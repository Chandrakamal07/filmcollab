"use client";

import { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactPlayerDefault from "react-player";
const ReactPlayer = ReactPlayerDefault as any;
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "motion/react";
import { AddFileDialog } from "@/components/directory/AddFileDialog";
import { CategoryDropdown } from "@/components/ui/category-dropdown";
import {
  Search,
  Plus,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Music,
  Heart,
  Share2,
  Calendar,
  Eye,
  Play,
  Clock,
  ChevronLeft,
  ChevronRight,
  Minimize2,
  ZoomIn,
  ZoomOut,
  BookOpen,
  AlignLeft,
  Moon,
  Sun,
  X,
  Volume2,
  Filter
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DirType = "images" | "videos" | "documents" | "audios";

interface BaseItem {
  id: string;
  title: string;
  username: string; // YYYY-MM-DD
  uploadDate: string; // YYYY-MM-DD
  likes: number;
  likedByUser?: boolean;
  tags?: string[];
  description?: string;
}

interface ImageItem extends BaseItem {
  type: "images";
  thumbnailUrl: string;
  additionalUrls?: string[];
}

interface VideoItem extends BaseItem {
  type: "videos";
  thumbnailUrl: string;
  coverUrl?: string;
  videoUrl: string;
}

interface DocumentItem extends BaseItem {
  type: "documents";
  fileUrl: string;
  ext: string;
  pages: string[];
  outline: string[];
}

interface AudioItem extends BaseItem {
  type: "audios";
  audioUrl: string;
}

type DirItem = ImageItem | VideoItem | DocumentItem | AudioItem;

const initialItems: DirItem[] = [
  { 
    id: "i1", 
    type: "images", 
    title: "Behind the Scenes - Studio Shoot", 
    username: "Sarah Johnson",
    uploadDate: "2024-12-10", 
    likes: 42, 
    likedByUser: true,
    tags: ["production", "studio", "bts"], 
    thumbnailUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80",
    description: "Camera operator lining up a cinematic tracking shot on stage 4."
  },
  { 
    id: "i2", 
    type: "images", 
    title: "Mountain Pass Location Scout", 
    username: "Alex Rodriguez",
    uploadDate: "2024-12-05", 
    likes: 29, 
    likedByUser: false,
    tags: ["outdoors", "scouting", "cinematic"],
    thumbnailUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=640&q=80",
    description: "Golden hour wide lens scouting for the upcoming adventure sequence."
  },
  { 
    id: "i3", 
    type: "images", 
    title: "Moody Lighting Reference Sheet", 
    username: "Amelia Chen",
    uploadDate: "2024-12-09", 
    likes: 56, 
    likedByUser: false,
    tags: ["lighting", "moodboard", "color"],
    thumbnailUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=640&q=80",
    description: "High contrast neon and low-key shadow configurations for retro thriller scene."
  },
  { 
    id: "i4", 
    type: "images", 
    title: "Cyberpunk Alley Matte Painting", 
    username: "Raj Patel",
    uploadDate: "2024-12-11", 
    likes: 88, 
    likedByUser: false,
    tags: ["vfx", "concept", "cyberpunk"],
    thumbnailUrl: "https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?auto=format&fit=crop&w=640&q=80",
    description: "Detailed matte painting background for sequence 12."
  },
  { 
    id: "i5", 
    type: "images", 
    title: "Vintage Retro Costume Board", 
    username: "Sonya Vance",
    uploadDate: "2024-12-03", 
    likes: 19, 
    likedByUser: false,
    tags: ["costume", "retro", "wardrobe"],
    thumbnailUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=640&q=80",
    description: "Inspiration lookbook for characters in the mid-70s setting."
  },
  { 
    id: "v1", 
    type: "videos", 
    title: "Action Sequence Lighting Breakdown", 
    username: "Marcus Thompson",
    uploadDate: "2024-12-08", 
    likes: 134, 
    likedByUser: false,
    tags: ["gimmicks", "tutorial", "lighting"],
    thumbnailUrl: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80", 
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-smartphone-showing-a-video-41719-large.mp4",
    description: "A 3D breakdown of the active multi-cam light rig utilized in the warehouse chase."
  },
  { 
    id: "v2", 
    type: "videos", 
    title: "Color Grading Reel - Autumn Look", 
    username: "Priya Sharma",
    uploadDate: "2024-12-02", 
    likes: 95, 
    likedByUser: true,
    tags: ["grading", "autumn", "davinci"],
    thumbnailUrl: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=640&q=80", 
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-color-grading-a-cinematic-forest-shot-43180-large.mp4",
    description: "Before & after color transformation showcase from flat log footage."
  },
  { 
    id: "v3", 
    type: "videos", 
    title: "Behind-The-Lens Camera Movement Rig", 
    username: "Devon Miller",
    uploadDate: "2024-12-12", 
    likes: 112, 
    likedByUser: false,
    tags: ["camera", "gimbal", "rigging"],
    thumbnailUrl: "https://images.unsplash.com/photo-1473186578172-c141e6798cf4?auto=format&fit=crop&w=640&q=80",
    videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-professional-video-camera-on-a-stabilizer-41618-large.mp4",
    description: "Slow motion gimbal tracks demonstrating stabilization over rough terrain."
  },
  { 
    id: "d1", 
    type: "documents", 
    title: "Short Film - Final Script (Draft 4)", 
    username: "Marcus Vance",
    uploadDate: "2024-11-30", 
    likes: 67, 
    likedByUser: false,
    tags: ["script", "drama", "writing"],
    fileUrl: "#", 
    ext: "pdf",
    description: "Final locked shooting script for the sci-fi project 'Midnight Circuit'.",
    outline: ["1. SCENE 1: The Terminal", "2. SCENE 2: Decryption Protocol", "3. SCENE 3: Street Escape", "4. SCENE 4: Safe House Static"],
    pages: [
      `SCENE 1: THE TERMINAL - NIGHT

EXT. ROOFTOP TERMINAL - NIGHT

Rain lashes against the neon panels of the communications array. A lone figure, KAI (20s), shivering in a synthetic high-collar duster, slides a glowing optical drive into the junction port.

KAI
Come on... bypass the hub... just three more seconds.

A red warning light flashes. A mechanical hum starts up in the ventilation stack.

KAI (CONT'D)
No, no, no! Don't lock me out. Not tonight.

An electronic voice echoes from the transceiver.

TRANSCEIVER VOICE
Security compromise detected. Perimeter sweep initiated.`,

      `SCENE 2: DECRYPTION PROTOCOL - CONTINUOUS

INT. SYSTEM CORE - NIGHT

The holographic matrix flickers with amber warning codes. Kai frantically taps a handheld deck connected via wire to the main terminal.

KAI
If I can spoof the gateway, I can grab the telemetry and clear the record before the drones arrive.

A visual overlay lights up his eyes. The decryption progress bar crawls from 88% to 92%.

KAI (CONT'D)
Almost there... almost there...

Behind him, a heavy pneumatic seal slides open with a hiss.`,

      `SCENE 3: STREET ESCAPE - NIGHT

EXT. ALLEYWAY LEVEL 4 - LATER

Kai drops from the ladder, splashing into oily water. Neon reflections bounce off the wet brick. Footsteps echo from above.

KAI
(into comms)
I have the file. But they are on the grid. Block the bridge!

OPERATOR (O.S.)
Bridges are locked. You have to go through the underground ducts.

Kai hesitates, looking down the dark pipe, then bolts as a searchlight sweep illuminates the alley.`,

      `SCENE 4: SAFE HOUSE STATIC - LATER

INT. ABANDONED LOFT - NIGHT

Kai collapses against the metal framing of a rusty server rack. The handheld deck is plugged in, feeding a green status line to a broken monitor.

KAI
It's done. The entire registry is scrubbed. We're invisible.

He closes his eyes. Outside, the storm rages on, thunder rolling across the iron sky.

FADE OUT.`
    ]
  },
  { 
    id: "d2", 
    type: "documents", 
    title: "Production Schedule & Cast List", 
    username: "Sarah Johnson",
    uploadDate: "2024-12-06", 
    likes: 45, 
    likedByUser: false,
    tags: ["schedule", "planning", "cast"],
    fileUrl: "#", 
    ext: "docx",
    description: "Day-by-day shoot mapping and emergency contact protocols.",
    outline: ["1. Crew Call Times", "2. Scene Allocation", "3. Principal Cast", "4. Emergency Protocols"],
    pages: [
      `PRODUCTION DAY 1 - SHOOT SCHEDULE

DATE: JULY 6, 2026
LOCATION: Stage 4 - Cyberpunk Alley Set

07:00 AM - Crew Call & Equipment Setup
08:00 AM - Actor Call (Kai, Operator) / Wardrobe & Makeup
09:15 AM - Block & Light Scene 1 (Rooftop Terminal)
10:30 AM - Shoot Scene 1 (A-Cam & B-Cam synced)
01:00 PM - Lunch Break (Catering on set)
02:00 PM - Move to Stage 2 (System Core Set)
02:30 PM - Block & Light Scene 2 (Decryption)
06:00 PM - Wrap Day 1 / Daily rushes backing up`,

      `PRINCIPAL CAST LIST & CONTACTS

CHARACTER: KAI
Actor: Devon Miller
Phone: +1 (555) 019-3284
Email: devon.m@talentagency.com

CHARACTER: OPERATOR (VOICE)
Actor: Sonya Vance
Phone: +1 (555) 014-9982
Email: sonya.vance@voicepool.com

DIRECTOR: Marcus Vance
Phone: +1 (555) 012-4400
PRODUCER: Sarah Johnson
Phone: +1 (555) 017-8833`
    ]
  },
  { 
    id: "d3", 
    type: "documents", 
    title: "Cinematography Shot List & Lighting Map", 
    username: "Amelia Chen",
    uploadDate: "2024-12-07", 
    likes: 72, 
    likedByUser: true,
    tags: ["cinematography", "lighting", "shots"],
    fileUrl: "#", 
    ext: "pdf",
    description: "Camera positions, lens selections, and light fixture arrangements.",
    outline: ["1. Lens Packages", "2. Setup 1-A details", "3. Lighting Configuration"],
    pages: [
      `CINEMATOGRAPHY CONFIGURATIONS

LENS PACKAGE:
- Arri Signature Primes (18mm, 35mm, 50mm, 85mm T1.8)
- 35mm will be the workhorse for mid-wide master shots.
- 85mm reserved for dramatic extreme close-ups of Kai's eye screen.

CAMERA RIG:
- RED V-Raptor on DJI Ronin 2 Stabilizer
- Flowcine Black Arm mounted on tracking vehicle for alleyway chases.`,

      `SETUP 1-A: ROOFTOP TERMINAL

SHOT LIST:
- Shot 1: Wide (Est.) - 18mm, tracking down-to-up revealing Kai.
- Shot 2: Mid Shot - 35mm, eye level. Following hand movement to the port.
- Shot 3: Tight Close-up - 85mm. Rain splashing on the synthetic duster.

LIGHTING DESIGN:
- Key: 1x Nanlite Pavotube II (cyan tint) overhead.
- Fill: Ambient neon purple panel bounce from left side.
- Rim: 2K tungsten fresnel behind Kai for rain silhouette.`
    ]
  },
  { 
    id: "a1", 
    type: "audios", 
    title: "Theme Track - Retro Ambient (Demo)", 
    username: "Raj Patel",
    uploadDate: "2024-12-01", 
    likes: 154, 
    likedByUser: false,
    tags: ["synth", "music", "ost"],
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    description: "Analog synthesizer theme meant for the main menu background loop."
  },
  { 
    id: "a2", 
    type: "audios", 
    title: "Foley Pack - Ambient Rain & City Noise", 
    username: "Sonya Vance",
    uploadDate: "2024-12-04", 
    likes: 68, 
    likedByUser: false,
    tags: ["foley", "audio", "sfx"],
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    description: "Clean stereo recording of rainfall on asphalt with distant thunder rumbles."
  },
  { 
    id: "a3", 
    type: "audios", 
    title: "Drone Cyber Synth Sweep SFX", 
    username: "Marcus Thompson",
    uploadDate: "2024-12-10", 
    likes: 41, 
    likedByUser: false,
    tags: ["ambient", "drone", "scifi"],
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    description: "Low-frequency futuristic sweep for tension builds during hacking scenes."
  }
];

export default function DirectoryPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  const [projectName, setProjectName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DirType>("images");
  const [items, setItems] = useState<DirItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "likes" | "date">("recent");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d">("all");
  const [viewingLiked, setViewingLiked] = useState<boolean>(false);
  const [likedFilter, setLikedFilter] = useState<"all" | DirType>("all");
  
  // Filter sidebar states
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterMinLikes, setFilterMinLikes] = useState<string>("");
  const [filterMaxLikes, setFilterMaxLikes] = useState<string>("");
  
  // Modals / Read mode states
  const [selectedImage, setSelectedImage] = useState<ImageItem | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [docPageNum, setDocPageNum] = useState<number>(0);
  const [docZoom, setDocZoom] = useState<number>(100);
  const [readerTheme, setReaderTheme] = useState<"sepia" | "light" | "night">("sepia");

  // Pagination states (Requirement 5: Display 12 per page)
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Add Files state
  const [showAddFileDialog, setShowAddFileDialog] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setCurrentUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!projectId) {
      setProjectName(null);
      return;
    }
    const fetchProjectName = async () => {
      try {
        const { data } = await supabase.from("projects").select("title").eq("id", projectId).maybeSingle();
        if (data?.title) {
          setProjectName(data.title);
        } else {
          setProjectName(`Project ${projectId.slice(0, 8)}`);
        }
      } catch {
        setProjectName(`Project ${projectId.slice(0, 8)}`);
      }
    };
    fetchProjectName();
  }, [projectId]);

  // Toggle Like Handler (Requirement 4: Remove views, instead add likes)
  const handleLikeToggle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card clicks
    
    const itemToUpdate = items.find(i => i.id === id);
    if (!itemToUpdate) return;
    
    const liked = !itemToUpdate.likedByUser;
    const newLikesCount = liked ? itemToUpdate.likes + 1 : Math.max(0, itemToUpdate.likes - 1);

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          if (liked) {
            toast.success(`Liked "${item.title}"`);
          }
          return {
            ...item,
            likedByUser: liked,
            likes: newLikesCount,
          };
        }
        return item;
      })
    );

    // Sync with database
    try {
      const { data, error } = await supabase
        .from('directory_files')
        .select('stats')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      const currentStats = data?.stats as any || { views: 0, likes: 0, downloads: 0 };
      const updatedStats = {
        ...currentStats,
        likes: newLikesCount
      };

      await supabase
        .from('directory_files')
        .update({ stats: updatedStats })
        .eq('id', id);
    } catch (err) {
      console.error("Failed to sync like status", err);
    }
  };

  const handleShare = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = new URL(window.location.href);
    url.searchParams.set("item", id);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url.toString());
    }
    toast.success(`Link for "${title}" copied to clipboard!`);
  };

  const filtered = useMemo(() => {
    const now = new Date();
    const cutoffDays = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 10000;
    
    // Choose base items based on whether we are viewing liked items
    const baseItems = viewingLiked ? items.filter((it) => it.likedByUser) : items;

    // Filter by type
    const byTab = baseItems.filter((it) => {
      if (viewingLiked) {
        return likedFilter === "all" ? true : it.type === likedFilter;
      } else {
        return it.type === activeTab;
      }
    });

    const byDate = byTab.filter((it) => {
      if (viewingLiked || dateFilter === "all") return true;
      const d = new Date(it.uploadDate);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= cutoffDays;
    });

    const byCategoryAndLikes = byDate.filter((it) => {
      if (filterCategory !== "all" && !(it.tags || []).some(t => t.toLowerCase() === filterCategory.toLowerCase())) return false;
      if (filterMinLikes && it.likes < parseInt(filterMinLikes)) return false;
      if (filterMaxLikes && it.likes > parseInt(filterMaxLikes)) return false;
      return true;
    });

    const byQuery = byCategoryAndLikes.filter((it) => {
      const q = query.toLowerCase();
      return (
        it.title.toLowerCase().includes(q) ||
        (it.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    });

    const sorted = [...byQuery].sort((a, b) => {
      if (sortBy === "likes") return b.likes - a.likes;
      if (sortBy === "date") return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
      return b.id.localeCompare(a.id);
    });

    return sorted;
  }, [items, activeTab, query, sortBy, dateFilter, viewingLiked, likedFilter, filterCategory, filterMinLikes, filterMaxLikes]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function resetPaging() {
    setPage(1);
  }

  function handleTabChange(tab: DirType) {
    setActiveTab(tab);
    resetPaging();
  }

  // Handle Document Click (Requirement 3: Go inside and show in read mode)
  const handleOpenDocument = (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setDocPageNum(0);
    setDocZoom(100);
  };

  const closeModal = () => {
    setSelectedImage(null);
    setPreviewImageIndex(0);
    setSelectedVideo(null);
    setSelectedDoc(null);
    if (searchParams.has("item")) {
      setSearchParams(prev => {
        prev.delete("item");
        return prev;
      }, { replace: true });
    }
  };

  // React Query for caching directory files so it loads instantly when navigating back
  const { data: fetchedItems, isLoading: isQueryLoading } = useQuery({
    queryKey: ['directory_files', projectId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (userId) setCurrentUserId(userId);

      let queryBuilder = supabase
        .from("directory_files")
        .select(`
          *,
          profiles:user_id (id, full_name, username)
        `);

      if (projectId) {
        queryBuilder = queryBuilder.eq("project_id", projectId);
      }

      const { data, error } = await queryBuilder.order("created_at", { ascending: false });

      if (error && error.code !== '42P01') throw error;
      if (!data) return [];

      const visibleData = data.filter((item: any) => 
        (item.status !== 'blocked' && (!item.tags || !item.tags.includes('Blocked'))) || item.user_id === userId
      );

      return visibleData.map((item: any) => {
        const typeMap: Record<string, DirType> = {
          'image': 'images',
          'video': 'videos',
          'audio': 'audios',
          'document': 'documents'
        };
        
        const stats = item.stats as any || { likes: 0, views: 0, downloads: 0 };
        
        return {
          id: item.id,
          userId: item.profiles?.id || item.user_id,
          title: item.title,
          type: typeMap[item.file_type] || 'documents',
          username: item.profiles?.username || item.profiles?.full_name || 'unknown',
          uploadDate: new Date(item.created_at).toISOString().split('T')[0],
          likes: stats.likes || 0,
          likedByUser: false,
          tags: item.tags || [],
          description: undefined,
          coverUrl: (stats as any)?.coverUrl,
          thumbnailUrl: (stats as any)?.coverUrl || item.file_url,
          additionalUrls: item.additional_urls,
          videoUrl: item.file_type === 'video' ? item.file_url : undefined,
          audioUrl: item.file_type === 'audio' ? item.file_url : undefined,
          fileUrl: item.file_url,
          outline: item.file_type === 'document' ? ['Document Preview'] : undefined,
          pages: item.file_type === 'document' ? [item.description || 'No content available for preview.'] : undefined
        } as DirItem;
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  useEffect(() => {
    if (fetchedItems) {
      setItems(fetchedItems);
      setLoading(false);
    }
  }, [fetchedItems]);

  useEffect(() => {
    const itemId = searchParams.get("item");
    if (itemId && items.length > 0) {
      const it = items.find(i => i.id === itemId);
      if (it) {
        if (it.type === "images" && selectedImage?.id !== it.id) setSelectedImage(it as ImageItem);
        else if (it.type === "videos" && selectedVideo?.id !== it.id) setSelectedVideo(it as VideoItem);
        else if (it.type === "documents" && selectedDoc?.id !== it.id) handleOpenDocument(it as DocumentItem);
      }
    }
  }, [searchParams, items]);

  return (
    <AppLayout>
      <div className="space-y-6 bg-background text-foreground min-h-screen p-4 -m-4 transition-colors duration-200">
        
        {/* Header - Upload button removed (Requirement 2) */}
        <div className="bg-card text-card-foreground p-6 rounded-xl border border-border/80 shadow-noir">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="noir-eyebrow text-primary mb-1">Production Vault</p>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1 flex items-center gap-2.5">
                {viewingLiked ? (
                  <>
                    <Heart className="w-6 h-6 text-destructive fill-destructive" />
                    <span>Liked Assets Library</span>
                  </>
                ) : (
                  "Asset Directory"
                )}
              </h1>
              <p className="text-muted-foreground text-sm">
                {viewingLiked 
                  ? "Browse all the creative files and media references you have favorited." 
                  : "Explore creative reference media, conceptual breakdowns, documents, scripts, and foley."}
              </p>
              {projectId && (
                <div className="mt-3 flex items-center gap-2">
                  <Badge className="bg-primary/15 text-primary border border-primary/30 flex items-center gap-1.5 py-1 px-3 text-xs">
                    <span>Project Filter: <strong>{projectName || projectId}</strong></span>
                    <button
                      onClick={() => {
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.delete("project");
                        setSearchParams(nextParams);
                      }}
                      className="ml-1 hover:text-foreground rounded-full p-0.5 hover:bg-primary/20 transition-colors"
                      title="Clear project filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </Badge>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-initial sm:min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search assets..."
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); resetPaging(); }}
                  className="pl-9 h-9 border-border/80 rounded-lg bg-surface-elevated text-foreground text-sm w-full"
                />
              </div>

              {/* Dropdown filter for category when viewing liked */}
              {viewingLiked && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-semibold">Filter:</span>
                  <select
                    value={likedFilter}
                    onChange={(e) => { setLikedFilter(e.target.value as "all" | DirType); resetPaging(); }}
                    className="px-3 py-1 border border-border/80 rounded-lg text-xs bg-surface-elevated text-foreground h-9 font-medium"
                  >
                    <option value="all">All Liked</option>
                    <option value="images">Images</option>
                    <option value="videos">Videos</option>
                    <option value="documents">Documents</option>
                    <option value="audios">Audios</option>
                  </select>
                </div>
              )}

              {/* View Liked Button */}
              <Button
                variant={viewingLiked ? "default" : "outline"}
                onClick={() => {
                  setViewingLiked(!viewingLiked);
                  resetPaging();
                }}
                className={`h-9 font-semibold text-xs gap-1.5 transition-all duration-200 shrink-0 ${
                  viewingLiked 
                    ? "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30 shadow-sm" 
                    : "border-border/80 text-foreground hover:text-destructive bg-surface-elevated"
                }`}
              >
                <Heart className={`w-4 h-4 ${viewingLiked ? "fill-current" : ""}`} />
                {viewingLiked ? "Back to All" : "View Liked"}
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation - Tabs for Desktop, Dropdown for Mobile - Only displayed if not viewing liked items */}
        {!viewingLiked && (
          <div className="bg-card text-card-foreground rounded-xl border border-border/80 shadow-noir overflow-hidden">
            {/* Desktop View */}
            <div className="hidden md:flex justify-between items-center border-b border-border/60 px-4">
              <div className="flex">
                {[
                  { id: "images", label: "Images", icon: ImageIcon },
                  { id: "videos", label: "Videos", icon: VideoIcon },
                  { id: "documents", label: "Documents", icon: FileText },
                  { id: "audios", label: "Audios", icon: Music },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as DirType)}
                    className={`px-5 py-4 border-b-2 font-medium transition-all flex items-center gap-2 text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" /> {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center ml-4 my-2 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setSidebarOpen(true)}
                  className="mr-2 border-border/80 bg-surface-elevated hover:bg-surface-hover text-foreground font-medium h-9 text-xs transition-colors"
                >
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-primary" /> Filter
                </Button>
                <Button
                  onClick={() => setShowAddFileDialog(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium h-9 text-xs px-4 shadow-noir transition-all"
                >
                  Add Files
                </Button>
              </div>
            </div>

            {/* Mobile View */}
            <div className="flex md:hidden flex-col gap-3 p-3 border-b border-border/60">
              <div className="flex justify-between items-center w-full gap-2">
                <Select value={activeTab} onValueChange={(val) => handleTabChange(val as DirType)}>
                  <SelectTrigger className="w-full text-sm font-medium bg-surface-elevated border-border/80 h-10">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                    <SelectItem value="images"><div className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Images</div></SelectItem>
                    <SelectItem value="videos"><div className="flex items-center gap-2"><VideoIcon className="w-4 h-4" /> Videos</div></SelectItem>
                    <SelectItem value="documents"><div className="flex items-center gap-2"><FileText className="w-4 h-4" /> Documents</div></SelectItem>
                    <SelectItem value="audios"><div className="flex items-center gap-2"><Music className="w-4 h-4" /> Audios</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  onClick={() => setSidebarOpen(true)}
                  className="flex-1 border-border/80 bg-surface-elevated hover:bg-surface-hover text-foreground font-medium h-10 text-xs transition-colors"
                >
                  <Filter className="w-3.5 h-3.5 mr-1.5 text-primary" /> Filter
                </Button>
                <Button
                  onClick={() => setShowAddFileDialog(true)}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-medium h-10 text-xs shadow-noir transition-all"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Files
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Grid Area */}
        <div className="min-h-[400px]">
          {pageItems.length === 0 ? (
            <div className="bg-card text-card-foreground rounded-xl border border-border/80 shadow-noir p-12 text-center">
              <div className="w-16 h-16 bg-primary/15 border border-primary/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-xl font-semibold mb-1 text-foreground">No assets found</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                {viewingLiked 
                  ? "You haven't liked any assets in this category yet. Click the heart icon on any asset to add it here!"
                  : "No items match your query or category filter. Try clearing your filters or changing search query."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {pageItems.map((it) => (
                <Card 
                  key={it.id} 
                  className="group overflow-hidden bg-card text-card-foreground border border-border/80 hover:border-primary/40 rounded-xl shadow-noir transition-all duration-300 relative cursor-pointer"
                  onClick={() => {
                    setSearchParams(prev => {
                      prev.set("item", it.id);
                      return prev;
                    });
                  }}
                >
                  {/* Media container */}
                  <div className="relative w-full h-[180px] overflow-hidden bg-surface-elevated flex flex-col justify-center">
                    
                    {/* Top Right Corner Controls (Requirement 2: Share and Likes overlay) */}
                    <div 
                      className="absolute top-3 right-3 z-20 flex items-center gap-2" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Share Button */}
                      <button 
                        onClick={(e) => handleShare(it.id, it.title, e)}
                        className="p-1.5 rounded-full bg-black/65 hover:bg-black/85 text-white hover:text-primary transition-colors duration-200 shadow-sm"
                        title="Share link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Likes Interactive Button */}
                      <button 
                        onClick={(e) => handleLikeToggle(it.id, e)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/65 hover:bg-black/85 text-white transition-colors duration-200 shadow-sm"
                      >
                        <Heart 
                          className={`w-3.5 h-3.5 transition-all transform hover:scale-125 ${
                            it.likedByUser 
                              ? "fill-destructive text-destructive scale-110" 
                              : "text-white/80 hover:text-destructive"
                          }`} 
                        />
                        <span className="text-xs font-mono font-bold text-white">{it.likes}</span>
                      </button>
                    </div>

                    {/* Images */}
                    {it.type === "images" && (
                      <div className="relative w-full h-full">
                        <img 
                          src={(it as ImageItem).thumbnailUrl} 
                          alt={it.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          loading="lazy"
                        />
                        {(it as ImageItem).additionalUrls && (it as ImageItem).additionalUrls!.length > 0 && (
                          <div className="absolute top-2 left-2 bg-black/70 text-white font-mono text-xs px-2 py-1 rounded-md flex items-center gap-1 z-10 pointer-events-none">
                            <ImageIcon className="w-3 h-3 text-primary" />
                            {(it as ImageItem).additionalUrls!.length + 1}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Video format (Requirement 1: Just video thumbnail with interactive play overlay) */}
                    {it.type === "videos" && (
                      <div className="w-full h-full relative">
                        {(it as any).coverUrl ? (
                          <img src={(it as any).coverUrl} alt={it.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full relative pointer-events-none">
                            <ReactPlayer 
                              url={(it as VideoItem).videoUrl} 
                              width="100%" 
                              height="100%"
                              light={true}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 pointer-events-none"
                            />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                          <div className="w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                            <Play className="w-5 h-5 fill-current ml-0.5" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Document format (Requirement 1: Visual thumb with no download icon!) */}
                    {it.type === "documents" && (
                      <div className="w-full h-full relative flex flex-col items-center justify-center p-6 bg-surface-elevated overflow-hidden">
                        {(it as any).coverUrl ? (
                          <img 
                            src={(it as any).coverUrl} 
                            alt={it.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                          />
                        ) : (
                          <>
                            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shadow-sm mb-3 group-hover:scale-105 transition-transform duration-300">
                              <FileText className="w-7 h-7" />
                            </div>
                            <span className="text-[10px] font-mono font-semibold text-primary uppercase tracking-widest bg-primary/10 px-3 py-1 rounded-full border border-primary/25 mb-1 z-10">
                              {(it as DocumentItem).ext} Document
                            </span>
                            <span className="text-[11px] text-muted-foreground text-center max-w-[160px] truncate z-10">
                              Click to enter reader
                            </span>
                          </>
                        )}
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Audio format (Requirement 1: Custom sleek card with player controls in media frame) */}
                    {it.type === "audios" && (
                      <div className="w-full h-full relative flex flex-col justify-between p-5 bg-surface-elevated overflow-hidden">
                        {(it as any).coverUrl && (
                          <img 
                            src={(it as any).coverUrl} 
                            alt={it.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-35"
                          />
                        )}
                        <div className="flex items-center gap-3 z-10">
                          <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center shadow-sm backdrop-blur-md">
                            <Music className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase font-semibold text-primary tracking-widest">
                              Audio Sequence
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-foreground/80 font-medium">
                              <Volume2 className="w-3.5 h-3.5 text-primary" /> Direct Play
                            </div>
                          </div>
                        </div>

                        {/* Interactive Waveform Audio bar inside card */}
                        <div className="py-2 z-10" onClick={(e) => e.stopPropagation()}>
                          <audio 
                            src={(it as AudioItem).audioUrl} 
                            controls 
                            className="w-full h-8 rounded opacity-90 hover:opacity-100 transition-opacity" 
                          />
                        </div>

                        <div className="text-[10px] text-muted-foreground italic text-center font-medium z-10">
                          Shared reference loop
                        </div>
                      </div>
                    )}

                    {/* Elegant overlay on the bottom (Requirement 2: Name, username . category, date at right end) */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/85 to-transparent p-4 flex flex-col justify-end text-white select-none">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-sm tracking-tight text-white line-clamp-1 truncate pr-2">
                          {it.title}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-white/80 mt-1">
                        <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                          <span 
                            className="font-semibold text-primary truncate hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if ((it as any).userId) {
                                navigate(`/profile/${(it as any).userId}`);
                              } else {
                                navigate(`/profile?u=${encodeURIComponent(it.username)}`);
                              }
                            }}
                          >
                            {it.username}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 font-mono text-white/70 shrink-0">
                          <Calendar className="w-3 h-3 text-white/70" />
                          <span>{it.uploadDate}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Pagination Section (Requirement 5: 12 per page) */}
        {totalPages > 1 && (
          <div className="bg-card text-card-foreground p-4 rounded-xl border border-border/80 shadow-noir flex items-center justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              Showing page <b className="text-foreground">{page}</b> of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page <= 1} 
                onClick={() => setPage((p) => Math.max(1, p - 1))} 
                className="border-border/80 bg-surface-elevated hover:bg-surface-hover text-foreground transition-colors h-8 text-xs font-medium"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              
              {/* Individual page numbers */}
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 p-0 text-xs font-mono font-semibold ${
                    page === pageNum
                      ? "bg-primary hover:bg-primary-hover text-primary-foreground border-transparent"
                      : "border-border/80 bg-surface-elevated text-foreground hover:bg-surface-hover"
                  }`}
                >
                  {pageNum}
                </Button>
              ))}

              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= totalPages} 
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                className="border-border/80 bg-surface-elevated hover:bg-surface-hover text-foreground transition-colors h-8 text-xs font-medium"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Overlay Modal */}
      <AnimatePresence>
        {selectedImage && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center md:p-4 bg-black/95 backdrop-blur-sm cursor-pointer"
            onClick={closeModal}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full h-full md:h-auto max-w-4xl bg-card flex flex-col md:rounded-2xl overflow-hidden border-0 md:border md:border-border/80 shadow-noir cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 bg-surface-elevated border-b border-border/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest block">Image Reference</span>
                  <h3 className="text-sm font-display font-semibold text-foreground">{selectedImage.title}</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full hover:bg-surface-hover text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Image Content */}
              <div className="w-full flex-1 bg-black relative flex flex-col items-center justify-center p-0 md:p-4 min-h-0">
                <img 
                  src={
                    selectedImage.additionalUrls && selectedImage.additionalUrls.length > 0 
                      ? [selectedImage.thumbnailUrl, ...selectedImage.additionalUrls][previewImageIndex] 
                      : selectedImage.thumbnailUrl
                  } 
                  alt={selectedImage.title} 
                  className="w-full h-full object-contain"
                />
                
                {selectedImage.additionalUrls && selectedImage.additionalUrls.length > 0 && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-black/50 rounded-full"
                      onClick={(e) => { e.stopPropagation(); setPreviewImageIndex(p => Math.max(0, p - 1)); }}
                      disabled={previewImageIndex === 0}
                    >
                      <ChevronLeft className="w-8 h-8" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-black/50 rounded-full"
                      onClick={(e) => { e.stopPropagation(); setPreviewImageIndex(p => Math.min((selectedImage.additionalUrls?.length || 0), p + 1)); }}
                      disabled={previewImageIndex === (selectedImage.additionalUrls?.length || 0)}
                    >
                      <ChevronRight className="w-8 h-8" />
                    </Button>
                    
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 p-2 rounded-lg flex items-center gap-2 max-w-[80vw] overflow-x-auto" onClick={e => e.stopPropagation()}>
                      {[selectedImage.thumbnailUrl, ...selectedImage.additionalUrls].map((url, idx) => (
                        <div key={idx} className="relative group shrink-0">
                          <img 
                            src={url} 
                            alt={`Thumbnail ${idx}`} 
                            className={cn("w-10 h-10 md:w-16 md:h-16 object-cover rounded cursor-pointer border-2 transition-all", previewImageIndex === idx ? "border-primary scale-110" : "border-transparent opacity-60 hover:opacity-100")}
                            onClick={() => setPreviewImageIndex(idx)}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Footer stats */}
              <div className="p-4 bg-surface-elevated border-t border-border/80 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-4">
                  <button 
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                    onClick={(e) => {
                      handleLikeToggle(selectedImage.id, e as unknown as React.MouseEvent);
                      setSelectedImage(prev => prev ? { 
                        ...prev, 
                        likes: prev.likedByUser ? Math.max(0, prev.likes - 1) : prev.likes + 1,
                        likedByUser: !prev.likedByUser 
                      } : null);
                    }}
                  >
                    <Heart className={cn("w-4 h-4", selectedImage.likedByUser ? "text-destructive fill-destructive" : "text-muted-foreground")} />
                    <span>{selectedImage.likes} likes</span>
                  </button>
                  <span>Uploaded: {selectedImage.uploadDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(selectedImage.tags || []).map((tag, i) => (
                    <span key={i} className="text-[10px] text-primary">#{tag}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Video Player Overlay Modal (Requirement 2) */}
      <AnimatePresence>
        {selectedVideo && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-4xl bg-card rounded-2xl overflow-hidden border border-border/80 shadow-noir"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 bg-surface-elevated border-b border-border/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-widest block">Cinematic Reference</span>
                  <h3 className="text-sm font-display font-semibold text-foreground">{selectedVideo.title}</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={closeModal}
                  className="w-8 h-8 rounded-full hover:bg-surface-hover text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Video Player */}
              <div className="aspect-[16/9] w-full bg-black relative flex items-center justify-center">
                <ReactPlayer 
                  url={selectedVideo.videoUrl} 
                  controls 
                  playing
                  width="100%"
                  height="100%"
                  className="react-player-wrapper max-h-[70vh]"
                  style={{ maxHeight: '70vh' }}
                />
              </div>

              {/* Footer stats */}
              <div className="p-4 bg-surface-elevated border-t border-border/80 flex items-center justify-between text-xs font-mono text-muted-foreground">
                <div className="flex items-center gap-4">
                  <button 
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
                    onClick={(e) => {
                      handleLikeToggle(selectedVideo.id, e as unknown as React.MouseEvent);
                      setSelectedVideo(prev => prev ? { 
                        ...prev, 
                        likes: prev.likedByUser ? Math.max(0, prev.likes - 1) : prev.likes + 1,
                        likedByUser: !prev.likedByUser 
                      } : null);
                    }}
                  >
                    <Heart className={cn("w-4 h-4", selectedVideo.likedByUser ? "text-destructive fill-destructive" : "text-muted-foreground")} />
                    <span>{selectedVideo.likes} likes</span>
                  </button>
                  <span>Uploaded: {selectedVideo.uploadDate}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(selectedVideo.tags || []).map((tag, i) => (
                    <span key={i} className="text-[10px] text-primary">#{tag}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Document Reader Overlay Modal (Requirement 3: Show Document in read mode) */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="w-full max-w-6xl h-[90vh] bg-card rounded-2xl border border-border/80 shadow-noir overflow-hidden flex flex-col md:flex-row"
            >
              
              {/* Left Sidebar - Outline & Document Specs */}
              <div className="w-full md:w-64 bg-surface-elevated border-b md:border-b-0 md:border-r border-border/80 p-4 flex flex-col justify-between shrink-0">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Reader Hub</span>
                    </div>
                    <h3 className="text-sm font-display font-bold text-foreground line-clamp-2">
                      {selectedDoc.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Draft version of production asset.
                    </p>
                  </div>

                  {/* Table of contents / Outline */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider block">Document Outline</span>
                    <div className="space-y-1">
                      {selectedDoc.outline.map((o, idx) => (
                        <button
                          key={idx}
                          onClick={() => setDocPageNum(idx)}
                          className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors truncate block ${
                            docPageNum === idx
                              ? "bg-primary/15 text-primary font-semibold"
                              : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                          }`}
                        >
                          {o}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Theme Selector inside sidebar */}
                <div className="pt-4 border-t border-border/80 space-y-3">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-wider block">Page Style</span>
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { id: "sepia", label: "Sepia", bg: "bg-amber-50 text-amber-900 border-amber-200" },
                      { id: "light", label: "Paper", bg: "bg-white text-zinc-900 border-zinc-200" },
                      { id: "night", label: "Night", bg: "bg-background text-foreground border-border/80" },
                    ].map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setReaderTheme(theme.id as "sepia" | "light" | "night")}
                        className={`text-[11px] py-1 px-1.5 rounded border text-center transition-all ${theme.bg} ${
                          readerTheme === theme.id ? "ring-2 ring-primary font-bold" : "opacity-75 hover:opacity-100"
                        }`}
                      >
                        {theme.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Reading Canvas */}
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-background">
                
                {/* Top Control Bar */}
                <div className="h-14 px-6 bg-card border-b border-border/80 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={docZoom <= 60} 
                        onClick={() => setDocZoom(z => Math.max(60, z - 10))}
                        className="w-8 h-8 text-muted-foreground hover:text-foreground"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-xs font-mono font-semibold text-muted-foreground min-w-[40px] text-center">
                        {docZoom}%
                      </span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        disabled={docZoom >= 160} 
                        onClick={() => setDocZoom(z => Math.min(160, z + 10))}
                        className="w-8 h-8 text-muted-foreground hover:text-foreground"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Page Status indicator */}
                  <span className="text-xs font-mono font-bold text-muted-foreground">
                    Document Viewer
                  </span>

                  <Button
                    onClick={closeModal}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold text-xs h-8 px-3"
                  >
                    Close Reader
                  </Button>
                </div>

                {/* Interactive Paper Page */}
                <div className="flex-1 overflow-y-auto p-8 flex justify-center h-full">
                  <div 
                    style={{ fontSize: `${(docZoom / 100) * 0.875}rem` }}
                    className={`w-full max-w-4xl min-h-[500px] h-full rounded-xl shadow-lg border overflow-hidden transition-all duration-300 ${
                      readerTheme === "sepia" 
                        ? "bg-amber-50/90 text-amber-900 border-amber-200/60" 
                        : readerTheme === "night"
                        ? "bg-card text-foreground border-border/80"
                        : "bg-white text-zinc-900 border-zinc-200"
                    }`}
                  >
                    <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent((selectedDoc as DocumentItem).fileUrl || (selectedDoc as any).url || "")}&embedded=true`} className="w-full h-full bg-white" title="Document Preview" />
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AddFileDialog 
        open={showAddFileDialog} 
        onOpenChange={setShowAddFileDialog} 
        userId={currentUserId}
        projectId={projectId}
        onUploadSuccess={() => {
          // Re-fetch items on success without reloading
          queryClient.invalidateQueries({ queryKey: ['directory_files'] });
        }} 
      />

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent className="bg-card text-card-foreground border-border/80 sm:max-w-md w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display text-xl font-bold flex items-center gap-2 text-foreground">
              <Filter className="w-5 h-5 text-primary" />
              Filters & Sort
            </SheetTitle>
          </SheetHeader>
          <div className="mt-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Category</Label>
              <CategoryDropdown
                value={filterCategory === "all" ? "" : filterCategory}
                onChange={(val) => { setFilterCategory(val || "all"); resetPaging(); }}
                placeholder="All Categories"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Likes Range</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={filterMinLikes}
                  onChange={(e) => { setFilterMinLikes(e.target.value); resetPaging(); }}
                  className="bg-surface-elevated border-border/80 text-foreground font-mono"
                />
                <span className="text-sm text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={filterMaxLikes}
                  onChange={(e) => { setFilterMaxLikes(e.target.value); resetPaging(); }}
                  className="bg-surface-elevated border-border/80 text-foreground font-mono"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-semibold text-foreground">Sort By</Label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as "recent" | "likes" | "date"); resetPaging(); }}
                className="flex h-10 w-full rounded-md border border-border/80 bg-surface-elevated text-foreground px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="recent" className="bg-card text-foreground">Recent</option>
                <option value="likes" className="bg-card text-foreground">Most Liked</option>
                <option value="date" className="bg-card text-foreground">Upload Date</option>
              </select>
            </div>

            <Button 
              onClick={() => {
                setFilterCategory("all");
                setFilterMinLikes("");
                setFilterMaxLikes("");
                setSortBy("recent");
                resetPaging();
              }}
              variant="outline" 
              className="w-full mt-4 border-border/80 bg-surface-elevated hover:bg-surface-hover text-foreground transition-colors"
            >
              Clear Filters
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppLayout>
  );
}
