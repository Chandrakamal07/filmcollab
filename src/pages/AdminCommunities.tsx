import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Search,
  Tags,
  User,
  Check,
  Eye,
  Trash2,
  Shield,
  MessageSquare,
  Settings
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AdminCommunities() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  // Available tags for communities
  const availableTags = [
    { value: "featured", label: "Featured", color: "purple" },
    { value: "trending", label: "Trending", color: "orange" },
    { value: "popular", label: "Popular", color: "green" },
    { value: "verified", label: "Verified", color: "blue" },
    { value: "private", label: "Private", color: "red" },
    { value: "public", label: "Public", color: "yellow" }
  ];

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingTags, setEditingTags] = useState<{ id: string | number; tags: string[] } | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch real community groups from Supabase
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);
        const { data, error } = await supabase
          .from("community_groups")
          .select("id, name, description, category, tags, privacy, created_at, created_by")
          .order("created_at", { ascending: false });

        if (error) {
          if (error.code !== "42P01") {
            setFetchError(error.message);
          }
          setCommunities([]);
        } else {
          const mapped = (data || []).map((g: any) => ({
            id: g.id,
            name: g.name,
            description: g.description || "Community group",
            totalMembers: 1,
            activeMembers: 1,
            creator: {
              id: g.created_by,
              name: "Community Admin",
              username: "admin",
              avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${g.name}`
            },
            status: g.tags?.includes("Blocked") ? "Blocked" : "Active",
            dateCreated: new Date(g.created_at).toISOString().split("T")[0],
            lastActive: new Date(g.created_at).toISOString().split("T")[0],
            tags: g.tags && g.tags.length > 0 ? g.tags : [g.privacy === "private" ? "Private" : "Public"]
          }));
          setCommunities(mapped);
        }
      } catch (err: any) {
        setFetchError(err.message || "Failed to load community groups");
        setCommunities([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCommunities();
  }, []);

  const isUuid = (id: string | number): boolean => {
    return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  const handleEditTags = (communityId: string | number, currentTags: string[]) => {
    setEditingTags({ id: communityId, tags: currentTags });
  };

  const handleSaveCommunityTags = async (communityId: string | number) => {
    if (!editingTags) return;
    const strId = String(communityId);
    if (!isUuid(strId)) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: "Cannot modify invalid or non-persisted community ID."
      });
      return;
    }
    const newTags = editingTags.tags;
    try {
      const { error } = await supabase.from("community_groups").update({ tags: newTags }).eq("id", strId);
      if (error) throw error;
      setCommunities(prev => prev.map(c => c.id === communityId ? { ...c, tags: newTags } : c));
      setEditingTags(null);
      toast({
        title: "Tags updated",
        description: "Community tags saved successfully."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err?.message || "Failed to update community tags."
      });
    }
  };

  const handleDeleteCommunity = async (communityId: string | number) => {
    if (!hasPermission("Communities", "delete")) {
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: "You do not have permission to delete communities."
      });
      return;
    }
    const strId = String(communityId);
    if (!isUuid(strId)) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Cannot delete invalid or non-persisted community ID."
      });
      return;
    }
    try {
      const { error } = await supabase.from("community_groups").delete().eq("id", strId);
      if (error) throw error;
      setCommunities(prev => prev.filter(c => c.id !== communityId));
      toast({
        title: "Community deleted",
        description: "Community has been permanently removed."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err?.message || "Failed to delete community."
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

  const getTagBadgeStyle = (tag: string): string => {
    const tagConfig = availableTags.find(t => t.label === tag);
    if (!tagConfig) return "bg-surface-elevated text-foreground border border-border/80";

    return ({
      purple: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
      orange: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
      green: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
      blue: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
      red: "bg-destructive/15 text-destructive border border-destructive/30",
      yellow: "bg-primary/15 text-primary border border-primary/30"
    }[tagConfig.color] || "bg-surface-elevated text-foreground");
  };

  const getStatusBadgeStyle = (status: string) => {
    return status === "Active"
      ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
      : "bg-destructive/15 text-destructive border border-destructive/30";
  };

  // Filter communities based on search and filters
  const filteredCommunities = communities.filter(community => {
    const matchesSearch = 
      community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      community.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      community.creator.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || community.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout pageTitle="Communities Management">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="border-b border-border/60 pb-5">
          <p className="noir-eyebrow mb-1">Guilds & Collectives</p>
          <h1 className="text-3xl font-display font-bold text-foreground">Communities Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and monitor community groups</p>
        </div>

        {/* Main Content Card */}
        <Card className="noir-card border-border/80 bg-card">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-2xl font-display">Communities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search communities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-surface-elevated border-border/80"
                />
              </div>
              
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Status:</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-surface-elevated border-border/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Communities Table */}
            <div className="border border-border/80 rounded-xl overflow-hidden bg-surface-elevated/40">
              <Table>
                <TableHeader className="bg-surface-elevated">
                  <TableRow className="border-border/70">
                    <TableHead>Community</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                          <span>Loading communities from database...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredCommunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {fetchError ? `Error: ${fetchError}` : "No communities found matching the criteria."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCommunities.map((community) => (
                    <TableRow key={community.id} className="border-border/60 hover:bg-surface-hover/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-foreground">{community.name}</span>
                          <span className="text-sm text-muted-foreground truncate max-w-xs">
                            {community.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col font-mono">
                          <span className="font-medium text-foreground">{community.totalMembers.toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">
                            {community.activeMembers.toLocaleString()} active
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">{community.creator.name}</span>
                            <span className="text-xs font-mono text-muted-foreground">@{community.creator.username}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusBadgeStyle(community.status)}>
                          {community.status === "Active" ? (
                            <Shield className="h-3 w-3 mr-1" />
                          ) : (
                            <Eye className="h-3 w-3 mr-1" />
                          )}
                          {community.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-2 flex-1">
                            {community.tags.map((tag, index) => (
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
                            open={editingTags?.id === community.id}
                            onOpenChange={(open) => {
                              if (open) {
                                handleEditTags(community.id, community.tags);
                              } else {
                                setEditingTags(null);
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10"
                              >
                                <Tags className="h-4 w-4 text-primary" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 bg-card border-border/80" align="end">
                              <Command className="bg-card">
                                <CommandInput placeholder="Search tags..." />
                                <CommandEmpty>No tags found.</CommandEmpty>
                                <CommandGroup>
                                  {availableTags.map((tag) => {
                                    const isSelected = editingTags?.tags.includes(tag.label);
                                    return (
                                      <CommandItem
                                        key={tag.value}
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
                                    onClick={() => handleSaveCommunityTags(community.id)}
                                  >
                                    Save Changes
                                  </Button>
                                </div>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col font-mono">
                          <span className="text-sm text-foreground">{community.lastActive}</span>
                          <span className="text-xs text-muted-foreground">
                            Created: {community.dateCreated}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteCommunity(community.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )))}
                </TableBody>
              </Table>
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
              <span>Showing {filteredCommunities.length} communities</span>
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
      </div>
    </AdminLayout>
  );
}
