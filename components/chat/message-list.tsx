"use client"

import { useEffect, useRef, useState } from "react"

type ChatMessage = {
  id?: string
  role: "user" | "assistant" | "system"
  content: string
  image?: { url: string; name: string }
}

export function MessageList({ messages, isLoading }: { messages: ChatMessage[], isLoading?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const lastMessageRef = useRef<HTMLDivElement | null>(null)

  // Scroll to the last message or loading indicator
  useEffect(() => {
    if (!messages.length && !isLoading) return
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [messages, isLoading])

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full overflow-y-auto overflow-x-hidden"
    >
      <div className="flex flex-col gap-6 pb-[40vh]">
        {messages.map((m, i) => {
          const isUser = m.role === "user"
          const isLast = i === messages.length - 1

          return (
            <div
              key={m.id ?? i}
              ref={isLast && !isLoading ? lastMessageRef : null} // scroll when AI message is fully shown
              className={`flex items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div
                  aria-hidden
                  className="mt-1 h-10 w-10 rounded-full flex-shrink-0 overflow-hidden"
                >
                  <img
                    src="/sentient.jpg"
                    alt="AI"
                    className="h-full w-full object-cover"
                  />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl text-sm leading-relaxed break-words overflow-hidden px-4 py-3 ${
                  isUser
                    ? "bg-neutral-100 text-neutral-900"
                    : "bg-transparent text-foreground flex flex-col gap-2"
                }`}
                style={{ marginTop: isUser ? '0' : '-4px' }}
              >
                {m.image && (
                  <img
                    src={m.image.url || "/placeholder.svg"}
                    alt={m.image.name}
                    className="w-full max-h-[400px] rounded-lg object-contain shadow-sm"
                  />
                )}
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                {m.image && m.image.name && (
                  <p className="text-xs text-neutral-500 mt-1">{m.image.name}</p>
                )}
              </div>
            </div>
          )
        })}

        {isLoading && (
          <div className="flex items-start gap-3 justify-start" ref={lastMessageRef}>
            <div
              aria-hidden
              className="mt-1 h-10 w-10 rounded-full flex-shrink-0 overflow-hidden"
            >
              <img
                src="/sentient.jpg"
                alt="AI"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="max-w-[85%] rounded-2xl bg-transparent text-foreground px-4 py-3" style={{ marginTop: '-4px' }}>
              <div className="flex items-center gap-2 text-muted-foreground text-sm sm:text-base">
                <span>Generating</span>
                <div className="flex gap-1 pt-1.5">
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce [animation-delay:0.15s]">.</span>
                  <span className="animate-bounce [animation-delay:0.3s]">.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
