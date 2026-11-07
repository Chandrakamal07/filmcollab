import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Bell,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AdminNotifications() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load real notifications from Supabase
  useEffect(() => {
    const fetchNotifications = async () => {
      const profileId = profile?.id;
      if (!profileId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", profileId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Could not fetch notifications:", error);
          toast({
            variant: "destructive",
            title: "Failed to load notifications",
            description: error.message,
          });
        } else if (data) {
          const mapped = data.map((n: any) => ({
            id: n.id,
            type: n.type || "system",
            title: n.title || "Notification",
            message: n.description || n.message || "",
            time: n.created_at
              ? new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
            isUnread: n.status === "unread",
            icon:
              n.type === "user" || n.type === "connection"
                ? Users
                : n.type === "content"
                ? AlertTriangle
                : CheckCircle2,
            color:
              n.type === "user" || n.type === "connection"
                ? "text-primary"
                : n.type === "content"
                ? "text-amber-400"
                : "text-emerald-400",
          }));
          setNotifications(mapped);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unexpected error fetching notifications.";
        console.warn("Could not fetch real notifications:", msg);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [profile?.id, toast]);

  const handleMarkAllRead = async () => {
    try {
      const profileId = profile?.id;
      if (profileId) {
        const { error } = await supabase
          .from("notifications")
          .update({ status: "read" })
          .eq("user_id", profileId)
          .eq("status", "unread");

        if (error) throw error;
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
      toast({
        title: "All marked as read",
        description: "Notifications have been marked as read.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not mark notifications as read.";
      toast({
        variant: "destructive",
        title: "Action failed",
        description: msg,
      });
    }
  };

  // Filter notifications based on search and type
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch =
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || notification.type === typeFilter;

    return matchesSearch && matchesType;
  });

  return (
    <AdminLayout pageTitle="Notifications" pageName="Notifications">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <span className="noir-eyebrow">System Feed</span>
            <h1 className="font-display text-3xl font-bold text-foreground mt-0.5">Notifications</h1>
            <p className="text-muted-foreground mt-1">View and manage your notifications</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-primary border-primary/30 bg-surface-elevated hover:bg-primary/10"
            onClick={handleMarkAllRead}
          >
            Mark all read
          </Button>
        </div>

        {/* Main Content Card */}
        <Card className="noir-card border-border/80 bg-card">
          <CardHeader className="border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="font-display text-2xl flex items-center gap-2.5 text-foreground">
                <Bell className="h-5 w-5 text-primary" />
                All Notifications
              </CardTitle>
              <div className="flex items-center gap-3">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px] bg-surface-elevated border-border/80">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/80">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-[220px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-surface-elevated border-border/80"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-3 animate-pulse opacity-40 text-primary" />
                <p className="text-sm">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Bell className="h-10 w-10 mx-auto mb-3 opacity-30 text-muted-foreground" />
                <p className="text-base font-medium text-foreground">No notifications found</p>
                <p className="text-sm mt-1">
                  {searchTerm || typeFilter !== "all"
                    ? "Try adjusting your search query or filter."
                    : "You are all caught up! No recent system notifications."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNotifications.map((notification) => {
                  const NotificationIcon = notification.icon;
                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-4 p-4 rounded-xl border transition-colors",
                        notification.isUnread
                          ? "bg-primary/[0.05] border-primary/30 border-l-4 border-l-primary"
                          : "bg-surface-elevated/60 border-border/70",
                        "hover:border-primary/40"
                      )}
                    >
                      <div className={cn(
                        "p-2.5 rounded-lg border",
                        notification.isUnread
                          ? "bg-primary/15 border-primary/30"
                          : "bg-surface-elevated border-border/60"
                      )}>
                        <NotificationIcon className={cn(
                          "h-5 w-5",
                          notification.isUnread ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                              {notification.title}
                              {notification.isUnread && (
                                <span className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground whitespace-nowrap flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {notification.time}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
