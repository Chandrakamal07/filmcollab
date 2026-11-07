import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  HelpCircle,
  MessageSquare,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  FileText,
  Search,
  Filter,
  Plus,
  Eye,
  Reply,
  Star,
  Phone,
  Mail,
  Calendar,
  User,
  Tag
} from 'lucide-react';

const Support = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Form state for creating tickets
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: '',
    priority: 'medium',
    description: '',
    attachments: []
  });

  const fetchTickets = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
        
      console.log("Support.tsx fetchTickets - profile.id:", profile.id);
      console.log("Support.tsx fetchTickets - returned data:", data);

      if (error) {
        console.error("Tickets fetch error:", error);
        throw error;
      }
      setTickets(data || []);
    } catch (err: any) {
      console.error('Error fetching tickets:', err);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchTickets();
    }
  }, [profile]);

  const categories = [
    'Account',
    'Billing',
    'Technical',
    'Feature Request',
    'Bug Report',
    'General Inquiry'
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-500/15 text-amber-500 border border-amber-500/30' },
    { value: 'high', label: 'High', color: 'bg-destructive/15 text-destructive border border-destructive/30' }
  ];

  const statuses = [
    { value: 'open', label: 'Open', color: 'bg-primary/15 text-primary border border-primary/30' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-amber-500/15 text-amber-500 border border-amber-500/30' },
    { value: 'resolved', label: 'Resolved', color: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' },
    { value: 'closed', label: 'Closed', color: 'bg-surface-elevated text-muted-foreground border border-border/80' }
  ];

  const handleFormChange = (field: string, value: string) => {
    setTicketForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitTicket = async () => {
    if (!ticketForm.subject || !ticketForm.category || !ticketForm.description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user || !profile) {
      toast({
        title: "Error",
        description: "You must be fully logged in to create a ticket.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.from('tickets').insert({
        user_id: profile.id,
        subject: ticketForm.subject,
        category: ticketForm.category,
        priority: ticketForm.priority,
        description: ticketForm.description
      });
      
      if (error) {
        console.error("Insert ticket error:", error);
        throw error;
      }
      
      toast({
        title: "Ticket Created",
        description: "Your support ticket has been submitted successfully.",
      });
      
      fetchTickets();
      setActiveTab('tickets');
      
      // Reset form
      setTicketForm({
        subject: '',
        category: '',
        priority: 'medium',
        description: '',
        attachments: []
      });
    } catch (error: any) {
      console.error("Create ticket exception:", error);
      toast({
        title: "Error",
        description: `Failed to create ticket: ${error?.message || "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = priorities.find(p => p.value === priority);
    return (
      <Badge className={priorityConfig?.color || 'bg-surface-elevated text-muted-foreground'}>
        {priorityConfig?.label || priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statuses.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-surface-elevated text-muted-foreground'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || ticket.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <p className="noir-eyebrow mb-1">Concierge & Assistance</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Support Center</h1>
            <p className="text-muted-foreground text-sm mt-1">Get help and submit support tickets</p>
          </div>
          <Badge variant="outline" className="w-fit text-xs border-primary/30 bg-primary/10 text-primary px-3 py-1 font-mono">
            <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
            Support Available 24/7
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex space-x-1 bg-surface-elevated border border-border/80 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'create' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Create Ticket
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === 'tickets' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Tickets ({tickets.length})
            </button>
          </div>

          {/* Search and Filter */}
          {activeTab === 'tickets' && (
            <div className="flex flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-64 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search tickets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 w-full bg-surface-elevated border-border/80"
                />
              </div>
              <div className="flex-shrink-0 flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] h-10 bg-surface-elevated border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Create Ticket Tab */}
        {activeTab === 'create' && (
          <Card className="noir-card border-border/80 bg-card">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2 font-display text-xl">
                <Plus className="w-5 h-5 text-primary" />
                Create Support Ticket
              </CardTitle>
              <CardDescription>
                Describe your issue and we'll get back to you as soon as possible
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={ticketForm.subject}
                    onChange={(e) => handleFormChange('subject', e.target.value)}
                    placeholder="Brief description of your issue"
                    className="bg-surface-elevated border-border/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={ticketForm.category} 
                    onValueChange={(value) => handleFormChange('category', value)}
                  >
                    <SelectTrigger className="bg-surface-elevated border-border/80">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={ticketForm.priority} 
                  onValueChange={(value) => handleFormChange('priority', value)}
                >
                  <SelectTrigger className="bg-surface-elevated border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={ticketForm.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="Please provide detailed information about your issue..."
                  rows={6}
                  className="bg-surface-elevated border-border/80"
                />
              </div>

              <div className="space-y-2">
                <Label>Attachments (Optional)</Label>
                <div className="border-2 border-dashed border-border/80 rounded-xl p-6 text-center bg-surface-elevated/40">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drag and drop files here, or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">Max file size: 10MB</p>
                </div>
              </div>

              <Button 
                onClick={handleSubmitTicket}
                disabled={isLoading}
                className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="w-4 h-4 mr-2" />
                {isLoading ? 'Creating Ticket...' : 'Submit Ticket'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* My Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="space-y-4">
            {/* Tickets List */}
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <Card key={ticket.id} className="noir-card-interactive border-border/80 bg-card transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 
                            className="font-semibold text-lg text-foreground cursor-pointer hover:text-primary transition-colors"
                            onClick={() => navigate(`/support/${ticket.id}`)}
                          >
                            {ticket.subject}
                          </h3>
                          <Badge variant="outline" className="text-xs font-mono border-border/80">
                            {ticket.ticket_number}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                          <div className="flex items-center gap-1">
                            <Tag className="w-3 h-3 text-primary" />
                            {ticket.category}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {ticket.replies} replies
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTickets.length === 0 && (
              <Card className="noir-card border-border/80 bg-card">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No tickets found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'You haven\'t created any support tickets yet.'
                    }
                  </p>
                  {!searchQuery && filterStatus === 'all' && (
                    <Button onClick={() => setActiveTab('create')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Ticket
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Support;
