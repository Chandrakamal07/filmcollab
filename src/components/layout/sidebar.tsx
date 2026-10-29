import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home,
  Briefcase,
  FolderOpen,
  UserCheck,
  Calendar,
  Search,
  MessageCircle,
  Heart,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Building2,
  MapPin,
  Megaphone,
  Film,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const navigationItems = [
  {
    section: "MAIN",
    items: [{ name: "Dashboard", icon: Home, href: "/dashboard" }],
  },
  {
    section: "CONTENT",
    items: [
      { name: "Talent Hub", icon: Search, href: "/discover" },
      { name: "Talent Directory", icon: UserCheck, href: "/directory" },
      { name: "Companies Directory", icon: Building2, href: "/studios" },
      { name: "Shooting Locations", icon: MapPin, href: "/locations" },
    ],
  },
  {
    section: "OPPORTUNITIES",
    items: [
      { name: "Casting Calls", icon: Megaphone, href: "/casting-calls" },
      { name: "Jobs", icon: Briefcase, href: "/jobs" },
      { name: "Industry Hub", icon: Calendar, href: "/industry-hub" },
      { name: "Projects", icon: FolderOpen, href: "/projects" },
    ],
  },
  {
    section: "NETWORKING",
    items: [
      { name: "Messages", icon: MessageCircle, href: "/messages" },
      { name: "Connections", icon: Heart, href: "/connections" },
    ],
  },
];

export function Sidebar({ className, isCollapsed = false, onToggle }: SidebarProps) {
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      sessionStorage.setItem("sidebarScrollPos", target.scrollTop.toString());
    };

    let viewport: Element | null = null;
    if (scrollRef.current) {
      setTimeout(() => {
        if (!scrollRef.current) return;
        viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
        if (viewport) {
          const savedScroll = sessionStorage.getItem("sidebarScrollPos");
          if (savedScroll) {
            viewport.scrollTop = parseInt(savedScroll, 10);
          }
          viewport.addEventListener("scroll", handleScroll);
        }
      }, 50);
    }

    return () => {
      if (viewport) {
        viewport.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const isActive = (href: string) => {
    return location.pathname === href || (href !== "/dashboard" && location.pathname.startsWith(`${href}/`));
  };

  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!profile?.id) {
        try {
          const saved = localStorage.getItem("chat_conversations");
          if (saved) {
            const conversations = JSON.parse(saved);
            const total = conversations.reduce(
              (acc: number, c: { unread?: number }) => acc + (c.unread || 0),
              0,
            );
            setUnreadCount(total);
          }
        } catch (e) {
          console.error(e);
        }
        return;
      }

      try {
        const { data: unreadMsgs, error } = await supabase
          .from("messages")
          .select("sender_id, created_at")
          .eq("receiver_id", profile.id)
          .eq("is_read", false);

        if (!error && unreadMsgs) {
          const readConvs = JSON.parse(localStorage.getItem("read_conversations") || "{}");
          const actualUnread = unreadMsgs.filter(
            (m) => new Date(m.created_at).getTime() > (readConvs[m.sender_id] || 0),
          ).length;
          setUnreadCount(actualUnread);
        }
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 4000);
    return () => clearInterval(interval);
  }, [profile?.id]);

  const isDarkActive =
    theme === "dark" ||
    (theme === "system" &&
      typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark"));

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200 ease-noir relative",
        isCollapsed && "w-16",
        className,
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border relative",
          isCollapsed ? "justify-center" : "justify-between px-5",
        )}
      >
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <div className="h-8 w-8 rounded-lg border border-primary/40 bg-primary/15 text-primary flex items-center justify-center flex-shrink-0 shadow-sm">
            <Film className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="font-display text-xl font-semibold tracking-tight text-foreground whitespace-nowrap">
              FilmCollab
            </span>
          )}
        </div>
        {onToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "h-8 w-8 p-0 text-muted-foreground hover:text-foreground flex-shrink-0",
              isCollapsed
                ? "absolute -right-3.5 top-4 bg-card border border-border rounded-full shadow-soft z-50 hover:bg-surface-hover"
                : "hover:bg-surface-hover",
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea ref={scrollRef} className="flex-1 px-3 py-5">
        <div className="space-y-7">
          {navigationItems.map((section) => (
            <div key={section.section}>
              {!isCollapsed && (
                <h3 className="mb-2.5 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
                  {section.section}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Button
                      key={item.name}
                      variant="ghost"
                      title={isCollapsed ? item.name : undefined}
                      className={cn(
                        "w-full justify-start h-10 px-3 rounded-lg text-sm font-medium transition-all duration-150 ease-noir relative group",
                        active
                          ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:text-primary-foreground"
                          : "text-sidebar-foreground/80 hover:bg-surface-hover hover:text-foreground",
                        isCollapsed && "justify-center px-2",
                      )}
                      onClick={() => handleNavigation(item.href)}
                    >
                      <div className="relative flex items-center">
                        <item.icon
                          className={cn(
                            "h-4 w-4 transition-transform duration-150",
                            !isCollapsed && "mr-3",
                            active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary",
                          )}
                        />
                        {isCollapsed && item.name === "Messages" && unreadCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center ring-2 ring-sidebar">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                      {!isCollapsed && item.name === "Messages" && unreadCount > 0 && (
                        <span
                          className={cn(
                            "ml-auto text-[11px] font-semibold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center",
                            active
                              ? "bg-primary-foreground text-primary"
                              : "bg-primary/20 text-primary border border-primary/35",
                          )}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Theme section */}
      <div className="border-t border-sidebar-border p-3.5">
        {!isCollapsed && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80 mb-2.5 px-2">
            Appearance
          </p>
        )}

        <div
          role="button"
          tabIndex={0}
          aria-label="Toggle color theme"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setTheme(isDarkActive ? "light" : "dark");
            }
          }}
          className={cn(
            "flex items-center rounded-full p-1 bg-surface-elevated border border-border/80 cursor-pointer relative transition-colors",
            isCollapsed ? "flex-col h-16 w-8 mx-auto" : "w-full h-9",
          )}
          onClick={() => setTheme(isDarkActive ? "light" : "dark")}
        >
          <div
            className={cn(
              "absolute bg-primary rounded-full shadow-sm transition-all duration-200 ease-noir",
              isCollapsed
                ? cn("w-6 h-[28px] left-[3px]", isDarkActive ? "top-[31px]" : "top-[3px]")
                : cn("h-7 w-[calc(50%-4px)] top-[3px]", isDarkActive ? "left-[calc(50%+1px)]" : "left-1"),
            )}
          />
          <div
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors",
              isCollapsed ? "h-1/2 w-full" : "w-1/2 h-full",
              !isDarkActive ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Sun className="h-3.5 w-3.5" />
            {!isCollapsed && <span>Light</span>}
          </div>
          <div
            className={cn(
              "relative z-10 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors",
              isCollapsed ? "h-1/2 w-full" : "w-1/2 h-full",
              isDarkActive ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            <Moon className="h-3.5 w-3.5" />
            {!isCollapsed && <span>Noir</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
