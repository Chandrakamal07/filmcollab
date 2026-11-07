import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Trash2,
  CheckCircle,
  Clock,
  Play,
  Search,
  Tags,
  Check,
  MoreVertical,
  Bell,
  Ban
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const generateProjectId = (uuid: string) => {
  let hash = 0;
  for (let i = 0; i < uuid.length; i++) {
    hash = uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `project_${Math.abs(hash).toString().substring(0, 6).padStart(6, '0')}`;
};

export default function AdminProjects() {
  // Available tags for projects (will be fetched dynamically)
  const [globalTags, setGlobalTags] = useState<{ label: string, color: string }[]>([]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingTags, setEditingTags] = useState<{ id: string; tags: string[] } | null>(null);

  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Notification states
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [notifyUser, setNotifyUser] = useState<any | null>(null);
  const [notifyProject, setNotifyProject] = useState<any | null>(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const [projectsRes, profilesRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, username, full_name, avatar_url")
      ]);

      if (projectsRes.error) throw projectsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      setProjects(projectsRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast({
        title: "Error fetching data",
        description: "Failed to load projects from the database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
    fetchProjects();
    fetchGlobalTags();
  }, [fetchProjects]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Active":
      case "Pending":
        return "secondary";
      case "Rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
      case "open":
        return Play;
      case "pending":
        return Clock;
      case "blocked":
      case "rejected":
        return Ban;
      default:
        return Clock;
    }
  };

  const handleUpdateStatus = async (projectId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ status: newStatus })
        .eq("id", projectId)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No project was updated. Permission denied.");
      }

      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
      toast({
        title: "Status Updated",
        description: `Project status changed to ${newStatus}.`
      });
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast({
        title: "Update Failed",
        description: error?.message || "Could not update project status.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No project was deleted. Permission denied.");
      }

      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast({
        title: "Project Deleted",
        description: "The project has been successfully removed."
      });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast({
        title: "Delete Failed",
        description: error?.message || "Could not delete the project.",
        variant: "destructive"
      });
    }
  };

  const handleEditTags = (projectId: string, currentTags: string[]) => {
    setEditingTags({ id: projectId, tags: currentTags || [] });
  };

  const handleSaveProjectTags = async (projectId: string) => {
    if (!editingTags) return;
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ project_tags: editingTags.tags })
        .eq("id", projectId)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No project was updated. Permission denied.");
      }

      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, project_tags: editingTags.tags } : p));
      setEditingTags(null);
      toast({
        title: "Tags Updated",
        description: "Project tags have been successfully saved."
      });
    } catch (error: any) {
      console.error("Error updating tags:", error);
      toast({
        title: "Update Failed",
        description: error?.message || "Could not save project tags.",
        variant: "destructive"
      });
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

  const handleOpenNotify = (project: any, creator: any) => {
    if (!creator) {
      toast({
        title: "Creator Not Found",
        description: "Cannot send notification. Creator profile is missing.",
        variant: "destructive"
      });
      return;
    }
    setNotifyUser(creator);
    setNotifyProject(project);
    setNotificationTitle(`Regarding your project: ${project.title}`);
    setNotificationMessage("");
    setIsNotifyDialogOpen(true);
  };

  const handleSendNotification = async () => {
    if (!notifyUser || !notifyProject || !notificationTitle.trim() || !notificationMessage.trim()) return;
    try {
      setIsSendingNotification(true);
      const fullDescription = `${notificationMessage.trim()}\n\nProject Details:\nTitle: ${notifyProject.title}\nCategory: ${notifyProject.category}\nStatus: ${notifyProject.status}`;

      const targetUserId = notifyProject.created_by || notifyUser?.id;

      if (!targetUserId) {
        throw new Error("Target user ID is missing");
      }

      const { error } = await supabase.rpc("send_authorized_notification", {
        p_recipient_id: targetUserId,
        p_title: notificationTitle.trim(),
        p_description: fullDescription,
        p_type: "project",
        p_priority: "high",
        p_action_url: `/projects/${notifyProject.id}`
      });

      if (error) throw error;

      toast({
        title: "Notification Sent",
        description: `Successfully sent notification to ${notifyUser.username || notifyUser.full_name || 'the user'}.`
      });
      setIsNotifyDialogOpen(false);
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        title: "Failed to send notification",
        description: "Could not write notification entry to database.",
        variant: "destructive"
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Filter projects based on search and filters
  const filteredProjects = projects.filter(project => {
    const creator = profiles.find(p => p.id === project.created_by) || {};
    const matchesSearch =
      (project.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.description || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (creator.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (creator.username || "").toLowerCase().includes(searchTerm.toLowerCase());

    const projectType = project.project_type || project.category || "";
    const matchesCategory = categoryFilter === "all" || projectType.toLowerCase() === categoryFilter.toLowerCase();

    const status = project.status || "open";
    const matchesStatus = statusFilter === "all" || status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <AdminLayout pageTitle="Projects Management" pageName="Projects">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-border/60 pb-5">
          <div>
            <p className="noir-eyebrow mb-1">Production Registry</p>
            <h1 className="text-3xl font-display font-bold text-foreground">Projects Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">Approve or reject project listings</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 bg-surface-elevated border-border/80"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-surface-elevated border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="feature film">Feature Film</SelectItem>
                  <SelectItem value="short film">Short Film</SelectItem>
                  <SelectItem value="documentary">Documentary</SelectItem>
                  <SelectItem value="web series">Web Series</SelectItem>
                  <SelectItem value="music video">Music Video</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[120px] h-9 bg-surface-elevated border-border/80">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active/Open</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="noir-card border-border/80 bg-card">
          <CardContent className="space-y-6 pt-6">
            {/* Projects Table */}
            <div className="border border-border/80 rounded-xl overflow-hidden bg-surface-elevated/40">
              <Table>
                <TableHeader className="bg-surface-elevated">
                  <TableRow className="border-border/70">
                    <TableHead>Project ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Project Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2 text-sm text-muted-foreground">Loading projects...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No projects found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : filteredProjects.map((project) => {
                    const status = project.status || "open";
                    const StatusIcon = getStatusIcon(status);
                    const creator = profiles.find((p: any) => p.id === project.created_by);

                    return (
                      <TableRow key={project.id} className="border-border/60 hover:bg-surface-hover/50">
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {generateProjectId(project.id)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">{project.title}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 whitespace-nowrap">
                            {project.project_type || project.category || "Uncategorized"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(status)} className="flex items-center gap-1 w-fit capitalize">
                            <StatusIcon className="h-3 w-3" />
                            {status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono font-medium text-foreground whitespace-nowrap">
                            {project.budget_min || project.budget_max
                              ? `${project.budget_currency || '₹'} ${project.budget_min || 0} - ${project.budget_max || 0}`
                              : 'Not Specified'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {creator ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={creator.avatar_url || ""} />
                                <AvatarFallback className="bg-primary/15 text-primary text-xs">
                                  {creator.username?.substring(0, 2).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{creator.full_name || creator.username}</span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-row items-start justify-between gap-2 min-w-[150px]">
                            <div className="flex flex-wrap gap-1 max-w-[150px]">
                              {Array.isArray(project.project_tags) && project.project_tags.length > 0 ? (
                                project.project_tags.map((tag: string, i: number) => (
                                  <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0.5 font-semibold">
                                    {tag}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic mt-1">No tags</span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full hover:bg-primary/10 shrink-0"
                              title="Edit Tags"
                              onClick={() => handleEditTags(project.id, Array.isArray(project.project_tags) ? project.project_tags : [])}
                            >
                              <Tags className="h-3.5 w-3.5 text-primary" />
                            </Button>
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
                              <DropdownMenuItem onClick={() => handleOpenNotify(project, creator)}>
                                <Bell className="mr-2 h-4 w-4 text-primary" />
                                Notify Creator
                              </DropdownMenuItem>

                              {status !== 'blocked' ? (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(project.id, 'blocked')}>
                                  <Ban className="mr-2 h-4 w-4 text-amber-500" />
                                  Block Project
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleUpdateStatus(project.id, 'open')}>
                                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-500" />
                                  Unblock Project
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() => handleDeleteProject(project.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Project
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
              <span>Showing {projects.length} projects</span>
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
                Send a direct notification to {notifyUser?.full_name || notifyUser?.username || 'the creator'}.
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

        {/* Edit Tags Dialog */}
        <Dialog open={editingTags !== null} onOpenChange={(open) => !open && setEditingTags(null)}>
          <DialogContent className="sm:max-w-[425px] bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="font-display">Edit Project Tags</DialogTitle>
              <DialogDescription>
                Assign or remove global tags for this project.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Command className="border border-border/80 rounded-md bg-surface-elevated">
                <CommandInput placeholder="Search tags..." />
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup className="max-h-[200px] overflow-y-auto">
                  {globalTags.map((tag) => {
                    const isSelected = editingTags?.tags.includes(tag.label);
                    return (
                      <CommandItem
                        key={tag.label}
                        onSelect={() => handleTagToggle(tag.label)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          isSelected ? "bg-primary border-primary" : "border-border"
                        )}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <Badge
                          variant="secondary"
                          className={getTagBadgeStyle(tag.label)}
                        >
                          {tag.label}
                        </Badge>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Command>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTags(null)}>
                Cancel
              </Button>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => {
                  if (editingTags) {
                    handleSaveProjectTags(editingTags.id);
                  }
                }}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
