import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Trash2,
  CheckCircle,
  X,
  Clock,
  Play,
  Search,
  Tags,
  Check,
  Building2,
  MapPin,
  MoreVertical,
  Bell,
  Ban
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminJobs() {
  // Available tags for jobs
  const [globalTags, setGlobalTags] = useState<{label: string, color: string}[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingTags, setEditingTags] = useState<{ id: string; tags: string[] } | null>(null);

  const [jobs, setJobs] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Notification states
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [notifyUser, setNotifyUser] = useState<any | null>(null);
  const [notifyJob, setNotifyJob] = useState<any | null>(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const generateJobId = (uuid: string) => {
    if (!uuid) return "job_000000";
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `job_${Math.abs(hash).toString().substring(0, 6).padStart(6, '0')}`;
  };

  const fetchGlobalTags = async () => {
    try {
      const { data, error } = await supabase.from("global_tags").select("name").order("name");
      if (error && error.code !== '42P01') throw error;
      if (data) {
        setGlobalTags(data.map(t => ({ label: t.name, color: "bg-surface-elevated text-foreground border border-border/80" })));
      }
    } catch (error) {
      console.error("Error fetching global tags:", error);
    }
  };

  useEffect(() => {
    fetchJobs();
    fetchGlobalTags();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("name").order("name");
      if (error && error.code !== '42P01') throw error;
      if (data) {
        setDbCategories(data.map(c => c.name));
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          creator:profiles(id, full_name, username, avatar_url, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs from database.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "Pending":
        return "secondary";
      case "Rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Active":
        return Play;
      case "Pending":
        return Clock;
      case "Rejected":
        return X;
      default:
        return Clock;
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      await supabase.from("jobs").delete().eq("id", jobId);
      setJobs(prev => prev.filter(j => j.id !== jobId));
      toast({ title: "Job deleted" });
    } catch (e) {}
  };

  const handleUpdateStatus = async (jobId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ status: newStatus })
        .eq("id", jobId);
      
      if (error) throw error;
      
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
      toast({
        title: "Status Updated",
        description: `Job status changed to ${newStatus}.`
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Update Failed",
        description: "Could not change the job status.",
        variant: "destructive"
      });
    }
  };

  const handleOpenNotify = (job: any, creator: any) => {
    if (!creator) {
      toast({
        title: "Creator Not Found",
        description: "Cannot send notification. Creator profile is missing.",
        variant: "destructive"
      });
      return;
    }
    setNotifyUser(creator);
    setNotifyJob(job);
    setNotificationTitle(`Regarding your job: ${job.job_title}`);
    setNotificationMessage("");
    setIsNotifyDialogOpen(true);
  };

  const handleSendNotification = async () => {
    if (!notifyUser || !notifyJob || !notificationTitle.trim() || !notificationMessage.trim()) return;
    setIsSendingNotification(true);
    try {
      const fullDescription = `${notificationMessage.trim()}\n\nJob Details:\nTitle: ${notifyJob.job_title}\nLocation: ${notifyJob.location}\nType: ${notifyJob.job_type}`;
      
      const targetUserId = notifyJob.user_id || (Array.isArray(notifyUser) ? notifyUser[0]?.id : notifyUser?.id);
      
      if (!targetUserId) {
        toast({
          title: "Cannot Send Notification",
          description: "This job has no creator assigned in the database, so there is no one to notify.",
          variant: "destructive"
        });
        setIsSendingNotification(false);
        return;
      }

      const { error } = await supabase.from('notifications').insert({
        user_id: targetUserId,
        title: notificationTitle.trim(),
        description: fullDescription,
        type: "job",
        priority: "high",
        status: "unread",
        action_url: `/jobs/${notifyJob.id}`
      });
      if (error) throw error;
      toast({
        title: "Notification Sent",
        description: `Successfully sent message to ${notifyUser.full_name || notifyUser.username}.`
      });
      setIsNotifyDialogOpen(false);
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        title: "Failed to send notification",
        description: "An error occurred while sending the message.",
        variant: "destructive"
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleEditTags = (jobId: string, currentTags: string[]) => {
    setEditingTags({ id: jobId, tags: currentTags || [] });
  };

  const handleSaveJobTags = async (jobId: string) => {
    try {
      if (!editingTags) return;
      const { error } = await supabase.rpc('admin_update_job_tags', { 
        p_job_id: jobId, 
        p_tags: editingTags.tags 
      });
      if (error) throw error;
      setJobs(prev => prev.map(j => j.id === jobId ? { ...j, job_tags: editingTags.tags } : j));
      setEditingTags(null);
      toast({ title: "Tags updated" });
    } catch (e: any) {
      console.error("Error saving job tags:", e);
      toast({ title: "Error saving tags", description: e.message || "Could not save tags to the database. Make sure the job_tags column exists.", variant: "destructive" });
    }
  };

  const handleTagToggle = (tag: string) => {
    if (!editingTags) return;

    setEditingTags(current => {
      if (!current) return null;

      const newTags = current.tags.includes(tag)
        ? current.tags.filter(t => t !== tag)
        : [...current.tags, tag];

      return { ...current, tags: newTags };
    });
  };

  const getTagBadgeStyle = (_tag: string): string => {
    return "bg-surface-elevated text-foreground border border-border/80";
  };

  // Filter jobs based on search and filters
  const filteredJobs = jobs.filter(job => {
    const title = job.job_title || "";
    const desc = job.job_description || "";
    const comp = job.company_name || "";
    const loc = job.location || "";
    
    const matchesSearch = 
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === "all" || (job.industry || "").toLowerCase() === categoryFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || (job.status || "Active").toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AdminLayout pageTitle="Jobs Management" pageName="Jobs">
      <div className="space-y-6">
        {/* Page Header with Search & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-5">
          <div>
            <p className="noir-eyebrow mb-1">Casting & Crew Calls</p>
            <h1 className="text-3xl font-display font-bold text-foreground">Jobs Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">Approve or reject job listings</p>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-surface-elevated border-border/80"
              />
            </div>
            
            <div className="flex gap-2 items-center">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-surface-elevated border-border/80">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {dbCategories.map(cat => (
                    <SelectItem key={cat} value={cat.toLowerCase()}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-9 bg-surface-elevated border-border/80">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="noir-card border-border/80 bg-card">
          <CardContent className="space-y-6 pt-6">

            {/* Jobs Table */}
            <div className="border border-border/80 rounded-xl overflow-hidden bg-surface-elevated/40">
              <Table>
                <TableHeader className="bg-surface-elevated">
                  <TableRow className="border-border/70">
                    <TableHead>Job ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Posted By</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading jobs...</TableCell></TableRow>
                  ) : filteredJobs.map((job) => {
                    const StatusIcon = getStatusIcon(job.status || "Active");
                    const jobTags = Array.isArray(job.job_tags) ? job.job_tags : [];
                    const creatorName = job.creator?.full_name || job.company_name || "Unknown";
                    const creatorUsername = job.creator?.username || "";
                    
                    return (
                      <TableRow key={job.id} className="border-border/60 hover:bg-surface-hover/50">
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {generateJobId(job.id)}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <span className="font-medium text-foreground truncate block" title={job.job_title}>{job.job_title}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            {job.industry || "General"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{creatorName}</span>
                              {creatorUsername && <span className="text-xs font-mono text-muted-foreground">@{creatorUsername}</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 text-primary" />
                            <span className="text-sm">{job.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(job.status || "Active")} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {job.status || "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[200px]">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-wrap gap-1 flex-1">
                              {jobTags.map((tag: string, index: number) => (
                                <Badge 
                                  key={index}
                                  variant="secondary" 
                                  className={getTagBadgeStyle(tag) || ""}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            <Popover 
                              open={editingTags?.id === job.id}
                              onOpenChange={(open) => {
                                if (open) {
                                  handleEditTags(job.id, jobTags);
                                } else {
                                  setEditingTags(null);
                                }
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 flex-shrink-0 hover:bg-primary/10"
                                >
                                  <Tags className="h-4 w-4 text-primary" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-0 bg-card border-border/80" align="end">
                                <Command className="bg-card">
                                  <CommandInput placeholder="Search tags..." />
                                  <CommandEmpty>No tags found.</CommandEmpty>
                                  <CommandGroup>
                                    {globalTags.map((tag) => {
                                      const isSelected = editingTags?.tags.includes(tag.label);
                                      return (
                                        <CommandItem
                                          key={tag.label}
                                          onSelect={() => handleTagToggle(tag.label)}
                                          className="flex items-center gap-2"
                                        >
                                          <div className={cn(
                                            "flex h-4 w-4 items-center justify-center rounded border",
                                            isSelected ? "bg-primary border-primary" : "border-border"
                                          )}>
                                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                          </div>
                                          <Badge 
                                            variant="secondary"
                                            className={getTagBadgeStyle(tag.label) || ""}
                                          >
                                            {tag.label}
                                          </Badge>
                                        </CommandItem>
                                      );
                                    })}
                                  </CommandGroup>
                                  <div className="border-t border-border/60 p-2">
                                    <Button
                                      size="sm"
                                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                      onClick={() => handleSaveJobTags(job.id)}
                                    >
                                      Save Changes
                                    </Button>
                                  </div>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border/80">
                              <DropdownMenuItem onClick={() => handleOpenNotify(job, job.creator)}>
                                <Bell className="mr-2 h-4 w-4 text-primary" />
                                Notify Creator
                              </DropdownMenuItem>
                              
                              {job.status !== 'blocked' ? (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(job.id, 'blocked')}>
                                  <Ban className="mr-2 h-4 w-4 text-amber-500" />
                                  Block Job
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(job.id, 'Active')}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                  Unblock Job
                                </DropdownMenuItem>
                              )}
                              
                              <DropdownMenuItem 
                                onClick={() => handleDeleteJob(job.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Job
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

            {/* Results Summary */}
            <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
              <span>Showing {jobs.length} jobs</span>
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select className="w-16 h-8 px-2 border border-border/80 bg-surface-elevated text-foreground rounded text-sm">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Notify Dialog */}
        <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="font-display">Send Notification</DialogTitle>
              <DialogDescription>
                Send a direct notification to {notifyUser?.full_name || notifyUser?.username || notifyUser?.company_name || 'the creator'}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Title</label>
                <Input
                  placeholder="Notification title..."
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  className="bg-surface-elevated border-border/80"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Message</label>
                <Textarea
                  placeholder="Type your message here..."
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  className="min-h-[100px] bg-surface-elevated border-border/80"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNotifyDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                onClick={handleSendNotification}
                disabled={isSendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}
              >
                {isSendingNotification ? "Sending..." : "Send Notification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
