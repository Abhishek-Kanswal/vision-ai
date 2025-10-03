"use client"

import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { useTheme } from "next-themes"
import { Copy, Check } from "lucide-react"

type ChatMessage = {
  id?: string
  role: "user" | "assistant" | "system"
  content: string
  image?: { url: string; name: string }
}

export function MessageList({
  messages,
  isLoading,
}: {
  messages: ChatMessage[]
  isLoading?: boolean
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const lastMessageRef = useRef<HTMLDivElement | null>(null)
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => setIsGenerating(messages.length % 2 !== 0), [messages.length])

  useEffect(() => {
    if (!messages.length && !isLoading) return
    lastMessageRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    })
  }, [messages, isLoading, isGenerating])

  const handleCopy = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const highlightCode = (code: string, language: string) => {
    const isDark = theme === "dark"

    // Language-specific patterns
    const patterns: Record<string, Array<{ pattern: RegExp; className: string }>> = {
      javascript: [
        { pattern: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: isDark ? "text-gray-400" : "text-gray-500" },
        {
          pattern:
            /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch)\b/g,
          className: isDark ? "text-purple-400" : "text-purple-600",
        },
        { pattern: /\b(true|false|null|undefined)\b/g, className: isDark ? "text-orange-400" : "text-orange-600" },
        { pattern: /(["'`])(?:(?=(\\?))\2.)*?\1/g, className: isDark ? "text-green-400" : "text-green-600" },
        { pattern: /\b\d+\b/g, className: isDark ? "text-blue-400" : "text-blue-600" },
      ],
      typescript: [
        { pattern: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: isDark ? "text-gray-400" : "text-gray-500" },
        {
          pattern:
            /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|try|catch|interface|type|enum)\b/g,
          className: isDark ? "text-purple-400" : "text-purple-600",
        },
        {
          pattern: /\b(string|number|boolean|any|void|never)\b/g,
          className: isDark ? "text-cyan-400" : "text-cyan-600",
        },
        { pattern: /\b(true|false|null|undefined)\b/g, className: isDark ? "text-orange-400" : "text-orange-600" },
        { pattern: /(["'`])(?:(?=(\\?))\2.)*?\1/g, className: isDark ? "text-green-400" : "text-green-600" },
        { pattern: /\b\d+\b/g, className: isDark ? "text-blue-400" : "text-blue-600" },
      ],
      python: [
        { pattern: /(#.*$)/gm, className: isDark ? "text-gray-400" : "text-gray-500" },
        {
          pattern: /\b(def|class|if|elif|else|for|while|return|import|from|as|try|except|with|lambda|yield)\b/g,
          className: isDark ? "text-purple-400" : "text-purple-600",
        },
        { pattern: /\b(True|False|None)\b/g, className: isDark ? "text-orange-400" : "text-orange-600" },
        { pattern: /(["'])(?:(?=(\\?))\2.)*?\1/g, className: isDark ? "text-green-400" : "text-green-600" },
        { pattern: /\b\d+\b/g, className: isDark ? "text-blue-400" : "text-blue-600" },
      ],
      jsx: [
        { pattern: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: isDark ? "text-gray-400" : "text-gray-500" },
        {
          pattern: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await)\b/g,
          className: isDark ? "text-purple-400" : "text-purple-600",
        },
        { pattern: /\b(true|false|null|undefined)\b/g, className: isDark ? "text-orange-400" : "text-orange-600" },
        { pattern: /(["'`])(?:(?=(\\?))\2.)*?\1/g, className: isDark ? "text-green-400" : "text-green-600" },
        { pattern: /<\/?[\w\s="/.':;#-/]+>/g, className: isDark ? "text-pink-400" : "text-pink-600" },
      ],
      tsx: [
        { pattern: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, className: isDark ? "text-gray-400" : "text-gray-500" },
        {
          pattern:
            /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|async|await|interface|type)\b/g,
          className: isDark ? "text-purple-400" : "text-purple-600",
        },
        { pattern: /\b(string|number|boolean|any|void)\b/g, className: isDark ? "text-cyan-400" : "text-cyan-600" },
        { pattern: /\b(true|false|null|undefined)\b/g, className: isDark ? "text-orange-400" : "text-orange-600" },
        { pattern: /(["'`])(?:(?=(\\?))\2.)*?\1/g, className: isDark ? "text-green-400" : "text-green-600" },
        { pattern: /<\/?[\w\s="/.':;#-/]+>/g, className: isDark ? "text-pink-400" : "text-pink-600" },
      ],
      css: [
        { pattern: /(\/\*[\s\S]*?\*\/)/g, className: isDark ? "text-gray-400" : "text-gray-500" },
        { pattern: /([.#][\w-]+)/g, className: isDark ? "text-yellow-400" : "text-yellow-600" },
        { pattern: /([\w-]+)(?=\s*:)/g, className: isDark ? "text-cyan-400" : "text-cyan-600" },
        { pattern: /(["'])(?:(?=(\\?))\2.)*?\1/g, className: isDark ? "text-green-400" : "text-green-600" },
      ],
      html: [
        { pattern: /([\s\S]*?)/g, className: isDark ? "text-gray-400" : "text-gray-500" },
        { pattern: /(<\/?)([\w-]+)/g, className: isDark ? "text-pink-400" : "text-pink-600" },
        { pattern: /([\w-]+)(?==)/g, className: isDark ? "text-cyan-400" : "text-cyan-600" },
        { pattern: /(["'])(?:(?=(\\?))\2.)*?\1/g, className: isDark ? "text-green-400" : "text-green-600" },
      ],
      json: [
        { pattern: /(["'])(?:(?=(\\?))\2.)*?\1(?=\s*:)/g, className: isDark ? "text-cyan-400" : "text-cyan-600" },
        { pattern: /(["'])(?:(?=(\\?))\2.)*?\1(?!\s*:)/g, className: isDark ? "text-green-400" : "text-green-600" },
        { pattern: /\b(true|false|null)\b/g, className: isDark ? "text-orange-400" : "text-orange-600" },
        { pattern: /\b\d+\b/g, className: isDark ? "text-blue-400" : "text-blue-600" },
      ],
    }

    const langPatterns = patterns[language.toLowerCase()] || patterns.javascript

    let highlighted = code
    const replacements: Array<{ start: number; end: number; html: string }> = []

    langPatterns.forEach(({ pattern, className }) => {
      let match
      while ((match = pattern.exec(code)) !== null) {
        replacements.push({
          start: match.index,
          end: match.index + match[0].length,
          html: `<span class="${className}">${match[0]}</span>`,
        })
      }
    })

    replacements.sort((a, b) => b.start - a.start)
    replacements.forEach(({ start, end, html }) => {
      highlighted = highlighted.slice(0, start) + html + highlighted.slice(end)
    })

    return highlighted
  }

  if (!mounted) return null

  return (
    <div ref={containerRef} className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
      <div className="flex flex-col gap-4 pb-[40vh] px-2 md:px-4">
        {messages.map((m, i) => {
          const isUser = m.role === "user"
          const isLast = i === messages.length - 1

          return (
            <div
              key={m.id ?? i}
              ref={isLast && !isLoading ? lastMessageRef : null}
              className={`flex items-start gap-2 md:gap-3 w-full ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <div className="hidden md:flex mt-1 h-8 w-8 rounded-full flex-shrink-0 overflow-hidden" aria-hidden>
                  <img src="/sentient.avif" alt="AI" className="h-full w-full object-cover" />
                </div>
              )}

              <div
                className={`${
                  isUser ? "max-w-[85%] md:max-w-[70%]" : "max-w-full md:max-w-[90%]"
                } flex-shrink-0 rounded-2xl text-sm leading-relaxed break-words overflow-hidden ${
                  isUser
                    ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-4 py-2.5"
                    : "bg-transparent text-foreground flex flex-col gap-2 px-1 md:px-3 py-2"
                }`}
              >
                {m.image && (
                  <img
                    src={m.image.url || "/placeholder.svg"}
                    alt={m.image.name}
                    className="w-full max-h-[250px] rounded-lg object-contain shadow-sm"
                  />
                )}

                {!isUser ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ inline, className, children, ...props }) {
                        const codeText = String(children).replace(/\n$/, "")
                        const language = className?.replace("language-", "") || "text"

                        if (inline) {
                          return (
                            <code
                              className="px-1.5 py-0.5 rounded font-mono text-xs bg-muted text-foreground"
                              {...props}
                            >
                              {children}
                            </code>
                          )
                        }

                        const highlightedCode = highlightCode(codeText, language)

                        return (
                          <div className="relative w-full group my-2">
                            <div
                              className={`rounded-lg overflow-hidden border ${theme === "dark" ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"}`}
                            >
                              <div
                                className={`px-3 py-1.5 text-xs font-mono border-b ${theme === "dark" ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-100 border-gray-200 text-gray-600"}`}
                              >
                                {language}
                              </div>
                              <pre className="p-4 overflow-x-auto">
                                <code
                                  className="text-sm font-mono leading-relaxed"
                                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                                />
                              </pre>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleCopy(codeText)}
                              className="absolute top-2 right-2 p-1.5 rounded bg-background/80 hover:bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                              aria-label="Copy code"
                            >
                              {copiedCode === codeText ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )
                      },
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.content}</p>
                )}
              </div>
            </div>
          )
        })}

        {isGenerating && (
          <div className="flex items-start gap-2 md:gap-3 justify-start" ref={lastMessageRef}>
            <div className="hidden md:flex mt-1 h-8 w-8 rounded-full flex-shrink-0 overflow-hidden" aria-hidden>
              <img src="/sentient.avif" alt="AI" className="h-full w-full object-cover" />
            </div>
            <div className="max-w-full md:max-w-[90%] rounded-2xl bg-transparent text-foreground px-1 md:px-3 py-2">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <span>Generating</span>
                <div className="flex gap-1 pt-1">
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