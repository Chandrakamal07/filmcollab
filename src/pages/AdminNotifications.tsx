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
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function AdminNotifications() {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Mock notifications data
  const notifications = [
    {
      id: 1,
      type: "user",
      title: "New user registration",
      message: "5 new users registered today",
      time: "10 minutes ago",
      isUnread: true,
      icon: Users,
      color: "text-primary"
    },
    {
      id: 2,
      type: "content",
      title: "Content flagged",
      message: "A post has been reported by users",
      time: "30 minutes ago",
      isUnread: true,
      icon: AlertTriangle,
      color: "text-amber-400"
    },
    {
      id: 3,
      type: "system",
      title: "System backup completed",
      message: "Daily backup finished successfully",
      time: "2 hours ago",
      isUnread: false,
      icon: CheckCircle2,
      color: "text-emerald-400"
    }
  ];

  // Filter notifications based on search and type
  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = 
      notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || notification.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <AdminLayout pageTitle="Notifications">
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
            onClick={() => console.log("Mark all as read")}
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
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
