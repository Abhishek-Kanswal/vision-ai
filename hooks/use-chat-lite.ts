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
  chatId?: string // Added optional chatId for loading specific chats
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
  const [isLoading, setIsLoading] = useState(false)
  const [dbLoading, setDbLoading] = useState(false) // Start with false to not block UI
  const abortRef = useRef<AbortController | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function initializeChat() {
      const initial = createConversation()
      setConversations([initial])
      setActiveId(initial.id)

      try {
        setDbLoading(true)
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          await loadConversations()
          if (chatId) {
            await loadSpecificChat(chatId)
          }
        }
      } catch (error) {
        console.log("Authentication not available, using local storage")
      } finally {
        setDbLoading(false)
      }
    }

    initializeChat()
  }, [chatId])

  const loadConversations = async () => {
    if (!user) return

    const { data, error } = await supabase.from("chats").select("*").order("updated_at", { ascending: false })

    if (!error && data) {
      const conversations: Conversation[] = data.map((chat) => ({
        id: chat.id,
        title: chat.title,
        updatedAt: new Date(chat.updated_at).getTime(),
        messages: [],
      }))

      setConversations(conversations)
      if (conversations.length > 0 && !activeId) {
        setActiveId(conversations[0].id)
        await loadMessages(conversations[0].id)
      }
    }
  }

  const loadSpecificChat = async (chatId: string) => {
    if (!user) return

    await loadMessages(chatId)
    setActiveId(chatId)
  }

  const loadMessages = async (chatId: string) => {
    if (!user) return

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true })

    if (!error && data) {
      const messages: ChatMessage[] = data.map((msg) => ({
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

      setConversations((prev) => prev.map((conv) => (conv.id === chatId ? { ...conv, messages } : conv)))
    }
  }

  const saveMessage = async (chatId: string, message: ChatMessage) => {
    if (!user) return

    const { error } = await supabase.from("messages").insert({
      chat_id: chatId,
      role: message.role,
      content: message.content,
      image_url: message.image?.url || null,
    })

    if (error) {
      console.error("Error saving message:", error)
    }
  }

  const updateChatTimestamp = async (chatId: string) => {
    if (!user) return

    await supabase.from("chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId)
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

  const append = useCallback(
    async (message: ChatMessage, opts?: AppendOptions) => {
      if (!activeId) return

      if (user) {
        await saveMessage(activeId, message)
        await updateChatTimestamp(activeId)
      }

      // add user message to local state
      updateActive((c) => ({
        ...c,
        updatedAt: Date.now(),
        messages: [...c.messages, message],
      }))
      setIsLoading(true)

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const nextMessages = (messages ?? []).concat(message)
        const res = await fetch(api, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: nextMessages, data: opts?.data }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const text = await res.text().catch(() => res.statusText)
          const errorMessage = { role: "assistant" as const, content: `Error: ${text || res.status}` }

          updateActive((c) => ({
            ...c,
            messages: [...c.messages, errorMessage],
          }))

          if (user) {
            await saveMessage(activeId, errorMessage)
          }

          setIsLoading(false)
          return
        }

        if (!res.body) {
          const text = await res.text().catch(() => "")
          const assistantMessage = { role: "assistant" as const, content: text }

          updateActive((c) => ({
            ...c,
            messages: [...c.messages, assistantMessage],
          }))

          if (user) {
            await saveMessage(activeId, assistantMessage)
          }

          setIsLoading(false)
          return
        }

        // streaming
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ""
        let assistantMessageSaved = false

        // push placeholder assistant message
        updateActive((c) => ({
          ...c,
          messages: [...c.messages, { role: "assistant", content: "" }],
        }))

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          acc += decoder.decode(value, { stream: true })

          // update last assistant message
          updateActive((c) => {
            const msgs = [...c.messages]
            const last = msgs[msgs.length - 1]
            if (last && last.role === "assistant") {
              msgs[msgs.length - 1] = { ...last, content: acc }
            }
            return { ...c, updatedAt: Date.now(), messages: msgs }
          })
        }

        if (user && acc && !assistantMessageSaved) {
          await saveMessage(activeId, { role: "assistant", content: acc })
          assistantMessageSaved = true
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          const errorMessage = { role: "assistant" as const, content: `Error: ${err?.message || "Request failed"}` }

          updateActive((c) => ({
            ...c,
            messages: [...c.messages, errorMessage],
          }))

          if (user) {
            await saveMessage(activeId, errorMessage)
          }
        }
      } finally {
        setIsLoading(false)
        abortRef.current = null
      }
    },
    [api, activeId, messages, updateActive, user],
  )

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setIsLoading(false)
  }, [])

  const newConversation = useCallback(async () => {
    if (!user) {
      // For non-authenticated users, create local conversation
      const conv = createConversation()
      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id)
      return
    }

    // For authenticated users, create in database
    const { data, error } = await supabase
      .from("chats")
      .insert({
        user_id: user.id,
        title: "New Chat",
      })
      .select()
      .single()

    if (!error && data) {
      const conv: Conversation = {
        id: data.id,
        title: data.title,
        updatedAt: new Date(data.created_at).getTime(),
        messages: [],
      }
      setConversations((prev) => [conv, ...prev])
      setActiveId(conv.id)
    }
  }, [user, supabase])

  const selectConversation = useCallback(
    async (id: string) => {
      setActiveId(id)
      if (user) {
        await loadMessages(id)
      }
    },
    [user],
  )

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      if (!user) {
        // For non-authenticated users, update locally
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: title || c.title, updatedAt: Date.now() } : c)),
        )
        return
      }

      // For authenticated users, update in database
      const { error } = await supabase
        .from("chats")
        .update({ title: title || "New Chat" })
        .eq("id", id)

      if (!error) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: title || c.title, updatedAt: Date.now() } : c)),
        )
      }
    },
    [user, supabase],
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      if (!user) {
        // For non-authenticated users, delete locally
        setConversations((prev) => {
          const next = prev.filter((c) => c.id !== id)
          if (next.length === 0) {
            const fresh = createConversation()
            setActiveId(fresh.id)
            return [fresh]
          }
          if (activeId === id) {
            setActiveId(next[0].id)
          }
          return next
        })
        return
      }

      // For authenticated users, delete from database
      const { error } = await supabase.from("chats").delete().eq("id", id)

      if (!error) {
        setConversations((prev) => {
          const next = prev.filter((c) => c.id !== id)
          if (next.length === 0) {
            // Create new conversation in database
            newConversation()
            return prev
          }
          if (activeId === id) {
            setActiveId(next[0].id)
            loadMessages(next[0].id)
          }
          return next
        })
      }
    },
    [activeId, user, supabase, newConversation],
  )

  return {
    // chat data
    messages,
    input,
    setInput,
    append,
    isLoading,
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
