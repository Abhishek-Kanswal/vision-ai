// hooks/use-chat-lite.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client"; // ensure this exports a function that returns a browser Supabase client

// --- types from your original hook ---
export interface AgentResponse {
  name: string;
  content: string;
  sources?: string[];
  rawData: string;
  error?: string;
  status: "success" | "error";
  metadata?: {
    responseTime?: number;
    dataPoints?: number;
    currency?: string;
    sourceCount?: number;
  };
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  image?: { url: string; name: string };
  agents?: AgentResponse[];
}

export type Conversation = {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
};

type UseChatLiteOptions = {
  api: string;
  chatId?: string | null;
};

type AppendOptions = {
  data?: any;
};

function createConversation(title = "New chat"): Conversation {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as any).randomUUID()
        : String(Date.now()),
    title,
    updatedAt: Date.now(),
    messages: [],
  };
}

export function useChatLite({ api, chatId }: UseChatLiteOptions) {
  const [user, setUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [dbLoading, setDbLoading] = useState(true);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  // Hold Supabase client in ref to avoid calling createClient at module load
  const supabaseRef = useRef<any | null>(null);

  const setLoading = useCallback((conversationId: string, loading: boolean) => {
    setLoadingStates((prev) => ({
      ...prev,
      [conversationId]: loading,
    }));
  }, []);

  const getLoading = useCallback(
    (conversationId: string) => {
      return loadingStates[conversationId] || false;
    },
    [loadingStates]
  );

  // initialize supabase client and user
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        // Create browser client from your lib (must return a browser client)
        try {
          supabaseRef.current = supabaseBrowser();
        } catch (err) {
          // fallback: if the lib exports an async factory
          if (typeof (createClientFromLib as any) === "function") {
            const maybePromise = (createClientFromLib as any)();
            if (maybePromise && typeof maybePromise.then === "function") {
              supabaseRef.current = await maybePromise;
            }
          }
        }

        if (!mounted) return;

        if (supabaseRef.current) {
          const { data, error } = await supabaseRef.current.auth.getUser();
          if (!error) {
            const authUser = data?.user ?? null;
            setUser(authUser);

            if (authUser) {
              await loadConversations(authUser.id);
            } else {
              const initial = createConversation();
              setConversations([initial]);
              setActiveId(initial.id);
            }

            // subscribe to auth changes
            const { data: sub } = supabaseRef.current.auth.onAuthStateChange(
              (_event: any, session: any) => {
                setUser(session?.user ?? null);
              }
            );

            // cleanup subscription on unmount
            return () => {
              try {
                sub?.subscription?.unsubscribe?.();
              } catch {
                try {
                  sub?.unsubscribe?.();
                } catch {
                  /* ignore */
                }
              }
            };
          } else {
            console.error("Error getting user:", error);
            const initial = createConversation();
            setConversations([initial]);
            setActiveId(initial.id);
          }
        } else {
          // if supabase not available, initialize local state
          const initial = createConversation();
          setConversations([initial]);
          setActiveId(initial.id);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        const initial = createConversation();
        setConversations([initial]);
        setActiveId(initial.id);
      } finally {
        if (mounted) setDbLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      // abort any ongoing requests
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId]); // keep chatId as dep to reload if provided

  // load conversations helper (uses supabaseRef.current)
  const loadConversations = async (userId: string) => {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    try {
      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (chatsError) {
        console.error("Error loading conversations:", chatsError);
        return;
      }

      if (chatsData && chatsData.length > 0) {
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .in("chat_id", chatsData.map((chat: any) => chat.id))
          .order("created_at", { ascending: true });

        if (messagesError) {
          console.error("Error loading messages:", messagesError);
          return;
        }

        const messagesByChatId = new Map<string, any[]>();
        if (messagesData) {
          messagesData.forEach((message: any) => {
            if (!messagesByChatId.has(message.chat_id)) {
              messagesByChatId.set(message.chat_id, []);
            }
            messagesByChatId.get(message.chat_id).push(message);
          });
        }

        const loadedConversations: Conversation[] = chatsData.map((chat: any) => {
          const chatMessages = messagesByChatId.get(chat.id) || [];
          return {
            id: chat.id,
            title: chat.title,
            updatedAt: new Date(chat.updated_at).getTime(),
            messages: chatMessages.map((msg: any) => ({
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              ...(msg.image_url && {
                image: {
                  url: msg.image_url,
                  name: "image",
                },
              }),
            })),
          };
        });

        setConversations(loadedConversations);

        if (loadedConversations.length > 0) {
          const activeConversationId = chatId || loadedConversations[0].id;
          setActiveId(activeConversationId);
        } else {
          await newConversation();
        }
      } else {
        await newConversation();
      }
    } catch (error) {
      console.error("Error in loadConversations:", error);
    }
  };

  const loadSpecificChat = async (specificChatId: string) => {
    const supabase = supabaseRef.current;
    if (!user || !supabase) return;

    try {
      const { data, error } = await supabase
        .from("chats")
        .select(`
          *,
          messages (
            id,
            role,
            content,
            image_url,
            created_at
          )
        `)
        .eq("id", specificChatId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        console.error("Chat not found or access denied");
        return;
      }

      const conversation: Conversation = {
        id: data.id,
        title: data.title,
        updatedAt: new Date(data.updated_at).getTime(),
        messages: data.messages
          ? data.messages.map((msg: any) => ({
              id: msg.id,
              role: msg.role as "user" | "assistant",
              content: msg.content,
              ...(msg.image_url && {
                image: {
                  url: msg.image_url,
                  name: "image",
                },
              }),
            }))
          : [],
      };

      setConversations((prev) => {
        const filtered = prev.filter((conv) => conv.id !== specificChatId);
        return [conversation, ...filtered];
      });

      setActiveId(specificChatId);
    } catch (error) {
      console.error("Error loading specific chat:", error);
    }
  };

  const saveMessage = async (chatId: string, message: ChatMessage) => {
    const supabase = supabaseRef.current;
    if (!user || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          role: message.role,
          content: message.content,
          image_url: message.image?.url || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving message:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error in saveMessage:", error);
      return null;
    }
  };

  const updateChatTimestamp = async (chatId: string) => {
    const supabase = supabaseRef.current;
    if (!user || !supabase) return;

    try {
      await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId);
    } catch (error) {
      console.error("Error updating chat timestamp:", error);
    }
  };

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  const messages = activeConversation?.messages ?? [];

  const updateActive = useCallback(
    (updater: (c: Conversation) => Conversation) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === activeId);
        if (idx === -1) return prev;
        const clone = [...prev];
        clone[idx] = updater({ ...clone[idx] });
        return clone;
      });
    },
    [activeId]
  );

  useEffect(() => {
    const handleIncompleteResponses = () => {
      setConversations((prev) =>
        prev.map((conv) => ({
          ...conv,
          messages: conv.messages.map((msg) => {
            if (
              msg.role === "assistant" &&
              (!msg.content ||
                msg.content.trim() === "" ||
                msg.content === "AI is thinking..." ||
                msg.content === "Thinking...")
            ) {
              return {
                ...msg,
                content: "Sorry, got disrupted by loading. Please try your message again.",
              };
            }
            return msg;
          }),
        }))
      );
    };

    handleIncompleteResponses();
  }, []);

  const append = useCallback(
    async (message: ChatMessage, opts?: AppendOptions) => {
      if (!activeId) return;

      setLoading(activeId, true);

      updateActive((c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: [...c.messages, message],
      }));

      // save to DB if available
      if (user && supabaseRef.current) {
        await saveMessage(activeId, message);
        await updateChatTimestamp(activeId);
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const nextMessages = (messages ?? []).concat(message);
        const res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages, data: opts?.data }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const responseData = await res.json();

        if (responseData.error) {
          throw new Error(responseData.error);
        }

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: responseData.message,
          agents: responseData.agents || [],
        };

        updateActive((c) => ({
          ...c,
          messages: [...c.messages, assistantMessage],
        }));

        if (user && supabaseRef.current) {
          await saveMessage(activeId, assistantMessage);
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Error in append:", err);

          const errorMessage: ChatMessage = {
            role: "assistant",
            content: "Sorry, there was an error processing your request. Please try again.",
          };

          updateActive((c) => ({
            ...c,
            messages: [...c.messages, errorMessage],
          }));

          if (user && supabaseRef.current) {
            await saveMessage(activeId, errorMessage);
          }
        } else {
          console.log("Request was aborted by user");
        }
      } finally {
        setLoading(activeId, false);
        abortRef.current = null;
      }
    },
    [api, activeId, messages, updateActive, user, setLoading]
  );

  const stop = useCallback(() => {
    if (activeId) {
      setLoading(activeId, false);
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [activeId, setLoading]);

  const newConversation = useCallback(async () => {
    const newConv = createConversation();

    if (user && supabaseRef.current) {
      try {
        const { data, error } = await supabaseRef.current
          .from("chats")
          .insert({
            user_id: user.id,
            title: newConv.title,
          })
          .select()
          .single();

        if (!error && data) {
          const dbConversation: Conversation = {
            id: data.id,
            title: data.title,
            updatedAt: new Date(data.created_at).getTime(),
            messages: [],
          };
          setConversations((prev) => [dbConversation, ...prev]);
          setActiveId(dbConversation.id);
          return;
        }
      } catch (error) {
        console.error("Error creating conversation in DB:", error);
      }
    }

    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
  }, [user]);

  const selectConversation = useCallback(async (id: string) => {
    setActiveId(id);
  }, []);

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      const newTitle = title.trim() || "New Chat";

      if (user && supabaseRef.current) {
        try {
          const { error } = await supabaseRef.current.from("chats").update({ title: newTitle }).eq("id", id);

          if (error) {
            console.error("Error renaming conversation:", error);
            return;
          }
        } catch (error) {
          console.error("Error in renameConversation:", error);
        }
      }

      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c))
      );
    },
    [user]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      if (user && supabaseRef.current) {
        try {
          const { error } = await supabaseRef.current.from("chats").delete().eq("id", id);
          if (error) {
            console.error("Error deleting conversation:", error);
            return;
          }
        } catch (error) {
          console.error("Error in deleteConversation:", error);
        }
      }

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);

        if (filtered.length === 0) {
          const newConv = createConversation();
          setActiveId(newConv.id);
          return [newConv];
        }

        if (activeId === id) {
          setActiveId(filtered[0].id);
        }

        return filtered;
      });
    },
    [activeId, user]
  );

  const isLoading = getLoading(activeId || "");

  return {
    // chat data
    messages,
    input,
    setInput,
    append,
    isLoading,
    getLoading,
    stop,
    // sidebar data
    conversations,
    activeId,
    newConversation,
    selectConversation,
    renameConversation,
    deleteConversation,
    user,
    dbLoading,
  };
}
