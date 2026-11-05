import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  Image,
  Video,
  FileText,
  Music,
  User,
  Heart,
  MoreVertical,
  Bell,
  Ban,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminDirectory() {
  const [globalTags, setGlobalTags] = useState<{label: string, color: string}[]>([]);
  const [directoryItems, setDirectoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification dialog states
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [notifyUser, setNotifyUser] = useState<any>(null);
  const [notifyFile, setNotifyFile] = useState<any>(null);
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

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

  const fetchDirectoryItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("directory_files")
        .select(`
          *,
          profiles:user_id (id, full_name, username, avatar_url)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code !== '42P01') {
          console.error("Error fetching directory files:", error);
        }
        return;
      }

      setDirectoryItems(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalTags();
    fetchDirectoryItems();
  }, []);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editingTags, setEditingTags] = useState<{ id: string; tags: string[] } | null>(null);

  const getTypeBadgeVariant = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("image")) return "secondary";
    if (t.includes("video")) return "secondary";
    if (t.includes("document")) return "secondary";
    if (t.includes("audio")) return "secondary";
    return "outline";
  };

  const getTypeIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes("image")) return Image;
    if (t.includes("video")) return Video;
    if (t.includes("document")) return FileText;
    if (t.includes("audio")) return Music;
    return FileText;
  };

  const formatNumber = (num: number): string => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      try {
        const { error } = await supabase.from("directory_files").delete().eq("id", itemId);
        if (error) throw error;
        setDirectoryItems(prev => prev.filter(i => i.id !== itemId));
        toast.success("File deleted successfully");
      } catch (error) {
        console.error("Error deleting file:", error);
        toast.error("Failed to delete file");
      }
    }
  };

  const handleBlock = async (itemId: string) => {
    try {
      const item = directoryItems.find(i => i.id === itemId);
      const isBlocked = item?.status === "blocked" || (item?.tags && item.tags.includes("Blocked"));
      const newStatus = isBlocked ? "active" : "blocked";
      const currentTags = item?.tags || [];
      const updatedTags = isBlocked
        ? currentTags.filter((t: string) => t !== "Blocked")
        : [...currentTags, "Blocked"];

      const { error } = await supabase
        .from("directory_files")
        .update({ status: newStatus, tags: updatedTags })
        .eq("id", itemId);

      if (error) throw error;

      setDirectoryItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus, tags: updatedTags } : i));
      toast.success(isBlocked ? "File unblocked successfully" : "File blocked successfully");
    } catch (error: any) {
      console.error("Error toggling block state for file:", error);
      toast.error(error?.message || "Failed to update file moderation status");
    }
  };

  const handleOpenNotify = (item: any) => {
    const creator = item.profiles;
    if (!creator || !creator.id) {
      toast.error("Cannot send notification. Creator profile is missing.");
      return;
    }
    setNotifyUser(creator);
    setNotifyFile(item);
    setNotificationTitle(`Regarding your file: ${item.title}`);
    setNotificationMessage("");
    setIsNotifyDialogOpen(true);
  };

  const handleSendNotification = async () => {
    if (!notifyUser || !notifyFile || !notificationTitle.trim() || !notificationMessage.trim()) return;
    try {
      setIsSendingNotification(true);
      const fullDescription = `${notificationMessage.trim()}\n\nFile Details:\nTitle: ${notifyFile.title}\nType: ${notifyFile.file_type}`;
      
      const { error } = await supabase.from('notifications').insert({
        user_id: notifyUser.id,
        title: notificationTitle.trim(),
        description: fullDescription,
        type: 'system',
        priority: 'high',
        status: 'unread',
        action_url: `/directory`
      });

      if (error) throw error;

      toast.success("Notification sent successfully!");
      setIsNotifyDialogOpen(false);
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Failed to send notification.");
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Filter directory items based on search and filters
  const filteredItems = directoryItems.filter(item => {
    const matchesSearch = 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || item.file_type?.toLowerCase().includes(typeFilter.toLowerCase());
    
    return matchesSearch && matchesType;
  });

  return (
    <AdminLayout pageTitle="Directory Management">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/60 pb-5">
          <div>
            <p className="noir-eyebrow mb-1">Media Vault</p>
            <h1 className="text-3xl font-display font-bold text-foreground">Directory Management</h1>
          </div>
        </div>

        {/* Main Content Card */}
        <Card className="noir-card border-border/80 bg-card">
          <CardContent className="p-0">
            {/* Directory Table */}
            <div className="border border-border/80 rounded-xl overflow-hidden m-6 bg-surface-elevated/40">
              <Table>
                <TableHeader className="bg-surface-elevated">
                  <TableRow className="border-border/70">
                    <TableHead>ID</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Posted By</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : directoryItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No files found</TableCell>
                    </TableRow>
                  ) : directoryItems.map((item) => {
                    const TypeIcon = getTypeIcon(item.file_type);
                    const stats = item.stats || { downloads: 0, views: 0, likes: 0 };
                    return (
                      <TableRow key={item.id} className="border-border/60 hover:bg-surface-hover/50">
                        <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[80px]" title={item.id}>
                          {item.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{item.title}</span>
                            <span className="text-sm text-muted-foreground truncate max-w-[150px]">{item.description}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeBadgeVariant(item.file_type)} className="flex items-center gap-1 w-fit capitalize bg-surface-elevated border border-border/80 text-foreground">
                            <TypeIcon className="h-3 w-3 text-primary" />
                            {item.file_type?.replace(/s$/, '')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center overflow-hidden">
                              {item.profiles?.avatar_url ? (
                                <img src={item.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <User className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">{item.profiles?.full_name || "Unknown"}</span>
                              <span className="text-xs font-mono text-muted-foreground">@{item.profiles?.username || "unknown"}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm font-mono font-medium text-foreground" title="Likes">
                            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                            <span>{formatNumber(stats.likes)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.file_size || "Unknown"}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border/80">
                              <DropdownMenuItem onClick={() => handleOpenNotify(item)}>
                                <Bell className="mr-2 h-4 w-4 text-primary" />
                                <span>Notify</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleBlock(item.id)}>
                                <Ban className="mr-2 h-4 w-4 text-amber-500" />
                                <span>Block</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
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
            <div className="flex justify-between items-center m-6 mt-0 text-sm text-muted-foreground font-mono">
              <span>Showing {filteredItems.length} items</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="font-display">Send Notification</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">To:</label>
              <Input value={notifyUser ? `${notifyUser.full_name} (@${notifyUser.username})` : ''} disabled className="bg-surface-elevated border-border/80" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Title:</label>
              <Input 
                value={notificationTitle} 
                onChange={(e) => setNotificationTitle(e.target.value)}
                placeholder="Notification Title"
                className="bg-surface-elevated border-border/80"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Message:</label>
              <Textarea 
                value={notificationMessage} 
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                className="bg-surface-elevated border-border/80"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotifyDialogOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSendNotification} disabled={isSendingNotification || !notificationTitle.trim() || !notificationMessage.trim()}>
              {isSendingNotification ? "Sending..." : "Send Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AdminLayout>
  );
}
