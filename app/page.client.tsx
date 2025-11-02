"use client"

import { useState, useCallback, useEffect } from "react"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { useChatLite } from "@/hooks/use-chat-lite"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import ChatSidebar from "@/components/chat/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Check, ChevronDown, X, ExternalLink, Zap, Bitcoin, ShieldCheck } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import ShinyText from "@/components/ui/ShinyText"

interface PageProps {
    user: User | null
}

export default function ClientChatPage({ user }: PageProps) {
    const [selectedAIModel, setSelectedAIModel] = useState("VisionAI 1.0")
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
    const [renamingConversations, setRenamingConversations] = useState<Set<string>>(new Set())
    const [hydrated, setHydrated] = useState(false)

    const {
        messages,
        input,
        setInput,
        append,
        isLoading,
        dbLoading,
        conversations,
        activeId,
        newConversation,
        selectConversation,
        deleteConversation,
        renameConversation,
    } = useChatLite({ api: "/api/chat" })

    useEffect(() => {
        setHydrated(true)
    }, [])

    const handleNewChat = () => {
        if (typeof newConversation === "function") newConversation()
    }

    const generateChatTitle = useCallback(
        async (conversationId: string, userMessage: string) => {
            if (!conversationId || !userMessage.trim()) return
            if (renamingConversations.has(conversationId)) return

            setRenamingConversations((prev) => new Set(prev).add(conversationId))

            try {
                const res = await fetch("/api/chat-title", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ userMessage }),
                })

                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

                const data = await res.json()
                if (data?.title && typeof renameConversation === "function") {
                    await renameConversation(conversationId, data.title)
                }
            } catch (err) {
                console.error("Failed to rename conversation:", err)
            } finally {
                setRenamingConversations((prev) => {
                    const updated = new Set(prev)
                    updated.delete(conversationId)
                    return updated
                })
            }
        },
        [renameConversation, renamingConversations]
    )

    const send = useCallback(
        async ({ deepSearch, attachmentsText, image, overrideInput }: any) => {
            const messageContent = overrideInput ?? input
            if (!messageContent.trim()) return

            const userMessage = {
                role: "user" as const,
                content: messageContent,
                ...(image && { image }),
            }

            const previousMessageCount = messages.length

            await append(userMessage, {
                data: { deepSearch, attachmentsText },
            })

            const convId = activeId ?? conversations?.[0]?.id

            if (convId && previousMessageCount === 0) {
                generateChatTitle(convId, messageContent)
            }

            if (!overrideInput) setInput("")
            if (!isSidebarExpanded) setIsSidebarExpanded(true)
        },
        [
            input,
            messages,
            append,
            selectedAIModel,
            isSidebarExpanded,
            setInput,
            activeId,
            conversations,
            generateChatTitle,
        ]
    )

    if (!hydrated) return null

    return (
        <SidebarProvider defaultOpen={isSidebarExpanded}>
            <ChatSidebar
                conversations={conversations}
                activeId={activeId}
                onNewChat={handleNewChat}
                setInput={setInput}
                onSelectChat={selectConversation}
                onDeleteChat={deleteConversation}
                setIsExpanded={setIsSidebarExpanded}
                renamingIds={renamingConversations}
                variant="inset"
            />
            <SidebarInset className="flex flex-col h-screen overflow-hidden">
                <div className="flex items-center justify-center h-full w-full bg-[var(--secondary)]">
                    <div className="flex flex-col bg-background text-foreground w-[98%] h-[98%] rounded-2xl shadow-lg p-2 m-auto">
                        <header className="flex-shrink-0 bg-background border-b border-border px-4 py-2 flex items-center gap-3 z-10">
                            <SidebarTrigger className="h-8 w-8 p-0 hover:bg-accent" />
                            <div className="flex-1 flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium bg-muted hover:bg-muted/70 text-foreground transition-colors">
                                            {selectedAIModel}
                                            <ChevronDown className="h-3 w-3 opacity-70" />
                                        </button>
                                    </DropdownMenuTrigger>
                                </DropdownMenu>
                                {dbLoading && (
                                    <div className="ml-2">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-foreground"></div>
                                    </div>
                                )}
                            </div>
                        </header>

                        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background hide-scrollbar">
                            <div className="max-w-4xl mx-auto px-6 py-4 h-full">
                                {messages.length > 0 ? (
                                    <MessageList messages={messages} isLoading={isLoading} />
                                ) : (
                                    <EmptyState
                                        selectedAIModel={selectedAIModel}
                                        send={send}
                                        input={input}
                                        setInput={setInput}
                                        isLoading={isLoading}
                                    />
                                )}
                            </div>
                        </main>

                        {messages.length > 0 && (
                            <footer className="flex-shrink-0 bg-background border-t border-border px-4 py-3">
                                <div className="max-w-4xl mx-auto">
                                    <ChatInput
                                        value={input}
                                        onChange={setInput}
                                        onSend={send}
                                        disabled={isLoading}
                                        isLoading={isLoading}
                                        messages={messages}
                                        selectedModel={selectedAIModel}
                                    />
                                </div>
                            </footer>
                        )}
                    </div>
                </div>
            </SidebarInset>

            <style jsx global>{`
                .hide-scrollbar {
                    -ms-overflow-style: none !important;
                    scrollbar-width: none !important;
                }
                .hide-scrollbar::-webkit-scrollbar {
                    display: none !important;
                    width: 0 !important;
                    height: 0 !important;
                    background: transparent !important;
                    -webkit-appearance: none !important;
                }
            `}</style>

        </SidebarProvider >
    )
}

function EmptyState({ input, setInput, selectedAIModel, send, isLoading }: any) {
    const prePrompts = [
        { icon: Zap, text: "ETH Price", prompt: "What is the ETH price?" },
        { icon: Bitcoin, text: "Check Token", prompt: "This is Contract Address: 0x6982508145454ce325ddbe47a25d4ec3d2311933 , tell me about the coin." },
        { icon: ShieldCheck, text: "Search Sentient", prompt: "Search about Sentient AGI" },
    ]

    const handlePrePromptClick = (prompt: string) => {
        send({
            deepSearch: !prompt.toLowerCase().includes("search"),
            attachmentsText: "",
            image: undefined,
            overrideInput: prompt,
        })
    }

    return (
        <div className="flex flex-col items-center gap-5 text-center mt-24 md:mt-36 w-full">
            <div className="text-5xl font-bold text-muted-foreground max-w-xl leading-tight">
                What can I help you build today,{" "}
                <ShinyText text="Genius" disabled={false} speed={3} className="custom-class" />?
            </div>

            {/* Chat Input for Desktop */}
            <div className="w-full max-w-4xl hidden md:block">
                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={send}
                    disabled={isLoading}
                    isLoading={isLoading}
                    messages={[]}
                    selectedModel={selectedAIModel}
                />
            </div>

            {/* Chat Input for Mobile */}
            <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border md:hidden px-4 py-3 z-50">
                <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={send}
                    disabled={isLoading}
                    isLoading={isLoading}
                    messages={[]}
                    selectedModel={selectedAIModel}
                />
            </div>

            {/* Suggestions */}
            <div className="flex gap-3 flex-wrap justify-start w-full max-w-4xl mt-2">
                {prePrompts.map(({ icon: Icon, text, prompt }, i) => (
                    <button
                        key={i}
                        onClick={() => handlePrePromptClick(prompt)}
                        className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card hover:bg-muted transition cursor-pointer"
                    >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{text}</span>
                    </button>
                ))}
            </div>
        </div>
    )
}