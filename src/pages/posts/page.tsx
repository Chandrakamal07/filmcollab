"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Image as ImageIcon,
  Video as VideoIcon,
  AtSign,
  Hash,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Search,
  Filter,
  Clock,
  Flame,
  Users,
  Plus,
  X,
  ChevronRight,
  Upload,
  Play,
  Pause,
} from "lucide-react";

interface Post {
  id: string;
  title?: string;
  content: string;
  author_id: string;
  media_urls?: string[];
  media_types?: string[];
  hashtags?: string[];
  is_published: boolean;
  is_featured: boolean;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name?: string;
    avatar_url?: string | null;
  };
  is_liked?: boolean;
  is_saved?: boolean;
}

interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name?: string;
    avatar_url?: string | null;
  };
  replies?: PostComment[];
}

const PostsPage = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Hardcoded posts data
  const hardcodedPosts: Post[] = [
    {
      id: "1",
      title: "Behind the Scenes: New Short Film Project",
      content: "Just wrapped up filming for our latest short film 'Echoes of Tomorrow'. The cinematography turned out amazing! Can't wait to share the final cut with everyone. #filmmaking #shortfilm #cinematography #indie",
      author_id: "user-1",
      media_urls: ["https://images.unsplash.com/photo-1489599808417-8a4a4b4b4b4b?w=800"],
      media_types: ["image"],
      hashtags: ["filmmaking", "shortfilm", "cinematography", "indie"],
      is_published: true,
      is_featured: true,
      likes_count: 24,
      comments_count: 8,
      shares_count: 3,
      created_at: "2024-12-15T10:30:00Z",
      updated_at: "2024-12-15T10:30:00Z",
      author: {
        id: "user-1",
        full_name: "Sarah Chen"
      },
      is_liked: false,
      is_saved: false
    },
    {
      id: "2",
      title: "Looking for Sound Designer",
      content: "Our upcoming documentary about climate change needs a talented sound designer. Must have experience with nature documentaries and environmental audio. Budget: ₹50,000-₹75,000. DM for details! #hiring #sounddesign #documentary #climatechange",
      author_id: "user-2",
      media_urls: [],
      media_types: [],
      hashtags: ["hiring", "sounddesign", "documentary", "climatechange"],
      is_published: true,
      is_featured: false,
      likes_count: 12,
      comments_count: 5,
      shares_count: 7,
      created_at: "2024-12-14T16:45:00Z",
      updated_at: "2024-12-14T16:45:00Z",
      author: {
        id: "user-2",
        full_name: "Raj Patel"
      },
      is_liked: true,
      is_saved: false
    },
    {
      id: "3",
      content: "Just finished editing this music video for a local band. The color grading really brought the story to life! What do you think? #musicvideo #editing #colorgrading #localmusic",
      author_id: "user-3",
      media_urls: ["https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800"],
      media_types: ["image"],
      hashtags: ["musicvideo", "editing", "colorgrading", "localmusic"],
      is_published: true,
      is_featured: false,
      likes_count: 18,
      comments_count: 6,
      shares_count: 2,
      created_at: "2024-12-14T09:20:00Z",
      updated_at: "2024-12-14T09:20:00Z",
      author: {
        id: "user-3",
        full_name: "Maya Sharma"
      },
      is_liked: false,
      is_saved: true
    },
    {
      id: "4",
      title: "Film Festival Submission Tips",
      content: "After submitting to 15+ festivals this year, here are my top tips: 1) Research each festival's specific requirements 2) Create compelling loglines 3) Submit early 4) Follow up professionally. What's your experience with festival submissions? #filmfestival #submission #tips #filmmaking",
      author_id: "user-4",
      media_urls: [],
      media_types: [],
      hashtags: ["filmfestival", "submission", "tips", "filmmaking"],
      is_published: true,
      is_featured: true,
      likes_count: 31,
      comments_count: 12,
      shares_count: 9,
      created_at: "2024-12-13T14:15:00Z",
      updated_at: "2024-12-13T14:15:00Z",
      author: {
        id: "user-4",
        full_name: "Alex Kumar"
      },
      is_liked: true,
      is_saved: true
    },
    {
      id: "5",
      content: "Working on a new web series concept. The script is coming together nicely! Looking for feedback from fellow writers. Anyone interested in a script swap? #webseries #scriptwriting #collaboration #feedback",
      author_id: "user-5",
      media_urls: [],
      media_types: [],
      hashtags: ["webseries", "scriptwriting", "collaboration", "feedback"],
      is_published: true,
      is_featured: false,
      likes_count: 15,
      comments_count: 4,
      shares_count: 1,
      created_at: "2024-12-13T11:30:00Z",
      updated_at: "2024-12-13T11:30:00Z",
      author: {
        id: "user-5",
        full_name: "Priya Singh"
      },
      is_liked: false,
      is_saved: false
    },
    {
      id: "6",
      title: "Cinematography Workshop This Weekend",
      content: "Join us for a hands-on cinematography workshop this Saturday! We'll cover lighting techniques, camera movement, and composition. Perfect for beginners and intermediate filmmakers. Limited seats available! #workshop #cinematography #learning #filmmaking",
      author_id: "user-6",
      media_urls: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800"],
      media_types: ["image"],
      hashtags: ["workshop", "cinematography", "learning", "filmmaking"],
      is_published: true,
      is_featured: false,
      likes_count: 22,
      comments_count: 7,
      shares_count: 5,
      created_at: "2024-12-12T18:00:00Z",
      updated_at: "2024-12-12T18:00:00Z",
      author: {
        id: "user-6",
        full_name: "David Wilson"
      },
      is_liked: false,
      is_saved: false
    },
    {
      id: "7",
      content: "Just got my first paid gig as a freelance editor! Starting with corporate videos and hoping to move into narrative work. Any advice for building a portfolio? #freelance #editing #career #advice",
      author_id: "user-7",
      media_urls: [],
      media_types: [],
      hashtags: ["freelance", "editing", "career", "advice"],
      is_published: true,
      is_featured: false,
      likes_count: 19,
      comments_count: 9,
      shares_count: 3,
      created_at: "2024-12-12T13:45:00Z",
      updated_at: "2024-12-12T13:45:00Z",
      author: {
        id: "user-7",
        full_name: "Neha Gupta"
      },
      is_liked: true,
      is_saved: false
    },
    {
      id: "8",
      title: "Equipment Rental Available",
      content: "Professional camera equipment available for rent: Sony FX6, Canon C70, lighting kits, audio gear. Daily/weekly rates. Perfect for indie filmmakers and content creators. DM for pricing! #equipment #rental #camera #lighting #audio",
      author_id: "user-8",
      media_urls: ["https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800"],
      media_types: ["image"],
      hashtags: ["equipment", "rental", "camera", "lighting", "audio"],
      is_published: true,
      is_featured: false,
      likes_count: 16,
      comments_count: 3,
      shares_count: 8,
      created_at: "2024-12-11T20:30:00Z",
      updated_at: "2024-12-11T20:30:00Z",
      author: {
        id: "user-8",
        full_name: "Rohit Agarwal"
      },
      is_liked: false,
      is_saved: true
    }
  ];

  // State management
  const [posts, setPosts] = useState<Post[]>(hardcodedPosts);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCommentsDialogOpen, setIsCommentsDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");

  // Create post form state
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    hashtags: [] as string[],
    mediaFiles: [] as File[],
    mediaUrls: [] as string[],
  });
  const [isUploading, setIsUploading] = useState(false);

  // Loading states for actions
  const [loadingActions, setLoadingActions] = useState<{ [key: string]: boolean }>({});

  // Helper function to get or create user profile
  const getOrCreateProfile = async () => {
    if (!user?.id) return null;

    try {
      // First, try to get existing profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        return profile;
      }

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          throw createError;
        }

        return newProfile;
      }

      throw profileError;
    } catch (error) {
      console.error('Error in getOrCreateProfile:', error);
      throw error;
    }
  };

  // Fetch posts from database (falling back gracefully to sample feed if empty)
  const fetchPosts = async () => {
    try {
      setLoading(true);

      const { data: dbPosts, error: dbError } = await supabase
        .from('posts')
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
          likes_count,
          comments_count,
          shares_count,
          created_at,
          updated_at,
          profiles:author_id (id, full_name, avatar_url, username)
        `)
        .order('created_at', { ascending: false });

      const activeProfileId = profile?.id;
      const userLikedIds = new Set<string>();
      const userSavedIds = new Set<string>();

      if (activeProfileId) {
        const [likesRes, savesRes] = await Promise.all([
          supabase.from('post_likes').select('post_id').eq('user_id', activeProfileId),
          supabase.from('post_saves').select('post_id').eq('user_id', activeProfileId)
        ]);
        if (likesRes.data) (likesRes.data as any[]).forEach((r: any) => userLikedIds.add(r.post_id));
        if (savesRes.data) (savesRes.data as any[]).forEach((r: any) => userSavedIds.add(r.post_id));
      }

      let loadedPosts: Post[] = [];

      if (!dbError && dbPosts && dbPosts.length > 0) {
        loadedPosts = dbPosts.map((p: any) => ({
          id: p.id,
          title: p.title || undefined,
          content: p.content,
          author_id: p.author_id,
          media_urls: p.media_urls || undefined,
          media_types: p.media_types || undefined,
          hashtags: p.hashtags || undefined,
          is_published: p.is_published ?? true,
          is_featured: p.is_featured ?? false,
          likes_count: p.likes_count || 0,
          comments_count: p.comments_count || 0,
          shares_count: p.shares_count || 0,
          created_at: p.created_at,
          updated_at: p.updated_at,
          author: {
            id: p.profiles?.id || p.author_id,
            full_name: p.profiles?.full_name || p.profiles?.username || 'Creator',
            avatar_url: p.profiles?.avatar_url
          },
          is_liked: userLikedIds.has(p.id),
          is_saved: userSavedIds.has(p.id)
        }));
      } else {
        loadedPosts = [];
      }

      let filteredPosts = loadedPosts;

      // Apply filters based on active tab
      if (activeTab === "trending") {
        filteredPosts = filteredPosts.sort((a, b) => b.likes_count - a.likes_count);
      } else if (activeTab === "published") {
        filteredPosts = filteredPosts.filter(post => post.is_published);
      } else if (activeTab === "saved") {
        filteredPosts = filteredPosts.filter(post => post.is_saved);
      }

      // Apply sorting
      if (sortBy === "popular") {
        filteredPosts = filteredPosts.sort((a, b) => b.likes_count - a.likes_count);
      } else if (sortBy === "trending") {
        filteredPosts = filteredPosts.sort((a, b) => (b.likes_count + b.comments_count + b.shares_count) - (a.likes_count + a.comments_count + a.shares_count));
      } else {
        filteredPosts = filteredPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }

      setPosts(filteredPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load posts"
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch comments for a post
  const fetchComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *,
          author:profiles(id, full_name)
        `)
        .eq('post_id', postId)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch replies for each comment
      if (data) {
        const commentsWithReplies = await Promise.all(
          data.map(async (comment) => {
            const { data: replies } = await supabase
              .from('post_comments')
              .select(`
                *,
                author:profiles(id, full_name)
              `)
              .eq('parent_id', comment.id)
              .order('created_at', { ascending: true });

            return {
              ...comment,
              replies: replies || []
            };
          })
        );

        setComments(commentsWithReplies);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch comments"
      });
    }
  };

  // Upload media files to Supabase Storage
  const uploadMedia = async (files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      console.log('Uploading file:', file.name, 'to path:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('post-media')
        .getPublicUrl(filePath);

      console.log('File uploaded successfully:', data.publicUrl);
      return data.publicUrl;
    });

    return Promise.all(uploadPromises);
  };

  // Create new post
  const handleCreatePost = async () => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to create a post"
      });
      return;
    }

    if (!newPost.content.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Post content is required"
      });
      return;
    }

    try {
      setIsUploading(true);

      // Resolve author profile ID (M04 / M10: bind author_id to profile.id)
      let authorProfileId = profile?.id;
      if (!authorProfileId) {
        const p = await getOrCreateProfile();
        authorProfileId = p?.id;
      }
      if (!authorProfileId) {
        throw new Error("User profile not found. Please set up your profile first.");
      }

      // Extract hashtags from content
      const hashtagMatches = newPost.content.match(/#\w+/g);
      const hashtags = hashtagMatches ? hashtagMatches.map(tag => tag.substring(1)) : [];

      // Upload media files if any
      let uploadedUrls: string[] = [...newPost.mediaUrls];
      let uploadedTypes: string[] = [];

      for (const file of newPost.mediaFiles) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${authorProfileId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('post-media')
          .upload(filePath, file);

        if (uploadErr) {
          throw new Error(`Media upload failed: ${uploadErr.message || 'Storage error'}`);
        }
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from('post-media').getPublicUrl(uploadData.path);
          uploadedUrls.push(publicUrl);
          uploadedTypes.push(file.type.startsWith('video/') ? 'video' : 'image');
        }
      }

      // Real database insert
      const { data: createdPost, error: insertError } = await supabase
        .from('posts')
        .insert({
          title: newPost.title || null,
          content: newPost.content.trim(),
          author_id: authorProfileId,
          media_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
          media_types: uploadedTypes.length > 0 ? uploadedTypes : null,
          hashtags: hashtags.length > 0 ? hashtags : null,
          is_published: true,
          is_featured: false
        })
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
          likes_count,
          comments_count,
          shares_count,
          created_at,
          updated_at,
          profiles:author_id (id, full_name, avatar_url, username)
        `)
        .single();

      if (insertError) throw insertError;

      const formattedPost: Post = {
        id: createdPost.id,
        title: createdPost.title || undefined,
        content: createdPost.content,
        author_id: createdPost.author_id,
        media_urls: createdPost.media_urls || undefined,
        media_types: createdPost.media_types || undefined,
        hashtags: createdPost.hashtags || undefined,
        is_published: createdPost.is_published ?? true,
        is_featured: createdPost.is_featured ?? false,
        likes_count: createdPost.likes_count || 0,
        comments_count: createdPost.comments_count || 0,
        shares_count: createdPost.shares_count || 0,
        created_at: createdPost.created_at,
        updated_at: createdPost.updated_at,
        author: {
          id: (createdPost as any).profiles?.id || authorProfileId,
          full_name: (createdPost as any).profiles?.full_name || profile?.full_name || user.user_metadata?.full_name || 'Creator',
          avatar_url: (createdPost as any).profiles?.avatar_url || profile?.avatar_url
        },
        is_liked: false,
        is_saved: false
      };

      setPosts(prev => [formattedPost, ...prev]);

      toast({
        title: "Success",
        description: "Post created successfully"
      });

      // Reset form and close dialog
      setNewPost({
        title: "",
        content: "",
        hashtags: [],
        mediaFiles: [],
        mediaUrls: [],
      });
      setIsCreateDialogOpen(false);

    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create post"
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle like/unlike post
  const handleLikePost = async (postId: string, isLiked: boolean) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to like posts"
      });
      return;
    }

    const actionKey = `like-${postId}`;
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
      const authorProfileId = profile?.id;

      if (isUuid && authorProfileId) {
        if (!isLiked) {
          const { error: likeErr } = await supabase.from('post_likes').insert({
            post_id: postId,
            user_id: authorProfileId
          });
          if (likeErr && likeErr.code !== '23505') throw likeErr;
        } else {
          const { data: delData, error: unlikeErr } = await supabase
            .from('post_likes')
            .delete()
            .match({ post_id: postId, user_id: authorProfileId })
            .select("id");
          if (unlikeErr) throw unlikeErr;
          if (!delData || delData.length === 0) {
            throw new Error("Like record not found or permission denied.");
          }
        }
      }

      // Update local state
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? {
            ...post,
            is_liked: !isLiked,
            likes_count: isLiked ? Math.max(0, post.likes_count - 1) : post.likes_count + 1
          }
          : post
      ));

      toast({
        title: isLiked ? "Post unliked" : "Post liked",
        description: isLiked ? "You've unliked this post" : "You've liked this post"
      });
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update like status. Please try again."
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle save/unsave post
  const handleSavePost = async (postId: string, isSaved: boolean) => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Authentication Required",
        description: "Please log in to save posts"
      });
      return;
    }

    const actionKey = `save-${postId}`;
    setLoadingActions(prev => ({ ...prev, [actionKey]: true }));

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
      const authorProfileId = profile?.id;

      if (isUuid && authorProfileId) {
        if (!isSaved) {
          const { error: saveErr } = await supabase.from('post_saves').insert({
            post_id: postId,
            user_id: authorProfileId
          });
          if (saveErr && saveErr.code !== '23505') throw saveErr;
        } else {
          const { data: delData, error: unsaveErr } = await supabase
            .from('post_saves')
            .delete()
            .match({ post_id: postId, user_id: authorProfileId })
            .select("id");
          if (unsaveErr) throw unsaveErr;
          if (!delData || delData.length === 0) {
            throw new Error("Saved post record not found or permission denied.");
          }
        }
      }

      // Update local state
      setPosts(prev => prev.map(post =>
        post.id === postId
          ? { ...post, is_saved: !isSaved }
          : post
      ));

      toast({
        title: isSaved ? "Post unsaved" : "Post saved",
        description: isSaved ? "Post removed from your saved posts" : "Post saved to your collection"
      });
    } catch (error: any) {
      console.error('Error toggling save:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update save status. Please try again."
      });
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  // Handle share post
  const handleSharePost = async (post: Post) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title || 'Check out this post',
          text: post.content,
          url: window.location.href,
        });
        toast({
          title: "Post shared",
          description: "Post shared successfully"
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(
          `${post.title || 'Check out this post'}\n\n${post.content}\n\n${window.location.href}`
        );
        toast({
          title: "Copied to clipboard",
          description: "Post link copied to clipboard"
        });
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      if (error.name !== 'AbortError') {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to share post. Please try again."
        });
      }
    }
  };

  // Handle add comment
  const handleAddComment = async () => {
    if (!user?.id || !selectedPost || !newComment.trim()) return;

    try {
      // Get or create user profile
      const profile = await getOrCreateProfile();
      if (!profile) {
        throw new Error('Unable to get or create user profile');
      }

      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: selectedPost.id,
          user_id: profile.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      fetchComments(selectedPost.id);

      // Update comments count
      setPosts(prev => prev.map(post =>
        post.id === selectedPost.id
          ? { ...post, comments_count: post.comments_count + 1 }
          : post
      ));

      toast({
        title: "Success",
        description: "Comment added successfully"
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add comment"
      });
    }
  };

  // Handle media file selection
  const handleMediaSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setNewPost(prev => ({
      ...prev,
      mediaFiles: [...prev.mediaFiles, ...files],
    }));
  };

  // Remove media file
  const removeMediaFile = (index: number) => {
    setNewPost(prev => ({
      ...prev,
      mediaFiles: prev.mediaFiles.filter((_, i) => i !== index),
    }));
  };

  // Format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 2592000)}mo`;
  };

  // Filter posts based on search term
  const filteredPosts = useMemo(() => {
    if (!searchTerm.trim()) return posts;

    return posts.filter(post =>
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.hashtags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [posts, searchTerm]);

  // Test function to debug post creation
  const testPostCreation = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }

    try {
      console.log('Testing post creation with user ID:', user.id);

      // First, get the profile ID for the current user
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        toast({
          variant: "destructive",
          title: "Profile Error",
          description: "Could not find user profile. Please make sure you have a profile set up."
        });
        return;
      }

      console.log('Found profile ID:', profile.id);

      const testData = {
        content: 'Test post from debug function',
        author_id: profile.id, // Use profile ID, not user ID
        is_published: true,
      };

      console.log('Test data:', testData);

      const { data, error } = await supabase
        .from('posts')
        .insert(testData)
        .select();

      if (error) {
        console.error('Test post creation failed:', error);
        toast({
          variant: "destructive",
          title: "Test Failed",
          description: `Error: ${error.message}`
        });
      } else {
        console.log('Test post created successfully:', data);
        toast({
          title: "Test Success",
          description: "Test post created successfully!"
        });
      }
    } catch (error) {
      console.error('Test post creation error:', error);
      toast({
        variant: "destructive",
        title: "Test Error",
        description: "An unexpected error occurred during testing."
      });
    }
  };

  // Load posts on component mount and when dependencies change
  useEffect(() => {
    fetchPosts();
  }, [activeTab, sortBy, profile?.id]);

  return (
    <AppLayout pageTitle="Posts">
      <div className="w-full py-4 px-4 md:px-6 space-y-6">
        {/* Header */}
        <div className="border-b border-border/60 pb-5">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <p className="noir-eyebrow text-primary mb-1">Creator Feed</p>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground">Posts</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Share updates, work-in-progress, and ideas with the community
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search posts or #hashtag"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 bg-surface-elevated border-border/80"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-36 bg-surface-elevated border-border/80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/80">
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="trending">Trending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={testPostCreation}
                  className="text-xs border-border/80 bg-surface-elevated hover:bg-surface-hover"
                >
                  Debug Test
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir font-medium">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Post
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border/80 shadow-noir">
                    <DialogHeader>
                      <DialogTitle className="font-display text-xl text-foreground">Create New Post</DialogTitle>
                      <DialogDescription>
                        Share your thoughts, updates, or work-in-progress with the community.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Input
                          placeholder="Post title (optional)"
                          className="bg-surface-elevated border-border/80"
                          value={newPost.title}
                          onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Textarea
                          placeholder="What's on your mind? Use #hashtags to categorize your post..."
                          value={newPost.content}
                          onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                          className="min-h-32 bg-surface-elevated border-border/80"
                        />
                      </div>

                      {/* Media Upload */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Add Media (Optional)</label>
                        <div className="border-2 border-dashed border-border/80 bg-surface-elevated/50 hover:border-primary/40 rounded-xl p-6 transition-colors">
                          <input
                            type="file"
                            multiple
                            accept="image/*,video/*"
                            onChange={handleMediaSelect}
                            className="hidden"
                            id="media-upload"
                          />
                          <label
                            htmlFor="media-upload"
                            className="flex flex-col items-center justify-center cursor-pointer"
                          >
                            <Upload className="h-8 w-8 text-primary mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload images or videos
                            </p>
                          </label>
                        </div>

                        {/* Selected Media Preview */}
                        {newPost.mediaFiles.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {newPost.mediaFiles.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 p-2.5 bg-surface-elevated border border-border/80 rounded-lg">
                                {file.type.startsWith('image/') ? (
                                  <ImageIcon className="h-4 w-4 text-primary" />
                                ) : (
                                  <VideoIcon className="h-4 w-4 text-primary" />
                                )}
                                <span className="text-sm flex-1 truncate text-foreground">{file.name}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMediaFile(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          className="border-border/80 bg-surface-elevated hover:bg-surface-hover"
                          onClick={() => setIsCreateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          className="bg-primary text-primary-foreground hover:bg-primary-hover"
                          onClick={handleCreatePost}
                          disabled={isUploading || !newPost.content.trim()}
                        >
                          {isUploading ? "Creating..." : "Create Post"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 bg-surface-elevated border border-border/80">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All Posts</TabsTrigger>
            <TabsTrigger value="trending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Trending Posts</TabsTrigger>
            <TabsTrigger value="published" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Published Posts</TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Saved Posts</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Posts Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2 font-mono text-xs uppercase tracking-widest">Loading posts...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-border/80 bg-card/60">
              <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No posts found</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-noir">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border border-border/80">
                        <AvatarFallback className="bg-primary/15 text-primary font-mono font-semibold">
                          {post.author?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">
                          {post.author?.full_name || "Unknown User"}
                        </h3>
                        <p className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary/80" />
                          {formatTimeAgo(post.created_at)}
                        </p>
                      </div>
                    </div>
                    {post.is_featured && (
                      <Badge variant="secondary" className="bg-primary/15 text-primary border border-primary/30 font-mono text-[11px] uppercase">
                        <Flame className="h-3 w-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Post Content */}
                  <div>
                    {post.title && (
                      <h4 className="font-display font-semibold text-lg text-foreground mb-2">{post.title}</h4>
                    )}
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.content}</p>

                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {post.hashtags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs bg-surface-elevated border-border/80 text-muted-foreground font-mono">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Media */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="space-y-2">
                      {post.media_urls.map((url, index) => (
                        <div key={index} className="relative rounded-xl overflow-hidden border border-border/80 bg-surface-elevated">
                          {post.media_types?.[index] === 'video' ? (
                            <video
                              src={url}
                              controls
                              className="w-full max-h-96 object-cover rounded-lg"
                            />
                          ) : (
                            <img
                              src={url}
                              alt="Post media"
                              className="w-full max-h-96 object-cover rounded-lg"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/60">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLikePost(post.id, post.is_liked || false)}
                        disabled={loadingActions[`like-${post.id}`]}
                        className={`flex items-center gap-2 transition-colors ${post.is_liked ? 'text-destructive hover:text-destructive' : 'text-muted-foreground hover:text-primary'}`}
                      >
                        <Heart className={`h-4 w-4 transition-all ${post.is_liked ? 'fill-current scale-110' : 'hover:scale-110'}`} />
                        <span className="font-mono font-medium">{post.likes_count}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPost(post);
                          setIsCommentsDialogOpen(true);
                          fetchComments(post.id);
                        }}
                        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <MessageCircle className="h-4 w-4 hover:scale-110 transition-transform" />
                        <span className="font-mono font-medium">{post.comments_count}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSharePost(post)}
                        className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Share2 className="h-4 w-4 hover:scale-110 transition-transform" />
                        <span className="font-mono font-medium">{post.shares_count}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSavePost(post.id, post.is_saved || false)}
                        disabled={loadingActions[`save-${post.id}`]}
                        className={`flex items-center gap-2 transition-colors ${post.is_saved ? 'text-primary hover:text-primary' : 'text-muted-foreground hover:text-primary'}`}
                      >
                        <Bookmark className={`h-4 w-4 transition-all ${post.is_saved ? 'fill-current scale-110' : 'hover:scale-110'}`} />
                      </Button>
                    </div>

                    {post.comments_count > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPost(post);
                          setIsCommentsDialogOpen(true);
                          fetchComments(post.id);
                        }}
                        className="text-muted-foreground hover:text-primary text-xs"
                      >
                        View comments
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Comments Dialog */}
        <Dialog open={isCommentsDialogOpen} onOpenChange={setIsCommentsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-foreground">Comments</DialogTitle>
              <DialogDescription>
                Join the conversation and share your thoughts on this post.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Add Comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-surface-elevated border-border/80"
                />
                <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={handleAddComment} disabled={!newComment.trim()}>
                  Post
                </Button>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="space-y-2 p-3 rounded-xl bg-surface-elevated border border-border/80">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 border border-border/80">
                        <AvatarFallback className="bg-primary/15 text-primary font-mono text-xs">
                          {comment.author?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground">
                            {comment.author?.full_name || "Unknown User"}
                          </h4>
                          <span className="text-xs font-mono text-muted-foreground">
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/90 mt-1">{comment.content}</p>
                      </div>
                    </div>

                    {/* Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="ml-11 space-y-2 pt-2 border-t border-border/50">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex items-start gap-3">
                            <Avatar className="h-6 w-6 border border-border/80">
                              <AvatarFallback className="bg-primary/15 text-primary font-mono text-[10px]">
                                {reply.author?.full_name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="font-medium text-xs text-foreground">
                                  {reply.author?.full_name || "Unknown User"}
                                </h5>
                                <span className="text-xs font-mono text-muted-foreground">
                                  {formatTimeAgo(reply.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-foreground/90 mt-1">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default PostsPage;
