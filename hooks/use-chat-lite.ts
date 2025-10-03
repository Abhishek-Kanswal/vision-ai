"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export type ChatMessage = {
  id?: string
  role: "user" | "assistant" | "system"
  content: string
  image?: {
    url: string
    name: string
  }
}

export type Conversation = {
  id: string
  title: string
  updatedAt: number
  messages: ChatMessage[]
}

type UseChatLiteOptions = {
  api: string
  chatId?: string
}

type AppendOptions = {
  data?: any
}

function createConversation(title = "New chat"): Conversation {
  return {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
    title,
    updatedAt: Date.now(),
    messages: [],
  }
}

export function useChatLite({ api, chatId }: UseChatLiteOptions) {
  const [user, setUser] = useState<User | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [dbLoading, setDbLoading] = useState(true)
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const abortRef = useRef<AbortController | null>(null)
  const supabase = createClient()

  const setLoading = useCallback((conversationId: string, loading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [conversationId]: loading
    }))
  }, [])

  const getLoading = useCallback((conversationId: string) => {
    return loadingStates[conversationId] || false
  }, [loadingStates])

  useEffect(() => {
    async function initialize() {
      try {
        setDbLoading(true)

        if (supabase) {
          const { data: { user: authUser }, error } = await supabase.auth.getUser()
          if (!error) {
            setUser(authUser)

            if (authUser) {
              await loadConversations(authUser.id)
            } else {
              const initial = createConversation()
              setConversations([initial])
              setActiveId(initial.id)
            }
          } else {
            console.error("Error getting user:", error)
            const initial = createConversation()
            setConversations([initial])
            setActiveId(initial.id)
          }
        } else {
          const initial = createConversation()
          setConversations([initial])
          setActiveId(initial.id)
        }
      } catch (error) {
        console.error("Initialization error:", error)
        const initial = createConversation()
        setConversations([initial])
        setActiveId(initial.id)
      } finally {
        setDbLoading(false)
      }
    }

    initialize()
  }, [chatId])

  const loadConversations = async (userId: string) => {
    if (!supabase) return

    try {
      const { data: chatsData, error: chatsError } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (chatsError) {
        console.error("Error loading conversations:", chatsError)
        return
      }

      if (chatsData && chatsData.length > 0) {
        const { data: messagesData, error: messagesError } = await supabase
          .from("messages")
          .select("*")
          .in("chat_id", chatsData.map(chat => chat.id))
          .order("created_at", { ascending: true })

        if (messagesError) {
          console.error("Error loading messages:", messagesError)
          return
        }

        const messagesByChatId = new Map()
        if (messagesData) {
          messagesData.forEach(message => {
            if (!messagesByChatId.has(message.chat_id)) {
              messagesByChatId.set(message.chat_id, [])
            }
            messagesByChatId.get(message.chat_id).push(message)
          })
        }

        const loadedConversations: Conversation[] = chatsData.map((chat) => {
          const chatMessages = messagesByChatId.get(chat.id) || []

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
          }
        })

        setConversations(loadedConversations)

        if (loadedConversations.length > 0) {
          const activeConversationId = chatId || loadedConversations[0].id
          setActiveId(activeConversationId)
        } else {
          await newConversation()
        }
      } else {
        await newConversation()
      }
    } catch (error) {
      console.error("Error in loadConversations:", error)
    }
  }

  const loadSpecificChat = async (specificChatId: string) => {
    if (!user || !supabase) return

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
        .single()

      if (error || !data) {
        console.error("Chat not found or access denied")
        return
      }

      const conversation: Conversation = {
        id: data.id,
        title: data.title,
        updatedAt: new Date(data.updated_at).getTime(),
        messages: data.messages ? data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role as "user" | "assistant",
          content: msg.content,
          ...(msg.image_url && {
            image: {
              url: msg.image_url,
              name: "image",
            },
          }),
        })) : [],
      }

      setConversations(prev => {
        const filtered = prev.filter(conv => conv.id !== specificChatId)
        return [conversation, ...filtered]
      })

      setActiveId(specificChatId)
    } catch (error) {
      console.error("Error loading specific chat:", error)
    }
  }

  const saveMessage = async (chatId: string, message: ChatMessage) => {
    if (!user || !supabase) return null

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
        .single()

      if (error) {
        console.error("Error saving message:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("Error in saveMessage:", error)
      return null
    }
  }

  const updateChatTimestamp = async (chatId: string) => {
    if (!user || !supabase) return

    try {
      await supabase
        .from("chats")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", chatId)
    } catch (error) {
      console.error("Error updating chat timestamp:", error)
    }
  }

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  )

  const messages = activeConversation?.messages ?? []

  const updateActive = useCallback(
    (updater: (c: Conversation) => Conversation) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === activeId)
        if (idx === -1) return prev
        const clone = [...prev]
        clone[idx] = updater({ ...clone[idx] })
        return clone
      })
    },
    [activeId],
  )

  useEffect(() => {
    const handleIncompleteResponses = () => {
      setConversations(prev =>
        prev.map(conv => ({
          ...conv,
          messages: conv.messages.map(msg => {
            if (msg.role === "assistant" &&
              (!msg.content ||
                msg.content.trim() === "" ||
                msg.content === "AI is thinking..." ||
                msg.content === "Thinking...")) {
              return {
                ...msg,
                content: "Sorry, got disrupted by loading. Please try your message again."
              };
            }
            return msg;
          })
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

      if (user && supabase) {
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

        if (!res.body) {
          const text = await res.text().catch(() => "");
          const assistantMessage = { role: "assistant" as const, content: text };

          updateActive((c) => ({
            ...c,
            messages: [...c.messages, assistantMessage],
          }));

          if (user && supabase) {
            await saveMessage(activeId, assistantMessage);
          }

          setLoading(activeId, false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";

        const loadingMessage = {
          role: "assistant" as const,
          content: "AI is thinking..."
        };

        updateActive((c) => ({
          ...c,
          messages: [...c.messages, loadingMessage],
        }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          accumulatedContent += decoder.decode(value, { stream: true });

          updateActive((c) => {
            const updatedMessages = [...c.messages];
            const lastMessage = updatedMessages[updatedMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              updatedMessages[updatedMessages.length - 1] = {
                ...lastMessage,
                content: accumulatedContent || "Thinking...",
              };
            }
            return { ...c, messages: updatedMessages };
          });
        }

        if (user && supabase && accumulatedContent) {
          updateActive((c) => {
            const updatedMessages = [...c.messages];
            updatedMessages[updatedMessages.length - 1] = {
              role: "assistant",
              content: accumulatedContent
            };
            return { ...c, messages: updatedMessages };
          });

          await saveMessage(activeId, {
            role: "assistant",
            content: accumulatedContent
          });
        }

      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Error in append:", err);

          updateActive((c) => {
            const updatedMessages = [...c.messages];
            if (updatedMessages.length > 0) {
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              if (lastMessage.role === "assistant") {
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMessage,
                  content: "Sorry, got disrupted by loading. Please try your message again."
                };
              }
            }
            return { ...c, messages: updatedMessages };
          });

          if (user && supabase) {
            await saveMessage(activeId, {
              role: "assistant",
              content: "Sorry, got disrupted by loading. Please try your message again."
            });
          }
        } else {
          updateActive((c) => {
            const updatedMessages = [...c.messages];
            if (updatedMessages.length > 0) {
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              if (lastMessage.role === "assistant") {
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMessage,
                  content: "Response generation stopped by user."
                };
              }
            }
            return { ...c, messages: updatedMessages };
          });

          if (user && supabase) {
            await saveMessage(activeId, {
              role: "assistant",
              content: "Response generation stopped by user."
            });
          }
        }
      } finally {
        setLoading(activeId, false);
        abortRef.current = null;
      }
    },
    [api, activeId, messages, updateActive, user, supabase, setLoading],
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
    const newConv = createConversation()

    if (user && supabase) {
      try {
        const { data, error } = await supabase
          .from("chats")
          .insert({
            user_id: user.id,
            title: newConv.title,
          })
          .select()
          .single()

        if (!error && data) {
          const dbConversation: Conversation = {
            id: data.id,
            title: data.title,
            updatedAt: new Date(data.created_at).getTime(),
            messages: [],
          }
          setConversations((prev) => [dbConversation, ...prev])
          setActiveId(dbConversation.id)
          return
        }
      } catch (error) {
        console.error("Error creating conversation in DB:", error)
      }
    }

    setConversations((prev) => [newConv, ...prev])
    setActiveId(newConv.id)
  }, [user, supabase])

  const selectConversation = useCallback(
    async (id: string) => {
      setActiveId(id)
    },
    []
  )

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      const newTitle = title.trim() || "New Chat"

      if (user && supabase) {
        try {
          const { error } = await supabase
            .from("chats")
            .update({ title: newTitle })
            .eq("id", id)

          if (error) {
            console.error("Error renaming conversation:", error)
            return
          }
        } catch (error) {
          console.error("Error in renameConversation:", error)
        }
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c
        ),
      )
    },
    [user, supabase]
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      if (user && supabase) {
        try {
          const { error } = await supabase.from("chats").delete().eq("id", id)
          if (error) {
            console.error("Error deleting conversation:", error)
            return
          }
        } catch (error) {
          console.error("Error in deleteConversation:", error)
        }
      }

      setConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id)

        if (filtered.length === 0) {
          const newConv = createConversation()
          setActiveId(newConv.id)
          return [newConv]
        }

        if (activeId === id) {
          setActiveId(filtered[0].id)
        }

        return filtered
      })
    },
    [activeId, user, supabase],
  )

  const isLoading = getLoading(activeId || '')

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
  }
}