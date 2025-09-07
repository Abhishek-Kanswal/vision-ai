"use client";

import { useState } from "react";
import { MessageList } from "@/components/chat/message-list";
import { ChatInput } from "@/components/chat/chat-input";
import { useChatLite } from "@/hooks/use-chat-lite";
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
  const [selectedAIModel, setSelectedAIModel] = useState("Dobby Mini Plus 3.1 8B");
  const [isExpanded, setIsExpanded] = useState(true);

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
  } = useChatLite({ api: "/api/chat" });

  function send({
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

    append(userMessage as any, {
      data: { model: selectedAIModel, deepSearch, attachmentsText },
    });

    setInput("");
  }

  return (
    <SidebarProvider>
      <ChatSidebar
        setIsExpanded={setIsExpanded}
        conversations={conversations}
        activeId={activeId}
        onNewChat={newConversation}
        setInput={setInput}
        onSelectChat={selectConversation}
        onDeleteChat={deleteConversation}
      />
      <SidebarInset>
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 left-0 right-0 z-10 bg-[#FEFEFE] backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-[0.92rem]">
            <div className="flex items-center gap-2">
              {!isExpanded && <SidebarTrigger />}

              {/* Model Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium bg-background hover:bg-muted cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary">
                    {selectedAIModel}
                    <ChevronDown className="h-4 w-4 opacity-70" />
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-56">
                  <DropdownMenuItem
                    onClick={() => setSelectedAIModel("Dobby-3.3-70B")}
                    className="focus:outline-none"
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
                    onClick={() => setSelectedAIModel("Dobby Mini Plus 3.1 8B")}
                    className="focus:outline-none"
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

              {/* DB Loading spinner */}
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
                  <MessageList messages={messages as any} isLoading={isLoading} />
                </section>

                {/* Sticky Input */}
                <div className="sticky bottom-0 backdrop-blur py-4 border-t">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={send}
                    disabled={isLoading}
                    messages={messages as any}
                    selectedModel={selectedAIModel}
                  />
                </div>
              </>
            ) : (
              // Empty State
              <div className="flex-1 flex flex-col items-center justify-center gap-6 -translate-y-8">
                <h1 className="text-4xl font-bold text-center text-neutral-700">
                  Good to see you here, try out Dobby AI
                </h1>
                <div className="w-full max-w-4xl px-4">
                  <ChatInput
                    value={input}
                    onChange={setInput}
                    onSend={send}
                    disabled={isLoading}
                    messages={messages as any}
                    selectedModel={selectedAIModel}
                  />
                </div>
              </div>
            )}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}