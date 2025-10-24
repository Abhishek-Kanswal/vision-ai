"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ArrowUp, ImageIcon, Lock, Paperclip, Square } from "lucide-react"

type Props = {
  value: string
  onChange: (v: string) => void
  onSend: (opts: {
    model: string
    deepSearch: boolean
    attachmentsText?: string
    image?: { url: string; name: string }
  }) => void
  disabled?: boolean
  isLoading?: boolean
  onStop?: () => void
  messages: any[]
  selectedModel: string
}

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  isLoading,
  onStop,
  selectedModel,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!taRef.current) return
    taRef.current.style.height = "0px"
    taRef.current.style.height = Math.min(160, taRef.current.scrollHeight) + "px"
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!value.trim() || disabled || isLoading) return
      handleSend()
    }
  }

  function handleSend() {
    onSend({
      model: selectedModel,
      deepSearch: false,
    })
    onChange("")
  }

  return (
    <div
      className="w-full rounded-[28px] border border-border bg-background/96 px-4 md:px-6 pt-4 pb-3 shadow-[0_10px_30px_rgba(0,0,0,0.05),_0_2px_6px_rgba(0,0,0,0.04)]"
      role="form"
      aria-label="Chat input"
      aria-busy={isLoading || undefined}
    >
      {/* Top row */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Textarea */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask 800+ AIs anything"
            rows={1}
            disabled={isLoading}
            className="w-full resize-none border-0 bg-transparent outline-none focus:ring-0 text-base leading-6 text-foreground placeholder:text-muted-foreground pt-[0.2rem]"
          />
        </div>

        {/* Icons */}
        <div className="hidden md:flex items-center gap-3 text-muted-foreground">
          <Paperclip className="h-5 w-5" aria-hidden />
          <Lock className="h-5 w-5" aria-hidden />
        </div>

        {/* Send / Loading button */}
        <div className="relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!isLoading ? (
              <motion.button
                key="send"
                type="button"
                onClick={handleSend}
                disabled={disabled || !value.trim()}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.9 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className={`flex items-center justify-center h-12 w-12 rounded-full bg-primary hover:brightness-95 shadow-sm text-primary-foreground transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/70 ${
                  disabled ? "cursor-not-allowed opacity-70" : ""
                }`}
                aria-label="Send"
              >
                <ArrowUp className="h-5 w-5" />
              </motion.button>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="relative"
              >
                {/* Halo pulse */}
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary/15"
                  animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                />

                {/* Spinner ring */}
                <motion.div
                  className="absolute inset-0 rounded-full border-[3px] border-primary/35 border-t-primary shadow-sm"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  aria-hidden
                />

                {/* Stop button */}
                <motion.button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop response"
                  title="Stop response"
                  whileTap={{ scale: 0.9 }}
                  className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm outline-none transition-colors hover:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/70"
                >
                  <Square className="h-5 w-5" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom row */}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          aria-label="Web search"
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm bg-secondary text-foreground"
        >
          Web Search
        </button>

        <button
          type="button"
          aria-label="Add image"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-secondary text-foreground"
        >
          <ImageIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export default ChatInput