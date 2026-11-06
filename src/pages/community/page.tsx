"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search,
  Filter,
  Users,
  MessageSquare,
  Heart,
  Share2,
  MoreHorizontal,
  MapPin,
  Calendar,
  Clock,
  Star,
  UserPlus,
  Building2,
  Camera,
  Mic,
  PenTool,
  Scissors,
  Music,
  Palette,
  TrendingUp,
  Award,
  Globe,
  Hash,
  Bookmark,
  Eye,
  ThumbsUp,
  MessageCircle,
  Send,
  Image,
  Video,
  FileText,
  Plus,
  Settings,
  Bell,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  ExternalLink,
  X
} from "lucide-react";

export default function CommunityPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  // Real Database Groups State
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Group Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("Filmmaking");
  const [newGroupTags, setNewGroupTags] = useState("");
  const [newGroupPrivacy, setNewGroupPrivacy] = useState<"public" | "private">("public");

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("community_groups")
        .select(`
          *,
          community_group_members(id, user_id, role, joined_at)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Could not load community groups:", error.message);
        setGroups([]);
      } else if (data) {
        setGroups(data);
      }
    } catch (err: unknown) {
      console.error("Fetch groups error:", err);
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const myJoinedGroups = groups.filter((g) =>
    g.community_group_members?.some((m: any) => m.user_id === user?.id)
  );

  const myCreatedGroups = groups.filter((g) =>
    g.created_by === user?.id ||
    g.community_group_members?.some(
      (m: any) => m.user_id === user?.id && (m.role === "Owner" || m.role === "Admin")
    )
  );

  const filterGroupList = (list: any[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((group) => {
      const tags = Array.isArray(group.tags) ? group.tags : [];
      return (
        group.name?.toLowerCase().includes(q) ||
        group.description?.toLowerCase().includes(q) ||
        group.category?.toLowerCase().includes(q) ||
        tags.some((t: string) => t.toLowerCase().includes(q))
      );
    });
  };

  const filteredTrendingGroups = filterGroupList(groups);
  const filteredJoinedGroups = filterGroupList(myJoinedGroups);
  const filteredCreatedGroups = filterGroupList(myCreatedGroups);

  const handleJoinGroup = async (e: React.MouseEvent, group: any) => {
    e.stopPropagation();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "You must be logged in to join a community group.",
      });
      return;
    }

    const isMember = group.community_group_members?.some((m: any) => m.user_id === user.id);
    if (isMember) {
      navigate(`/community/joined-group/${group.id}`);
      return;
    }

    try {
      const reqApproval = group.require_approval ?? group.settings?.requireApproval ?? false;
      const roleToInsert = reqApproval ? "Pending" : "Member";

      const { error } = await supabase
        .from("community_group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: roleToInsert,
        });

      if (error) throw error;

      if (roleToInsert === "Pending") {
        toast({
          title: "Request Submitted",
          description: `Your request to join ${group.name} has been submitted for approval.`,
        });
      } else {
        toast({
          title: "Joined Group",
          description: `You are now a member of ${group.name}.`,
        });
      }
      await fetchGroups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to join group.";
      toast({
        variant: "destructive",
        title: "Could not join",
        description: msg,
      });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign in required",
        description: "You must be logged in to establish a group.",
      });
      return;
    }

    if (!newGroupName.trim()) {
      toast({
        variant: "destructive",
        title: "Name required",
        description: "Please enter a name for the group.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const tagArray = newGroupTags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      const { data: newGroup, error: groupErr } = await supabase
        .from("community_groups")
        .insert({
          name: newGroupName.trim(),
          description: newGroupDesc.trim(),
          category: newGroupCategory.trim() || "Filmmaking",
          tags: tagArray,
          privacy: newGroupPrivacy,
          created_by: user.id,
        })
        .select()
        .single();

      if (groupErr) throw groupErr;

      // Verify creator Owner membership (created automatically by DB trigger, or fallback upsert)
      const { data: existingMember } = await supabase
        .from("community_group_members")
        .select("id")
        .eq("group_id", newGroup.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existingMember) {
        const { error: memberErr } = await supabase
          .from("community_group_members")
          .upsert({
            group_id: newGroup.id,
            user_id: user.id,
            role: "Owner",
          }, { onConflict: "group_id,user_id" });

        if (memberErr && memberErr.code !== '23505') {
          // Atomic compensation: clean up orphaned group record only on genuine unrecoverable error
          await supabase.from("community_groups").delete().eq("id", newGroup.id);
          throw new Error(`Failed to establish owner membership: ${memberErr.message}. Group creation rolled back.`);
        }
      }

      toast({
        title: "Group Created",
        description: `${newGroup.name} has been created successfully.`,
      });

      setIsCreateOpen(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setNewGroupTags("");
      await fetchGroups();
      navigate(`/community/group/${newGroup.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create group.";
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGroupClick = (group: any) => {
    const isOwner = group.created_by === user?.id;
    const isMember = group.community_group_members?.some((m: any) => m.user_id === user?.id);

    if (activeTab === "created" || isOwner) {
      navigate(`/community/group/${group.id}`);
    } else if (activeTab === "joined" || isMember) {
      navigate(`/community/joined-group/${group.id}`);
    } else {
      setSelectedGroup(group);
      setShowGroupDetails(true);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 bg-background min-h-screen p-4 md:p-6">
        {/* Header */}
        <div className="bg-card p-5 rounded-xl shadow-noir border border-border/80">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="noir-eyebrow text-primary mb-1">Guilds & Collectives</p>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">Community</h1>
              <p className="text-muted-foreground text-sm">
                Connect with film professionals, join groups, and participate in discussions
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-surface-elevated border-border/80 rounded-lg text-sm"
                />
              </div>
              <Button variant="outline" className="h-9 px-3 border-border/80 bg-surface-elevated text-foreground hover:bg-surface-hover rounded-lg text-sm">
                <Filter className="w-4 h-4 mr-1.5" />
                Filters
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg text-sm shadow-noir font-medium"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Group
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-noir border border-border/80">
          <div className="flex border-b border-border/60 px-4">
            <button
              onClick={() => setActiveTab("groups")}
              className={`px-4 py-3 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "groups"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab("joined")}
              className={`px-4 py-3 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "joined"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Joined ({myJoinedGroups.length})
            </button>
            <button
              onClick={() => setActiveTab("created")}
              className={`px-4 py-3 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "created"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Created ({myCreatedGroups.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "groups" && (
          <div className="bg-card rounded-xl shadow-noir border border-border/80 p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground">All Guilds & Collectives</h2>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-border/80 bg-surface-elevated text-foreground hover:bg-surface-hover text-xs h-8"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  New Group
                </Button>
              </div>

              {loading ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-3 animate-pulse opacity-40 text-primary" />
                  <p className="text-sm">Loading community groups...</p>
                </div>
              ) : filteredTrendingGroups.length === 0 ? (
                <div className="py-16 text-center bg-surface-elevated/40 border border-border/80 rounded-xl p-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <h3 className="font-display text-lg font-semibold text-foreground">No community groups found</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1 mb-6 leading-relaxed">
                    {searchQuery
                      ? "No groups matched your query. Try a different search term or clear the filter."
                      : "Be the pioneer to establish a guild, collective, or crew forum for filmmakers on FilmCollab."}
                  </p>
                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create First Group
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTrendingGroups.map((group) => {
                    const isMember = group.community_group_members?.some((m: any) => m.user_id === user?.id);
                    const isOwner = group.created_by === user?.id;
                    const membersCount = group.community_group_members?.length || 1;
                    const tags = Array.isArray(group.tags) ? group.tags : [];

                    return (
                      <Card 
                        key={group.id} 
                        className="bg-surface-elevated border-border/80 hover:border-primary/40 shadow-noir transition-all rounded-xl cursor-pointer group"
                        onClick={() => handleGroupClick(group)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="font-display text-base text-foreground group-hover:text-primary transition-colors">
                                {group.name}
                              </CardTitle>
                              <CardDescription className="mt-1 text-muted-foreground text-xs leading-relaxed line-clamp-2">
                                {group.description || "No description provided."}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider bg-surface-elevated text-muted-foreground">
                              {group.category || "General"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-3 mb-3 font-mono text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-primary/80" />
                              <span>{membersCount} {membersCount === 1 ? "member" : "members"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-primary/80" />
                              <span className="capitalize">{group.privacy || "public"}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3 min-h-[22px]">
                            {tags.slice(0, 3).map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-[11px] bg-primary/10 text-primary border border-primary/25 font-mono">
                                #{tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex gap-1.5">
                            {isOwner ? (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/community/group/${group.id}`);
                                }}
                                className="flex-1 bg-surface-elevated text-foreground hover:bg-surface-hover border border-border/80 h-8 text-xs font-medium"
                              >
                                Manage Group
                              </Button>
                            ) : isMember ? (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/community/joined-group/${group.id}`);
                                }}
                                className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-8 text-xs font-medium"
                              >
                                Open Group
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={(e) => handleJoinGroup(e, group)}
                                className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-8 text-xs font-medium"
                              >
                                Join Group
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedGroup(group);
                                setShowGroupDetails(true);
                              }}
                              className="border-border/80 bg-card hover:bg-surface-hover h-8 w-8 p-0"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "joined" && (
          <div className="bg-card rounded-xl shadow-noir border border-border/80 p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground">My Joined Groups</h2>
                <Button
                  onClick={() => setActiveTab("groups")}
                  variant="outline"
                  size="sm"
                  className="border-border/80 bg-surface-elevated text-foreground hover:bg-surface-hover text-xs h-8"
                >
                  Browse All Groups
                </Button>
              </div>

              {filteredJoinedGroups.length === 0 ? (
                <div className="py-16 text-center bg-surface-elevated/40 border border-border/80 rounded-xl p-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <h3 className="font-display text-lg font-semibold text-foreground">No joined groups</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1 mb-6 leading-relaxed">
                    You haven't joined any community groups yet. Browse the directory to connect with other filmmakers.
                  </p>
                  <Button
                    onClick={() => setActiveTab("groups")}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir text-sm"
                  >
                    Browse Guilds
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredJoinedGroups.map((group) => {
                    const memberRecord = group.community_group_members?.find((m: any) => m.user_id === user?.id);
                    const membersCount = group.community_group_members?.length || 1;
                    const tags = Array.isArray(group.tags) ? group.tags : [];

                    return (
                      <Card 
                        key={group.id} 
                        className="bg-surface-elevated border-border/80 hover:border-primary/40 shadow-noir transition-all rounded-xl cursor-pointer group"
                        onClick={() => navigate(`/community/joined-group/${group.id}`)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="font-display text-base text-foreground group-hover:text-primary transition-colors">{group.name}</CardTitle>
                              <CardDescription className="mt-1 text-muted-foreground text-xs leading-relaxed line-clamp-2">
                                {group.description || "No description provided."}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider bg-surface-elevated text-muted-foreground">
                              {group.category || "General"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-3 mb-3 font-mono text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-primary/80" />
                              <span>{membersCount} {membersCount === 1 ? "member" : "members"}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3 min-h-[22px]">
                            {tags.slice(0, 3).map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-[11px] bg-primary/10 text-primary border border-primary/25 font-mono">
                                #{tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-3">
                            <span>Joined: {memberRecord?.joined_at ? new Date(memberRecord.joined_at).toLocaleDateString() : "Active"}</span>
                            <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30 uppercase">
                              {memberRecord?.role || "Member"}
                            </Badge>
                          </div>

                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/community/joined-group/${group.id}`);
                              }}
                              className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-8 text-xs font-medium"
                            >
                              Open Group
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "created" && (
          <div className="bg-card rounded-xl shadow-noir border border-border/80 p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground">My Created Groups</h2>
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover h-8 text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Create New Group
                </Button>
              </div>

              {filteredCreatedGroups.length === 0 ? (
                <div className="py-16 text-center bg-surface-elevated/40 border border-border/80 rounded-xl p-8">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                  <h3 className="font-display text-lg font-semibold text-foreground">No created groups</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1 mb-6 leading-relaxed">
                    You haven't founded any groups yet. Establish a guild to bring together collaborators for your projects.
                  </p>
                  <Button
                    onClick={() => setIsCreateOpen(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Your First Group
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCreatedGroups.map((group) => {
                    const membersCount = group.community_group_members?.length || 1;
                    const tags = Array.isArray(group.tags) ? group.tags : [];

                    return (
                      <Card 
                        key={group.id} 
                        className="bg-surface-elevated border-border/80 hover:border-primary/40 shadow-noir transition-all rounded-xl cursor-pointer group"
                        onClick={() => navigate(`/community/group/${group.id}`)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="font-display text-base text-foreground group-hover:text-primary transition-colors">{group.name}</CardTitle>
                              <CardDescription className="mt-1 text-muted-foreground text-xs leading-relaxed line-clamp-2">
                                {group.description || "No description provided."}
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider bg-surface-elevated text-muted-foreground">
                              {group.category || "General"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center gap-3 mb-3 font-mono text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-primary/80" />
                              <span>{membersCount} {membersCount === 1 ? "member" : "members"}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Globe className="w-3.5 h-3.5 text-primary/80" />
                              <span className="capitalize">{group.privacy || "public"}</span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-3 min-h-[22px]">
                            {tags.slice(0, 3).map((tag: string, index: number) => (
                              <Badge key={index} variant="secondary" className="text-[11px] bg-primary/10 text-primary border border-primary/25 font-mono">
                                #{tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/community/group/${group.id}`);
                              }}
                              className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-8 text-xs font-medium"
                            >
                              Manage Group
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Group Details Popup */}
        {showGroupDetails && selectedGroup && (() => {
          const isMember = selectedGroup.community_group_members?.some((m: any) => m.user_id === user?.id);
          const isOwner = selectedGroup.created_by === user?.id;
          const membersCount = selectedGroup.community_group_members?.length || 1;
          const tags = Array.isArray(selectedGroup.tags) ? selectedGroup.tags : [];

          return (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-card border border-border/80 shadow-noir rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
                    <div>
                      <h2 className="font-display text-xl font-bold text-foreground">{selectedGroup.name}</h2>
                      <p className="text-xs font-mono text-primary mt-0.5 uppercase tracking-wider">{selectedGroup.category || "General"}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowGroupDetails(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {/* Group Description */}
                    <div>
                      <h3 className="font-semibold text-sm mb-1 text-foreground">About This Group</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {selectedGroup.description || "No description provided for this group."}
                      </p>
                    </div>

                    {/* Group Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="bg-surface-elevated p-3 rounded-xl text-center border border-border/80">
                        <div className="text-lg font-mono font-bold text-primary">{membersCount}</div>
                        <div className="text-xs text-muted-foreground">Active Members</div>
                      </div>
                      <div className="bg-surface-elevated p-3 rounded-xl text-center border border-border/80">
                        <div className="text-lg font-mono font-bold text-primary capitalize">{selectedGroup.privacy || "public"}</div>
                        <div className="text-xs text-muted-foreground">Access</div>
                      </div>
                      <div className="bg-surface-elevated p-3 rounded-xl text-center border border-border/80 col-span-2 sm:col-span-1">
                        <div className="text-lg font-mono font-bold text-primary">
                          {selectedGroup.created_at ? new Date(selectedGroup.created_at).toLocaleDateString() : "Active"}
                        </div>
                        <div className="text-xs text-muted-foreground">Founded</div>
                      </div>
                    </div>

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-sm mb-2 text-foreground">Focus Tags</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-xs bg-surface-elevated text-muted-foreground border border-border/80 font-mono">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-border/60">
                      {isOwner ? (
                        <Button
                          onClick={() => {
                            setShowGroupDetails(false);
                            navigate(`/community/group/${selectedGroup.id}`);
                          }}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Group
                        </Button>
                      ) : isMember ? (
                        <Button
                          onClick={() => {
                            setShowGroupDetails(false);
                            navigate(`/community/joined-group/${selectedGroup.id}`);
                          }}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                        >
                          <Users className="w-4 h-4 mr-2" />
                          Open Group
                        </Button>
                      ) : (
                        <Button
                          onClick={(e) => {
                            setShowGroupDetails(false);
                            handleJoinGroup(e, selectedGroup);
                          }}
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Join Guild
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="border-border/80 bg-surface-elevated hover:bg-surface-hover"
                        onClick={() => {
                          navigator.clipboard?.writeText(window.location.origin + `/community/group/${selectedGroup.id}`);
                          toast({ title: "Link copied", description: "Group link copied to clipboard." });
                        }}
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Create Group Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-[500px] bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-foreground">Create Community Group</DialogTitle>
              <DialogDescription className="text-muted-foreground text-sm">
                Establish a new collective or guild for film industry professionals to collaborate.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateGroup} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="group-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Group Name *
                </Label>
                <Input
                  id="group-name"
                  placeholder="e.g. Independent Cinematographers Guild"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className="bg-surface-elevated border-border/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="group-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Category
                </Label>
                <Select value={newGroupCategory} onValueChange={setNewGroupCategory}>
                  <SelectTrigger id="group-category" className="bg-surface-elevated border-border/80">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/80">
                    <SelectItem value="Filmmaking">Filmmaking</SelectItem>
                    <SelectItem value="Cinematography">Cinematography</SelectItem>
                    <SelectItem value="Directing">Directing</SelectItem>
                    <SelectItem value="Screenwriting">Screenwriting</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                    <SelectItem value="Documentary">Documentary</SelectItem>
                    <SelectItem value="Audio & Sound">Audio & Sound</SelectItem>
                    <SelectItem value="Editing & VFX">Editing & VFX</SelectItem>
                    <SelectItem value="Networking">Networking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="group-desc" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </Label>
                <Textarea
                  id="group-desc"
                  placeholder="Describe the group's mission, audience, and collaboration goals..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  rows={3}
                  className="bg-surface-elevated border-border/80 resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="group-tags" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags (comma separated)
                </Label>
                <Input
                  id="group-tags"
                  placeholder="indie, lighting, 4k, post-production"
                  value={newGroupTags}
                  onChange={(e) => setNewGroupTags(e.target.value)}
                  className="bg-surface-elevated border-border/80"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="group-privacy" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Privacy
                </Label>
                <Select value={newGroupPrivacy} onValueChange={(val: "public" | "private") => setNewGroupPrivacy(val)}>
                  <SelectTrigger id="group-privacy" className="bg-surface-elevated border-border/80">
                    <SelectValue placeholder="Select privacy" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/80">
                    <SelectItem value="public">Public (anyone can discover and join)</SelectItem>
                    <SelectItem value="private">Private (requires creator invitation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="border-border/80 bg-surface-elevated hover:bg-surface-hover"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !newGroupName.trim()}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir font-medium"
                >
                  {isSubmitting ? "Creating..." : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
