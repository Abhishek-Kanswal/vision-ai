"use client"

import { useState, useCallback, useEffect } from "react"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { useChatLite } from "@/hooks/use-chat-lite"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import ChatSidebar from "@/components/chat/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Check, ChevronDown, X, ExternalLink, Zap, Bitcoin, Shield } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import ShinyText from "../components/ui/ShinyText"
import { motion } from "framer-motion"

interface PageProps {
    user: User | null
}

export default function ClientChatPage({ user }: PageProps) {
    const [selectedAIModel, setSelectedAIModel] = useState("Dobby-3.3-70B")
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

    const getModelString = useCallback((name: string) => {
        const modelMap: Record<string, string> = {
            "Dobby-3.3-70B": "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new",
            "Dobby Mini Plus 3.1 8B":
                "accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b",
        }
        return modelMap[name] || name
    }, [])

    const send = useCallback(
        async ({ deepSearch, attachmentsText, image }: any) => {
            if (!input.trim()) return

            const userMessage = {
                role: "user" as const,
                content: input,
                ...(image && { image }),
            }

            await append(userMessage, {
                data: { model: getModelString(selectedAIModel), deepSearch, attachmentsText },
            })

            setInput("")
            if (!isSidebarExpanded) setIsSidebarExpanded(true)
        },
        [input, append, getModelString, selectedAIModel, isSidebarExpanded, setInput],
    )

    const generateChatTitle = useCallback(
        async (conversationId: string, userMessage: string) => {
            if (renamingConversations.has(conversationId))
                return setRenamingConversations((prev) => new Set(prev.add(conversationId)))

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
                    const newSet = new Set(prev)
                    newSet.delete(conversationId)
                    return newSet
                })
            }
        },
        [renameConversation, renamingConversations],
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
            <SidebarInset>
                <div className="flex items-center justify-center h-full w-full bg-[var(--secondary)]">
                    <div className="flex flex-col bg-background text-foreground w-[98%] h-[98%] rounded-2xl shadow-lg p-2 m-auto">
                        {/* Header */}
                        <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-2 flex items-center gap-3 min-h-[56px]">
                            <SidebarTrigger className="h-9 w-9 p-0 hover:bg-accent" />

                            <div className="flex-1 flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-muted hover:bg-muted/70 text-foreground">
                                            {selectedAIModel}
                                            <ChevronDown className="h-4 w-4 opacity-70" />
                                        </button>
                                    </DropdownMenuTrigger>

                                    <DropdownMenuContent className="w-56 bg-background border border-border text-foreground">
                                        {["Dobby-3.3-70B", "Dobby Mini Plus 3.1 8B"].map((model) => (
                                            <DropdownMenuItem
                                                key={model}
                                                onClick={() => setSelectedAIModel(model)}
                                                className={`flex justify-between px-3 py-2 rounded-md cursor-pointer ${
                                                    selectedAIModel === model
                                                        ? "bg-accent/40 text-primary"
                                                        : "hover:bg-accent/30"
                                                }`}
                                            >
                                                {model}
                                                <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                {dbLoading && (
                                    <div className="ml-auto">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-foreground"></div>
                                    </div>
                                )}
                            </div>
                        </header>

                        {/* Main Content */}
                        <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 relative">
                            {messages.length > 0 ? (
                                <>
                                    <section className="flex-1 overflow-y-auto py-4">
                                        <MessageList messages={messages} isLoading={isLoading} />
                                    </section>

                                    <div className="sticky bottom-0 border-t border-border py-4">
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
                                </>
                            ) : (
                                <EmptyState
                                    input={input}
                                    setInput={setInput}
                                    send={send}
                                    isLoading={isLoading}
                                    selectedAIModel={selectedAIModel}
                                />
                            )}
                        </main>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}

function EmptyState({ input, setInput, send, isLoading, selectedAIModel }: any) {
    const [greeting, setGreeting] = useState<{ type: "genius" | "time"; text: string } | null>(null)

    useEffect(() => {
        const greetings = ["Good Morning", "Good Afternoon", "Good Evening"]
        const randomTimeGreeting = greetings[Math.floor(Math.random() * greetings.length)]
        const randomChoice = Math.random() < 0.5 ? "genius" : "time"

        if (randomChoice === "genius") {
            setGreeting({ type: "genius", text: "What can I help you build today, Genius?" })
        } else {
            setGreeting({ type: "time", text: `${randomTimeGreeting}, there.` })
        }
    }, [])

    if (!greeting) return null // Wait until hydrated to show dynamic text

    const prePrompts = [
        { icon: Zap, text: "ETH inflow" },
        { icon: Bitcoin, text: "Bhutan BTC" },
        { icon: Shield, text: "BTC identity" },
    ]

    const handlePrePromptClick = (prompt: string) => setInput(prompt)

    return (
        <div className="flex flex-col items-center gap-5 text-center mt-24 md:mt-36 w-full">
            <div className="text-5xl font-bold text-muted-foreground max-w-xl leading-tight">
                {greeting.type === "genius" ? (
                    <>
                        What can I help you build today,{" "}
                        <ShinyText text="Genius" disabled={false} speed={3} className="custom-class" />?
                    </>
                ) : (
                    <>
                        {greeting.text.split(", ")[0]},{" "}
                        <ShinyText
                            text={greeting.text.split(", ")[1]}
                            disabled={false}
                            speed={3}
                            className="custom-class"
                        />
                    </>
                )}
            </div>

            <div className="w-full max-w-3xl">
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

            <div className="flex gap-3 flex-wrap justify-start w-full max-w-3xl mt-2">
                {prePrompts.map(({ icon: Icon, text }, i) => (
                    <div
                        key={i}
                        onClick={() => handlePrePromptClick(text)}
                        className="flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card hover:bg-muted transition cursor-pointer"
                    >
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{text}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
