"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "next-themes";
import { Copy, Check, RefreshCcw, MoreVertical } from "lucide-react";
import type { ChatMessage } from "@/types/agent";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CodeBlock } from "@geist-ui/core";

export function MessageList({
  messages,
  isLoading,
  onRegenerate,
}: {
  messages: ChatMessage[];
  isLoading?: boolean;
  onRegenerate?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastMessageRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | number | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => setIsGenerating(messages.length % 2 !== 0), [messages.length]);

  useEffect(() => {
    if (!isAtBottom) return;
    lastMessageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages, isLoading, isGenerating, isAtBottom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      setIsAtBottom(nearBottom);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1000);
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full overflow-y-auto overflow-x-hidden scroll-smooth"
    >
      <div className="flex flex-col gap-4 pb-32 px-2 md:px-4">
        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const isLast = i === messages.length - 1;

          return (
            <div
              key={i}
              ref={isLast && !isLoading ? lastMessageRef : null}
              className={`flex items-start gap-2 md:gap-3 w-full ${
                isUser ? "justify-end" : "justify-start"
              }`}
              onMouseEnter={() => !isUser && setHoveredMessageId(i)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {!isUser && (
                <div className="hidden md:flex mt-1 h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                  <img src="/sentient.avif" alt="AI" className="h-full w-full object-cover" />
                </div>
              )}

              <div className="flex flex-col gap-2 w-full">
                <div
                  className={`${
                    isUser
                      ? "max-w-[85%] md:max-w-[70%] ml-auto bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 px-4 py-2.5"
                      : "max-w-full md:max-w-[90%] bg-transparent text-foreground px-1 md:px-3 py-2"
                  } rounded-2xl text-sm leading-relaxed break-words overflow-hidden`}
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
                        code({ inline, className, children }) {
                          const codeText = String(children).replace(/\n$/, "");
                          const language =
                            className?.replace("language-", "") || "plaintext";

                          if (inline) {
                            return (
                              <code className="px-1.5 py-0.5 rounded font-mono text-xs bg-muted text-foreground">
                                {children}
                              </code>
                            );
                          }

                          // CodeBlock
                          return (
                            <div className="relative my-3 group">
                              <CodeBlock
                                aria-label="Code snippet"
                                filename={`code.${language}`}
                                language={language}
                              >
                                {codeText}
                              </CodeBlock>

                              <button
                                onClick={() => handleCopy(codeText)}
                                className="absolute top-2 right-2 p-1.5 rounded bg-background/80 hover:bg-background border border-border opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Copy code"
                              >
                                {copiedText === codeText ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          );
                        },
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {m.content}
                    </p>
                  )}
                </div>

                {!isUser && hoveredMessageId === i && (
                  <div className="flex items-center gap-1 px-1 md:px-3">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(m.content)}
                            className="h-8 w-8 p-0 hover:bg-muted"
                          >
                            {copiedText === m.content ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{copiedText === m.content ? "Copied!" : "Copy message"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {onRegenerate && isLast && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={onRegenerate}
                              className="h-8 w-8 p-0 hover:bg-muted"
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Regenerate response</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleCopy(m.content)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy message
                        </DropdownMenuItem>
                        {onRegenerate && isLast && (
                          <DropdownMenuItem onClick={onRegenerate}>
                            <RefreshCcw className="h-4 w-4 mr-2" />
                            Regenerate response
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isGenerating && (
          <div className="flex items-start gap-2 md:gap-3 justify-start" ref={lastMessageRef}>
            <div className="hidden md:flex mt-1 h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
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
  );
}