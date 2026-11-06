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
  Eye,
  Flag,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Tags,
  User,
  Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AdminPosts() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const [editingTags, setEditingTags] = useState<{ id: string | number; tags: string[] } | null>(null);

  // Available tags for posts
  const availableTags = [
    { value: "trending", label: "Trending", color: "orange" },
    { value: "featured", label: "Featured", color: "purple" },
    { value: "popular", label: "Popular", color: "green" },
    { value: "editors-pick", label: "Editor's Pick", color: "blue" },
    { value: "sponsored", label: "Sponsored", color: "yellow" }
  ];

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Load real posts from Supabase
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);
        const { data, error } = await supabase
          .from("posts")
          .select(`
            id,
            title,
            content,
            author_id,
            media_urls,
            media_types,
            hashtags,
            is_published,
            is_featured,
            created_at,
            profiles:author_id (id, full_name, username, avatar_url, category)
          `)
          .order("created_at", { ascending: false });

        if (error) {
          if (error.code !== "42P01") {
            setFetchError(error.message);
          }
          setPosts([]);
        } else {
          const mapped = (data || []).map((p: any) => {
            const prof = p.profiles || {};
            const name = prof.full_name || prof.username || "Creator";
            const mediaType = (p.media_types && p.media_types[0]) || (p.media_urls && p.media_urls.length > 0 ? "Image" : "Text");
            const typeFormatted = mediaType.charAt(0).toUpperCase() + mediaType.slice(1);
            return {
              id: p.id,
              content: p.content || p.title || "No content",
              type: typeFormatted,
              date: new Date(p.created_at).toISOString().split("T")[0],
              status: p.is_published ? "Published" : "Flagged",
              creator: {
                id: prof.id || p.author_id,
                name,
                username: prof.username || name.toLowerCase().replace(/\s+/g, ""),
                avatar: prof.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                category: prof.category || "General"
              },
              tags: p.hashtags && p.hashtags.length > 0 ? p.hashtags : (p.is_featured ? ["Featured"] : ["Trending"])
            };
          });
          setPosts(mapped);
        }
      } catch (err: any) {
        setFetchError(err.message || "Failed to load posts");
        setPosts([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "Text":
      case "Image":
      case "Video":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "Published":
      case "Pending":
        return "secondary";
      case "Flagged":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Published":
        return CheckCircle;
      case "Pending":
        return Clock;
      case "Flagged":
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getTagBadgeStyle = (tag: string): string => {
    const tagConfig = availableTags.find(t => t.label === tag);
    if (!tagConfig) return "bg-surface-elevated text-foreground border border-border/80";

    return ({
      orange: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
      purple: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
      green: "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30",
      blue: "bg-sky-500/15 text-sky-400 border border-sky-500/30",
      yellow: "bg-primary/15 text-primary border border-primary/30"
    }[tagConfig.color] || "bg-surface-elevated text-foreground");
  };

  // Filter posts based on search and filters
  const filteredPosts = posts.filter(post => {
    const matchesSearch =
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.creator.username.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || post.type.toLowerCase() === typeFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || post.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesType && matchesStatus;
  });

  const isUuid = (id: string | number): boolean => {
    return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  const handleViewPost = (postId: string | number) => {
    const p = posts.find(item => item.id === postId);
    if (p) {
      toast({
        title: `Post by ${p.creator.name}`,
        description: p.content.slice(0, 100)
      });
    }
  };

  const handleApprovePost = async (postId: string | number) => {
    if (!hasPermission("Posts", "edit")) {
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: "You do not have permission to approve posts."
      });
      return;
    }
    if (!isUuid(postId)) {
      toast({
        variant: "destructive",
        title: "Approve failed",
        description: "Cannot approve invalid or non-persisted post ID."
      });
      return;
    }
    const strId = String(postId);
    try {
      const { data, error } = await supabase
        .from("posts")
        .update({ is_published: true })
        .eq("id", strId)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Post not found or permission denied.");
      }
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: "Published" } : p));
      toast({
        title: "Post approved",
        description: "The post is now published and visible."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Approve failed",
        description: err?.message || "Failed to approve post in database."
      });
    }
  };

  const handleFlagPost = async (postId: string | number) => {
    if (!hasPermission("Posts", "edit")) {
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: "You do not have permission to moderate posts."
      });
      return;
    }
    if (!isUuid(postId)) {
      toast({
        variant: "destructive",
        title: "Flag failed",
        description: "Cannot flag invalid or non-persisted post ID."
      });
      return;
    }
    const strId = String(postId);
    try {
      const { data, error } = await supabase
        .from("posts")
        .update({ is_published: false })
        .eq("id", strId)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Post not found or permission denied.");
      }
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: "Flagged" } : p));
      toast({
        title: "Post flagged",
        description: "The post has been hidden and flagged for moderation."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Flag failed",
        description: err?.message || "Failed to flag post in database."
      });
    }
  };

  const handleDeletePost = async (postId: string | number) => {
    if (!hasPermission("Posts", "delete")) {
      toast({
        variant: "destructive",
        title: "Permission denied",
        description: "You do not have permission to delete posts."
      });
      return;
    }
    if (!isUuid(postId)) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Cannot delete invalid or non-persisted post ID."
      });
      return;
    }
    const strId = String(postId);
    try {
      const { data, error } = await supabase
        .from("posts")
        .delete()
        .eq("id", strId)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Post not found or permission denied.");
      }
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast({
        title: "Post deleted",
        description: "The post has been permanently removed."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: err?.message || "Failed to delete post."
      });
    }
  };

  const handleEditTags = (postId: string | number, currentTags: string[]) => {
    setEditingTags({ id: postId, tags: currentTags });
  };

  const handleSavePostTags = async (postId: string | number) => {
    if (!editingTags) return;
    if (!isUuid(postId)) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: "Cannot update tags for invalid or non-persisted post ID."
      });
      return;
    }
    const strId = String(postId);
    const newTags = editingTags.tags;
    try {
      const { data, error } = await supabase
        .from("posts")
        .update({ hashtags: newTags })
        .eq("id", strId)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Post not found or permission denied.");
      }
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, tags: newTags } : p));
      setEditingTags(null);
      toast({
        title: "Tags updated",
        description: "Post tags have been saved."
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: err?.message || "Failed to persist tags."
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

  return (
    <AdminLayout pageTitle="Posts Management" pageName="Posts">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="border-b border-border/60 pb-5">
          <p className="noir-eyebrow mb-1">Content Moderation</p>
          <h1 className="text-3xl font-display font-bold text-foreground">Posts Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Moderate user posts and content</p>
        </div>

        {/* Main Content Card */}
        <Card className="noir-card border-border/80 bg-card">
          <CardHeader className="border-b border-border/60">
            <CardTitle className="text-2xl font-display">Posts</CardTitle>
            <p className="text-muted-foreground text-sm">Review and moderate user-generated content</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Search and Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by content or creator..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-surface-elevated border-border/80"
                />
              </div>

              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Type:</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[120px] bg-surface-elevated border-border/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Status:</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[120px] bg-surface-elevated border-border/80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Posts Table */}
            <div className="border border-border/80 rounded-xl overflow-hidden bg-surface-elevated/40">
              <Table>
                <TableHeader className="bg-surface-elevated">
                  <TableRow className="border-border/70">
                    <TableHead>Post ID</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex items-center justify-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                          <span>Loading posts from database...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredPosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {fetchError ? `Error: ${fetchError}` : "No posts found matching the criteria."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPosts.map((post) => {
                      const StatusIcon = getStatusIcon(post.status);
                      return (
                        <TableRow key={post.id} className="border-border/60 hover:bg-surface-hover/50">
                          <TableCell className="font-mono font-medium text-muted-foreground">#{post.id}</TableCell>
                          <TableCell className="max-w-xs truncate text-foreground">{post.content}</TableCell>
                          <TableCell>
                            <Badge variant={getTypeBadgeVariant(post.type)} className="bg-surface-elevated border border-border/80 text-foreground">
                              {post.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                                <User className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">{post.creator.name}</span>
                                <span className="text-xs text-muted-foreground font-mono">@{post.creator.username}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{post.date}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(post.status)} className="flex items-center gap-1 w-fit">
                              <StatusIcon className="h-3 w-3" />
                              {post.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-wrap gap-2 flex-1">
                                {post.tags.map((tag, index) => (
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
                                open={editingTags?.id === post.id}
                                onOpenChange={(open) => {
                                  if (open) {
                                    handleEditTags(post.id, post.tags);
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
                                        onClick={() => handleSavePostTags(post.id)}
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
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewPost(post.id)}
                                className="h-8 w-8"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {post.status === "Pending" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleApprovePost(post.id)}
                                  className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}

                              {post.status !== "Flagged" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleFlagPost(post.id)}
                                  className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                                >
                                  <Flag className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeletePost(post.id)}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }))}
                </TableBody>
              </Table>
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
              <span>Showing {posts.length} posts</span>
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
