import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { 
  RefreshCw,
  ChevronLeft,
  Clock,
  TicketCheck,
  CheckCircle2,
  Send,
  UserCog
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function UserTicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [ticketUpdates, setTicketUpdates] = useState<any[]>([]);
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
        .select(`*`)
        .eq("id", ticketId)
        .single();
      
      if (ticketError) throw ticketError;
      setTicket(ticketData);

      const { data: msgData, error: msgError } = await supabase
        .from("ticket_messages")
        .select(`
          *,
          author:profiles(id, full_name, role)
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
        
      if (msgError) {
        console.error("Error fetching ticket messages:", msgError);
      } else if (msgData) {
        setMessages(msgData);
      }

      const { data: updateData, error: updateError } = await supabase
        .from("ticket_updates")
        .select(`
          *,
          author:profiles(id, full_name, role)
        `)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: false });
        
      if (updateError) {
        console.error("Error fetching ticket updates:", updateError);
      } else if (updateData) {
        setTicketUpdates(updateData);
      }

    } catch (error) {
      console.error("Error fetching ticket details:", error);
      toast({ title: "Failed to load ticket details", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !profile) return;
    
    const draftText = newMessage.trim();
    const tempMessage = {
      id: Date.now(),
      ticket_id: ticketId,
      author_id: profile.id,
      message: draftText,
      created_at: new Date().toISOString(),
      author: profile
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage("");
    setIsSending(true);
    
    try {
      const { data, error } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId,
          author_id: profile.id,
          message: draftText
        })
        .select(`*, author:profiles(id, full_name, role)`).single();

      if (error) throw error;
      setMessages(prev => prev.map(m => m.id === tempMessage.id ? data : m));
    } catch (error: any) {
      console.error("Send message error:", error);
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
      setNewMessage(draftText);
      toast({ title: `Failed to send message: ${error.message || 'Unknown error'}`, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = status?.toLowerCase() || "";
    switch (s) {
      case "open": return "bg-primary/15 text-primary border border-primary/30";
      case "in-progress": return "bg-amber-500/15 text-amber-500 border border-amber-500/30";
      case "resolved":
      case "closed": return "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30";
      default: return "bg-surface-elevated text-muted-foreground border border-border/80";
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
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">Loading ticket details...</div>
      </AppLayout>
    );
  }

  if (!ticket) {
    return (
      <AppLayout>
        <div className="p-8 text-center text-muted-foreground">Ticket not found.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between border-b border-border/60 pb-5">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/support")}
              className="h-9 w-9 p-0 border border-border/80 bg-surface-elevated hover:bg-surface-hover"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="noir-eyebrow mb-0.5">Support Case</p>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Ticket Details</h1>
              <p className="text-muted-foreground font-mono text-xs mt-1">View your ticket #{ticket.ticket_number}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="h-9 border-primary/30 hover:bg-primary/10 hover:text-primary"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 noir-card border-border/80 bg-card">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="text-xl sm:text-2xl font-display flex items-center justify-between gap-3">
                <span className="text-foreground">{ticket.subject}</span>
                <Badge variant="secondary" className={getStatusBadgeStyle(ticket.status)}>
                  {StatusIcon(ticket.status)}
                  {ticket.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground font-medium block">Created Date</span>
                    <span className="mt-1 font-mono text-foreground">{new Date(ticket.created_at).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium block">Category</span>
                    <span className="mt-1 text-foreground">{ticket.category}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/60">
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <div className="mt-2 p-4 bg-surface-elevated border border-border/80 rounded-xl whitespace-pre-wrap text-foreground text-sm leading-relaxed">{ticket.description}</div>
                </div>
                
                <div className="pt-4 border-t border-border/60 space-y-4">
                  <Label className="text-lg font-display font-semibold text-foreground">Official Updates</Label>
                  <div className="space-y-3">
                    {ticketUpdates.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">No official updates posted yet.</p>
                    ) : (
                      ticketUpdates.map((update) => (
                        <div key={update.id} className="bg-primary/10 border border-primary/25 p-4 rounded-xl">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-primary text-sm">{update.author?.full_name || "Support Team"}</span>
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
            </CardContent>
          </Card>

          <Card className="lg:col-span-1 flex flex-col h-[600px] noir-card border-border/80 bg-card">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="text-xl font-display">Interaction Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 overflow-hidden space-y-4 pt-4">
              {!ticket.chat_enabled ? (
                <div className="flex-1 flex items-center justify-center text-center p-6 text-muted-foreground bg-surface-elevated/50 rounded-xl border border-dashed border-border/80">
                  <div>
                    <TicketCheck className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Chat is currently disabled</p>
                    <p className="text-xs mt-1">A support agent will enable chat if they need more details from you.</p>
                  </div>
                </div>
              ) : (
                <>
                  <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
                    <div className="space-y-4 pb-4">
                      {messages.length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm py-4">No messages yet.</div>
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
                                "max-w-[85%] rounded-xl p-3 border",
                                isMe
                                  ? "bg-primary text-primary-foreground border-primary/40 ml-auto"
                                  : isAdmin ? "bg-surface-elevated text-foreground border-primary/30" : "bg-surface-elevated text-foreground border-border/80"
                              )}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                {isAdmin && <UserCog className="w-3 h-3 text-primary" />}
                                <span className={cn(
                                  "text-xs font-semibold", 
                                  isMe ? "text-primary-foreground/90" : isAdmin ? "text-primary" : "text-muted-foreground"
                                )}>
                                  {isMe ? "You" : msg.author?.full_name || "Agent"}
                                </span>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                              <div
                                className={cn(
                                  "text-[10px] font-mono mt-1 text-right",
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
                      placeholder="Type a message..."
                      className="flex-1 bg-surface-elevated border-border/80"
                      disabled={isSending || ticket.status === 'closed' || ticket.status === 'resolved'}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isSending || !newMessage.trim() || ticket.status === 'closed' || ticket.status === 'resolved'}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
