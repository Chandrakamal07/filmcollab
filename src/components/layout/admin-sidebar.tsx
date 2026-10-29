import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  BarChart3,
  Users,
  FileText,
  FolderOpen,
  Briefcase,
  Image,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Monitor,
  UserCog,
  TicketCheck,
  UsersRound,
  MapPin,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

interface AdminSidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const adminNavigationItems = [
  { name: "Overview", icon: BarChart3, href: "/admin-dashboard" },
  { name: "Analytics", icon: BarChart3, href: "/admin-dashboard/analytics" },
  { name: "Users", icon: Users, href: "/admin-dashboard/users" },
  { name: "Projects", icon: FolderOpen, href: "/admin-dashboard/projects" },
  { name: "Jobs", icon: Briefcase, href: "/admin-dashboard/jobs" },
  { name: "Team Members", icon: UserCog, href: "/admin-dashboard/team" },
  { name: "Tickets", icon: TicketCheck, href: "/admin-dashboard/tickets" },
  { name: "Posts", icon: FileText, href: "/admin-dashboard/posts" },
  { name: "Communities", icon: UsersRound, href: "/admin-dashboard/communities" },
  { name: "Directory", icon: Image, href: "/admin-dashboard/directory" },
  { name: "Locations", icon: MapPin, href: "/admin-dashboard/locations" },
  { name: "Settings", icon: Settings, href: "/admin-dashboard/settings" },
];

export function AdminSidebar({ className, isCollapsed = false, onToggle }: AdminSidebarProps) {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission } = useAuth();

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  const isActive = (href: string) => {
    if (href === "/admin-dashboard") {
      return location.pathname === "/admin-dashboard";
    }
    return location.pathname === href || location.pathname.startsWith(`${href}/`);
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border relative",
        isCollapsed ? "w-16" : "w-64",
        "transition-[width] duration-200 ease-noir",
        className,
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4 relative">
        <div
          className="flex items-center gap-2.5 pr-8 cursor-pointer"
          onClick={() => navigate("/admin-dashboard")}
        >
          <div className="h-8 w-8 rounded-lg border border-primary/40 bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <span className="font-display text-lg font-semibold tracking-tight text-foreground whitespace-nowrap">
              Admin Portal
            </span>
          )}
        </div>
        {onToggle && (
          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-50">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              aria-label={isCollapsed ? "Expand admin sidebar" : "Collapse admin sidebar"}
              className={cn(
                "h-7 w-7 rounded-full bg-card border border-border shadow-soft p-0",
                "hover:bg-surface-hover hover:border-primary/40 hover:text-primary",
                "transition-all duration-150 text-muted-foreground",
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronLeft className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {adminNavigationItems
            .filter((item) => {
              if (item.name === "Overview") return true;
              return hasPermission(item.name);
            })
            .map((item) => {
              const active = isActive(item.href);
              return (
                <Button
                  key={item.name}
                  variant="ghost"
                  title={isCollapsed ? item.name : undefined}
                  className={cn(
                    "w-full justify-start h-10 px-3 rounded-lg text-sm font-medium transition-all duration-150 ease-noir group",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:text-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-surface-hover hover:text-foreground",
                    isCollapsed && "justify-center px-2",
                  )}
                  onClick={() => handleNavigation(item.href)}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4 flex-shrink-0",
                      !isCollapsed && "mr-3",
                      active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary",
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Button>
              );
            })}
        </div>
      </ScrollArea>

      {/* Theme Settings */}
      <div className="border-t border-sidebar-border p-3.5">
        <div className="space-y-2">
          {!isCollapsed && (
            <p className="text-[11px] font-semibold text-muted-foreground/80 uppercase tracking-[0.14em] mb-2">
              Theme
            </p>
          )}
          <div className={cn("flex items-center gap-1.5", isCollapsed && "flex-col")}>
            <Button
              variant="ghost"
              size="sm"
              aria-label="Light theme"
              className={cn(
                "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-surface-hover",
                theme === "light" && "bg-primary/15 text-primary border border-primary/35",
              )}
              onClick={() => setTheme("light")}
            >
              <Sun className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              aria-label="Studio Noir theme"
              className={cn(
                "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-surface-hover",
                theme === "dark" && "bg-primary/15 text-primary border border-primary/35",
              )}
              onClick={() => setTheme("dark")}
            >
              <Moon className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              aria-label="System theme"
              className={cn(
                "h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-surface-hover",
                theme === "system" && "bg-primary/15 text-primary border border-primary/35",
              )}
              onClick={() => setTheme("system")}
            >
              <Monitor className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
