"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Megaphone, ArrowUp, Square } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: (opts: {
    model: string;
    deepSearch: boolean;
    attachmentsText?: string;
    image?: { url: string; name: string };
  }) => void;
  disabled?: boolean;
  isLoading?: boolean;
  onStop?: () => void;
  messages: any[];
  selectedModel: string;
};

export function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  isLoading,
  onStop,
  messages,
  selectedModel,
}: Props) {
  const [deepSearch, setDeepSearch] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{ url: string; name: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!taRef.current) return;
    taRef.current.style.height = "0px";
    taRef.current.style.height = Math.min(160, taRef.current.scrollHeight) + "px";
  }, [value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!value.trim() || disabled || isLoading) return;
      handleSend();
    }
  }

  function handleSend() {
    onSend({
      model: selectedModel,
      deepSearch,
      attachmentsText: fileName,
      image: imageData,
    });

    clearAttachments();
  }

  function clearAttachments() {
    setFileName("");
    setPreviewUrl(null);
    setImageData(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("Only images are allowed");
      return;
    }

    setIsUploading(true);
    setFileName(file.name);
    setPreviewUrl(null);
    setImageData(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Failed to upload image");
      const result = await response.json();

      setPreviewUrl(result.dataUrl);
      setImageData({ url: result.url, name: file.name });
    } catch {
      alert("Failed to upload image");
      clearAttachments();
    } finally {
      setTimeout(() => setIsUploading(false), 300);
    }
  }

  return (
    <div
      className="w-full rounded-3xl border border-neutral-200 bg-white shadow-sm px-3 md:px-4 pt-3 pb-3"
      role="form"
      aria-label="Chat input"
    >
      {/* Image preview */}
      {(previewUrl || isUploading) && (
        <div className="mb-2 flex items-center gap-3">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={fileName}
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
                <div className="h-full bg-neutral-400 rounded-full animate-pulse w-3/4"></div>
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

      {/* Input row */}
      <div className="flex items-start gap-3">
        {/* Plus button */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-neutral-200 hover:bg-neutral-50 transition-colors"
            aria-label="Add image"
          >
            <Plus className="h-5 w-5 text-neutral-600" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        {/* Textarea */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Summarize the latest AI papers from this week"
            className="w-full resize-none border-0 outline-none focus:ring-0 bg-transparent text-base leading-6 text-foreground placeholder:text-neutral-400 pt-[0.6rem]"
            rows={1}
            disabled={isLoading}
          />

          {/* Deep Search */}
          {messages.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDeepSearch((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  deepSearch
                    ? "bg-gray-200 border-gray-300 text-gray-800"
                    : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                }`}
                aria-pressed={deepSearch}
                aria-label="Toggle Deep Search"
              >
                <Megaphone className="h-4 w-4 text-gray-600" />
                <span>Deep Search</span>
              </button>
            </div>
          )}
        </div>

        {/* Send button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={isLoading ? onStop : handleSend}
            disabled={disabled || (!isLoading && !value.trim())}
            className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              isLoading
                ? "bg-neutral-500 hover:bg-neutral-600 text-white"
                : disabled || !value.trim()
                ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                : "bg-neutral-800 hover:bg-neutral-700 text-white shadow-sm"
            }`}
          >
            {isLoading ? <Square className="h-4 w-4" /> : <ArrowUp className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}