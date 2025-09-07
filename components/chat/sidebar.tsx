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
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PanelRightOpen,
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
}

interface ChatSidebarProps {
  conversations?: any[];
  activeId?: string | null;
  onNewChat?: () => void;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
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
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { state } = useSidebar();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadChats();
    });

    // Initial fetch
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) loadChats();
      setLoading(false);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (state === "expanded") setIsExpanded(true);
    else setIsExpanded(false);
  }, [state]);

  const loadChats = async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from("chats")
        .select(
          `
        id,
        title,
        updated_at,
        messages(count)
      `
        )
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching chats:", error);
        return;
      }

      if (data) {
        const filtered = data.filter((chat) => chat.messages[0]?.count > 0);

        const cleanChats = filtered.map((chat) => ({
          id: chat.id,
          title: chat.title,
          updated_at: chat.updated_at,
        }));

        setChats(cleanChats);
      }
    } catch (err) {
      console.error("Unexpected error loading chats:", err);
    }
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  }

  async function handleNewChat() {
    setInput("");
    if (onNewChat) return onNewChat();
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("chats")
        .insert({ user_id: user.id, title: "New Chat" })
        .select()
        .single();
      if (!error && data) {
        router.push(`/chat/${data.id}`);
        await loadChats();
      }
    } catch {}
  }

  async function deleteChat(chatId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (onDeleteChat) return onDeleteChat(chatId);
    try {
      const { error } = await supabase.from("chats").delete().eq("id", chatId);
      if (!error) await loadChats();
    } catch {}
  }

  if (loading) {
    return (
      <Sidebar collapsible="icon" className="overflow-x-hidden">
        <SidebarContent className="overflow-x-hidden">
          <div className="p-4 text-muted-foreground text-sm">Loading...</div>
        </SidebarContent>
      </Sidebar>
    );
  }

  const displayChats = user ? chats : conversations;

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-x-hidden border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      {/* Header */}
      <SidebarHeader className="sticky top-0 z-10 px-2 py-2 border-b bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2 w-full">
          <div
            className={`rounded-lg ring-1 ring-primary/20 
        ${state === "expanded" ? "h-10 w-10 ml-2" : "h-6 w-6 mx-auto"}`}
            style={{
              backgroundImage: 'url("/sentient.jpg")',
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          {state === "expanded" && (
            <span className="text-sm font-medium text-foreground/90">
              SentientAI
            </span>
          )}

          {/* Panel icon on the right when expanded */}
          {state === "expanded" && (
            <SidebarTrigger className="h-5 w-5 ml-auto text-muted-foreground" />
          )}
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-2 py-3">
          <SidebarMenu>
            {/* New Chat */}
            <SidebarMenuItem className="min-w-0">
              <SidebarMenuButton
                onClick={handleNewChat}
                className={`min-w-0 rounded-lg transition hover:bg-muted/60
                  ${
                    state === "expanded"
                      ? "px-3 py-2 justify-start"
                      : "p-2 justify-center"
                  }`}
                tooltip="New chat"
              >
                <SquarePen className="h-4 w-4 shrink-0 text-muted-foreground" />
                {state === "expanded" && (
                  <span className="truncate text-sm">New Chat</span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Search chats */}
            <SidebarMenuItem className="min-w-0">
              <SidebarMenuButton
                className={`min-w-0 rounded-lg transition hover:bg-muted/60
                  ${
                    state === "expanded"
                      ? "px-3 py-2 justify-start"
                      : "p-2 justify-center"
                  }`}
                tooltip="Search chats"
              >
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                {state === "expanded" && (
                  <span className="truncate text-sm">Search chats</span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Library */}
            <SidebarMenuItem className="min-w-0">
              <SidebarMenuButton
                className={`min-w-0 rounded-lg transition hover:bg-muted/60
                  ${
                    state === "expanded"
                      ? "px-3 py-2 justify-start"
                      : "p-2 justify-center"
                  }`}
                tooltip="Library"
              >
                <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                {state === "expanded" && (
                  <span className="truncate text-sm">Library</span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        <SidebarSeparator className="mx-3" />

        {/* Chat list */}
        <div className="px-2 py-3">
          {state === "expanded" && (
            <p className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-muted-foreground/80">
              {user ? "Recent Chats" : "Current Session"}
            </p>
          )}
          <SidebarMenu>
            {displayChats
              .filter((chat) => chat.messages?.length > 0) // 👈 only chats with messages
              .map((chat) => (
                <SidebarMenuItem key={chat.id} className="min-w-0">
                  <SidebarMenuButton
                    onClick={() =>
                      onSelectChat
                        ? onSelectChat(chat.id)
                        : router.push(`/chat/${chat.id}`)
                    }
                    className={`group relative w-full min-w-0 justify-between rounded-lg px-3 py-2 transition
            ${
              activeId === chat.id
                ? "bg-accent/70 text-accent-foreground ring-1 ring-border shadow-sm"
                : "hover:bg-muted/60"
            }`}
                    tooltip={chat.title}
                  >
                    {state === "expanded" ? (
                      <>
                        <span className="truncate text-sm">{chat.title}</span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <span
                              className={`
                      absolute right-1 h-6 w-6 p-0 flex items-center justify-center cursor-pointer rounded
                      opacity-0 group-hover:opacity-100
                      data-[state=open]:opacity-100
                      focus:outline-none
                    `}
                              onClick={(e) => e.stopPropagation()}
                              tabIndex={0}
                              role="button"
                              aria-label="Chat actions"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => deleteChat(chat.id, e)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    ) : (
                      <MoreHorizontal className="h-5 w-5 mx-auto" />
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="sticky bottom-0 border-t bg-background/80 px-3 py-2 backdrop-blur">
        <SidebarMenu>
          <SidebarMenuItem className="min-w-0">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    className={`min-w-0 w-full rounded-xl transition
                      ${
                        state === "expanded"
                          ? "justify-start px-3 py-2 gap-2"
                          : "justify-center p-2"
                      }`}
                    tooltip={user.email || "User menu"}
                  >
                    <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border">
                      <AvatarFallback className="text-xs">
                        {user.email?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    {state === "expanded" && (
                      <span className="truncate text-sm">{user.email}</span>
                    )}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-56">
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton
                onClick={() => router.push("/auth/login")}
                className={`min-w-0 w-full rounded-xl transition text-muted-foreground hover:text-foreground
                  ${
                    state === "expanded"
                      ? "justify-start px-3 py-2 gap-2"
                      : "justify-center p-2"
                  }`}
                tooltip="Sign in to save chats"
              >
                <UserPlus className="h-4 w-4" />
                {state === "expanded" && (
                  <span className="text-xs">Sign In</span>
                )}
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
