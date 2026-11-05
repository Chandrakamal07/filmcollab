import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Search,
  MoreVertical,
  Trash2,
  Bell,
  Ban,
  Plus,
  Tag,
  Tags,
  Check,
  Edit2
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const getTagBadgeStyle = (tag: string) => {
  switch (tag) {
    case "Verified": return "bg-sky-500/15 text-sky-400 border border-sky-500/30";
    case "Popular": return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30";
    case "Featured": return "bg-primary/15 text-primary border border-primary/30";
    case "Trending": return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
    case "Expert": return "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30";
    case "Mentor": return "bg-rose-500/15 text-rose-400 border border-rose-500/30";
    default: return "bg-surface-elevated text-muted-foreground border border-border/70";
  }
};

export default function AdminLocations() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  const [isPropertyTypeDialogOpen, setIsPropertyTypeDialogOpen] = useState(false);
  const [newPropertyType, setNewPropertyType] = useState("");
  const [existingPropertyTypes, setExistingPropertyTypes] = useState<any[]>([]);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [notifyLocation, setNotifyLocation] = useState<any>(null);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");

  const [editingTags, setEditingTags] = useState<{ id: string, tags: string[] } | null>(null);

  const [globalTags, setGlobalTags] = useState<{label: string, color: string}[]>([]);

  const fetchGlobalTags = async () => {
    try {
      const { data, error } = await supabase.from("global_tags").select("name").order("name");
      if (error && error.code !== '42P01') throw error;
      if (data) {
        setGlobalTags(data.map(t => ({ label: t.name, color: "bg-surface-elevated text-foreground" })));
      }
    } catch (error) {
      console.error("Error fetching global tags:", error);
    }
  };

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("shooting_locations")
        .select(`
          id,
          name,
          type,
          city,
          state,
          price,
          owner_name,
          created_by,
          tags,
          created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast({ title: "Failed to fetch locations", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    fetchGlobalTags();
  }, []);

  const handleDeleteLocation = async () => {
    if (!locationToDelete) return;
    try {
      const { error } = await supabase.from("shooting_locations").delete().eq("id", locationToDelete);
      if (error) throw error;
      setLocations(prev => prev.filter(l => l.id !== locationToDelete));
      toast({ title: "Location deleted successfully" });
    } catch (error) {
      toast({ title: "Failed to delete location", variant: "destructive" });
    } finally {
      setLocationToDelete(null);
    }
  };

  const handleBlock = async (id: string) => {
    try {
      const loc = locations.find(l => l.id === id);
      const currentTags = loc?.tags || [];
      const isBlocked = currentTags.includes("Blocked");
      const updatedTags = isBlocked
        ? currentTags.filter((t: string) => t !== "Blocked")
        : [...currentTags, "Blocked"];

      const { data, error } = await supabase
        .from("shooting_locations")
        .update({ tags: updatedTags })
        .eq("id", id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No location was updated. Permission denied.");
      }

      setLocations(prev =>
        prev.map(l => (l.id === id ? { ...l, tags: updatedTags } : l))
      );

      toast({
        title: isBlocked ? "Location unblocked" : "Location blocked",
        description: isBlocked ? "Location is now visible to users." : "Location has been flagged as blocked."
      });
    } catch (error: any) {
      console.error("Error updating location status:", error);
      toast({
        variant: "destructive",
        title: "Block action failed",
        description: error?.message || "Could not update location moderation status."
      });
    }
  };

  const handleOpenNotify = (loc: any) => {
    setNotifyLocation(loc);
    setNotifyTitle(`Regarding your location: ${loc.name}`);
    setNotifyMessage("");
    setIsNotifyDialogOpen(true);
  };

  const handleSendNotification = async () => {
    if (!notifyLocation || !notifyTitle.trim() || !notifyMessage.trim()) return;
    
    const targetUserId = notifyLocation.created_by;
    if (!targetUserId) {
      toast({ title: "Cannot send notification", description: "This location has no associated user.", variant: "destructive" });
      return;
    }

    try {
      const fullDescription = `${notifyMessage.trim()}\n\nLocation Details:\nName: ${notifyLocation.name}\nCity: ${notifyLocation.city}, ${notifyLocation.state}\nType: ${notifyLocation.type}`;

      const { error } = await supabase.from("notifications").insert({
        user_id: targetUserId,
        title: notifyTitle.trim(),
        description: fullDescription,
        type: 'project',
        priority: 'high',
        status: 'unread',
        action_url: `/locations/${notifyLocation.id}`
      });

      if (error) throw error;
      toast({ title: "Notification sent successfully!" });
      setIsNotifyDialogOpen(false);
    } catch (error) {
      toast({ title: "Failed to send notification", variant: "destructive" });
    }
  };

  const handleEditTags = (id: string, currentTags: string[]) => {
    setEditingTags({ id, tags: currentTags });
  };

  const handleTagToggle = (tagLabel: string) => {
    if (!editingTags) return;
    setEditingTags(prev => {
      if (!prev) return prev;
      const newTags = prev.tags.includes(tagLabel)
        ? prev.tags.filter(t => t !== tagLabel)
        : [...prev.tags, tagLabel];
      return { ...prev, tags: newTags };
    });
  };

  const handleSaveLocationTags = async (locationId: string) => {
    if (!editingTags) return;
    try {
      const { error } = await supabase
        .from('shooting_locations')
        .update({ tags: editingTags.tags })
        .eq('id', locationId);
        
      if (error) throw error;
      
      setLocations(prev => 
        prev.map(loc => 
          loc.id === locationId ? { ...loc, tags: editingTags.tags } : loc
        )
      );
      
      toast({ title: "Tags updated successfully!" });
      setEditingTags(null);
    } catch (error) {
      console.error("Error updating tags:", error);
      toast({ title: "Failed to update tags", variant: "destructive" });
    }
  };

  const filteredLocations = locations.filter(loc => {
    return loc.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           loc.city?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <AdminLayout pageTitle="Shooting Locations" pageName="Locations">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="noir-eyebrow">Location Scouting</span>
            <h1 className="font-display text-3xl font-bold text-foreground mt-0.5">Shooting Locations</h1>
            <p className="text-muted-foreground mt-1">Manage listed properties</p>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium" onClick={() => navigate("/locations/new")}>
              <Plus className="h-4 w-4 mr-2" />
              List Property
            </Button>
          </div>
        </div>

        <Card className="noir-card border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/60">
            <CardTitle className="font-display text-xl text-foreground">All Locations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by property name or city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-surface-elevated border-border/80"
                />
              </div>
            </div>

            <div className="border border-border/70 rounded-xl overflow-x-auto">
              <Table>
                <TableHeader className="bg-surface-elevated/60">
                  <TableRow className="border-border/70 hover:bg-transparent">
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Property Name</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Type</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Location</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Owner</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Price (₹)</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tags</TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Date Added</TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading locations...</TableCell>
                    </TableRow>
                  ) : filteredLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No locations found.</TableCell>
                    </TableRow>
                  ) : filteredLocations.map((loc) => (
                    <TableRow 
                      key={loc.id}
                      className="cursor-pointer border-border/60 hover:bg-surface-hover/50 transition-colors"
                      onClick={() => navigate(`/admin-dashboard/locations/${loc.id}`)}
                    >
                      <TableCell className="font-medium text-foreground">{loc.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize bg-surface-elevated border border-border/70 text-foreground">{loc.type}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{loc.city}, {loc.state}</TableCell>
                      <TableCell className="text-foreground">{loc.owner_name || "Unknown"}</TableCell>
                      <TableCell className="font-mono text-primary font-medium">₹{loc.price}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex flex-wrap gap-1.5 flex-1 max-w-[280px]">
                            {!loc.tags || loc.tags.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">No tags</span>
                            ) : (
                              loc.tags.map((tag: string, index: number) => (
                                <Badge 
                                  key={index}
                                  variant="secondary" 
                                  className={cn("text-[10px] px-2 py-0.5 font-semibold", getTagBadgeStyle(tag) || "")}
                                >
                                  {tag}
                                </Badge>
                              ))
                            )}
                          </div>
                          <Popover 
                            open={editingTags?.id === loc.id}
                            onOpenChange={(open) => {
                              if (open) {
                                handleEditTags(loc.id, loc.tags || []);
                              } else {
                                setEditingTags(null);
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full hover:bg-primary/15 shrink-0"
                                title="Edit Tags"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Tags className="h-3.5 w-3.5 text-primary" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 bg-card border-border/80" align="end" onClick={(e) => e.stopPropagation()}>
                              <Command className="bg-card">
                                <CommandInput placeholder="Search tags..." />
                                <CommandEmpty>No tags found.</CommandEmpty>
                                <CommandGroup className="max-h-[220px] overflow-y-auto">
                                  {globalTags.map((tag) => {
                                    const isSelected = editingTags?.tags.includes(tag.label);
                                    return (
                                      <CommandItem
                                        key={tag.label}
                                        onSelect={() => handleTagToggle(tag.label)}
                                        className="flex items-center gap-2 cursor-pointer py-2 hover:bg-surface-hover"
                                      >
                                        <div className={cn(
                                          "flex h-4 w-4 items-center justify-center rounded border transition-colors",
                                          isSelected ? "bg-primary border-primary" : "border-border"
                                        )}>
                                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                        </div>
                                        <Badge 
                                          variant="secondary"
                                          className={cn("text-xs font-semibold", getTagBadgeStyle(tag.label) || "")}
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
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                    onClick={() => handleSaveLocationTags(loc.id)}
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
                        <span className="text-xs font-mono text-muted-foreground">{new Date(loc.created_at).toLocaleDateString()}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="ghost" 
                              className="h-8 w-8 p-0 hover:bg-surface-hover"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card border-border/80" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleBlock(loc.id); }}>
                              <Ban className="mr-2 h-4 w-4" />
                              Block
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenNotify(loc); }}>
                              <Bell className="mr-2 h-4 w-4" />
                              Notify
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:bg-destructive/15 focus:text-destructive" onClick={(e) => { e.stopPropagation(); setLocationToDelete(loc.id); }}>
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={!!locationToDelete} onOpenChange={(open) => !open && setLocationToDelete(null)}>
          <AlertDialogContent className="bg-card border-border/80">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the property listing.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-surface-elevated border-border/70">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteLocation} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
          <DialogContent className="bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> 
                Send Direct Notification
              </DialogTitle>
              <DialogDescription>
                Compose a direct system notification to <strong>{notifyLocation?.owner_name || 'Admin'}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notification Title</label>
                <Input 
                  placeholder="e.g. Action Required" 
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  className="bg-surface-elevated border-border/80"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Notification Message</label>
                <textarea 
                  className="flex min-h-[100px] w-full rounded-md border border-border/80 bg-surface-elevated px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                  placeholder="Type your message here..."
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-border/70 bg-surface-elevated" onClick={() => setIsNotifyDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSendNotification} className="bg-primary hover:bg-primary/90 text-primary-foreground">Send Notification</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
