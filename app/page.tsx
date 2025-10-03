"use client";
import { useState, useRef, useEffect } from "react";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatLite } from "@/hooks/use-chat-lite";
import { createClient } from "@/lib/supabase/client";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import ChatSidebar from "@/components/chat/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";

export default function Page() {
  const [selectedAIModel, setSelectedAIModel] = useState(
    "Dobby-3.3-70B"
  );
  const [isExpanded, setIsExpanded] = useState(true);
  const supabase = createClient();
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
    reloadConversations,
  } = useChatLite({ api: "/api/chat" });

  // Reset rename flag and create a new conversation
  function handleNewChat() {
    if (typeof newConversation === "function") newConversation();
  }

  // Map UI model name to API model string
  function getModelString(name: string) {
    if (name === "Dobby-3.3-70B") {
      return "accounts/sentientfoundation/models/dobby-unhinged-llama-3-3-70b-new";
    }
    if (name === "Dobby Mini Plus 3.1 8B") {
      return "accounts/sentientfoundation-serverless/models/dobby-mini-unhinged-plus-llama-3-1-8b";
    }
    return name;
  }

  async function send({
    deepSearch,
    attachmentsText,
    image,
  }: {
    deepSearch: boolean;
    attachmentsText?: string;
    image?: { url: string; name: string };
  }) {
    if (!input.trim()) return;

    const userMessage = {
      role: "user" as const,
      content: input,
      ...(image && { image }),
    };

    await append(userMessage as any, {
      data: {
        model: getModelString(selectedAIModel),
        deepSearch,
        attachmentsText,
      },
      // No chat renaming logic here
    });

    setInput("");
  }

  useEffect(() => {
    const renameChats = async () => {
      for (const chat of conversations) {
        if (chat.messages?.length > 0 && chat.title.trim() === "New chat") {
          try {
            const res = await fetch("/api/chat-title", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userMessage: chat.messages[0].content }),
            });
            const data = await res.json();
            if (data.title) {
              renameConversation(chat.id, data.title);
            }
          } catch (error) {
            console.error("Error renaming chat:", error);
          }
        }
      }
    };

    renameChats();
  }, [conversations, renameConversation]);

  return (
    <SidebarProvider>
      <ChatSidebar
        setIsExpanded={setIsExpanded}
        conversations={conversations}
        activeId={activeId}
        onNewChat={handleNewChat}
        setInput={setInput}
        onSelectChat={selectConversation}
        onDeleteChat={deleteConversation}
      />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 left-0 right-0 z-10 bg-background/95 border-b px-4 py-2 flex items-center gap-2 min-h-[56px]">
            <SidebarTrigger />
            <div className="flex-1 flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  {/* Thin black border like your screenshot + no focus ring */}
                  <button className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-background hover:bg-muted cursor-pointer focus:outline-none focus:ring-0 focus-visible:ring-0">
                    {selectedAIModel}
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem
                    onClick={() => setSelectedAIModel("Dobby-3.3-70B")}
                    className="focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="text-sm font-medium">Dobby-3.3-70B</p>
                        <p className="text-xs text-muted-foreground">
                          Large model for complex reasoning & multi-step tasks
                        </p>
                      </div>
                      {selectedAIModel === "Dobby-3.3-70B" && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      setSelectedAIModel("Dobby Mini Plus 3.1 8B")
                    }
                    className="focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <p className="text-sm font-medium">
                          Dobby Mini Plus 3.1 8B
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Smaller, faster model for lightweight tasks
                        </p>
                      </div>
                      {selectedAIModel === "Dobby Mini Plus 3.1 8B" && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {dbLoading && (
                <div className="ml-auto">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 relative">
            {messages.length > 0 ? (
              <>
                {/* Messages */}
                <section className="flex-1 overflow-y-auto py-4">
                  <MessageList
                    messages={messages as any}
                    isLoading={isLoading}
                  />
                </section>

                {/* Sticky Input */}
                <div className="sticky bottom-0 bg-background py-4 border-t">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={send}
                    disabled={isLoading}
                    isLoading={isLoading}
                    messages={messages as any}
                    selectedModel={selectedAIModel}
                  />
                </div>
              </>
            ) : (
              // Empty State - Different layout for mobile vs desktop
              <>
                {/* Desktop Layout (your original code) */}
                <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-6 -translate-y-8">
                  <h1 className="text-4xl font-bold text-center text-neutral-700">
                    Good to see you here, try out Dobby AI
                  </h1>
                  <div className="w-full max-w-4xl px-4">
                    <ChatInput
                      value={input}
                      onChange={setInput}
                      onSend={send}
                      onStop={stop}
                      disabled={isLoading}
                      isLoading={isLoading}
                      messages={messages as any}
                      selectedModel={selectedAIModel}
                    />
                  </div>
                </div>

                {/* Mobile Layout - Input at bottom */}
                <div className="md:hidden flex flex-col min-h-full">
                  {/* Welcome message at top */}
                  <div className="flex-1 flex items-center justify-center px-4">
                    <h1 className="text-2xl font-bold text-center text-neutral-700">
                      Good to see you here, try out Dobby AI
                    </h1>
                  </div>
                  
                  {/* Input fixed at bottom */}
                  <div className="sticky bottom-0 bg-background py-4 border-t">
                    <ChatInput
                      value={input}
                      onChange={setInput}
                      onSend={send}
                      onStop={stop}
                      disabled={isLoading}
                      isLoading={isLoading}
                      messages={messages as any}
                      selectedModel={selectedAIModel}
                    />
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}