import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { 
  ChevronLeft,
  Clock,
  TicketCheck,
  CheckCircle2,
  Send,
  MessageSquare,
  UserCog,
  RefreshCw
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AdminTicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [ticketUpdates, setTicketUpdates] = useState<any[]>([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [isSendingUpdate, setIsSendingUpdate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [ticketId]);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const fetchData = async (background = false) => {
    if (!background) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select(`
          *,
          creator:profiles!tickets_user_id_fkey(id, full_name, username)
        `)
        .eq("id", ticketId)
        .single();
      
      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Fetch messages
      const { data: msgData, error: msgError } = await supabase
        .from("ticket_messages")
        .select(`
          *,
          author:profiles(id, full_name, role)
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
        
      if (msgError) throw msgError;
      setMessages(msgData || []);

      // Fetch official updates
      const { data: updateData, error: updateError } = await supabase
        .from("ticket_updates")
        .select(`
          *,
          author:profiles(id, full_name, role)
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
        
      if (!updateError && updateData) {
        setTicketUpdates(updateData);
      }

      // Fetch team members for assignment
      const { data: teamData, error: teamError } = await supabase
        .from("admin_team_members")
        .select(`profile:profiles(id, full_name)`);
        
      if (!teamError && teamData) {
        setTeamMembers(teamData.map(t => t.profile));
      }
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      toast({ title: "Failed to load ticket details", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticketId)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No ticket was updated. Permission denied.");
      }
      setTicket({ ...ticket, status: newStatus });
      toast({ title: "Status updated" });
    } catch (error: any) {
      toast({ title: error?.message || "Failed to update status", variant: "destructive" });
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    try {
      const val = newAssigneeId === "unassigned" ? null : newAssigneeId;
      const { data, error } = await supabase
        .from("tickets")
        .update({ assigned_to: val })
        .eq("id", ticketId)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No ticket was updated. Permission denied.");
      }
      setTicket({ ...ticket, assigned_to: val });
      toast({ title: "Assignee updated" });
    } catch (error: any) {
      toast({ title: error?.message || "Failed to reassign ticket", variant: "destructive" });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile) return;
    setIsSending(true);
    
    try {
      const { data, error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          author_id: profile.id,
          message: newMessage.trim()
        })
        .select(`*, author:profiles(id, full_name, role)`).single();

      if (error) throw error;
      setMessages(prev => [...prev, data]);
      setNewMessage("");
    } catch (error) {
      toast({ title: "Failed to send message", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendUpdate = async () => {
    if (!newUpdate.trim() || !profile) return;
    setIsSendingUpdate(true);
    
    try {
      const { data, error } = await supabase
        .from("ticket_updates")
        .insert({
          ticket_id: ticketId,
          author_id: profile.id,
          content: newUpdate.trim()
        })
        .select(`*, author:profiles(id, full_name, role)`).single();

      if (error) {
        console.error("Error inserting update:", error);
        throw error;
      }
      setTicketUpdates(prev => [data, ...prev]);
      setNewUpdate("");
      toast({ title: "Update posted successfully" });
    } catch (error: any) {
      console.error("Send update error:", error);
      toast({ title: `Failed to post update: ${error.message || 'Unknown error'}`, variant: "destructive" });
    } finally {
      setIsSendingUpdate(false);
    }
  };

  const toggleChatEnabled = async () => {
    const newValue = !ticket.chat_enabled;
    try {
      const { data, error } = await supabase
        .from("tickets")
        .update({ chat_enabled: newValue })
        .eq("id", ticketId)
        .select("id");

      if (error) {
        console.error("Error toggling chat:", error);
        throw error;
      }
      if (!data || data.length === 0) {
        throw new Error("No ticket was updated. Permission denied.");
      }
      setTicket({ ...ticket, chat_enabled: newValue });
      toast({ title: `Chat ${newValue ? "enabled" : "disabled"}` });
    } catch (error: any) {
      console.error("Toggle chat error:", error);
      toast({ title: `Failed to toggle chat: ${error.message || 'Unknown error'}`, variant: "destructive" });
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status?.toLowerCase() || "";
    switch (s) {
      case "open": return "bg-sky-500/15 text-sky-400 border border-sky-500/30";
      case "in-progress": return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
      case "resolved":
      case "closed": return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
      default: return "bg-surface-elevated text-muted-foreground border border-border/70";
    }
  };

  const StatusIcon = (status: string) => {
    const s = status?.toLowerCase() || "";
    switch (s) {
      case "open": return <Clock className="h-3 w-3 mr-1" />;
      case "in-progress": return <TicketCheck className="h-3 w-3 mr-1" />;
      case "resolved":
      case "closed": return <CheckCircle2 className="h-3 w-3 mr-1" />;
      default: return <Clock className="h-3 w-3 mr-1" />;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Ticket Details" pageName="Tickets">
        <div className="p-8 text-center text-muted-foreground">Loading ticket details...</div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout pageTitle="Ticket Details" pageName="Tickets">
        <div className="p-8 text-center text-muted-foreground">Ticket not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle={`Ticket ${ticket.ticket_number || "Details"}`} pageName="Tickets">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin-dashboard/tickets")}
              className="h-9 w-9 p-0 border border-border/70 bg-surface-elevated hover:bg-surface-hover"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <span className="noir-eyebrow">Support Resolution</span>
              <h1 className="font-display text-3xl font-bold text-foreground mt-0.5">Ticket Details</h1>
              <p className="text-muted-foreground mt-1 font-mono text-xs">View and manage ticket #{ticket.ticket_number}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="h-9 border-primary/30 bg-surface-elevated hover:bg-primary/10 hover:text-primary"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 noir-card border-border/80 bg-card">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="font-display text-2xl flex items-center justify-between gap-4">
                <span className="text-foreground">{ticket.subject}</span>
                <Badge variant="secondary" className={cn("capitalize", getStatusBadgeStyle(ticket.status))}>
                  {StatusIcon(ticket.status)}
                  {ticket.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Created By</Label>
                    <p className="mt-1 font-medium text-foreground">{ticket.creator?.full_name || "Unknown"}</p>
                  </div>
                  <div>
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Created Date</Label>
                    <p className="mt-1 font-mono text-sm text-foreground">{new Date(ticket.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Status</Label>
                    <Select value={ticket.status?.toLowerCase()} onValueChange={handleStatusChange}>
                      <SelectTrigger className="bg-surface-elevated border-border/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border/80">
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Assigned To</Label>
                    <Select value={ticket.assigned_to || "unassigned"} onValueChange={handleAssigneeChange}>
                      <SelectTrigger className="bg-surface-elevated border-border/80">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border/80">
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map(tm => (
                          <SelectItem key={tm.id} value={tm.id}>{tm.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <Label className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Description</Label>
                  <div className="mt-2 p-4 bg-surface-elevated border border-border/70 rounded-lg whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                    {ticket.description}
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border/60 space-y-4">
                  <Label className="font-display text-lg font-semibold text-foreground">Official Updates</Label>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={newUpdate}
                        onChange={(e) => setNewUpdate(e.target.value)}
                        placeholder="Add an official update (visible to user)..."
                        disabled={isSendingUpdate}
                        className="bg-surface-elevated border-border/80"
                      />
                      <Button
                        onClick={handleSendUpdate}
                        disabled={isSendingUpdate || !newUpdate.trim()}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Post Update
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      {ticketUpdates.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No official updates posted yet.</p>
                      ) : (
                        ticketUpdates.map((update) => (
                          <div key={update.id} className="bg-primary/10 border border-primary/25 p-4 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-primary text-sm">{update.author?.full_name}</span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {new Date(update.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{update.content}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 flex flex-col h-[600px] noir-card border-border/80 bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
              <CardTitle className="font-display text-xl text-foreground">Interaction Chat</CardTitle>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={ticket.chat_enabled || false}
                  onCheckedChange={toggleChatEnabled}
                  id="chat-toggle"
                />
                <Label htmlFor="chat-toggle" className="text-xs font-mono text-muted-foreground">
                  {ticket.chat_enabled ? "Enabled" : "Disabled"}
                </Label>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 overflow-hidden space-y-4 pt-4">
              <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                <div className="space-y-4 pb-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-8">No messages yet.</div>
                  ) : messages.map((msg) => {
                    const isAdmin = msg.author?.role === "admin";
                    const isMe = msg.author_id === profile?.id;
                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3",
                          isMe ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-xl p-3.5 border",
                            isMe
                              ? "bg-primary text-primary-foreground border-primary/40 ml-auto"
                              : isAdmin
                              ? "bg-surface-elevated text-foreground border-primary/30"
                              : "bg-surface-elevated text-foreground border-border/70"
                          )}
                        >
                          <div className="flex items-center gap-1.5 mb-1">
                            {isAdmin && !isMe && <UserCog className="w-3.5 h-3.5 text-primary" />}
                            <span className={cn(
                              "text-xs font-semibold", 
                              isMe ? "text-primary-foreground/90" : isAdmin ? "text-primary" : "text-muted-foreground"
                            )}>
                              {isMe ? "You" : msg.author?.full_name || "User"}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                          <div
                            className={cn(
                              "text-[10px] font-mono mt-1.5 text-right",
                              isMe ? "text-primary-foreground/80" : "text-muted-foreground"
                            )}
                          >
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              <div className="flex gap-2 pt-3 border-t border-border/60">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type an update..."
                  className="flex-1 bg-surface-elevated border-border/80"
                  disabled={isSending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isSending || !newMessage.trim()}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
