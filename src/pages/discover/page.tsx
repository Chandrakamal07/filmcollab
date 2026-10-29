"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Search,
  Filter,
  MapPin,
  User as UserIcon,
  UserPlus,
  Star,
  Award,
  Briefcase,
  GraduationCap,
  Heart,
  Users,
  Globe,
  MoreVertical,
  Bookmark,
  Share2,
  X,
  Check,
  Clock,
  UserCheck,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryDropdown } from "@/components/ui/category-dropdown";
import { FadeInSection, StaggerItem } from "@/components/ui/motion-primitives";

interface User {
  id: string;
  user_id?: string;
  full_name: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  role?: string;
  website?: string;
  skills?: string[];
  tags?: string[];
  experience_level?: string;
  category?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  github_url?: string;
  created_at: string;
  is_verified?: boolean;
  followers_count?: number;
  projects_count?: number;
  posts_count?: number;
  likes_count?: number;
  is_liked?: boolean;
  is_saved?: boolean;
  connection_status?: string | null;
  connection_initiator?: string | null;
  allow_connections_from?: string;
  total_experience?: string;
  price_per_day?: number;
  price_per_hour?: number;
  price_negotiable?: boolean;
}

type FilterType = "all" | "verified" | "new" | "popular";
type SortType = "recent" | "popular" | "alphabetical";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortType, setSortType] = useState<SortType>("recent");
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [minLikes, setMinLikes] = useState(0);
  const [currentTab, setCurrentTab] = useState<"discover" | "liked" | "saved">("discover");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 12;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*, settings(privacy_settings)");

      if (profilesError) {
        throw profilesError;
      }

      let likedUserIds: string[] = [];
      let savedUserIds: string[] = [];

      interface DBConnection {
        id: string;
        user_id: string;
        connected_user_id: string;
        status: string;
        created_at?: string;
        updated_at?: string;
      }
      let connectionsData: DBConnection[] = [];

      if (profile?.id) {
        const { data: likesData } = await supabase
          .from("user_likes")
          .select("liked_user_id")
          .eq("user_id", profile.id);

        if (likesData) {
          likedUserIds = likesData.map((l) => l.liked_user_id);
        }

        const { data: savesData } = await supabase
          .from("user_saves")
          .select("saved_user_id")
          .eq("user_id", profile.id);

        if (savesData) {
          savedUserIds = savesData.map((s) => s.saved_user_id);
        }

        const { data: connData } = await supabase
          .from("connections")
          .select("*")
          .or(`user_id.eq.${profile.id},connected_user_id.eq.${profile.id}`);

        if (connData) {
          connectionsData = connData;
        }
      }

      interface DBProfile {
        id: string;
        user_id: string | null;
        full_name?: string | null;
        username?: string | null;
        email?: string | null;
        avatar_url?: string | null;
        bio?: string | null;
        location?: string | null;
        role?: string | null;
        website?: string | null;
        skills?: string[] | null;
        tags?: string[] | null;
        experience_level?: string | null;
        category?: string | null;
        portfolio_url?: string | null;
        linkedin_url?: string | null;
        created_at?: string | null;
        is_verified?: boolean | null;
        followers_count?: number | null;
        projects_count?: number | null;
        posts_count?: number | null;
        likes_count?: number | null;
        total_experience?: string | null;
        price_per_day?: number | null;
        price_per_hour?: number | null;
        price_negotiable?: boolean | null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        settings?: any[];
      }

      const mappedUsers: User[] = ((profilesData as DBProfile[]) || [])
        .filter((p: DBProfile) => {
          if (profile?.id && p.id === profile.id) return false;
          if (user?.id && p.user_id === user.id) return false;
          const roleLower = (p.role || "").toLowerCase();
          if (roleLower === "admin") return false;
          const settingsObj = Array.isArray(p.settings)
            ? p.settings.length > 0
              ? p.settings[0]
              : null
            : p.settings;
          const privacySettings = settingsObj?.privacy_settings;
          const visibility = privacySettings?.profileVisibility || "public";
          if (visibility !== "public") return false;

          const visibleToCategories = settingsObj?.visible_to_categories || ["all"];
          if (!visibleToCategories.includes("all")) {
            const viewerCategory = profile?.category || profile?.role;
            if (!viewerCategory || !visibleToCategories.includes(viewerCategory)) {
              return false;
            }
          }
          return true;
        })
        .map((p: DBProfile) => {
          const conn = connectionsData.find(
            (c) =>
              (c.user_id === profile?.id && c.connected_user_id === p.id) ||
              (c.user_id === p.id && c.connected_user_id === profile?.id),
          );
          return {
            id: p.id,
            user_id: p.user_id || undefined,
            full_name: p.full_name || p.username || "Anonymous",
            username: p.username || "",
            email: p.email || "",
            avatar_url:
              p.avatar_url ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
            bio: p.bio || "",
            location: p.location || "",
            role: p.category || p.role || "Creator",
            website: p.website || "",
            skills: p.skills || [],
            tags: p.tags || [],
            experience_level: p.experience_level || "Entry",
            category: p.category || "",
            portfolio_url: p.portfolio_url || "",
            linkedin_url: p.linkedin_url || "",
            created_at: p.created_at || new Date().toISOString(),
            is_verified: p.is_verified || false,
            followers_count: p.followers_count || 0,
            projects_count: p.projects_count || 0,
            posts_count: p.posts_count || 0,
            likes_count: p.likes_count || 0,
            is_liked: likedUserIds.includes(p.id),
            is_saved: savedUserIds.includes(p.id),
            connection_status: conn?.status || null,
            connection_initiator: conn?.user_id || null,
            total_experience: p.total_experience || undefined,
            price_per_day: p.price_per_day || undefined,
            price_per_hour: p.price_per_hour || undefined,
            price_negotiable: p.price_negotiable || undefined,
            allow_connections_from: Array.isArray(p.settings)
              ? p.settings.length > 0
                ? p.settings[0].privacy_settings?.allowConnectionRequests
                : null
              : p.settings
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ? (p.settings as any).privacy_settings?.allowConnectionRequests
                : null,
          };
        });

      setUsers(mappedUsers);
    } catch (err) {
      console.error("Error fetching discover users:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch creators from the database.",
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.id, user?.id, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleCategory = (category: string) => {
    setCategoryFilters((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
    resetPaging();
  };

  const filtered = useMemo(() => {
    let filteredUsers = [...users];

    if (profile?.id) {
      filteredUsers = filteredUsers.filter((u) => u.id !== profile.id);
    } else if (user?.id) {
      filteredUsers = filteredUsers.filter((u) => u.user_id !== user.id);
    }

    if (currentTab === "liked") {
      filteredUsers = filteredUsers.filter((u) => u.is_liked);
    } else if (currentTab === "saved") {
      filteredUsers = filteredUsers.filter((u) => u.is_saved);
    }

    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.full_name.toLowerCase().includes(searchTerm) ||
          u.username?.toLowerCase().includes(searchTerm) ||
          u.role?.toLowerCase().includes(searchTerm) ||
          u.bio?.toLowerCase().includes(searchTerm) ||
          u.skills?.some((skill) => skill.toLowerCase().includes(searchTerm)) ||
          u.location?.toLowerCase().includes(searchTerm),
      );
    }

    if (filterType !== "all") {
      filteredUsers = filteredUsers.filter((u) => {
        switch (filterType) {
          case "verified":
            return u.is_verified;
          case "new": {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return new Date(u.created_at) > thirtyDaysAgo;
          }
          case "popular":
            return (u.followers_count || 0) > 1000;
          default:
            return true;
        }
      });
    }

    if (categoryFilters.length > 0) {
      filteredUsers = filteredUsers.filter(
        (u) => u.category && categoryFilters.includes(u.category),
      );
    }

    if (locationFilter.trim()) {
      const loc = locationFilter.toLowerCase();
      filteredUsers = filteredUsers.filter((u) => u.location?.toLowerCase().includes(loc));
    }

    if (minLikes > 0) {
      filteredUsers = filteredUsers.filter((u) => (u.likes_count || 0) >= minLikes);
    }

    filteredUsers.sort((a, b) => {
      switch (sortType) {
        case "popular":
          return (b.followers_count || 0) - (a.followers_count || 0);
        case "alphabetical":
          return a.full_name.localeCompare(b.full_name);
        case "recent":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return filteredUsers;
  }, [
    users,
    currentTab,
    query,
    filterType,
    sortType,
    categoryFilters,
    locationFilter,
    minLikes,
    profile?.id,
    user?.id,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetPaging() {
    setPage(1);
  }

  const handleConnect = async (
    userId: string,
    userName: string,
    currentStatus?: string | null,
    initiatorId?: string | null,
  ) => {
    try {
      if (!user?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to connect with users.",
        });
        return;
      }

      if (!profile?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Your user profile could not be found.",
        });
        return;
      }

      if (currentStatus === "accepted") {
        toast({
          title: "Connected",
          description: `You are already connected with ${userName}.`,
        });
        return;
      }

      if (currentStatus === "pending") {
        if (initiatorId && initiatorId !== profile.id) {
          const { error: updateError } = await supabase
            .from("connections")
            .update({ status: "accepted" })
            .match({ user_id: initiatorId, connected_user_id: profile.id });

          if (updateError) throw updateError;

          toast({
            title: "Connection Request Accepted",
            description: `You are now connected with ${userName}!`,
          });

          await supabase.from("notifications").insert({
            user_id: initiatorId,
            title: "Connection Accepted",
            description: `${profile.full_name || profile.username || "Someone"} accepted your connection request.`,
            type: "connection",
            action_url: `/profile/${profile.id}`,
          });

          fetchUsers();
          return;
        } else {
          toast({
            title: "Request Pending",
            description: `Your connection request to ${userName} is still pending.`,
          });
          return;
        }
      }

      const { data: existingConnection, error: checkError } = await supabase
        .from("connections")
        .select("*")
        .or(
          `and(user_id.eq.${profile.id},connected_user_id.eq.${userId}),and(user_id.eq.${userId},connected_user_id.eq.${profile.id})`,
        )
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingConnection) {
        toast({
          title: "Connection Already Exists",
          description: `You already have a connection status of '${existingConnection.status}' with ${userName}.`,
        });
        fetchUsers();
        return;
      }

      const { error: insertError } = await supabase.from("connections").insert({
        user_id: profile.id,
        connected_user_id: userId,
        status: "pending",
      });

      if (insertError) throw insertError;

      toast({
        title: "Connection Request Sent",
        description: `Connection request sent to ${userName}`,
      });

      await supabase.from("notifications").insert({
        user_id: userId,
        title: "New Connection Request",
        description: `${profile.full_name || profile.username || "Someone"} sent you a connection request.`,
        type: "connection",
        action_url: `/profile/${profile.id}`,
      });

      fetchUsers();
    } catch (error) {
      console.error("Error in handleConnect:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to perform connection action. Please try again.",
      });
    }
  };

  const handleLike = async (userId: string, userName: string) => {
    try {
      if (!user?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to like users.",
        });
        return;
      }

      if (!profile?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Your user profile could not be found.",
        });
        return;
      }

      const currentUserItem = users.find((u) => u.id === userId);
      const isCurrentlyLiked = currentUserItem?.is_liked || false;

      if (isCurrentlyLiked) {
        await supabase
          .from("notifications")
          .delete()
          .eq("user_id", userId)
          .eq("action_url", `/profile/${profile.id}`)
          .eq("type", "profile");

        const { error: deleteError } = await supabase
          .from("user_likes")
          .delete()
          .eq("user_id", profile.id)
          .eq("liked_user_id", userId);

        if (deleteError) throw deleteError;

        const currentLikesCount = currentUserItem?.likes_count || 0;
        const newLikesCount = Math.max(0, currentLikesCount - 1);

        await supabase
          .from("profiles")
          .update({ likes_count: newLikesCount })
          .eq("id", userId);

        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === userId ? { ...u, is_liked: false, likes_count: newLikesCount } : u,
          ),
        );
      } else {
        const { error: insertError } = await supabase.from("user_likes").insert({
          user_id: profile.id,
          liked_user_id: userId,
        });

        if (insertError) throw insertError;

        await supabase.from("notifications").insert({
          user_id: userId,
          title: "New Profile Like",
          description: `${profile.full_name || profile.username || "Someone"} liked your profile.`,
          type: "profile",
          action_url: `/profile/${profile.id}`,
        });

        const currentLikesCount = currentUserItem?.likes_count || 0;
        const newLikesCount = currentLikesCount + 1;

        await supabase
          .from("profiles")
          .update({ likes_count: newLikesCount })
          .eq("id", userId);

        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === userId ? { ...u, is_liked: true, likes_count: newLikesCount } : u,
          ),
        );
      }

      toast({
        title: isCurrentlyLiked ? "User Unliked" : "User Liked",
        description: isCurrentlyLiked
          ? `You unliked ${userName}'s profile`
          : `You liked ${userName}'s profile`,
      });
    } catch (error) {
      console.error("Error liking user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to like user. Please try again.",
      });
    }
  };

  const handleSave = async (userId: string, userName: string) => {
    try {
      if (!user?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please sign in to save users.",
        });
        return;
      }

      if (!profile?.id) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Your user profile could not be found.",
        });
        return;
      }

      const currentUserItem = users.find((u) => u.id === userId);
      const isCurrentlySaved = currentUserItem?.is_saved || false;

      if (isCurrentlySaved) {
        const { error: deleteError } = await supabase
          .from("user_saves")
          .delete()
          .eq("user_id", profile.id)
          .eq("saved_user_id", userId);

        if (deleteError) throw deleteError;

        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === userId ? { ...u, is_saved: false } : u)),
        );
      } else {
        const { error: insertError } = await supabase.from("user_saves").insert({
          user_id: profile.id,
          saved_user_id: userId,
        });

        if (insertError) throw insertError;

        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === userId ? { ...u, is_saved: true } : u)),
        );
      }

      toast({
        title: isCurrentlySaved ? "User Unsaved" : "User Saved",
        description: isCurrentlySaved
          ? `You unsaved ${userName}'s profile`
          : `You saved ${userName}'s profile`,
      });
    } catch (error) {
      console.error("Error saving user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save user. Please try again.",
      });
    }
  };

  const handleShare = async (userId: string, userName: string) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${userName}'s Profile`,
          text: `Check out ${userName}'s profile on FilmCollab`,
          url: `${window.location.origin}/profile/${userId}`,
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/profile/${userId}`);
        toast({
          title: "Link Copied",
          description: "Profile link copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Error sharing user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to share profile. Please try again.",
      });
    }
  };

  return (
    <AppLayout pageTitle="Talent Hub">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <FadeInSection className="bg-card p-6 rounded-xl shadow-soft border border-border/80">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div>
              <h1 className="noir-heading-workspace mb-1">Discover Creators</h1>
              <p className="text-muted-foreground text-sm">
                Connect with talented filmmakers, artists, and creative professionals
              </p>
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, skills, or location..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    resetPaging();
                  }}
                  className="pl-10 h-10"
                />
              </div>

              {/* Filter Sheet (Right Sidebar) */}
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="h-10 px-4 relative shrink-0">
                    <Filter className="w-4 h-4 mr-2 text-primary" />
                    Filters
                    {(filterType !== "all" ||
                      categoryFilters.length > 0 ||
                      locationFilter ||
                      minLikes > 0 ||
                      sortType !== "recent") && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
                      )}
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-full sm:max-w-md flex flex-col h-full bg-card border-l border-border/80 p-0"
                >
                  <div className="p-6 border-b border-border/70 flex items-center justify-between pr-12">
                    <div>
                      <SheetTitle className="text-lg font-semibold text-foreground">
                        Filter Creators
                      </SheetTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Refine your creative connections
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterType("all");
                        setCategoryFilters([]);
                        setLocationFilter("");
                        setMinLikes(0);
                        setSortType("recent");
                        resetPaging();
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                    >
                      Reset All
                    </Button>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6 pb-8">
                      {/* Filter by Type */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                          Filter by Type
                        </label>
                        <Select
                          value={filterType}
                          onValueChange={(value) => {
                            setFilterType(value as FilterType);
                            resetPaging();
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Users</SelectItem>
                            <SelectItem value="verified">Verified Only</SelectItem>
                            <SelectItem value="new">New Users (30 days)</SelectItem>
                            <SelectItem value="popular">Popular (1000+ followers)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Sort by */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                          Sort by
                        </label>
                        <Select
                          value={sortType}
                          onValueChange={(value) => {
                            setSortType(value as SortType);
                            resetPaging();
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select sort" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="recent">Most Recent</SelectItem>
                            <SelectItem value="popular">Most Popular</SelectItem>
                            <SelectItem value="alphabetical">Alphabetical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Location Filter */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                          Location
                        </label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="e.g. Austin, Toronto, Delhi..."
                            value={locationFilter}
                            onChange={(e) => {
                              setLocationFilter(e.target.value);
                              resetPaging();
                            }}
                            className="pl-9 h-10"
                          />
                        </div>
                      </div>

                      {/* Likes Count Slider */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                            Minimum Likes
                          </label>
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                            {minLikes}+ Likes
                          </Badge>
                        </div>
                        <Slider
                          value={[minLikes]}
                          onValueChange={(val) => {
                            setMinLikes(val[0]);
                            resetPaging();
                          }}
                          max={250}
                          step={5}
                          className="py-2"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>0</span>
                          <span>125</span>
                          <span>250</span>
                        </div>
                      </div>

                      {/* Categories Filter */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                          Categories
                        </label>
                        <CategoryDropdown
                          multiple
                          value={categoryFilters}
                          onChange={(vals) => setCategoryFilters(vals)}
                          placeholder={
                            categoryFilters.length === 0
                              ? "Select Categories..."
                              : `${categoryFilters.length} Selected`
                          }
                        />
                        {categoryFilters.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto mt-2 p-2 border border-dashed border-border/80 rounded-lg bg-surface-elevated/50">
                            {categoryFilters.map((cat) => (
                              <Badge
                                key={cat}
                                variant="secondary"
                                className="text-[11px] pr-1 flex items-center gap-1"
                              >
                                {cat}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleCategory(cat);
                                  }}
                                  className="rounded-full hover:bg-surface-hover p-0.5"
                                >
                                  <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </FadeInSection>

        {/* Tabs Bar */}
        <div className="flex justify-between items-center bg-card p-2.5 rounded-xl shadow-soft border border-border/80">
          <Tabs
            value={currentTab}
            onValueChange={(val) => {
              setCurrentTab(val as "discover" | "liked" | "saved");
              resetPaging();
            }}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="discover">
                <Users className="w-4 h-4 mr-2" />
                Discover
              </TabsTrigger>
              <TabsTrigger value="liked">
                <Heart className="w-4 h-4 mr-2" />
                Liked
              </TabsTrigger>
              <TabsTrigger value="saved">
                <Bookmark className="w-4 h-4 mr-2" />
                Saved
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="text-xs text-muted-foreground font-medium mr-2 hidden sm:block font-mono">
            {filtered.length} {filtered.length === 1 ? "Creator" : "Creators"} found
          </div>
        </div>

        {/* Users Grid */}
        <div>
          {loading ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border/80">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground text-sm">Loading creators...</p>
            </div>
          ) : pageItems.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border/80">
              <Users className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
              <h3 className="text-lg font-semibold mb-1.5 text-foreground">No creators found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search or filters to find more creators.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pageItems.map((userItem, idx) => (
                <StaggerItem key={userItem.id} index={idx} liftOnHover>
                  <Card className="h-full border-border/80 bg-card hover:border-primary/40 hover:shadow-noir overflow-hidden flex flex-col justify-between group">
                    <div>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <Avatar className="h-14 w-14 border border-primary/30 ring-2 ring-surface-elevated flex-shrink-0">
                              <AvatarImage
                                src={userItem.avatar_url}
                                alt={userItem.full_name}
                                className="object-cover"
                              />
                              <AvatarFallback className="bg-primary/15 text-primary font-semibold text-sm">
                                {userItem.full_name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                                <span className="truncate">{userItem.full_name}</span>
                                {userItem.is_verified && (
                                  <Badge
                                    variant="outline"
                                    className="border-primary/40 bg-primary/10 text-primary text-[10px] px-2 py-0"
                                  >
                                    Verified
                                  </Badge>
                                )}
                                {userItem.tags?.map((skill) => {
                                  const supportedLabels = [
                                    "Verified",
                                    "Popular",
                                    "Featured",
                                    "Trending",
                                    "Expert",
                                    "Mentor",
                                    "Influencer",
                                    "Rising Star",
                                  ];
                                  if (!supportedLabels.includes(skill)) return null;
                                  return (
                                    <Badge
                                      key={skill}
                                      variant="secondary"
                                      className="text-[10px] px-2 py-0.5 rounded-full font-medium h-fit leading-tight"
                                    >
                                      {skill}
                                    </Badge>
                                  );
                                })}
                              </CardTitle>
                              <div className="mt-1 flex flex-col">
                                <div className="flex items-center gap-1.5 text-xs font-medium flex-wrap">
                                  <span className="text-primary font-semibold">
                                    @
                                    {userItem.username ||
                                      userItem.full_name.toLowerCase().replace(/\s+/g, "")}
                                  </span>
                                  <span className="text-border">•</span>
                                  <span className="text-muted-foreground truncate">
                                    {userItem.role}
                                  </span>
                                </div>
                                {userItem.location && (
                                  <div className="text-xs text-muted-foreground/80 flex items-center mt-0.5 truncate">
                                    <MapPin className="w-3 h-3 mr-1 text-primary/70 flex-shrink-0" />
                                    {userItem.location}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Like Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={userItem.is_liked ? "Unlike profile" : "Like profile"}
                              onClick={() => handleLike(userItem.id, userItem.full_name)}
                              className={`h-8 w-8 p-0 rounded-full ${userItem.is_liked
                                  ? "text-primary hover:text-primary-hover"
                                  : "text-muted-foreground hover:text-primary"
                                }`}
                            >
                              <Heart
                                className={`w-4 h-4 ${userItem.is_liked ? "fill-current" : ""}`}
                              />
                            </Button>
                            <span className="text-xs font-semibold text-muted-foreground font-mono">
                              {userItem.likes_count || 0}
                            </span>

                            {/* 3 Dots Menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="More options"
                                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-full"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={() => handleSave(userItem.id, userItem.full_name)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Bookmark className="w-4 h-4 text-muted-foreground" />
                                  {userItem.is_saved ? "Unsave" : "Save"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleShare(userItem.id, userItem.full_name)}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <Share2 className="w-4 h-4 text-muted-foreground" />
                                  Share
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3.5">
                        {/* Bio */}
                        {userItem.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {userItem.bio}
                          </p>
                        )}

                        {/* Pricing and Experience */}
                        {(userItem.total_experience ||
                          userItem.price_per_day ||
                          userItem.price_per_hour) && (
                            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
                              {userItem.total_experience && (
                                <span className="flex items-center gap-1 bg-surface-elevated border border-border/70 text-foreground/90 px-2.5 py-1 rounded-md">
                                  <Briefcase className="w-3 h-3 text-muted-foreground" />
                                  {userItem.total_experience}
                                </span>
                              )}
                              {(userItem.price_per_day || userItem.price_per_hour) && (
                                <span className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-md border border-primary/30">
                                  <Award className="w-3 h-3" />
                                  {userItem.price_per_hour ? `₹${userItem.price_per_hour}/hr` : ""}
                                  {userItem.price_per_hour && userItem.price_per_day ? " • " : ""}
                                  {userItem.price_per_day ? `₹${userItem.price_per_day}/day` : ""}
                                  {userItem.price_negotiable ? " (Neg.)" : ""}
                                </span>
                              )}
                            </div>
                          )}

                        {/* Skills */}
                        {userItem.skills && userItem.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {userItem.skills.slice(0, 2).map((skill, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-[10px] border-border/80 bg-surface-elevated/60 text-foreground/90"
                              >
                                {skill}
                              </Badge>
                            ))}
                            {userItem.skills.length > 2 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-border/60 text-muted-foreground"
                              >
                                +{userItem.skills.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </div>

                    <CardContent className="pt-0 pb-4">
                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-border/60">
                        {userItem.id !== user?.id &&
                          (userItem.connection_status === "accepted" ? (
                            <Button
                              variant="secondary"
                              className="flex-1 text-xs h-9 border-success/40 bg-success/15 text-success hover:bg-success/20 cursor-default"
                              size="sm"
                            >
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                              Connected
                            </Button>
                          ) : userItem.connection_status === "pending" ? (
                            userItem.connection_initiator === profile?.id ? (
                              <Button
                                variant="secondary"
                                className="flex-1 text-xs h-9 cursor-not-allowed"
                                size="sm"
                                disabled
                              >
                                <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                                Request Sent
                              </Button>
                            ) : (
                              <Button
                                onClick={() =>
                                  handleConnect(
                                    userItem.id,
                                    userItem.full_name,
                                    userItem.connection_status,
                                    userItem.connection_initiator,
                                  )
                                }
                                className="flex-1 text-xs h-9"
                                size="sm"
                              >
                                <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                                Accept Request
                              </Button>
                            )
                          ) : (
                            <Button
                              onClick={() =>
                                handleConnect(
                                  userItem.id,
                                  userItem.full_name,
                                  userItem.connection_status,
                                  userItem.connection_initiator,
                                )
                              }
                              className="flex-1 text-xs h-9"
                              size="sm"
                              disabled={
                                userItem.allow_connections_from === "none" ||
                                userItem.allow_connections_from === "connections"
                              }
                            >
                              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                              Connect
                            </Button>
                          ))}
                        <Button
                          onClick={() => navigate(`/profile/${userItem.id}`)}
                          variant="outline"
                          className={`${userItem.id === user?.id ? "w-full" : "flex-1"} text-xs h-9`}
                          size="sm"
                        >
                          <UserIcon className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                          View Profile
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-card p-4 rounded-xl shadow-soft border border-border/80">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs text-muted-foreground font-medium font-mono">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)}{" "}
                of {filtered.length} creators
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="text-xs h-8"
                >
                  Previous
                </Button>
                <span className="text-xs text-foreground font-semibold px-3 font-mono">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="text-xs h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
