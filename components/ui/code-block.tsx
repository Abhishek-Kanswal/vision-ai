"use client";

import { useState, useCallback } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  onCopy?: () => void;
  copied?: boolean;
}

export function CodeBlock({ code, language, filename, copied, onCopy }: CodeBlockProps) {
  const [internalCopied, setInternalCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setInternalCopied(true);
    onCopy?.();
    setTimeout(() => setInternalCopied(false), 1000);
  }, [code, onCopy]);

  return (
    <div className="relative my-3 rounded-lg overflow-hidden bg-[#282C34] border border-gray-700">
      {/* Filename header */}
      {filename && (
        <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between">
          <span className="text-xs font-mono text-gray-400">{filename}</span>
          <span className="text-xs text-gray-500">{language}</span>
        </div>
      )}

      {/* Syntax Highlighted Code */}
      <SyntaxHighlighter
        language={language.toLowerCase()}
        style={oneDark}
        wrapLongLines
        className="m-0 p-4 text-sm font-mono overflow-x-auto"
        customStyle={{ background: "transparent" }}
      >
        {code}
      </SyntaxHighlighter>


      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded bg-[var(--card)] hover:bg-gray-700 border border-gray-600 transition-colors"
        aria-label="Copy code"
      >
        {copied || internalCopied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4 text-gray-300" />
        )}
      </button>
    </div>
  );
}
