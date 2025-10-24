"use client";

import { useState, useEffect, useMemo } from "react";
import type React from "react";
import { supabaseBrowser } from '@/lib/supabase/client';
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
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
import {
  SquarePen,
  Search,
  MoreHorizontal,
  Trash2,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  isSidebarExpanded?: boolean;
}

export default function ChatSidebar({
  conversations = [],
  activeId,
  onNewChat,
  setInput,
  onSelectChat,
  onDeleteChat,
  setIsExpanded,
  isSidebarExpanded,
}: ChatSidebarProps) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const router = useRouter();
  const { toggleSidebar } = useSidebar();

const supabase = supabaseBrowser();

  // --- Auth state ---
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (mounted) setUser(authUser ?? null);
      } catch (err) {
        console.error("Auth error:", err);
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initAuth();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const chatsWithMessages = useMemo(
    () =>
      conversations
        .filter((c) => Array.isArray(c.messages) && c.messages.length > 0)
        .sort((a, b) => {
          const dateA = new Date(a.updated_at || a.created_at).getTime();
          const dateB = new Date(b.updated_at || b.created_at).getTime();
          return dateB - dateA;
        }),
    [conversations]
  );

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push("/");
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  const handleNewChat = async () => {
    if (setInput) setInput("");
    if (onNewChat) return onNewChat();

    if (user) {
      setChatLoading(true);
      try {
        const { data, error } = await supabase
          .from("chats")
          .insert({
            user_id: user.id,
            title: "New Chat",
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && data) router.push(`/chat/${data.id}`);
      } catch (err) {
        console.error(err);
      } finally {
        setChatLoading(false);
      }
    } else router.push("/chat");
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeleteChat) return onDeleteChat(chatId);

    try {
      if (user) {
        await supabase.from("chats").delete().eq("id", chatId);
        if (activeId === chatId) router.push("/chat");
      } else if (activeId === chatId) router.push("/chat");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectChat = (chatId: string) => {
    if (onSelectChat) onSelectChat(chatId);
    else router.push(`/chat/${chatId}`);
  };

  useEffect(() => {
    if (!isSidebarExpanded && typeof setIsExpanded === "function") {
      const t = setTimeout(() => setIsExpanded(true), 300);
      return () => clearTimeout(t);
    }
  }, [isSidebarExpanded, setIsExpanded]);

  return (
    <Sidebar
      collapsible="offcanvas"
      className="overflow-x-hidden bg-sidebar backdrop-blur supports-[backdrop-filter]:bg-sidebar transition-all duration-200"
    >
      {/* Header */}
      <SidebarHeader className="sticky top-0 z-10 backdrop-blur mt-2">
        <div className="flex items-center gap-3 px-3">
          <div
            className="h-12 w-12 rounded-xl bg-cover bg-center shadow-sm"
            style={{ backgroundImage: 'url("/sentient.avif")' }}
          />
          <span className="text-lg font-semibold text-primary tracking-tight select-none">
            VisionAI
          </span>
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Main menu */}
        <div className="px-2 py-3 space-y-2">
          <SidebarMenu>
            {[
              { icon: SquarePen, label: "New Chat", onClick: handleNewChat },
              { icon: Search, label: "Search Chats" },
            ].map(({ icon: Icon, label, onClick }) => (
              <SidebarMenuItem key={label}>
                <SidebarMenuButton
                  onClick={() => {
                    onClick?.();
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                  className="rounded-xl hover:bg-accent/50 transition px-3 py-3 flex items-center gap-3 justify-start mb-2"
                >
                  <Icon className="h-8 w-8 shrink-0 text-muted-foreground" />
                  <span className="text-[16px] font-medium truncate">{label}</span>
                </SidebarMenuButton>
                <SidebarSeparator />
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </div>

        {/* Chat list */}
        <div className="p-2">
          <p className="px-3 py-1 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {user ? "Recent Chats" : "Current Session"}
          </p>

          {chatLoading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Loading chats...</div>
          )}

          <SidebarMenu>
            {chatsWithMessages.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                  onClick={() => {
                    handleSelectChat(chat.id);
                    if (window.innerWidth < 768) toggleSidebar();
                  }}
                  isActive={activeId === chat.id}
                  className={`group rounded-lg px-3 py-2.5 flex items-center justify-between transition 
                    ${activeId === chat.id ? "bg-[var(--muted)]" : "hover:bg-accent/50"}`}
                >
                  <span className="flex-1 truncate text-sm">{chat.title}</span>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded cursor-pointer"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-[var(--card)] border rounded-xl" align="end">
                      <DropdownMenuItem
                        onClick={(e) => deleteChat(chat.id, e)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-5 w-5 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            {chatsWithMessages.length === 0 && !chatLoading && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                {user ? "No chats yet" : "Start a new chat"}
              </div>
            )}
          </SidebarMenu>
        </div>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="sticky bottom-0 px-3 py-2 backdrop-blur">
        {!user && (
          <div className="w-full bg-background text-foreground rounded-xl border border-border p-4 space-y-3 shadow-sm">
            <div>
              <p className="text-base font-semibold">Login for good experience</p>
              <p className="text-sm text-muted-foreground mt-1 leading-snug">
                Sign up to gain access to higher limits for messages, save chats,
                multiple models, and more.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="w-full block bg-[var(--primary)] text-primary-foreground font-medium text-sm py-2 rounded-md transition hover:bg-primary/90 active:bg-primary/80 cursor-pointer text-center"
              prefetch
            >
              Sign in
            </Link>
          </div>
        )}

        {/* User Menu */}
        <SidebarMenu className="mt-2">
          <SidebarMenuItem>
            {user ? (
              <div className="flex items-center justify-between w-full rounded-lg px-3 py-3 bg-popover hover:bg-accent/50 transition">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={user.user_metadata?.avatar_url || "/default-avatar.png"}
                    alt="Avatar"
                    className="h-9 w-9 rounded-xl object-cover"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-foreground truncate">
                      {user.user_metadata?.full_name || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </span>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="p-2 rounded-md hover:bg-[var(--accent)] transition-colors focus:outline-none focus:ring-0 cursor-pointer"
                      title="More options"
                    >
                      <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    side="top"
                    align="end"
                    className="w-56 rounded-xl shadow-lg border bg-[var(--popover)]"
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
                      className="px-3 py-2 cursor-pointer hover:bg-[var(--destructive)]/10 hover:text-destructive rounded-lg m-1 text-destructive focus:outline-none focus:ring-0"
                    >
                      <LogOut className="mr-3 h-4 w-4" />
                      <span className="text-sm">Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full rounded-lg px-3 py-3 hover:bg-accent/50 transition">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                    <img
                      src="/guest-icon.png"
                      alt="Guest"
                      className="h-6 w-6 rounded-lg object-cover"
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    Guest Mode
                  </span>
                </div>
              </div>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
