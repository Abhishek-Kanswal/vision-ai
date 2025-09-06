"use client"

import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { useChatLite } from "@/hooks/use-chat-lite"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import ChatSidebar from "@/components/chat/sidebar"
import { use } from "react"

interface ChatPageProps {
  params: Promise<{ id: string }>
}

export default function ChatPage({ params }: ChatPageProps) {
  const { id } = use(params)
  const { messages, input, setInput, append, isLoading, user, dbLoading } = useChatLite({
    api: "/api/chat",
    chatId: id,
  })

  function send({
    model,
    deepSearch,
    attachmentsText,
    image,
  }: {
    model: string
    deepSearch: boolean
    attachmentsText?: string
    image?: { url: string; name: string }
  }) {
    if (!input.trim()) return

    const messageWithImage = {
      role: "user" as const,
      content: input,
      ...(image && { image }),
    }

    append(messageWithImage as any, {
      data: { model, deepSearch, attachmentsText },
    })
    setInput("")
  }

  if (dbLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <ChatSidebar />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 left-0 right-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-lg font-semibold">SentientAI</h1>
            </div>
          </header>

          <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4">
            <section className="flex-1 overflow-y-auto py-4">
              <MessageList messages={messages as any} />
            </section>

            <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t py-4">
              <ChatInput value={input} onChange={setInput} onSend={send} disabled={isLoading} />
            </div>
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
