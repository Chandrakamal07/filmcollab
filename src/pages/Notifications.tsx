import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import {
  Bell,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  MessageSquare,
  Users,
  Briefcase,
  Calendar,
  AlertTriangle,
  Check,
  MoreVertical,
  Eye,
  EyeOff,
  Database,
  Sparkles
} from 'lucide-react';

const formatRelativeTime = (dateString: string) => {
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Just now';
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return 'Recently';
  }
};

const Notifications = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!profile?.id) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Notifications table query failed", error);
        } else {
          setNotifications(data || []);
        }
      } catch (err) {
        console.error("Failed to load notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let subscription: any;
    if (profile?.id) {
      subscription = supabase
        .channel('public:notifications')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();
    }

    return () => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    };
  }, [profile?.id]);

  const notificationTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'job', label: 'Jobs' },
    { value: 'connection', label: 'Connections' },
    { value: 'project', label: 'Projects' },
    { value: 'event', label: 'Events' },
    { value: 'profile', label: 'Profile' },
    { value: 'system', label: 'System' }
  ];

  const notificationStatuses = [
    { value: 'all', label: 'All Status' },
    { value: 'unread', label: 'Unread' },
    { value: 'read', label: 'Read' }
  ];

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      high: { color: 'bg-destructive/15 text-destructive border border-destructive/30', label: 'High' },
      medium: { color: 'bg-amber-500/15 text-amber-500 border border-amber-500/30', label: 'Medium' },
      low: { color: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30', label: 'Low' }
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = {
      job: Briefcase,
      connection: Users,
      project: MessageSquare,
      event: Calendar,
      profile: Eye,
      system: AlertTriangle
    };
    return typeConfig[type as keyof typeof typeConfig] || Bell;
  };

  const handleMarkAsRead = async (notificationId: string | number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, status: 'read' } : n));
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark notification as read.",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('user_id', profile.id)
        .eq('status', 'unread');

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
      toast({
        title: "All notifications marked as read",
        description: "All unread notifications have been marked as read.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to mark all notifications as read.",
      });
    }
  };

  const handleDeleteNotification = async (notificationId: string | number) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: "Notification deleted",
        description: "The notification has been deleted.",
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete notification.",
      });
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = (notification.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (notification.description || notification.message || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || notification.type === filterType;
    const matchesStatus = filterStatus === 'all' || notification.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const unreadCount = filteredNotifications.filter(n => n.status === 'unread').length;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <p className="noir-eyebrow mb-1">Activity Feed</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Notifications</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden sm:inline-flex text-xs font-mono border-border/80 bg-surface-elevated">
              <Bell className="w-3.5 h-3.5 mr-1.5 text-primary" />
              {notifications.length} Total
            </Badge>
            {unreadCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleMarkAllAsRead}
                className="border-primary/30 hover:border-primary hover:bg-primary/10 text-foreground"
              >
                <CheckCircle className="w-4 h-4 mr-1.5 text-primary" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="noir-card border-border/80 bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-surface-elevated border-border/80"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40 bg-surface-elevated border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-40 bg-surface-elevated border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationStatuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-10 border-primary/30 hover:border-primary hover:bg-primary/10">
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const IconComponent = getTypeIcon(notification.type);
            return (
              <Card 
                key={notification.id} 
                className={`noir-card-interactive border-border/80 bg-card sm:cursor-default cursor-pointer ${
                  notification.status === 'unread' ? 'border-l-4 border-l-primary bg-primary/[0.04]' : ''
                }`}
                onClick={() => {
                  if (window.innerWidth < 640) {
                    if (notification.action_url) {
                      navigate(notification.action_url);
                    } else {
                      if (notification.type === 'job') navigate('/jobs');
                      else if (notification.type === 'connection') navigate('/connections');
                      else if (notification.type === 'project') navigate('/projects');
                    }
                  }
                }}
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border ${
                      notification.status === 'unread' 
                        ? 'bg-primary/15 border-primary/30 text-primary' 
                        : 'bg-surface-elevated border-border/80 text-muted-foreground'
                    }`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <h3 className={`font-semibold text-base sm:text-lg ${
                            notification.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className="text-muted-foreground text-sm mb-2.5 line-clamp-2">
                            {notification.description || notification.message}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {notification.created_at ? formatRelativeTime(notification.created_at) : (notification.time || "Recently")}
                            </div>
                            {getPriorityBadge(notification.priority)}
                            {notification.status === 'unread' && (
                              <Badge className="text-xs bg-primary/15 text-primary border border-primary/30">
                                Unread
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 sm:ml-4">
                          {notification.status === 'unread' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-primary/30 hover:border-primary hover:bg-primary/10 text-foreground"
                            onClick={() => {
                              if (notification.action_url) {
                                navigate(notification.action_url);
                              } else {
                                if (notification.type === 'job') navigate('/jobs');
                                else if (notification.type === 'connection') navigate('/connections');
                                else if (notification.type === 'project') navigate('/projects');
                              }
                            }}
                          >
                            {notification.action || (notification.type === 'connection' ? 'View Requests' : 'View Detail')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredNotifications.length === 0 && (
          <Card className="noir-card border-border/80 bg-card">
            <CardContent className="p-8 text-center">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No notifications found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterType !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'You\'re all caught up! No new notifications.'
                }
              </p>
              {(searchQuery || filterType !== 'all' || filterStatus !== 'all') && (
                <Button 
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setFilterStatus('all');
                  }}
                  className="border-primary/30 hover:border-primary hover:bg-primary/10"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Notifications;
