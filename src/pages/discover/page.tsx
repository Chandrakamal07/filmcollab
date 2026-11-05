"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Search,
  MapPin,
  User as UserIcon,
  UserPlus,
  Award,
  Briefcase,
  Heart,
  Users,
  MoreVertical,
  Bookmark,
  Share2,
  X,
  Check,
  Clock,
  UserCheck,
  SlidersHorizontal,
  Play,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Film,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CategoryDropdown } from "@/components/ui/category-dropdown";
import {
  FadeInSection,
  StaggerContainer,
  StaggerItem,
  DimensionalCard,
  DimensionalLayer,
  ImageReveal,
} from "@/components/ui/motion-primitives";

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

const PORTRAIT_FALLBACKS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=700&q=80",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=700&q=80",
];

const SHOWREEL_STILLS = [
  [
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=600&q=80",
  ],
  [
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
  ],
];

const DEFAULT_AVATAR_PLACEHOLDER =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face";

function getPortraitImage(userItem: User, idx: number): string {
  if (
    userItem.avatar_url &&
    userItem.avatar_url !== DEFAULT_AVATAR_PLACEHOLDER &&
    userItem.avatar_url.trim().length > 0
  ) {
    return userItem.avatar_url;
  }
  const hash = userItem.id
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), idx);
  return PORTRAIT_FALLBACKS[hash % PORTRAIT_FALLBACKS.length];
}

export default function DiscoverPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(() => searchParams.get("q") || searchParams.get("search") || "");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [sortType, setSortType] = useState<SortType>("recent");
  const [categoryFilters, setCategoryFilters] = useState<string[]>(() => {
    const craft = searchParams.get("craft") || searchParams.get("category");
    return craft ? [craft] : [];
  });

  // Synchronize search and craft filters whenever URL search parameters change
  useEffect(() => {
    const q = searchParams.get("q") || searchParams.get("search") || "";
    if (q !== query) {
      setQuery(q);
    }
    const craft = searchParams.get("craft") || searchParams.get("category");
    if (craft && !categoryFilters.includes(craft)) {
      setCategoryFilters([craft]);
    }
  }, [searchParams]);
  const [locationFilter, setLocationFilter] = useState("");
  const [minLikes, setMinLikes] = useState(0);
  const [currentTab, setCurrentTab] = useState<"discover" | "liked" | "saved">("discover");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inspectorTab, setInspectorTab] = useState<"about" | "showreel" | "credits" | "skills">(
    "showreel"
  );
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

      const mappedUsers: User[] = ((profilesData as unknown as DBProfile[]) || [])
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
              (c.user_id === p.id && c.connected_user_id === profile?.id)
          );
          return {
            id: p.id,
            user_id: p.user_id || undefined,
            full_name: p.full_name || p.username || "Anonymous",
            username: p.username || "",
            email: p.email || "",
            avatar_url: p.avatar_url || DEFAULT_AVATAR_PLACEHOLDER,
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
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (p.settings as any).privacy_settings?.allowConnectionRequests
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
  }, [profile?.id, profile?.category, profile?.role, user?.id, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleCategory = (category: string) => {
    setCategoryFilters((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]
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
          u.location?.toLowerCase().includes(searchTerm)
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
        (u) =>
          (u.category && categoryFilters.includes(u.category)) ||
          (u.role && categoryFilters.some((cat) => u.role?.toLowerCase().includes(cat.toLowerCase())))
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

  const selectedUser = useMemo(() => {
    if (!pageItems.length) return null;
    if (selectedUserId) {
      const found = pageItems.find((u) => u.id === selectedUserId);
      if (found) return found;
    }
    return pageItems[0];
  }, [pageItems, selectedUserId]);

  function resetPaging() {
    setPage(1);
  }

  const handleConnect = async (
    userId: string,
    userName: string,
    currentStatus?: string | null,
    initiatorId?: string | null
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
          `and(user_id.eq.${profile.id},connected_user_id.eq.${userId}),and(user_id.eq.${userId},connected_user_id.eq.${profile.id})`
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
            u.id === userId ? { ...u, is_liked: false, likes_count: newLikesCount } : u
          )
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
            u.id === userId ? { ...u, is_liked: true, likes_count: newLikesCount } : u
          )
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
          prevUsers.map((u) => (u.id === userId ? { ...u, is_saved: false } : u))
        );
      } else {
        const { error: insertError } = await supabase.from("user_saves").insert({
          user_id: profile.id,
          saved_user_id: userId,
        });

        if (insertError) throw insertError;

        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === userId ? { ...u, is_saved: true } : u))
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

  const hasActiveFilters =
    filterType !== "all" ||
    categoryFilters.length > 0 ||
    Boolean(locationFilter) ||
    minLikes > 0 ||
    sortType !== "recent";

  const quickCrafts = ["All Crafts", "Director", "Actor", "Cinematographer", "Editor", "Writer", "Producer"];

  return (
    <AppLayout pageTitle="Talent Hub">
      <div className="max-w-[1440px] mx-auto space-y-6 pb-8">
        {/* 03 / Talent Discovery Editorial Header & Inline Filter Bar */}
        <FadeInSection>
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 pb-2">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Find your next collaborator
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Discover talented filmmakers from around the world.
              </p>
            </div>

            {/* Inline Studio Noir Filter Bar matching 03 / Talent discovery */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search people, skills, locations..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    resetPaging();
                  }}
                  className="pl-9 h-10 bg-surface-base/90 border-border/80 text-xs rounded-lg"
                />
              </div>

              {/* Craft Pill Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 px-3.5 rounded-lg bg-surface-base/90 border-border/80 text-xs font-medium text-foreground/90 gap-2"
                  >
                    <span>
                      {categoryFilters.length > 0 ? `Craft (${categoryFilters.length})` : "Craft"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {quickCrafts.map((craft) => (
                    <DropdownMenuItem
                      key={craft}
                      onClick={() => {
                        if (craft === "All Crafts") {
                          setCategoryFilters([]);
                        } else {
                          handleToggleCategory(craft);
                        }
                        resetPaging();
                      }}
                      className="text-xs flex items-center justify-between cursor-pointer"
                    >
                      <span>{craft}</span>
                      {(craft === "All Crafts" && categoryFilters.length === 0) ||
                      categoryFilters.includes(craft) ? (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Location Quick Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 px-3.5 rounded-lg bg-surface-base/90 border-border/80 text-xs font-medium text-foreground/90 gap-2"
                  >
                    <span>{locationFilter ? locationFilter : "Location"}</span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 p-2">
                  <div className="space-y-1.5">
                    <Input
                      placeholder="Filter city or country..."
                      value={locationFilter}
                      onChange={(e) => {
                        setLocationFilter(e.target.value);
                        resetPaging();
                      }}
                      className="h-8 text-xs"
                    />
                    {["Mumbai", "London", "Los Angeles", "Berlin", "Seoul", "Remote"].map((city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                          setLocationFilter(locationFilter === city ? "" : city);
                          resetPaging();
                        }}
                        className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface-hover flex items-center justify-between text-muted-foreground hover:text-foreground"
                      >
                        <span>{city}</span>
                        {locationFilter.toLowerCase() === city.toLowerCase() && (
                          <Check className="w-3 h-3 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Availability / Tier Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 px-3.5 rounded-lg bg-surface-base/90 border-border/80 text-xs font-medium text-foreground/90 gap-2"
                  >
                    <span>
                      {filterType === "all"
                        ? "Availability"
                        : filterType === "verified"
                          ? "Verified"
                          : filterType === "new"
                            ? "New Talent"
                            : "Popular"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {[
                    { value: "all", label: "All Available" },
                    { value: "verified", label: "Verified Only" },
                    { value: "new", label: "New Talent (30d)" },
                    { value: "popular", label: "High Demand" },
                  ].map((item) => (
                    <DropdownMenuItem
                      key={item.value}
                      onClick={() => {
                        setFilterType(item.value as FilterType);
                        resetPaging();
                      }}
                      className="text-xs flex items-center justify-between cursor-pointer"
                    >
                      <span>{item.label}</span>
                      {filterType === item.value && <Check className="w-3.5 h-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* More Filters Sheet */}
              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 px-3.5 rounded-lg bg-surface-base/90 border-border/80 text-xs font-medium text-foreground relative shrink-0"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-primary" />
                    More filters
                    {hasActiveFilters && (
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
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

          {/* Animated Tab Bar (Discover / Liked / Saved) + Result Counter */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-border/60 pb-3">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-surface-base/90 border border-border/70">
              {(
                [
                  { id: "discover", label: "Discover", icon: Users },
                  { id: "liked", label: "Liked", icon: Heart },
                  { id: "saved", label: "Saved", icon: Bookmark },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setCurrentTab(tab.id);
                      resetPaging();
                    }}
                    className={`relative px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors ${
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="discover-tab-pill"
                        className="absolute inset-0 rounded-md bg-surface-elevated border border-primary/30 shadow-sm"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Icon
                      className={`relative z-10 w-3.5 h-3.5 ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <span>
                {filtered.length} {filtered.length === 1 ? "Creator" : "Creators"} available
              </span>
            </div>
          </div>
        </FadeInSection>

        {/* Main Master-Detail Talent Discovery Grid matching 03 / Talent discovery */}
        {loading ? (
          <div className="text-center py-20 bg-card/80 rounded-2xl border border-border/80">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Loading creators...</p>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="text-center py-20 bg-card/80 rounded-2xl border border-border/80">
            <Users className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <h3 className="text-lg font-semibold mb-1.5 text-foreground">No creators found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters to find more creators.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* LEFT 7 COLUMNS: 3-Column Vertical Portrait Dimensional Talent Grid */}
            <div className="xl:col-span-7 space-y-6">
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pageItems.map((userItem, idx) => {
                  const portraitSrc = getPortraitImage(userItem, idx);
                  const isSelected = selectedUser?.id === userItem.id;
                  const availabilityLabel =
                    idx % 4 === 2 ? "In 2 weeks" : idx % 5 === 4 ? "In 1 month" : "Available";
                  const isImmediate = availabilityLabel === "Available";

                  return (
                    <StaggerItem key={userItem.id} index={idx}>
                      <DimensionalCard
                        tiltStrength={6}
                        onClick={() => setSelectedUserId(userItem.id)}
                        className={`h-full rounded-xl bg-card overflow-hidden cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary/65 ring-1 ring-primary/30 shadow-noir"
                            : "border-border/80 hover:border-primary/40"
                        }`}
                      >
                        {/* Top Portrait Frame */}
                        <div className="relative aspect-[4/4.2] w-full overflow-hidden bg-surface-elevated">
                          <ImageReveal
                            src={portraitSrc}
                            alt={userItem.full_name}
                            containerClassName="w-full h-full"
                            className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#121417] via-transparent to-black/20" />

                          {/* Top-right Quick Actions (Save & Share menu) */}
                          <div
                            className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  aria-label="More options"
                                  className="h-7 w-7 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => handleSave(userItem.id, userItem.full_name)}
                                  className="flex items-center gap-2 cursor-pointer text-xs"
                                >
                                  <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />
                                  {userItem.is_saved ? "Unsave" : "Save"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleShare(userItem.id, userItem.full_name)}
                                  className="flex items-center gap-2 cursor-pointer text-xs"
                                >
                                  <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  Share
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Verified badge if verified */}
                          {userItem.is_verified && (
                            <span className="absolute top-2.5 left-2.5 z-20 px-2 py-0.5 rounded bg-black/65 backdrop-blur-md border border-primary/40 text-[10px] font-medium text-primary">
                              Verified
                            </span>
                          )}
                        </div>

                        {/* Portrait Card Details */}
                        <DimensionalLayer depth={14} className="p-4 flex flex-col justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-[15px] font-semibold text-foreground truncate leading-snug">
                                {userItem.full_name}
                              </h3>
                              <button
                                type="button"
                                aria-label={userItem.is_liked ? "Unlike profile" : "Like profile"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleLike(userItem.id, userItem.full_name);
                                }}
                                className={`shrink-0 p-1 rounded-full transition-colors ${
                                  userItem.is_liked
                                    ? "text-primary"
                                    : "text-muted-foreground hover:text-primary"
                                }`}
                              >
                                <Heart
                                  className={`w-4 h-4 ${userItem.is_liked ? "fill-current" : ""}`}
                                />
                              </button>
                            </div>

                            <p className="text-xs font-medium text-muted-foreground truncate">
                              {userItem.role || "Filmmaker"}
                            </p>

                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/90 truncate pt-0.5">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="truncate">
                                {userItem.location || "Available Worldwide"}
                              </span>
                            </div>

                            {/* Availability status dot matching 03 / Talent discovery */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground/90">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    isImmediate
                                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                                      : "bg-primary shadow-[0_0_8px_rgba(233,180,87,0.6)]"
                                  }`}
                                />
                                {availabilityLabel}
                              </span>

                              {(userItem.price_per_day || userItem.price_per_hour) && (
                                <span className="text-[10px] font-mono text-primary">
                                  {userItem.price_per_day
                                    ? `₹${userItem.price_per_day}/d`
                                    : `₹${userItem.price_per_hour}/h`}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div
                            className="flex items-center gap-1.5 pt-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              onClick={() => navigate(`/profile/${userItem.id}`)}
                              variant="outline"
                              size="sm"
                              className="flex-1 h-8 text-xs font-medium bg-surface-elevated/70 border-border/80 hover:border-primary/40 hover:text-foreground"
                            >
                              View profile
                            </Button>

                            {userItem.id !== user?.id && (
                              <Button
                                onClick={() =>
                                  handleConnect(
                                    userItem.id,
                                    userItem.full_name,
                                    userItem.connection_status,
                                    userItem.connection_initiator
                                  )
                                }
                                variant={
                                  userItem.connection_status === "accepted" ? "secondary" : "ghost"
                                }
                                size="sm"
                                disabled={
                                  (userItem.connection_status === "pending" &&
                                    userItem.connection_initiator === profile?.id) ||
                                  userItem.allow_connections_from === "none" ||
                                  userItem.allow_connections_from === "connections"
                                }
                                title={
                                  userItem.connection_status === "accepted"
                                    ? "Connected"
                                    : userItem.connection_status === "pending"
                                      ? "Pending"
                                      : "Connect"
                                }
                                className="h-8 w-8 p-0 shrink-0 border border-border/70 bg-surface-elevated/50 hover:border-primary/40 hover:text-primary"
                              >
                                {userItem.connection_status === "accepted" ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : userItem.connection_status === "pending" ? (
                                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <UserPlus className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </DimensionalLayer>
                      </DimensionalCard>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-card p-4 rounded-xl shadow-soft border border-border/80">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <span className="text-xs text-muted-foreground font-medium font-mono">
                      Showing {(page - 1) * pageSize + 1} to{" "}
                      {Math.min(page * pageSize, filtered.length)} of {filtered.length} creators
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

            {/* RIGHT 5 COLUMNS: Sticky Live Talent Showreel & Dossier Inspector matching 03 / Talent discovery */}
            {selectedUser && (
              <div className="xl:col-span-5 xl:sticky xl:top-20">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedUser.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <DimensionalCard
                      tiltStrength={3.5}
                      className="rounded-2xl border border-border/80 bg-card/95 overflow-hidden shadow-noir"
                    >
                      {/* Top 16:9 Showreel Video Preview Frame */}
                      <div
                        onClick={() => {
                          if (selectedUser.portfolio_url) {
                            window.open(selectedUser.portfolio_url, "_blank", "noopener,noreferrer");
                          } else {
                            navigate(`/profile/${selectedUser.id}`);
                          }
                        }}
                        className="relative aspect-[16/9] w-full overflow-hidden bg-surface-elevated cursor-pointer group/reel"
                      >
                        <img
                          src={getPortraitImage(selectedUser, 0)}
                          alt={`${selectedUser.full_name} Showreel`}
                          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover/reel:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121417] via-black/25 to-black/20" />

                        {/* Centered Glassmorphic Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-14 w-14 rounded-full bg-black/55 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-xl group-hover/reel:scale-110 group-hover/reel:border-primary/60 group-hover/reel:text-primary transition-all">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>

                        {/* Duration pill */}
                        <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[11px] font-mono text-white/90 border border-white/10">
                          02:16
                        </span>
                      </div>

                      {/* Inspector Body */}
                      <div className="p-5 sm:p-6 space-y-5">
                        {/* Creator Identity & Primary Connect Bar */}
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h2 className="font-serif text-2xl font-bold text-foreground tracking-tight">
                              {selectedUser.full_name}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                              <span className="font-medium text-foreground/90">
                                {selectedUser.role || "Director"}
                              </span>
                              <span>•</span>
                              <span>{selectedUser.location || "Available Worldwide"}</span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                Available
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {selectedUser.id !== user?.id && (
                              <Button
                                onClick={() =>
                                  handleConnect(
                                    selectedUser.id,
                                    selectedUser.full_name,
                                    selectedUser.connection_status,
                                    selectedUser.connection_initiator
                                  )
                                }
                                disabled={
                                  (selectedUser.connection_status === "pending" &&
                                    selectedUser.connection_initiator === profile?.id) ||
                                  selectedUser.allow_connections_from === "none" ||
                                  selectedUser.allow_connections_from === "connections"
                                }
                                className="h-9 px-5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shadow-amber-glow"
                              >
                                {selectedUser.connection_status === "accepted" ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 mr-1.5" />
                                    Connected
                                  </>
                                ) : selectedUser.connection_status === "pending" ? (
                                  selectedUser.connection_initiator === profile?.id ? (
                                    "Request Sent"
                                  ) : (
                                    "Accept Request"
                                  )
                                ) : (
                                  "Connect"
                                )}
                              </Button>
                            )}

                            <button
                              type="button"
                              aria-label={selectedUser.is_liked ? "Unlike profile" : "Like profile"}
                              onClick={() => handleLike(selectedUser.id, selectedUser.full_name)}
                              className={`h-9 w-9 rounded-lg border border-border/80 bg-surface-elevated/70 flex items-center justify-center transition-colors ${
                                selectedUser.is_liked
                                  ? "text-primary border-primary/40"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <Heart
                                className={`w-4 h-4 ${selectedUser.is_liked ? "fill-current" : ""}`}
                              />
                            </button>
                          </div>
                        </div>

                        {/* Animated Dossier Sub-Tabs (About / Showreel / Credits / Skills) */}
                        <div className="flex items-center gap-5 border-b border-border/70">
                          {(
                            [
                              { id: "about", label: "About" },
                              { id: "showreel", label: "Showreel" },
                              { id: "credits", label: "Credits" },
                              { id: "skills", label: "Skills" },
                            ] as const
                          ).map((tab) => {
                            const active = inspectorTab === tab.id;
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setInspectorTab(tab.id)}
                                className={`relative pb-2.5 text-xs font-medium transition-colors ${
                                  active
                                    ? "text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {tab.label}
                                {active && (
                                  <motion.span
                                    layoutId="dossier-inspector-tab"
                                    className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary rounded-full"
                                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                                  />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Tab Content */}
                        {inspectorTab === "credits" ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2.5">
                              <div className="p-3 rounded-xl bg-surface-elevated/60 border border-border/70">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                                  Experience
                                </div>
                                <div className="text-sm font-semibold text-foreground mt-1">
                                  {selectedUser.total_experience ||
                                    selectedUser.experience_level ||
                                    "Pro"}
                                </div>
                              </div>
                              <div className="p-3 rounded-xl bg-surface-elevated/60 border border-border/70">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                                  Projects
                                </div>
                                <div className="text-sm font-semibold text-foreground mt-1">
                                  {selectedUser.projects_count || 3} Credits
                                </div>
                              </div>
                              <div className="p-3 rounded-xl bg-surface-elevated/60 border border-border/70">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                                  Endorsements
                                </div>
                                <div className="text-sm font-semibold text-primary mt-1">
                                  {selectedUser.likes_count || 0} Likes
                                </div>
                              </div>
                            </div>

                            {(selectedUser.price_per_day || selectedUser.price_per_hour) && (
                              <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
                                <span className="text-xs font-medium text-foreground">
                                  Standard Production Rate
                                </span>
                                <span className="text-xs font-mono font-semibold text-primary">
                                  {selectedUser.price_per_hour
                                    ? `₹${selectedUser.price_per_hour}/hr`
                                    : ""}
                                  {selectedUser.price_per_hour && selectedUser.price_per_day
                                    ? " • "
                                    : ""}
                                  {selectedUser.price_per_day
                                    ? `₹${selectedUser.price_per_day}/day`
                                    : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : inspectorTab === "skills" ? (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Verified craft specialties and production tags:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {(selectedUser.skills && selectedUser.skills.length > 0
                                ? selectedUser.skills
                                : [
                                    selectedUser.role || "Filmmaking",
                                    "Visual Storytelling",
                                    "Production",
                                    "Directing",
                                  ]
                              ).map((skill, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs py-1 px-2.5 border-border/80 bg-surface-elevated/80 text-foreground"
                                >
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* 3-Frame Showreel Strip matching 03 / Talent discovery */}
                            <div className="grid grid-cols-3 gap-2.5">
                              {SHOWREEL_STILLS[
                                selectedUser.id.charCodeAt(0) % SHOWREEL_STILLS.length
                              ].map((stillUrl, sIdx) => (
                                <div
                                  key={sIdx}
                                  onClick={() => navigate(`/profile/${selectedUser.id}`)}
                                  className="aspect-[16/10] rounded-lg overflow-hidden border border-border/70 bg-surface-elevated cursor-pointer group/still"
                                >
                                  <img
                                    src={stillUrl}
                                    alt="Showreel frame"
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/still:scale-105"
                                  />
                                </div>
                              ))}
                            </div>

                            {/* Creator Bio */}
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {selectedUser.bio ||
                                `I'm a ${(selectedUser.role || "filmmaker").toLowerCase()} and visual storyteller drawn to real characters, intimate moments and the beauty in everyday life. I love collaborating with passionate people to tell compelling stories.`}
                            </p>
                          </>
                        )}

                        {/* Selected Work Strip matching 03 / Talent discovery */}
                        <div className="space-y-3 pt-1 border-t border-border/60">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">
                              Selected work
                            </span>
                            <button
                              type="button"
                              onClick={() => navigate(`/profile/${selectedUser.id}`)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                              View all
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2.5">
                            {[
                              {
                                title: "Monsoon Letters",
                                meta: `Short Film • ${selectedUser.role || "Director"}`,
                                img: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=500&q=80",
                              },
                              {
                                title: "The Waiting Room",
                                meta: `Short Film • ${selectedUser.role || "Director"}`,
                                img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=500&q=80",
                              },
                              {
                                title: "City of Dust",
                                meta: `Music Video • ${selectedUser.role || "Director"}`,
                                img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=500&q=80",
                              },
                            ].map((work, wIdx) => (
                              <div
                                key={wIdx}
                                onClick={() => navigate(`/profile/${selectedUser.id}`)}
                                className="group/work cursor-pointer space-y-1.5"
                              >
                                <div className="aspect-[16/10] rounded-lg overflow-hidden border border-border/70 bg-surface-elevated">
                                  <img
                                    src={work.img}
                                    alt={work.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover/work:scale-105"
                                  />
                                </div>
                                <div className="text-[11px] font-semibold text-foreground truncate group-hover/work:text-primary transition-colors">
                                  {work.title}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {work.meta}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DimensionalCard>
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
