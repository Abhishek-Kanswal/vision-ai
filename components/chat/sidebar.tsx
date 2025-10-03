"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SquarePen,
  Search,
  ImageIcon,
  Settings,
  LogOut,
  MoreHorizontal,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Chat {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages?: any[];
}

interface ChatSidebarProps {
  conversations?: Chat[];
  activeId?: string | null;
  onNewChat?: () => void;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  setInput?: (input: string) => void;
  setIsExpanded?: (expanded: boolean) => void;
}

export default function ChatSidebar({
  conversations = [],
  activeId,
  onNewChat,
  setInput,
  onSelectChat,
  onDeleteChat,
  setIsExpanded,
}: ChatSidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { state } = useSidebar();
  const router = useRouter();
  const supabase = createClient();
  const sidebar = useSidebar();

  useEffect(() => {
    async function initializeAuth() {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        if (!error) setUser(authUser);
      } catch (err) {
        console.error("Error initializing auth:", err);
      } finally {
        setLoading(false);
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (setIsExpanded) setIsExpanded(state === "expanded");
  }, [state, setIsExpanded]);

  const chatsWithMessages = conversations.filter(chat =>
    chat.messages && Array.isArray(chat.messages) && chat.messages.length > 0
  );

  // Sign out
  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push("/");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  }

  // Create new chat
  async function handleNewChat() {
    if (setInput) setInput("");

    if (onNewChat) {
      onNewChat();
      return;
    }

    if (user) {
      try {
        const { data, error } = await supabase
          .from("chats")
          .insert({ user_id: user.id, title: "New Chat" })
          .select()
          .single();

        if (!error && data) router.push(`/chat/${data.id}`);
      } catch (err) {
        console.error("Error creating new chat:", err);
      }
    } else {
      router.push("/chat");
    }
  }

  // Delete chat
  async function deleteChat(chatId: string, e: React.MouseEvent) {
    e.stopPropagation();

    if (onDeleteChat) {
      onDeleteChat(chatId);
      return;
    }

    if (user) {
      try {
        const { error } = await supabase.from("chats").delete().eq("id", chatId);
        if (!error && activeId === chatId) router.push("/chat");
      } catch (err) {
        console.error("Error deleting chat:", err);
      }
    } else {
      if (onDeleteChat) {
        onDeleteChat(chatId);
      }
      if (activeId === chatId) router.push("/chat");
    }
  }

  // Select chat
  function handleSelectChat(chatId: string) {
    if (onSelectChat) onSelectChat(chatId);
    else router.push(`/chat/${chatId}`);
  }

  if (loading) {
    return (
      <Sidebar collapsible="icon" className="overflow-x-hidden">
        <SidebarContent className="overflow-x-hidden">
          <div className="flex items-center justify-center p-4">
            <div className="text-muted-foreground text-sm">Loading...</div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-x-hidden border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      {/* Header */}
      <SidebarHeader className="sticky top-0 z-10 px-2 py-2 border-b bg-background/80 backdrop-blur">
        <div className={`flex items-center w-full ${state === "expanded" ? "gap-2" : "justify-center"}`}>
          <div
            className={`rounded-lg ring-1 ring-primary/20 flex items-center justify-center transition-all duration-200
              ${state === "expanded" ? "h-10 w-10 ml-2" : "h-9 w-9"}`}
            style={{ backgroundImage: 'url("/sentient.avif")', backgroundSize: "cover", backgroundPosition: "center" }}
          />
          {state === "expanded" && (
            <span className="text-base font-semibold text-foreground/90 tracking-tight select-none">
              SentientAI
            </span>
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-2 py-3">
          <SidebarMenu>
            <SidebarMenuItem className="min-w-0">
              <SidebarMenuButton
                onClick={() => {
                  handleNewChat();
                  if (window.innerWidth < 768) {
                    sidebar.toggleSidebar();
                  }
                }}
                className={`min-w-0 rounded-lg transition hover:bg-muted/60
    ${state === "expanded" ? "px-3 py-2 justify-start" : "p-2 justify-center"}`}
                tooltip="New chat"
              >
                <SquarePen className="h-4 w-4 shrink-0 text-muted-foreground" />
                {state === "expanded" && <span className="truncate text-sm">New Chat</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem className="min-w-0">
              <SidebarMenuButton
                className={`min-w-0 rounded-lg transition hover:bg-muted/60
                  ${state === "expanded" ? "px-3 py-2 justify-start" : "p-2 justify-center"}`}
                tooltip="Search chats"
              >
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                {state === "expanded" && <span className="truncate text-sm">Search chats</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem className="min-w-0">
              <SidebarMenuButton
                className={`min-w-0 rounded-lg transition hover:bg-muted/60
                  ${state === "expanded" ? "px-3 py-2 justify-start" : "p-2 justify-center"}`}
                tooltip="Library"
              >
                <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {state === "expanded" && <span className="truncate text-sm">Library</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        <SidebarSeparator className="mx-3" />

        {/* Chat list */}
        <div className="p-2">
          {state === "expanded" && (
            <div className="px-2 py-1 mb-2">
              <p className="text-xs font-medium text-muted-foreground">
                {user ? "Recent Chats" : "Current Session"}
              </p>
            </div>
          )}
          <SidebarMenu>
            {chatsWithMessages.length > 0
              ? chatsWithMessages.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    onClick={() => {
                      handleSelectChat(chat.id);
                      if (window.innerWidth < 768) {
                        sidebar.toggleSidebar();
                      }
                    }}
                    isActive={activeId === chat.id}
                    tooltip={chat.title}
                    className="group"
                  >
                    {state === "expanded" ? (
                      <>
                        <span className="flex-1 truncate text-left text-sm">{chat.title}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => deleteChat(chat.id, e)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
              : state === "expanded" && (
                <div className="px-2 py-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    {user ? "No chats with messages" : "Start a new chat to begin"}
                  </p>
                </div>
              )}
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="sticky bottom-0 border-t bg-background/95 px-3 py-2 backdrop-blur-lg supports-[backdrop-filter]:bg-background/90">
        <SidebarMenu>
          <SidebarMenuItem className="min-w-0">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`flex items-center min-w-0 w-full rounded-lg transition-all duration-200 hover:bg-accent/50 focus:outline-none focus:ring-0
                ${state === "expanded"
                        ? "justify-start px-3 py-2 gap-3"
                        : "justify-center p-2"
                      }`}
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage
                        src={user.user_metadata?.avatar_url}
                        alt={user.user_metadata?.full_name || "User"}
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <AvatarFallback className="text-sm font-medium bg-muted">
                        {user.user_metadata?.full_name
                          ?.charAt(0)
                          .toUpperCase() ||
                          user.email?.charAt(0).toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>

                    {state === "expanded" && (
                      <div className="flex items-center justify-between min-w-0 flex-1 gap-3">
                        <div className="flex flex-col items-start min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground truncate w-full">
                            {user.user_metadata?.full_name || "User"}
                          </span>
                        </div>
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  className="w-56 rounded-xl shadow-lg border bg-popover/95 backdrop-blur-sm"
                >
                  <div className="px-3 py-2 border-b">
                    <p className="text-sm font-medium text-foreground">
                      {user.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="px-3 py-2 cursor-pointer hover:bg-destructive/10 hover:text-destructive rounded-lg m-1 text-destructive focus:outline-none focus:ring-0"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    <span className="text-sm">Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton
                onClick={() => router.push("/auth/login")}
                className={`min-w-0 w-full rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-accent/50 focus:outline-none focus:ring-0
            ${state === "expanded"
                    ? "justify-start px-3 py-2 gap-3"
                    : "justify-center p-2"
                  }`}
                tooltip="Sign in to save chats"
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <UserPlus className="h-4 w-4" />
                </div>
                {state === "expanded" && (
                  <div className="flex items-center justify-between min-w-0 flex-1 gap-3">
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <span className="text-sm font-medium">Sign In</span>
                    </div>
                    <MoreHorizontal className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                )}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}