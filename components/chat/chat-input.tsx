"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Paperclip, Megaphone, ArrowUp, Square } from "lucide-react"

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
}

export function ChatInput({ value, onChange, onSend, disabled, isLoading, onStop }: Props) {
  const [deepSearch, setDeepSearch] = useState(false)
  const [fileName, setFileName] = useState<string>("")
  const [attachmentsText, setAttachmentsText] = useState<string>("")
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imageData, setImageData] = useState<{ url: string; name: string } | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!taRef.current) return
    taRef.current.style.height = "0px"
    taRef.current.style.height = Math.min(160, taRef.current.scrollHeight) + "px"
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (value.trim().length === 0 || disabled || isLoading) return
      handleSend()
    }
  }

  function handleSend() {
    onSend({
      model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
      deepSearch,
      attachmentsText,
      image: imageData,
    })
    clearAttachments()
  }

  function clearAttachments() {
    setFileName("")
    setAttachmentsText("")
    setPreviewUrl(null)
    setImageData(null)
    if (fileRef.current) {
      fileRef.current.value = ""
    }
  }

  async function handleFile(file: File) {
    const isValidType =
      file.type.startsWith("image/") || file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name)

    if (!isValidType) {
      alert("Only text files (.txt, .md, .csv, .json) and images are allowed")
      return
    }

    setIsUploading(true)
    setFileName(file.name)
    setPreviewUrl(null)
    setImageData(null)

    try {
      if (file.type.startsWith("image/")) {
        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          throw new Error("Failed to upload image")
        }

        const result = await response.json()

        setPreviewUrl(result.dataUrl)
        setAttachmentsText(`Image attached: ${file.name}`)

        setImageData({ url: result.url, name: file.name })
      } else if (file.type.startsWith("text/") || /\.(md|txt|csv|json)$/i.test(file.name)) {
        const text = await file.text()
        setAttachmentsText(text.slice(0, 8000))
      }
    } catch (error) {
      console.error("File upload error:", error)
      alert("Failed to upload file. Please try again.")
      clearAttachments()
    } finally {
      setTimeout(() => setIsUploading(false), 300)
    }
  }

  return (
    <div
      className="w-full rounded-3xl border border-neutral-200 bg-white shadow-sm px-3 md:px-4 pt-3 pb-3"
      role="form"
      aria-label="Chat input"
    >
      {(fileName || previewUrl || isUploading) && (
        <div className="mb-2 flex items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl || "/placeholder.svg"}
              alt={fileName || "Attachment preview"}
              className="h-8 w-8 rounded-md object-cover border border-neutral-200"
            />
          ) : (
            <div className="h-8 w-8 rounded-md border border-neutral-200 bg-neutral-50 flex items-center justify-center text-xs text-neutral-600">
              📄
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm text-neutral-800 truncate">{fileName || "Uploading…"}</p>
            {isUploading && (
              <div className="mt-1 h-2 w-16 bg-neutral-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full animate-pulse w-3/4"></div>
              </div>
            )}
          </div>
          <button
            onClick={clearAttachments}
            className="text-neutral-400 hover:text-neutral-600 text-sm"
            aria-label="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-neutral-200 hover:bg-neutral-50 transition-colors"
            aria-label="Add attachment"
            title="Add attachment (txt, images only)"
          >
            <Paperclip className="h-5 w-5 text-neutral-600" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.txt,.md,.csv,.json,text/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Summarize the latest AI papers from this week"
            className="w-full resize-none border-0 outline-none focus:ring-0 bg-transparent text-base leading-6 text-foreground placeholder:text-neutral-400"
            rows={1}
            aria-label="Message input"
            disabled={isLoading}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setDeepSearch((v) => !v)}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                deepSearch
                  ? "bg-orange-50 border-orange-200 text-orange-700"
                  : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
              }`}
              aria-pressed={deepSearch}
              aria-label="Toggle Deep Search"
              title="Deep Search"
            >
              <Megaphone className="h-4 w-4 text-orange-500" />
              <span>Deep Search</span>
            </button>
          </div>
        </div>

        <div className="flex items-end">
          <button
            type="button"
            onClick={isLoading ? onStop : handleSend}
            disabled={disabled || (!isLoading && value.trim().length === 0)}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              isLoading
                ? "bg-neutral-500 hover:bg-neutral-600 text-white"
                : disabled || value.trim().length === 0
                  ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  : "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
            }`}
            aria-label={isLoading ? "Stop generation" : "Send message"}
          >
            {isLoading ? <Square className="h-4 w-4" /> : <ArrowUp className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
