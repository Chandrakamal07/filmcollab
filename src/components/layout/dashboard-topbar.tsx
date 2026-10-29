import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Film,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CreditCard,
  HelpCircle,
  Search,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardTopbarProps {
  pageTitle?: string;
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function DashboardTopbar({
  pageTitle = "Dashboard",
  onMenuToggle,
  isMobileMenuOpen = false,
}: DashboardTopbarProps) {
  const { profile, signOut, user } = useAuth();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isUsingMock, setIsUsingMock] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!profile?.id) {
        setNotifications([
          {
            id: "mock-1",
            title: "12 new project applications",
            description: "Cinematographer & Editor roles on active slate",
            time: "2h ago",
            unread: true,
          },
          {
            id: "mock-2",
            title: "New message from Arjun Mehta",
            description: "I'd love to discuss the role further...",
            time: "4h ago",
            unread: true,
          },
          {
            id: "mock-3",
            title: "Task due tomorrow",
            description: "Finalize shooting script & location lock",
            time: "1d ago",
            unread: false,
          },
        ]);
        setIsUsingMock(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) {
          setIsUsingMock(true);
          setNotifications([
            {
              id: "mock-1",
              title: "12 new project applications",
              description: "Cinematographer & Editor roles on active slate",
              time: "2h ago",
              unread: true,
            },
            {
              id: "mock-2",
              title: "New message received",
              description: "Collaboration inquiry in your inbox",
              time: "4h ago",
              unread: true,
            },
          ]);
        } else {
          setIsUsingMock(false);
          const formatted = (data || []).map((n) => {
            const now = new Date();
            const date = new Date(n.created_at);
            const diffMins = Math.floor((now.getTime() - date.getTime()) / 60000);
            let timeStr = "Recently";
            if (diffMins < 1) timeStr = "Just now";
            else if (diffMins < 60) timeStr = `${diffMins}m ago`;
            else if (diffMins < 1440) timeStr = `${Math.floor(diffMins / 60)}h ago`;
            else timeStr = `${Math.floor(diffMins / 1440)}d ago`;

            return {
              id: n.id,
              title: n.title,
              description: n.description,
              time: timeStr,
              unread: n.status === "unread",
            };
          });
          setNotifications(formatted);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotifications();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let subscription: any;
    if (profile?.id) {
      subscription = supabase
        .channel("topbar:notifications")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${profile.id}`,
          },
          () => {
            fetchNotifications();
          },
        )
        .subscribe();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [profile?.id]);

  const handleMarkAllTopbarRead = async () => {
    if (isUsingMock) {
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      return;
    }
    if (!profile?.id) return;
    try {
      await supabase
        .from("notifications")
        .update({ status: "read" })
        .eq("user_id", profile.id)
        .eq("status", "unread");
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/discover");
  };

  return (
    <header className="sticky top-0 z-40 bg-[#111215]/90 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#111215]/80 border-b border-white/[0.07]">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6 relative">
        <div className="flex items-center gap-3 md:gap-5 flex-1 max-w-xl">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Toggle menu"
            className="md:hidden text-muted-foreground hover:text-foreground hover:bg-surface-hover p-2"
            onClick={onMenuToggle}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo (Mobile Only) */}
          <div
            className="flex md:hidden items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="h-8 w-8 rounded-lg border border-primary/40 bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
              <Film className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-semibold text-foreground">FilmCollab</span>
          </div>

          {/* Global Studio Search Bar (Matches 02 / Dashboard & 04 / Project Workspace topbar) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder={`Search people, projects, skills... (${pageTitle})`}
              className="w-full h-9 pl-10 pr-4 rounded-xl bg-surface-elevated/90 border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/75 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </form>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Notifications"
                className="relative h-9 w-9 rounded-xl p-0 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px] font-mono font-bold flex items-center justify-center bg-primary text-primary-foreground border-0">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 bg-popover border border-border/80 p-4 shadow-noir-lg" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllTopbarRead}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-primary hover:bg-surface-hover"
                  >
                    Mark all read
                  </Button>
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => {
                        setNotificationsOpen(false);
                        navigate("/notifications");
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors duration-150 ${
                        notification.unread
                          ? "bg-primary/10 border-primary/30 hover:bg-primary/15"
                          : "bg-surface-base/70 border-border/60 hover:bg-surface-hover"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {notification.description}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground/80">
                            {notification.time}
                          </p>
                        </div>
                        {notification.unread && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No notifications yet
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate("/notifications");
                  }}
                  className="w-full"
                >
                  View all notifications
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* User Profile Menu (Matches 02 / Dashboard top-right user pill) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2.5 h-10 py-1.5 px-2.5 rounded-xl border border-transparent hover:border-white/[0.08] hover:bg-white/[0.04]"
              >
                <Avatar className="h-7 w-7 border border-primary/35">
                  <AvatarImage
                    src={profile?.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"}
                    alt={profile?.full_name || "User"}
                  />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                    {(profile?.full_name || "P")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block text-sm font-medium text-foreground">
                  {profile?.full_name || user?.email?.split("@")[0] || "Filmmaker"}
                </span>
                <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {profile?.full_name || "Filmmaker"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || ""}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/settings")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/billing")}
                className="cursor-pointer"
              >
                <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Billing</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/support")}
                className="cursor-pointer"
              >
                <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
