import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface AdminTopbarProps {
  pageTitle?: string;
  onMenuToggle?: () => void;
  isMobileMenuOpen?: boolean;
}

export function AdminTopbar({
  pageTitle = "Admin Dashboard",
  onMenuToggle,
  isMobileMenuOpen = false,
}: AdminTopbarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSignOut = () => {
    localStorage.removeItem("admin-session");
    signOut();
    navigate("/", { replace: true });
  };

  const mockAdminNotifications = [
    {
      id: 1,
      title: "New user registration",
      description: "5 new users registered today",
      time: "10 minutes ago",
      unread: true,
      type: "info",
    },
    {
      id: 2,
      title: "Content flagged",
      description: "A post has been reported by users",
      time: "30 minutes ago",
      unread: true,
      type: "warning",
    },
    {
      id: 3,
      title: "System backup completed",
      description: "Daily backup finished successfully",
      time: "2 hours ago",
      unread: false,
      type: "success",
    },
  ];

  const unreadCount = mockAdminNotifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-40 bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/75 border-b border-border/80">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Toggle admin menu"
            className="md:hidden text-muted-foreground hover:text-foreground"
            onClick={onMenuToggle}
          >
            {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          <h1 className="text-lg font-semibold tracking-tight text-foreground hidden sm:block">
            {pageTitle}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative hidden lg:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search users, reports..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 w-64 h-9"
            />
          </div>

          {/* Admin Notifications */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" aria-label="Admin notifications" className="relative h-9 w-9 p-0">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 text-[10px] font-bold flex items-center justify-center bg-primary text-primary-foreground border-0">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Admin Notifications</h3>
                  <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                    Mark all read
                  </Button>
                </div>
                <div className="space-y-2.5">
                  {mockAdminNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        notification.unread
                          ? "bg-primary/10 border-primary/30 hover:bg-primary/15"
                          : "bg-surface-base/70 border-border/60 hover:bg-surface-hover"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.description}</p>
                          <p className="text-[11px] text-muted-foreground/80">{notification.time}</p>
                        </div>
                        {notification.unread && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  size="sm"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate("/admin-dashboard/notifications");
                  }}
                >
                  View all notifications
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Admin Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2.5 h-auto py-1.5 px-2.5 hover:bg-surface-hover">
                <Avatar className="h-8 w-8 border border-border/80">
                  <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || "Admin"} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold text-xs">
                    {profile?.first_name?.[0] || profile?.full_name?.[0] || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start text-left">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    {profile?.full_name || "Admin User"}
                  </span>
                  <span className="text-xs text-muted-foreground leading-tight">
                    admin@filmcollab.com
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">
                    {profile?.full_name || "Admin"}
                  </p>
                  <p className="text-xs leading-none text-primary font-semibold uppercase tracking-wider">
                    {profile?.role || "ADMIN"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin-dashboard/profile")}>
                <User className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Admin Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/admin-dashboard/settings")}>
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>System Settings</span>
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
