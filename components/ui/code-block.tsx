"use client"

import { Copy, Check } from "lucide-react"
import { useState, useCallback } from "react"

interface CodeBlockProps {
  code: string
  language: string
  filename?: string
}

export function CodeBlock({ code, language, filename }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1000)
  }, [code])

  // Simple syntax highlighting with regex patterns
  const highlightCode = (code: string, lang: string) => {
    // Keywords for different languages
    const keywords: Record<string, string[]> = {
      javascript: [
        "const",
        "let",
        "var",
        "function",
        "return",
        "if",
        "else",
        "for",
        "while",
        "import",
        "export",
        "async",
        "await",
        "class",
        "extends",
        "new",
        "this",
        "super",
        "try",
        "catch",
        "throw",
      ],
      typescript: [
        "const",
        "let",
        "var",
        "function",
        "return",
        "if",
        "else",
        "for",
        "while",
        "import",
        "export",
        "async",
        "await",
        "class",
        "extends",
        "new",
        "this",
        "super",
        "try",
        "catch",
        "throw",
        "interface",
        "type",
        "enum",
        "namespace",
        "public",
        "private",
        "protected",
      ],
      jsx: [
        "const",
        "let",
        "var",
        "function",
        "return",
        "if",
        "else",
        "for",
        "while",
        "import",
        "export",
        "async",
        "await",
        "class",
        "extends",
        "new",
        "this",
        "super",
        "try",
        "catch",
        "throw",
      ],
      tsx: [
        "const",
        "let",
        "var",
        "function",
        "return",
        "if",
        "else",
        "for",
        "while",
        "import",
        "export",
        "async",
        "await",
        "class",
        "extends",
        "new",
        "this",
        "super",
        "try",
        "catch",
        "throw",
        "interface",
        "type",
        "enum",
      ],
      python: [
        "def",
        "class",
        "return",
        "if",
        "else",
        "elif",
        "for",
        "while",
        "import",
        "from",
        "as",
        "try",
        "except",
        "finally",
        "with",
        "lambda",
        "yield",
        "async",
        "await",
      ],
      sql: [
        "SELECT",
        "FROM",
        "WHERE",
        "INSERT",
        "UPDATE",
        "DELETE",
        "CREATE",
        "DROP",
        "ALTER",
        "JOIN",
        "LEFT",
        "RIGHT",
        "INNER",
        "OUTER",
        "ON",
        "GROUP",
        "BY",
        "ORDER",
        "HAVING",
      ],
    }

    const keywordList = keywords[lang] || []
    let highlighted = code

    // Highlight keywords
    keywordList.forEach((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, "g")
      highlighted = highlighted.replace(regex, `<span class="text-blue-400">${keyword}</span>`)
    })

    // Highlight strings
    highlighted = highlighted.replace(/"([^"]*)"/g, '<span class="text-green-400">"$1"</span>')
    highlighted = highlighted.replace(/'([^']*)'/g, "<span class=\"text-green-400\">'$1'</span>")
    highlighted = highlighted.replace(/`([^`]*)`/g, '<span class="text-green-400">`$1`</span>')

    // Highlight comments
    highlighted = highlighted.replace(/\/\/(.*)$/gm, '<span class="text-gray-500">//$1</span>')
    highlighted = highlighted.replace(/\/\*([\s\S]*?)\*\//g, '<span class="text-gray-500">/*$1*/</span>')

    // Highlight numbers
    highlighted = highlighted.replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>')

    return highlighted
  }

  return (
    <div className="relative my-3 group rounded-lg overflow-hidden bg-black border border-gray-700">
      {/* Header with filename */}
      {filename && (
        <div className="bg-gray-900 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
          <span className="text-xs font-mono text-gray-400">{filename}</span>
          <span className="text-xs text-gray-500">{language}</span>
        </div>
      )}

      {/* Code container */}
      <div className="overflow-x-auto">
        <pre className="p-4 font-mono text-sm leading-relaxed text-gray-100">
          <code
            dangerouslySetInnerHTML={{
              __html: highlightCode(code, language),
            }}
          />
        </pre>
      </div>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-colors"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4 text-gray-300" />}
      </button>
    </div>
  )
}