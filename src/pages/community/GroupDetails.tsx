"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowLeft,
  Users,
  MessageSquare,
  Settings,
  Share2,
  Send,
  MoreHorizontal,
  Calendar,
  MapPin,
  Tag,
  UserPlus,
  UserX,
  Crown,
  Shield,
  Bell,
  BellOff,
  Edit,
  Trash2,
  Image,
  FileText,
  Link,
  Smile,
  Paperclip,
  X,
  Save,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Globe,
  UserCheck,
  AlertTriangle,
  Info
} from "lucide-react";

interface GroupMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  joinedDate: string;
  isAdmin: boolean;
  isModerator: boolean;
  online: boolean;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: string;
  type: 'text' | 'image' | 'file';
  isAdmin?: boolean;
  isModerator?: boolean;
}

export default function GroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [groupSettings, setGroupSettings] = useState({
    name: "",
    description: "",
    privacy: "public",
    allowMemberInvites: true,
    allowMemberPosts: true,
    requireApproval: false,
    notifications: true,
    autoDeleteMessages: false,
    messageRetentionDays: 30
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const isUuid = (id: string | null | undefined): boolean => {
    if (!id) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  useEffect(() => {
    if (!groupId) {
      setLoadingGroup(false);
      return;
    }

    if (!isUuid(groupId)) {
      setLoadingGroup(false);
      return;
    }

    const fetchGroupAndMembers = async () => {
      setLoadingGroup(true);
      try {
        const { data: gData, error: gErr } = await supabase
          .from("community_groups")
          .select("*")
          .eq("id", groupId)
          .single();

        if (gErr) throw gErr;
        if (gData) {
          const settings = (gData.settings || {}) as Record<string, any>;
          setGroup({
            id: gData.id,
            name: gData.name,
            description: gData.description || "",
            members: 1,
            posts: 0,
            category: gData.category || "Filmmaking",
            tags: Array.isArray(gData.tags) ? gData.tags : [],
            createdBy: gData.created_by,
            createdDate: gData.created_at ? new Date(gData.created_at).toLocaleDateString() : "Recent",
            status: "Active",
            rules: [
              "Be respectful to all members",
              "Keep discussions relevant to film production",
              "Share resources and knowledge generously",
              "No spam or self-promotion without permission"
            ],
            recentActivity: []
          });

          setGroupSettings({
            name: gData.name || "",
            description: gData.description || "",
            privacy: gData.privacy || "public",
            allowMemberInvites: settings.allowMemberInvites ?? true,
            allowMemberPosts: settings.allowMemberPosts ?? true,
            requireApproval: settings.requireApproval ?? false,
            notifications: settings.notifications ?? true,
            autoDeleteMessages: settings.autoDeleteMessages ?? false,
            messageRetentionDays: settings.messageRetentionDays ?? 30
          });
        }

        // Fetch real members
        const { data: mRows, error: mErr } = await supabase
          .from("community_group_members")
          .select("id, role, joined_at, user_id")
          .eq("group_id", groupId);

        if (!mErr && mRows && mRows.length > 0) {
          const uids = mRows.map((m: any) => m.user_id);
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, user_id, full_name, avatar_url")
            .in("user_id", uids);

          const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
          const formatted: GroupMember[] = mRows.map((m: any) => {
            const p = profMap.get(m.user_id);
            const name = m.user_id === user?.id ? "You" : (p?.full_name || "Community Member");
            return {
              id: m.id,
              name,
              role: m.role || "Member",
              avatar: name.slice(0, 2).toUpperCase(),
              joinedDate: m.joined_at ? new Date(m.joined_at).toISOString().slice(0, 10) : "",
              isAdmin: m.role === "Owner" || m.role === "Admin",
              isModerator: m.role === "Moderator",
              online: m.user_id === user?.id,
            };
          });
          setMembers(formatted);
          setGroup((prev: any) => prev ? { ...prev, members: formatted.length } : prev);
        }
      } catch (err: unknown) {
        console.error("Failed to load group details:", err);
      } finally {
        setLoadingGroup(false);
      }
    };

    fetchGroupAndMembers();
  }, [groupId, user?.id]);

  useEffect(() => {
    if (!groupId) return;
    let interval: NodeJS.Timeout | null = null;
    if (isUuid(groupId)) {
      const fetchGroupMessages = async () => {
        try {
          const { data, error } = await supabase
            .from("community_group_messages")
            .select("id, user_id, message, type, created_at")
            .eq("group_id", groupId)
            .order("created_at", { ascending: true });

          if (!error && data && data.length > 0) {
            setChatMessages(data.map((m: any) => ({
              id: m.id,
              userId: m.user_id,
              userName: m.user_id === user?.id ? (profile?.full_name || "You") : "Member",
              userAvatar: (m.user_id === user?.id ? (profile?.full_name || "Y") : "M").slice(0, 2).toUpperCase(),
              message: m.message,
              timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              type: m.type || 'text',
              isAdmin: false
            })));
          } else {
            setChatMessages([]);
          }
        } catch (err) {
          console.warn("Could not load real group messages:", err);
        }
      };
      fetchGroupMessages();
      interval = setInterval(fetchGroupMessages, 4000);
    } else {
      setChatMessages([]);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [groupId, user?.id, profile?.full_name]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const msg = newMessage.trim();
    setNewMessage("");
    try {
      if (user && isUuid(groupId)) {
        const { data, error } = await supabase
          .from("community_group_messages")
          .insert({
            group_id: groupId,
            user_id: user.id,
            message: msg,
            type: 'text'
          })
          .select("id, created_at")
          .single();

        if (error) throw error;

        setChatMessages((prev) => [
          ...prev,
          {
            id: data?.id || `msg-${Date.now()}`,
            userId: user.id,
            userName: profile?.full_name || "You",
            userAvatar: (profile?.full_name || "Y").slice(0, 2).toUpperCase(),
            message: msg,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            isAdmin: true
          }
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            userId: user?.id || "me",
            userName: profile?.full_name || "You",
            userAvatar: (profile?.full_name || "Y").slice(0, 2).toUpperCase(),
            message: msg,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'text',
            isAdmin: true
          }
        ]);
      }
    } catch (err: any) {
      console.error("Failed to send group message:", err);
      setNewMessage(msg); // Preserve draft on failure
      toast({
        variant: "destructive",
        title: "Message failed",
        description: err?.message || "Could not deliver message to the group."
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (loadingGroup) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm">Loading group collective...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!group) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Group Not Found</h1>
            <p className="text-muted-foreground mb-6">The requested collective or guild could not be found.</p>
            <Button onClick={() => navigate("/community")}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Community
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="bg-card border-b border-border/80 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="hover:bg-surface-elevated" onClick={() => navigate('/community')}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">{group.name}</h1>
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  <span>{group.members} members</span>
                  <span>•</span>
                  <span className="text-primary">{group.status}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-border/80 bg-surface-elevated hover:bg-surface-hover"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast({
                    title: "Link copied",
                    description: "Group link copied to clipboard."
                  });
                }}
              >
                <Share2 className="w-4 h-4 mr-1.5" />
                Share
              </Button>
              <Button variant="outline" size="sm" className="border-border/80 bg-surface-elevated hover:bg-surface-hover" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="w-4 h-4 mr-1.5" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-primary/20 border border-primary/30 text-primary rounded-full flex items-center justify-center font-mono font-semibold text-xs flex-shrink-0">
                    {message.userAvatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-foreground">{message.userName}</span>
                      {message.isAdmin && <Crown className="w-3.5 h-3.5 text-primary" />}
                      {message.isModerator && <Shield className="w-3.5 h-3.5 text-primary/80" />}
                      <span className="text-xs font-mono text-muted-foreground">{message.timestamp}</span>
                    </div>
                    <div className="bg-card rounded-xl p-3 shadow-noir border border-border/80">
                      <p className="text-sm text-foreground/90">{message.message}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-card border-t border-border/80 p-4">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    className="pr-20 bg-surface-elevated border-border/80"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                      <Paperclip className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                      <Smile className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 bg-card border-l border-border/80 overflow-y-auto hidden lg:block">
            <div className="p-4 space-y-6">
              {/* Group Info */}
              <div>
                <h3 className="font-display font-semibold text-foreground mb-3">Group Information</h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Description</p>
                    <p className="text-sm text-foreground/90">{group.description}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Category</p>
                    <Badge variant="secondary" className="bg-surface-elevated text-foreground border border-border/80">
                      {group.category}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Created</p>
                    <p className="text-sm font-mono text-foreground">{group.createdDate}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Tags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/25 font-mono">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Members */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display font-semibold text-foreground">Members (<span className="font-mono">{members.length}</span>)</h3>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs border-border/80 bg-surface-elevated hover:bg-surface-hover"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/community/joined/${groupId}`);
                      toast({
                        title: "Invite link copied",
                        description: "Share this link with collaborators to invite them."
                      });
                    }}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Invite
                  </Button>
                </div>
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-elevated transition-colors">
                      <div className="relative">
                        <div className="w-8 h-8 bg-primary/20 border border-primary/30 text-primary rounded-full flex items-center justify-center font-mono font-semibold text-xs">
                          {member.avatar}
                        </div>
                        {member.online && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-card"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                          {member.isAdmin && <Crown className="w-3 h-3 text-primary" />}
                          {member.isModerator && <Shield className="w-3 h-3 text-primary/80" />}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground">
                        <MoreHorizontal className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group Rules */}
              <div>
                <h3 className="font-display font-semibold text-foreground mb-3">Group Rules</h3>
                <div className="space-y-2">
                  {group.rules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      <p className="text-sm text-muted-foreground">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="font-display font-semibold text-foreground mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {group.recentActivity.map((activity, index) => (
                    <div key={index} className="text-sm p-2 rounded-lg bg-surface-elevated border border-border/60">
                      <p className="text-foreground text-xs font-medium">{activity.action}</p>
                      <p className="text-muted-foreground font-mono text-[11px]">{activity.user} • {activity.time}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Popup */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border/80 shadow-noir rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6 border-b border-border/60 pb-3">
                  <h2 className="font-display text-xl font-bold text-foreground">Group Settings</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      Basic Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Group Name</label>
                        <Input
                          value={groupSettings.name}
                          onChange={(e) => setGroupSettings(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full bg-surface-elevated border-border/80"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Description</label>
                        <textarea
                          value={groupSettings.description}
                          onChange={(e) => setGroupSettings(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 bg-surface-elevated border border-border/80 rounded-lg text-foreground text-sm"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Privacy Settings */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Privacy Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Group Visibility</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="privacy"
                              value="private"
                              checked={groupSettings.privacy === "private"}
                              onChange={(e) => setGroupSettings(prev => ({ ...prev, privacy: e.target.value }))}
                              className="text-primary"
                            />
                            <Lock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">Private</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="privacy"
                              value="public"
                              checked={groupSettings.privacy === "public"}
                              onChange={(e) => setGroupSettings(prev => ({ ...prev, privacy: e.target.value }))}
                              className="text-primary"
                            />
                            <Globe className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-foreground">Public</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Member Permissions */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      Member Permissions
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Allow members to invite others</p>
                          <p className="text-xs text-muted-foreground">Members can invite new people to join the group</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={groupSettings.allowMemberInvites}
                            onChange={(e) => setGroupSettings(prev => ({ ...prev, allowMemberInvites: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-elevated border border-border/80 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Allow members to post messages</p>
                          <p className="text-xs text-muted-foreground">Members can send messages in the group chat</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={groupSettings.allowMemberPosts}
                            onChange={(e) => setGroupSettings(prev => ({ ...prev, allowMemberPosts: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-elevated border border-border/80 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Require approval for new members</p>
                          <p className="text-xs text-muted-foreground">New member requests need admin approval</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={groupSettings.requireApproval}
                            onChange={(e) => setGroupSettings(prev => ({ ...prev, requireApproval: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-elevated border border-border/80 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      Notification Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Enable notifications</p>
                          <p className="text-xs text-muted-foreground">Receive notifications for group activities</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={groupSettings.notifications}
                            onChange={(e) => setGroupSettings(prev => ({ ...prev, notifications: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-elevated border border-border/80 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Message Settings */}
                  <div>
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-primary" />
                      Message Settings
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Auto-delete old messages</p>
                          <p className="text-xs text-muted-foreground">Automatically delete messages older than specified days</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={groupSettings.autoDeleteMessages}
                            onChange={(e) => setGroupSettings(prev => ({ ...prev, autoDeleteMessages: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-surface-elevated border border-border/80 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-foreground after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                      </div>
                      {groupSettings.autoDeleteMessages && (
                        <div>
                          <label className="text-sm font-medium text-foreground mb-2 block">Message retention (days)</label>
                          <Input
                            type="number"
                            value={groupSettings.messageRetentionDays}
                            onChange={(e) => setGroupSettings(prev => ({ ...prev, messageRetentionDays: parseInt(e.target.value) || 30 }))}
                            className="w-32 bg-surface-elevated border-border/80 font-mono"
                            min="1"
                            max="365"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="border-t border-border/60 pt-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2 text-destructive">
                      <AlertTriangle className="w-4 h-4" />
                      Danger Zone
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-destructive/10 rounded-xl border border-destructive/30">
                        <div>
                          <p className="text-sm font-medium text-destructive">Delete Group</p>
                          <p className="text-xs text-muted-foreground">Permanently delete this group and all its data</p>
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          disabled={savingSettings}
                          onClick={async () => {
                            if (!window.confirm("Are you sure you want to delete this community group? This action cannot be undone.")) return;
                            if (!isUuid(groupId)) {
                              toast({ variant: "destructive", title: "Error", description: "Invalid group ID." });
                              return;
                            }
                            setSavingSettings(true);
                            try {
                              const { data, error } = await supabase
                                .from("community_groups")
                                .delete()
                                .eq("id", groupId)
                                .select("id");
                              if (error) throw error;
                              if (!data || data.length === 0) {
                                throw new Error("Could not delete group. You might not have owner permissions.");
                              }
                              toast({
                                title: "Group Deleted",
                                description: "The community group has been permanently removed."
                              });
                              navigate("/community");
                            } catch (err: any) {
                              toast({
                                variant: "destructive",
                                title: "Delete Failed",
                                description: err.message || "Could not delete group."
                              });
                            } finally {
                              setSavingSettings(false);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-border/60">
                    <Button 
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover"
                      disabled={savingSettings || !group}
                      onClick={async () => {
                        if (!user || !isUuid(groupId) || !group) return;
                        setSavingSettings(true);
                        try {
                          const { data: updatedGroup, error } = await supabase
                            .from("community_groups")
                            .update({
                              name: groupSettings.name.trim(),
                              description: groupSettings.description.trim(),
                              privacy: groupSettings.privacy,
                              settings: {
                                allowMemberInvites: groupSettings.allowMemberInvites,
                                allowMemberPosts: groupSettings.allowMemberPosts,
                                requireApproval: groupSettings.requireApproval,
                                notifications: groupSettings.notifications,
                                autoDeleteMessages: groupSettings.autoDeleteMessages,
                                messageRetentionDays: groupSettings.messageRetentionDays
                              }
                            })
                            .eq("id", groupId)
                            .select()
                            .single();

                          if (error) throw error;
                          if (updatedGroup) {
                            setGroup((prev: any) => ({
                              ...prev,
                              name: updatedGroup.name,
                              description: updatedGroup.description,
                              privacy: updatedGroup.privacy,
                            }));
                          }
                          toast({
                            title: "Settings saved",
                            description: "Group preferences updated successfully."
                          });
                          setShowSettings(false);
                        } catch (err: unknown) {
                          const msg = err instanceof Error ? err.message : "Could not persist group settings.";
                          console.error("Failed to save settings:", err);
                          toast({
                            variant: "destructive",
                            title: "Save failed",
                            description: msg
                          });
                        } finally {
                          setSavingSettings(false);
                        }
                      }}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {savingSettings ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" className="border-border/80 bg-surface-elevated" onClick={() => setShowSettings(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
