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
  Info,
  LogOut
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

export default function JoinedGroupDetails() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mock group data - in real app, this would be fetched based on groupId
  const group = {
    id: groupId,
    name: "Independent Filmmakers Network",
    description: "A community for independent filmmakers to share resources, collaborate, and support each other.",
    members: 2847,
    posts: 156,
    category: "Filmmaking",
    tags: ["independent", "filmmaking", "collaboration"],
    createdBy: "Sarah Johnson",
    createdDate: "2024-01-15",
    status: "Active",
    joinedDate: "2024-11-20",
    userRole: "Member",
    rules: [
      "Be respectful to all members",
      "Keep discussions relevant to independent filmmaking",
      "Share resources and knowledge generously",
      "No spam or self-promotion without permission"
    ],
    recentActivity: [
      { action: "New member joined", user: "Alex Chen", time: "1 hour ago" },
      { action: "Posted in chat", user: "Maria Garcia", time: "2 hours ago" },
      { action: "Shared resource", user: "David Kim", time: "3 hours ago" }
    ]
  };

  const members: GroupMember[] = [
    { id: "1", name: "Sarah Johnson", role: "Group Admin", avatar: "SJ", joinedDate: "2024-01-15", isAdmin: true, isModerator: false, online: true },
    { id: "2", name: "Mike Chen", role: "Moderator", avatar: "MC", joinedDate: "2024-02-10", isAdmin: false, isModerator: true, online: true },
    { id: "3", name: "Lisa Park", role: "Member", avatar: "LP", joinedDate: "2024-03-05", isAdmin: false, isModerator: false, online: false },
    { id: "4", name: "David Kim", role: "Member", avatar: "DK", joinedDate: "2024-03-15", isAdmin: false, isModerator: false, online: true },
    { id: "5", name: "Emma Rodriguez", role: "Member", avatar: "ER", joinedDate: "2024-04-01", isAdmin: false, isModerator: false, online: false },
    { id: "6", name: "James Wilson", role: "Member", avatar: "JW", joinedDate: "2024-04-10", isAdmin: false, isModerator: false, online: true },
    { id: "7", name: "You", role: "Member", avatar: "Y", joinedDate: "2024-11-20", isAdmin: false, isModerator: false, online: true }
  ];

  const demoChatMessages: ChatMessage[] = [
    {
      id: "1",
      userId: "1",
      userName: "Sarah Johnson",
      userAvatar: "SJ",
      message: "Welcome everyone! Great to see so many independent filmmakers joining our community. Let's support each other and share our experiences!",
      timestamp: "3 hours ago",
      type: "text",
      isAdmin: true
    },
    {
      id: "2",
      userId: "2",
      userName: "Mike Chen",
      userAvatar: "MC",
      message: "Has anyone worked with the new Sony FX6? I'm considering it for my next documentary project.",
      timestamp: "2 hours ago",
      type: "text",
      isModerator: true
    },
    {
      id: "3",
      userId: "3",
      userName: "Lisa Park",
      userAvatar: "LP",
      message: "I've used the FX6 for a few projects. The low-light performance is excellent and the autofocus is really reliable. What's your budget range?",
      timestamp: "2 hours ago",
      type: "text"
    },
    {
      id: "4",
      userId: "4",
      userName: "David Kim",
      userAvatar: "DK",
      message: "I'm looking for collaborators for a short film I'm directing. Anyone interested in cinematography or sound design?",
      timestamp: "1 hour ago",
      type: "text"
    },
    {
      id: "5",
      userId: "5",
      userName: "Emma Rodriguez",
      userAvatar: "ER",
      message: "I'd be interested in sound design! What's the timeline for your project?",
      timestamp: "45 minutes ago",
      type: "text"
    },
    {
      id: "6",
      userId: "7",
      userName: "You",
      userAvatar: "Y",
      message: "This community is amazing! I'm learning so much from everyone's experiences. Thanks for sharing your knowledge!",
      timestamp: "30 minutes ago",
      type: "text"
    }
  ];

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
    if (!groupId) return;
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
    } else {
      setChatMessages(demoChatMessages);
    }
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
            isAdmin: false
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
            type: 'text'
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

  const handleLeaveGroup = async () => {
    try {
      if (user && isUuid(groupId)) {
        const { error } = await supabase
          .from("community_group_members")
          .delete()
          .eq("group_id", groupId)
          .eq("user_id", user.id);
        if (error) throw error;
      }
      toast({
        title: "Left group",
        description: `You have left ${group.name}.`
      });
      navigate('/community');
    } catch (err: any) {
      console.error("Failed to leave group:", err);
      toast({
        variant: "destructive",
        title: "Could not leave group",
        description: err?.message || "Failed to update membership."
      });
    }
  };

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
                  <span>•</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30 uppercase">
                    {group.userRole}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="border-border/80 bg-surface-elevated hover:bg-surface-hover">
                <Share2 className="w-4 h-4 mr-1.5" />
                Share
              </Button>
              <Button variant="outline" size="sm" onClick={handleLeaveGroup} className="text-destructive border-destructive/30 bg-destructive/10 hover:bg-destructive/20">
                <LogOut className="w-4 h-4 mr-1.5" />
                Leave Group
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
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Created By</p>
                    <p className="text-sm text-foreground">{group.createdBy}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Created</p>
                    <p className="text-sm font-mono text-foreground">{group.createdDate}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">You Joined</p>
                    <p className="text-sm font-mono text-foreground">{group.joinedDate}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">Your Role</p>
                    <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30 uppercase font-mono">
                      {group.userRole}
                    </Badge>
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
      </div>
    </AppLayout>
  );
}
