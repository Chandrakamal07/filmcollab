import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search,
  TicketCheck,
  Clock,
  CheckCircle2,
  MoreVertical,
  Eye,
  Trash2,
  UserCog
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminTickets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [ticketToDelete, setTicketToDelete] = useState<string | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          id,
          ticket_number,
          subject,
          description,
          status,
          created_at,
          creator:profiles!tickets_user_id_fkey(id, full_name, username),
          assignee:profiles!tickets_assigned_to_fkey(id, full_name, role)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      toast({ title: "Failed to fetch tickets", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleDeleteTicket = async () => {
    if (!ticketToDelete) return;
    try {
      const { data, error } = await supabase
        .from("tickets")
        .delete()
        .eq("id", ticketToDelete)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No ticket was deleted. Permission denied or ticket not found.");
      }
      setTickets(prev => prev.filter(t => t.id !== ticketToDelete));
      toast({ title: "Ticket deleted successfully" });
    } catch (error: any) {
      toast({ title: "Failed to delete ticket", description: error?.message || "Operation failed", variant: "destructive" });
    } finally {
      setTicketToDelete(null);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-primary/15 text-primary border border-primary/30";
      case "In Progress":
        return "bg-amber-500/15 text-amber-500 border border-amber-500/30";
      case "Closed":
        return "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30";
      default:
        return "bg-surface-elevated text-muted-foreground border border-border/80";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Open":
        return Clock;
      case "In Progress":
        return TicketCheck;
      case "Closed":
        return CheckCircle2;
      default:
        return Clock;
    }
  };

  // Filter tickets based on search and filters
  const filteredTickets = tickets.filter(ticket => {
    const ticketId = ticket.ticket_number || "";
    const subject = ticket.subject || "";
    const matchesSearch = 
      ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status.toLowerCase().replace(" ", "-") === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout pageTitle="Support Tickets" pageName="Tickets">
      <div className="space-y-6">
        <div className="border-b border-border/60 pb-5">
          <p className="noir-eyebrow mb-1">Concierge Operations</p>
          <h1 className="text-3xl font-display font-bold text-foreground">Support Tickets</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and track support tickets</p>
        </div>

        <Card className="noir-card border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
            <CardTitle className="text-xl font-display">All Tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by ticket number or title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-surface-elevated border-border/80"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground">Status:</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] bg-surface-elevated border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border border-border/80 rounded-xl overflow-x-auto bg-surface-elevated/40">
              <Table>
                <TableHeader className="bg-surface-elevated">
                  <TableRow className="border-border/70">
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading tickets...</TableCell>
                    </TableRow>
                  ) : filteredTickets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tickets found.</TableCell>
                    </TableRow>
                  ) : filteredTickets.map((ticket) => {
                    const StatusIcon = getStatusIcon(ticket.status);
                    return (
                      <TableRow 
                        key={ticket.id}
                        className="cursor-pointer border-border/60 hover:bg-surface-hover/50"
                        onClick={() => navigate(`/admin-dashboard/tickets/${ticket.id}`)}
                      >
                        <TableCell className="font-mono font-medium text-primary">{ticket.ticket_number || "TKT-UNKNOWN"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col max-w-[200px]">
                            <span className="font-medium text-foreground truncate">{ticket.subject}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {ticket.creator?.full_name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {ticket.assignee ? (
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                                <UserCog className="h-4 w-4 text-primary" />
                              </div>
                              <span className="text-sm font-medium text-foreground">{ticket.assignee.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground italic">Unassigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={getStatusBadgeStyle(ticket.status)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {ticket.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString()}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border/80" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/admin-dashboard/tickets/${ticket.id}`); }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={(e) => { e.stopPropagation(); setTicketToDelete(ticket.id); }}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground font-mono">
              <span>Showing {filteredTickets.length} tickets</span>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Alert */}
        <AlertDialog open={!!ticketToDelete} onOpenChange={(open) => !open && setTicketToDelete(null)}>
          <AlertDialogContent className="bg-card border-border/80">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the ticket
                and all of its associated messages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTicket} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
