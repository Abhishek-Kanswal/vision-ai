"use client"

import React, { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { ArrowUp, Lock, Paperclip, Square, FileText, X, Unlock } from "lucide-react"

type Props = {
  value: string
  onChange: (v: string) => void
  onSend: (opts: {
    model: string
    deepSearch: boolean
    attachmentsText?: string
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [deepSearch, setDeepSearch] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null)

  useEffect(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(160, ta.scrollHeight)}px`
  }, [value])

  const handleSend = useCallback(() => {
    if (!value.trim() || disabled || isLoading) return
    onSend({
      model: selectedModel,
      deepSearch,
      attachmentsText: uploadedFile ? `File: ${uploadedFile.name}\n\n${uploadedFile.content}` : undefined,
    })
    onChange("")
    setUploadedFile(null)
  }, [value, disabled, isLoading, selectedModel, deepSearch, uploadedFile, onChange, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "text/plain" && !file.name.endsWith(".txt")) {
      alert("Please upload only .txt files")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      const limited = content.length > 10000 ? content.slice(0, 10000) + "\n\n[File truncated...]" : content
      setUploadedFile({ name: file.name, content: limited })
    }
    reader.readAsText(file)
    e.target.value = ""
  }, [])

  return (
    <div
      className="w-full rounded-[24px] border border-border bg-background/95 px-4 md:px-6 pt-4 pb-3 shadow-[0_6px_20px_rgba(0,0,0,0.06)]
                 focus-within:ring-2 focus-within:ring-[#444444] transition-all"
      onClick={() => taRef.current?.focus()}
      role="form"
      aria-label="Chat input"
      aria-busy={isLoading || undefined}
    >
      {/* Uploaded File Preview */}
      {uploadedFile && (
        <div className="mb-3 p-3 bg-accent/10 border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                {uploadedFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                ({uploadedFile.content.length} chars)
              </span>
            </div>
            <button
              onClick={() => setUploadedFile(null)}
              className="p-1 hover:bg-accent rounded-full transition"
              aria-label="Remove file"
            >
              <X className="h-3 w-3 text-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-center gap-3 md:gap-4">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything to VisionAI..."
          rows={1}
          disabled={isLoading}
          className="flex-1 resize-none bg-transparent text-base leading-6 text-foreground placeholder:text-muted-foreground 
                     outline-none border-none min-h-[1.5rem]"
        />

        <div className="hidden md:flex items-center gap-2">
          <button
            type="button"
            onClick={() => !isLocked && fileInputRef.current?.click()}
            disabled={isLocked}
            title={isLocked ? "Upload disabled" : "Upload .txt file"}
            className={`p-1 rounded hover:bg-accent transition-colors ${
              isLocked ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <Paperclip className="h-5 w-5 text-foreground" />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLocked(!isLocked)
              if (!isLocked) setDeepSearch(false)
            }}
            title={isLocked ? "Unlock features" : "Lock features"}
            className="p-1 rounded hover:bg-accent transition-colors"
          >
            {isLocked ? (
              <Unlock className="h-5 w-5 text-yellow-500" />
            ) : (
              <Lock className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          accept=".txt,text/plain"
          className="hidden"
        />

        {/* Send / Stop Button */}
        <div className="relative flex items-center justify-center">
          <AnimatePresence mode="wait">
            {!isLoading ? (
              <motion.button
                key="send"
                onClick={handleSend}
                disabled={disabled}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className={`flex items-center justify-center h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-md 
                            hover:brightness-95 transition ${disabled ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                <ArrowUp className="h-5 w-5" />
              </motion.button>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative"
              >
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary/20"
                  animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <motion.button
                  onClick={onStop}
                  whileTap={{ scale: 0.9 }}
                  className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                  title="Stop response"
                >
                  <Square className="h-5 w-5" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => !isLocked && setDeepSearch(!deepSearch)}
          disabled={isLocked}
          className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-all ${
            deepSearch
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-secondary text-foreground hover:bg-accent"
          } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Web Search {deepSearch && "✓"}
        </button>
      </div>
    </div>
  )
}

export default ChatInput