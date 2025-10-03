"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import {
  Plus,
  Megaphone,
  ArrowUp,
  Square,
  Paperclip,
  ImageIcon,
  Lightbulb,
  Search,
  BookOpen,
  MoreHorizontal,
} from "lucide-react"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"

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

export function ChatInput({ value, onChange, onSend, disabled, isLoading, onStop, messages, selectedModel }: Props) {
  const { theme } = useTheme()
  const [deepSearch, setDeepSearch] = useState(false)

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
    onChange("")
    onSend({
      model: selectedModel,
      deepSearch,
    })
  }

  return (
    <div
      className="w-full rounded-3xl border bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm px-3 md:px-4 pt-3 pb-3"
      role="form"
      aria-label="Chat input"
    >
      {/* Input row */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-2 pt-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-neutral-200 dark:border-gray-600 hover:bg-neutral-50 dark:hover:bg-gray-700 transition-colors"
                aria-label="Add attachment"
              >
                <Plus className="h-5 w-5 text-neutral-600 dark:text-gray-300" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              side="top"
              className="w-56 bg-white dark:bg-gray-900 border-border text-foreground"
            >
              <DropdownMenuItem
                disabled
                className="gap-3 py-2.5 cursor-not-allowed opacity-50"
              >
                <Paperclip className="h-5 w-5" />
                <span className="flex-1">Add photos & files</span>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                disabled
                className="gap-3 py-2.5 cursor-not-allowed opacity-50"
              >
                <Search className="h-5 w-5" />
                <span className="flex-1">ODS</span>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Textarea */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Summarize the latest AI papers from this week"
            className="w-full resize-none border-0 outline-none focus:ring-0 bg-transparent dark:bg-gray-800 text-base leading-6 text-foreground dark:text-gray-100 placeholder:text-neutral-400 dark:placeholder:text-gray-400 pt-[0.6rem]"
            rows={1}
            disabled={isLoading}
          />
        </div>

        {/* Send button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={isLoading ? onStop : handleSend}
            disabled={disabled || (!isLoading && !value.trim())}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition-all ${isLoading
                ? "bg-neutral-500 hover:bg-neutral-600 text-white"
                : disabled || !value.trim()
                  ? "bg-neutral-200 dark:bg-gray-600 text-neutral-400 dark:text-gray-300 cursor-not-allowed"
                  : "bg-neutral-800 dark:bg-gray-200 dark:text-gray-900 hover:bg-neutral-700 dark:hover:bg-gray-300 text-white shadow-sm"
              }`}
          >
            {isLoading ? <Square className="h-4 w-4" /> : <ArrowUp className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
