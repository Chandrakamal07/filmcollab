import { AppLayout } from "@/components/layout/app-layout";
import { DimensionalCard, DimensionalLayer, ImageReveal } from "@/components/ui/motion-primitives";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryDropdown } from "@/components/ui/category-dropdown";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Search, 
  Filter, 
  Plus, 
  Heart, 
  Share2, 
  Eye, 
  Users, 
  Clock, 
  MapPin, 
  Film, 
  Tv, 
  Star, 
  TrendingUp,
  UserPlus,
  Bookmark,
  X,
  Check
} from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Project interface
interface Project {
  id: string;
  title: string;
  description: string | null;
  project_type: string;
  category: string;
  status: string;
  project_status?: string | null;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  duration_minutes: number | null;
  episodes: number | null;
  team_size: number;
  tags: string[] | null;
  project_tags?: string[] | null;
  skills_required: string[] | null;
  created_by: string;
  featured: boolean;
  popular: boolean;
  created_at: string;
  updated_at: string;
   likes_count?: number;
  is_liked?: boolean;
  is_member?: boolean;
  creator_username?: string;
  creator_name?: string;
  allow_applicants?: boolean;
}

// Form schema
const projectSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  project_type: z.string().min(1, "Please select a project type"),
  category: z.string().min(1, "Please select a category"),
  status: z.string().min(1, "Please select a status"),
  project_status: z.string().default("Public"),
  location: z.string().min(2, "Location must be at least 2 characters"),
  budget_min: z.number().optional(),
  budget_max: z.number().optional(),
  duration_minutes: z.number().optional(),
  episodes: z.number().optional(),
  skills_required: z.string().optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [likedProjects, setLikedProjects] = useState<string[]>([]);
  const [savedProjects, setSavedProjects] = useState<string[]>([]);
  const [appliedProjects, setAppliedProjects] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [projectDetailsTab, setProjectDetailsTab] = useState("details");
  const [applicants, setApplicants] = useState<Record<string, unknown>[]>([]);
  const [filters, setFilters] = useState({
    projectType: "all",
    category: "all",
    status: "all",
    location: "all",
    budgetRange: "all"
  });
  const [categories, setCategories] = useState<string[]>([
    "Feature Film", "Short Film", "Web Series", "TV Series", "Documentary", "Music Video"
  ]);

  useEffect(() => {
    const fetchDBCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("name")
          .order("name", { ascending: true });
        if (error) {
          console.error("Error fetching categories:", error);
          return;
        }
        if (data && data.length > 0) {
          const names = data.map((item) => item.name);
          setCategories(names);
        }
      } catch (err) {
        console.error("Error in fetchDBCategories:", err);
      }
    };
    fetchDBCategories();
  }, []);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      title: "",
      description: "",
      project_type: "",
      category: "",
      status: "planning",
      project_status: "Public",
      location: "",
      budget_min: 0,
      budget_max: 0,
      duration_minutes: 0,
      episodes: 0,
      skills_required: "",
    },
  });

  // Hardcoded projects data
  const hardcodedProjects: Project[] = [
    {
      id: "1",
      title: "The Silent Revolution",
      description: "A gripping thriller about a whistleblower who uncovers corporate corruption in the tech industry. Seeking experienced cinematographer and editor for this indie feature film.",
      project_type: "Film",
      category: "Feature Film",
      status: "pre-production",
      location: "Mumbai, India",
      budget_min: 5000000,
      budget_max: 8000000,
      budget_currency: "₹",
      duration_minutes: 120,
      episodes: null,
      team_size: 8,
      tags: ["thriller", "indie", "corruption"],
      skills_required: ["Director", "Cinematographer", "Editor", "Sound Designer"],
      created_by: "user-1",
      featured: true,
      popular: true,
      created_at: "2024-12-01T10:00:00Z",
      updated_at: "2024-12-15T14:30:00Z",
      likes_count: 45,
      is_liked: false,
      is_member: false
    },
    {
      id: "2",
      title: "Digital Dreams",
      description: "A sci-fi web series exploring the intersection of artificial intelligence and human creativity. Looking for talented writers and VFX artists.",
      project_type: "Web Series",
      category: "Web Series",
      status: "planning",
      location: "Bangalore, India",
      budget_min: 2000000,
      budget_max: 5000000,
      budget_currency: "₹",
      duration_minutes: null,
      episodes: 8,
      team_size: 12,
      tags: ["sci-fi", "AI", "web-series"],
      skills_required: ["Writer", "VFX Artist", "Director", "Producer"],
      created_by: "user-2",
      featured: false,
      popular: true,
      created_at: "2024-11-28T09:15:00Z",
      updated_at: "2024-12-10T16:45:00Z",
      likes_count: 32,
      is_liked: false,
      is_member: false
    },
    {
      id: "3",
      title: "Mumbai Stories",
      description: "An anthology series showcasing diverse stories from the heart of Mumbai. Each episode tells a different tale of hope, struggle, and triumph.",
      project_type: "Television",
      category: "TV Series",
      status: "production",
      location: "Mumbai, India",
      budget_min: 10000000,
      budget_max: 15000000,
      budget_currency: "₹",
      duration_minutes: null,
      episodes: 12,
      team_size: 15,
      tags: ["drama", "anthology", "mumbai"],
      skills_required: ["Director", "Script Writer", "Cinematographer", "Production Designer"],
      created_by: "user-3",
      featured: true,
      popular: false,
      created_at: "2024-11-15T14:20:00Z",
      updated_at: "2024-12-12T11:30:00Z",
      likes_count: 28,
      is_liked: false,
      is_member: false
    },
    {
      id: "4",
      title: "The Last Dance",
      description: "A documentary following the journey of classical dancers preserving traditional Indian dance forms in the modern world.",
      project_type: "Documentary",
      category: "Documentary",
      status: "post-production",
      location: "Delhi, India",
      budget_min: 1500000,
      budget_max: 2500000,
      budget_currency: "₹",
      duration_minutes: 90,
      episodes: null,
      team_size: 6,
      tags: ["documentary", "dance", "culture"],
      skills_required: ["Director", "Cinematographer", "Editor", "Sound Recordist"],
      created_by: "user-4",
      featured: false,
      popular: false,
      created_at: "2024-10-20T08:30:00Z",
      updated_at: "2024-12-08T13:15:00Z",
      likes_count: 19,
      is_liked: false,
      is_member: false
    },
    {
      id: "5",
      title: "Short Circuit",
      description: "A quirky short film about a robot learning to love. Perfect for emerging filmmakers looking to build their portfolio.",
      project_type: "Short Film",
      category: "Short Film",
      status: "planning",
      location: "Pune, India",
      budget_min: 500000,
      budget_max: 800000,
      budget_currency: "₹",
      duration_minutes: 15,
      episodes: null,
      team_size: 5,
      tags: ["short-film", "robot", "love", "quirky"],
      skills_required: ["Director", "Cinematographer", "Editor", "Actor"],
      created_by: "user-5",
      featured: false,
      popular: false,
      created_at: "2024-12-05T16:45:00Z",
      updated_at: "2024-12-14T10:20:00Z",
      likes_count: 12,
      is_liked: false,
      is_member: false
    },
    {
      id: "6",
      title: "Bollywood Beats",
      description: "A music video series featuring fusion of classical Indian music with contemporary beats. Seeking musicians and choreographers.",
      project_type: "Music Video",
      category: "Music Video",
      status: "pre-production",
      location: "Chennai, India",
      budget_min: 800000,
      budget_max: 1200000,
      budget_currency: "₹",
      duration_minutes: 4,
      episodes: 6,
      team_size: 7,
      tags: ["music", "fusion", "classical", "contemporary"],
      skills_required: ["Music Director", "Choreographer", "Cinematographer", "Editor"],
      created_by: "user-6",
      featured: false,
      popular: true,
      created_at: "2024-11-30T12:00:00Z",
      updated_at: "2024-12-13T15:30:00Z",
      likes_count: 25,
      is_liked: false,
      is_member: false
    },
    {
      id: "7",
      title: "The Startup Story",
      description: "A corporate drama series following the journey of young entrepreneurs building India's next unicorn startup.",
      project_type: "Television",
      category: "TV Series",
      status: "planning",
      location: "Gurgaon, India",
      budget_min: 12000000,
      budget_max: 20000000,
      budget_currency: "₹",
      duration_minutes: null,
      episodes: 10,
      team_size: 18,
      tags: ["drama", "startup", "entrepreneurship"],
      skills_required: ["Director", "Writer", "Producer", "Cinematographer", "Production Manager"],
      created_by: "user-7",
      featured: true,
      popular: false,
      created_at: "2024-12-03T11:30:00Z",
      updated_at: "2024-12-16T09:45:00Z",
      likes_count: 38,
      is_liked: false,
      is_member: false
    },
    {
      id: "8",
      title: "Street Art Chronicles",
      description: "A documentary exploring the vibrant street art scene in Indian cities and the artists behind these beautiful creations.",
      project_type: "Documentary",
      category: "Documentary",
      status: "production",
      location: "Kolkata, India",
      budget_min: 2000000,
      budget_max: 3500000,
      budget_currency: "₹",
      duration_minutes: 75,
      episodes: null,
      team_size: 8,
      tags: ["documentary", "street-art", "culture", "urban"],
      skills_required: ["Director", "Cinematographer", "Editor", "Researcher"],
      created_by: "user-8",
      featured: false,
      popular: false,
      created_at: "2024-11-25T14:15:00Z",
      updated_at: "2024-12-11T12:00:00Z",
      likes_count: 21,
      is_liked: false,
      is_member: false
    }
  ];

  useEffect(() => {
    fetchProjects();
    fetchLikedProjects();
    fetchSavedProjects();
    fetchAppliedProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Fetch projects from Supabase dynamically
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching projects from Supabase:", error);
        setProjects([]);
        return;
      }

      // Fetch profiles to map created_by to usernames
      const { data: profilesData } = await supabase
        .from("public_profiles")
        .select("id, username, full_name");

      // Fetch user's joined projects
      const memberOfProjects = new Set<string>();
      if (user?.id) {
        const { data: memberData } = await supabase
          .from("project_members")
          .select("project_id, role")
          .eq("user_id", user.id);
          
        if (memberData) {
          memberData.forEach(m => {
            if (m.role && m.role !== "Applicant") {
              memberOfProjects.add(m.project_id);
            }
          });
        }
      }

      const profileMap: Record<string, { username: string; full_name: string }> = {};
      if (profilesData) {
        profilesData.forEach(p => {
          if (p.id) {
            profileMap[p.id] = {
              username: p.username || "",
              full_name: p.full_name || ""
            };
          }
        });
      }

      if (data && data.length > 0) {
        const projectsWithDetails = data.map((project: {
          id: string;
          title: string;
          description: string | null;
          project_type: string;
          category: string;
          status: string;
          project_status: string | null;
          location: string | null;
          budget_min: number | null;
          budget_max: number | null;
          budget_currency: string | null;
          duration_minutes: number | null;
          episodes: number | null;
          team_size: number | null;
          tags: string[] | null;
          skills_required: string[] | null;
          created_by: string | null;
          featured: boolean | null;
          popular: boolean | null;
          created_at: string | null;
          updated_at: string | null;
          likes_count?: number;
          allow_applicants?: boolean | null;
        }) => {
          const isLiked = likedProjects.includes(project.id);
          const isMember = memberOfProjects.has(project.id);
          
          return {
            id: project.id,
            title: project.title,
            description: project.description,
            project_type: project.project_type,
            category: project.category,
            status: project.status,
            project_status: project.project_status || "Public",
            location: project.location,
            budget_min: project.budget_min ? Number(project.budget_min) : null,
            budget_max: project.budget_max ? Number(project.budget_max) : null,
            budget_currency: project.budget_currency || "₹",
            duration_minutes: project.duration_minutes,
            episodes: project.episodes,
            team_size: project.team_size || 1,
            tags: project.tags || [],
            skills_required: project.skills_required || [],
            created_by: project.created_by || "",
            featured: project.featured || false,
            popular: project.popular || false,
            created_at: project.created_at,
            updated_at: project.updated_at || project.created_at,
            likes_count: project.likes_count || Math.floor(Math.random() * 20) + 10,
            is_liked: isLiked,
            is_member: isMember,
            creator_username: project.created_by ? (profileMap[project.created_by]?.username || "") : "",
            creator_name: project.created_by ? (profileMap[project.created_by]?.full_name || "") : "",
            allow_applicants: project.allow_applicants !== false,
          };
        });

        setProjects(projectsWithDetails);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikedProjects = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("project_likes")
        .select("project_id")
        .eq("user_id", user.id);
      
      if (error) throw error;
      if (data) {
        setLikedProjects(data.map((item: { project_id: string }) => item.project_id));
      }
    } catch (error) {
      console.error('Error fetching liked projects:', error);
    }
  };

  const fetchSavedProjects = async () => {
    if (!user) return;
    
    try {
      const saved = localStorage.getItem(`saved_projects_${user.id}`);
      if (saved) {
        setSavedProjects(JSON.parse(saved));
      } else {
        setSavedProjects([]);
      }
    } catch (error) {
      console.error('Error fetching saved projects:', error);
      setSavedProjects([]);
    }
  };

  const fetchAppliedProjects = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user.id)
        .eq("role", "Applicant");
      
      if (error) throw error;
      if (data) {
        setAppliedProjects(data.map((item: { project_id: string }) => item.project_id));
      }
    } catch (error) {
      console.error('Error fetching applied projects:', error);
      setAppliedProjects([]);
    }
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (!user) return;

    try {
      const skillsArray = data.skills_required 
        ? data.skills_required.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0)
        : [];

      const normalizedVisibility = (data.project_status || "Public").toLowerCase() === "public" ? "public" : "private";
      // Insert new project into Supabase table
      const { data: insertedData, error } = await supabase
        .from("projects")
        .insert([{
          title: data.title,
          description: data.description,
          project_type: data.project_type,
          category: data.category,
          status: data.status,
          project_status: data.project_status || "Public",
          visibility: normalizedVisibility,
          location: data.location,
          budget_min: data.budget_min && data.budget_min > 0 ? data.budget_min : null,
          budget_max: data.budget_max && data.budget_max > 0 ? data.budget_max : null,
          budget_currency: "₹",
          duration_minutes: data.duration_minutes && data.duration_minutes > 0 ? data.duration_minutes : null,
          episodes: data.episodes && data.episodes > 0 ? data.episodes : null,
          team_size: Math.floor(Math.random() * 10) + 5,
          tags: [],
          skills_required: skillsArray,
          created_by: user.id,
          featured: false,
          popular: false
        }])
        .select();

      if (error) {
        console.error("Error inserting project:", error);
        toast({
          variant: "destructive",
          title: "Error Creating Project",
          description: error.message
        });
        return;
      }
      
      toast({
        title: "Success",
        description: "Project created successfully"
      });
      form.reset();
      setIsCreateDialogOpen(false);
      fetchProjects(); // Refresh the display
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    }
  };

  const handleSaveProject = async (projectId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign In Required",
        description: "Please sign in to save projects"
      });
      return;
    }

    try {
      const isSaved = savedProjects.includes(projectId);
      let updatedSaved: string[];

      if (isSaved) {
        // Unsave project
        updatedSaved = savedProjects.filter(id => id !== projectId);
        setSavedProjects(updatedSaved);
        toast({
          title: "Project Unsaved",
          description: "Project has been removed from your saved list"
        });
      } else {
        // Save project
        updatedSaved = [...savedProjects, projectId];
        setSavedProjects(updatedSaved);
        toast({
          title: "Project Saved",
          description: "Project has been added to your saved list"
        });
      }

      localStorage.setItem(`saved_projects_${user.id}`, JSON.stringify(updatedSaved));

      // Refresh projects to update counts
      fetchProjects();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleLikeProject = async (projectId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign In Required",
        description: "Please sign in to like projects"
      });
      return;
    }

    try {
      const isLiked = likedProjects.includes(projectId);

      if (isLiked) {
        // Unlike project
        setLikedProjects(prev => prev.filter(id => id !== projectId));
      } else {
        // Like project
        setLikedProjects(prev => [...prev, projectId]);
      }

      // Refresh projects to update like counts
      fetchProjects();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleJoinProject = async (projectId: string) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Sign In Required",
        description: "Please sign in to join projects"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: user.id,
          role: "Applicant"
        });

      if (error) throw error;

      // Add to applied projects
      setAppliedProjects(prev => [...prev, projectId]);
      
      const project = projects.find(p => p.id === projectId);
      if (project && project.created_by && project.created_by !== user.id) {
        supabase.rpc("send_authorized_notification", {
          p_recipient_id: project.created_by,
          p_title: "New Project Application",
          p_description: `Someone applied to join your project: ${project.title}`,
          p_type: "project",
          p_priority: "medium",
          p_action_url: `/projects?projectId=${project.id}`
        }).then(({ error: notifError }) => {
          if (notifError) console.error("Notification error:", notifError);
        });
      }
      
      toast({
        title: "Application submitted",
        description: "Your application has been submitted successfully."
      });
      fetchProjects();
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred"
      });
    }
  };

  const handleShareProject = async (project: Project) => {
    const projectUrl = `${window.location.origin}/projects/${project.id}`;
    const shareText = `Check out this project: ${project.title}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: project.title,
          text: shareText,
          url: projectUrl,
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${projectUrl}`);
        toast({
          title: "Link Copied",
          description: "Project link has been copied to clipboard"
        });
      } catch (error) {
        alert(`${shareText}\n${projectUrl}`);
      }
    }
  };

  const handleViewProjectDetails = (project: Project) => {
    // Navigate to project details page with tab information
    navigate(`/projects/${project.id}?tab=${activeTab}`);
  };

  const fetchApplicants = async (projectId: string) => {
    try {
      // Mock applicants data - in a real app, you'd fetch from your database
      const mockApplicants = [
        {
          id: "1",
          name: "John Smith",
          email: "john.smith@email.com",
          avatar: "JS",
          appliedDate: "2025-01-08",
          status: "pending",
          experience: "5 years",
          skills: ["Director", "Producer", "Editor"],
          role: "Director"
        },
        {
          id: "2", 
          name: "Sarah Johnson",
          email: "sarah.j@email.com",
          avatar: "SJ",
          appliedDate: "2025-01-07",
          status: "reviewed",
          experience: "3 years",
          skills: ["Cinematographer", "Photographer"],
          role: "Cinematographer"
        },
        {
          id: "3",
          name: "Mike Chen",
          email: "mike.chen@email.com", 
          avatar: "MC",
          appliedDate: "2025-01-06",
          status: "shortlisted",
          experience: "7 years",
          skills: ["Actor", "Voice Artist"],
          role: "Lead Actor"
        }
      ];
      setApplicants(mockApplicants);
    } catch (error) {
      console.error('Error fetching applicants:', error);
      setApplicants([]);
    }
  };

  const getFilteredProjects = () => {
    let filtered = projects;

    // Display only projects with public status, except in the 'created' tab where the user manages their own projects
    if (activeTab !== "created") {
      filtered = filtered.filter(project => project.project_status === "Public");
    }

    // Filter by tab
    if (activeTab === "joined") {
      filtered = filtered.filter(project => project.is_member && project.created_by !== user?.id);
    } else if (activeTab === "created") {
      filtered = filtered.filter(project => project.created_by === user?.id);
    } else if (activeTab === "saved") {
      filtered = filtered.filter(project => savedProjects.includes(project.id));
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.project_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.skills_required?.some(skill => 
          skill.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply additional filters
    if (filters.projectType !== "all") {
      filtered = filtered.filter(project => project.project_type === filters.projectType);
    }
    if (filters.category !== "all") {
      filtered = filtered.filter(project => project.category === filters.category);
    }
    if (filters.status !== "all") {
      filtered = filtered.filter(project => project.status === filters.status);
    }
    if (filters.location !== "all") {
      filtered = filtered.filter(project => project.location === filters.location);
    }
    if (filters.budgetRange !== "all") {
      filtered = filtered.filter(project => {
        const budget = project.budget_max || 0;
        switch (filters.budgetRange) {
          case "low": return budget < 1000000;
          case "medium": return budget >= 1000000 && budget < 5000000;
          case "high": return budget >= 5000000;
          default: return true;
        }
      });
    }

    // Sort projects
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case "popular":
        filtered.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
        break;
      case "budget":
        filtered.sort((a, b) => (b.budget_max || 0) - (a.budget_max || 0));
        break;
    }

    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing": return "bg-blue-500";
      case "planning": return "bg-yellow-500";
      case "completed": return "bg-green-500";
      default: return "bg-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Film": return <Film className="h-4 w-4" />;
      case "Television": return <Tv className="h-4 w-4" />;
      default: return <Film className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      if (diffDays <= 0) return "today";
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const days = diffDays % 30;
      const monthStr = `${months} ${months === 1 ? "month" : "months"}`;
      const dayStr = days > 0 ? ` ${days} ${days === 1 ? "day" : "days"}` : "";
      return `${monthStr}${dayStr} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      const months = Math.floor((diffDays % 365) / 30);
      const yearStr = `${years} ${years === 1 ? "year" : "years"}`;
      const monthStr = months > 0 ? ` ${months} ${months === 1 ? "month" : "months"}` : "";
      return `${yearStr}${monthStr} ago`;
    }
  };

  const formatBudget = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `${currency}${(min / 10000000).toFixed(1)}Cr - ${currency}${(max / 10000000).toFixed(1)}Cr`;
    if (min) return `${currency}${(min / 10000000).toFixed(1)}Cr+`;
    return `${currency}${(max! / 10000000).toFixed(1)}Cr`;
  };

  const filteredProjects = getFilteredProjects();

  return (
    <AppLayout pageTitle="Projects">
      <div className="space-y-6 text-foreground">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="w-full sm:w-auto">
            <p className="noir-eyebrow mb-1">Production Slate & Collaborations</p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Projects</h1>
            <p className="text-muted-foreground mt-1 w-full">
              Discover and collaborate on film and entertainment projects
            </p>
          </div>
          <Button 
            className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium w-full sm:w-auto"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex gap-2 w-full flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search projects, titles, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-border/80 focus:border-primary bg-card text-foreground w-full"
              />
            </div>
            <Button variant="outline" className="shrink-0 border-border/80 bg-surface-elevated/50 text-foreground hover:text-primary hover:border-primary/40 hover:bg-surface-hover" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Filters</span>
            </Button>
          </div>
          
          <div className="hidden md:block">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 bg-background border-border text-foreground">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="budget">Highest Budget</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="w-full overflow-x-auto pb-2 scrollbar-none">
            <TabsList className="inline-flex min-w-max w-full md:grid md:w-full md:grid-cols-4 bg-surface-elevated border border-border/80 p-1">
              <TabsTrigger value="all" className="flex-1 whitespace-nowrap px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">All Projects ({projects.length})</TabsTrigger>
              <TabsTrigger value="joined" className="flex-1 whitespace-nowrap px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">Joined ({projects.filter(p => p.is_member && p.created_by !== user?.id).length})</TabsTrigger>
              <TabsTrigger value="created" className="flex-1 whitespace-nowrap px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">Created ({projects.filter(p => p.created_by === user?.id).length})</TabsTrigger>
              <TabsTrigger value="saved" className="flex-1 whitespace-nowrap px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground dark:data-[state=active]:text-primary-foreground font-medium text-xs sm:text-sm">Saved ({savedProjects.length})</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Showing {filteredProjects.length} of {projects.length} projects
              </p>
            </div>

            {/* Projects Display */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card className="bg-card text-card-foreground border-border">
                <CardContent className="text-center py-12">
                  <Film className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No projects found</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'created' 
                      ? "You haven't created any projects yet. Click 'Create Project' to get started."
                      : activeTab === 'saved'
                      ? "You haven't saved any projects yet. Click the save icon on projects to add them here."
                      : "Try adjusting your search criteria or check back later for new projects."
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (activeTab === "joined" || activeTab === "created" || activeTab === "saved") ? (
              // Table format for joined, created, and saved tabs
              <div className="rounded-xl border border-border/80 bg-card text-card-foreground shadow-noir overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead>Project Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id} className="border-b border-border">
                        <TableCell className="font-medium">
                          <div className="space-y-1">
                            <div 
                              className="font-semibold cursor-pointer hover:text-primary transition-colors text-foreground"
                              onClick={() => {
                                handleViewProjectDetails(project);
                              }}
                            >
                              {project.title}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {project.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-foreground">
                            {getTypeIcon(project.project_type)}
                            <span className="text-sm">{project.project_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`}></div>
                            <Badge variant="outline" className="text-xs capitalize border-border text-foreground">
                              {project.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-foreground">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{project.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono font-medium text-primary">
                            {formatBudget(project.budget_min, project.budget_max, project.budget_currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-foreground">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(project.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {activeTab === "created" ? (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewProjectDetails(project)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleShareProject(project)}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleViewProjectDetails(project)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleSaveProject(project.id)}
                                  className={savedProjects.includes(project.id) ? "text-primary" : ""}
                                >
                                  <Bookmark className={`h-4 w-4 ${savedProjects.includes(project.id) ? "fill-current" : ""}`} />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleShareProject(project)}
                                >
                                  <Share2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              // Studio Noir V2 Widescreen 16:9 Dimensional Project Slates
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project, pIdx) => {
                  const projectBackdrops = [
                    "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=900&q=80",
                    "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=900&q=80",
                  ];
                  const backdropUrl = projectBackdrops[pIdx % projectBackdrops.length];
                  return (
                  <DimensionalCard key={project.id} tiltStrength={5.5} className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-noir hover:border-primary/45 transition-all duration-300 flex flex-col justify-between">
                    <div>
                      <div
                        onClick={() => handleViewProjectDetails(project)}
                        className="aspect-[16/9] w-full bg-surface-elevated border-b border-border/60 relative overflow-hidden cursor-pointer"
                      >
                        <ImageReveal
                          src={backdropUrl}
                          alt={project.title}
                          containerClassName="w-full h-full"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#121417] via-black/30 to-black/20" />
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                          <span className="px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur-md border border-primary/35 text-[10px] font-mono uppercase tracking-[0.18em] text-primary">
                            {project.project_type} • {project.category}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur-md border border-white/15 font-mono text-[10px] uppercase tracking-wider text-white/90 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(project.status)}`} />
                            {project.status}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2 z-10">
                          <div>
                            <h3 className="font-serif text-xl font-bold tracking-tight line-clamp-1 text-white group-hover:text-primary transition-colors">
                              {project.title}
                            </h3>
                            <p className="text-[11px] text-white/75 mt-0.5">
                              by <span className="font-medium text-primary">@{project.creator_username || "studio"}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    <CardHeader className="pb-2 pt-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary/80" />
                          <span>{project.location || "Remote / Global"}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleSaveProject(project.id)}
                            className={savedProjects.includes(project.id) ? "text-primary h-7 w-7 p-0" : "h-7 w-7 p-0"}
                          >
                            <Bookmark className={`h-3.5 w-3.5 ${savedProjects.includes(project.id) ? "fill-current" : ""}`} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleShareProject(project)}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    </div>
                    
                    <CardContent className="space-y-4">
                      <CardDescription className="line-clamp-2 text-muted-foreground">
                        {project.description}
                      </CardDescription>

                      {project.project_tags && project.project_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {project.project_tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary border border-primary/25">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-foreground">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{project.team_size} team members</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(project.created_at)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="font-mono text-xs font-medium text-primary">Budget: {formatBudget(project.budget_min, project.budget_max, project.budget_currency)}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            {project.duration_minutes ? `${project.duration_minutes} minutes` : 
                             project.episodes ? `${project.episodes} episodes` : 'Duration not specified'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <Button 
                          size="sm" 
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                          onClick={() => handleViewProjectDetails(project)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        {!project.is_member && project.created_by !== user?.id && project.allow_applicants !== false && (
                          <Button 
                            variant={appliedProjects.includes(project.id) ? "secondary" : "outline"}
                            size="sm"
                            className={appliedProjects.includes(project.id) 
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold opacity-100 disabled:opacity-100 cursor-default" 
                              : "border-border/80 bg-surface-elevated/50 text-foreground hover:text-primary hover:border-primary/40 hover:bg-surface-hover"
                            }
                            onClick={() => handleJoinProject(project.id)}
                            disabled={appliedProjects.includes(project.id)}
                          >
                            {appliedProjects.includes(project.id) ? (
                              <Check className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                            ) : (
                              <UserPlus className="h-4 w-4 mr-2" />
                            )}
                            {appliedProjects.includes(project.id) ? "Applied" : "Join Project"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </DimensionalCard>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Project Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
              <DialogDescription>
                Share your creative vision and find collaborators
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Project Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. The Silent..." className="border-border/80 bg-surface-elevated/50 focus:border-primary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="project_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Project Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-border/80 bg-surface-elevated/50 focus:border-primary">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Film">Film</SelectItem>
                            <SelectItem value="Television">Television</SelectItem>
                            <SelectItem value="Web Series">Web Series</SelectItem>
                            <SelectItem value="Documentary">Documentary</SelectItem>
                            <SelectItem value="Short Film">Short Film</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your project, its vision, and what you're looking for in collaborators..."
                          className="min-h-[100px] border-border/80 bg-surface-elevated/50 focus:border-primary"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Your Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-border/80 bg-surface-elevated/50 focus:border-primary">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-border/80 bg-surface-elevated/50 focus:border-primary">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="pre-production">Pre-Production</SelectItem>
                            <SelectItem value="production">Production</SelectItem>
                            <SelectItem value="post-production">Post-Production</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Los Angeles, CA" className="border-border/80 bg-surface-elevated/50 focus:border-primary" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="project_status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Project Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "Public"}>
                          <FormControl>
                            <SelectTrigger className="border-border/80 bg-surface-elevated/50 focus:border-primary">
                              <SelectValue placeholder="Select project status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Public">Public</SelectItem>
                            <SelectItem value="Private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="budget_min"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Budget Min (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 1000000"
                            className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                            value={field.value === 0 ? "" : field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseInt(value) || 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="budget_max"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Budget Max (₹)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 5000000"
                            className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                            value={field.value === 0 ? "" : field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseInt(value) || 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duration_minutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 120"
                            className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                            value={field.value === 0 ? "" : field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseInt(value) || 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="episodes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground">Episodes (for series)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="e.g. 8"
                            className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                            value={field.value === 0 ? "" : field.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === "" ? 0 : parseInt(value) || 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="border-border/80 bg-surface-elevated/50 text-foreground hover:text-primary hover:border-primary/40 hover:bg-surface-hover"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                  >
                    Create Project
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Filter Panel */}
        {showFilters && (
          <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div className="w-80 bg-background h-full shadow-lg overflow-y-auto">
              <div className="px-0 py-2 md:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Filters & Sort</h3>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setShowFilters(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                  {/* Mobile Sort */}
                  <div className="md:hidden space-y-2">
                    <label className="text-sm font-medium text-foreground">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full bg-background border-border text-foreground">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="popular">Most Popular</SelectItem>
                        <SelectItem value="budget">Highest Budget</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project Type</label>
                    <Select value={filters.projectType} onValueChange={(value) => setFilters(prev => ({ ...prev, projectType: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Film">Film</SelectItem>
                        <SelectItem value="Television">Television</SelectItem>
                        <SelectItem value="Web Series">Web Series</SelectItem>
                        <SelectItem value="Documentary">Documentary</SelectItem>
                        <SelectItem value="Short Film">Short Film</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <CategoryDropdown
                      value={filters.category === "all" ? "" : filters.category}
                      onChange={(value) => setFilters(prev => ({ ...prev, category: value || "all" }))}
                      placeholder="All Categories"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="pre-production">Pre-Production</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                        <SelectItem value="post-production">Post-Production</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="Los Angeles, CA">Los Angeles, CA</SelectItem>
                        <SelectItem value="New York, NY">New York, NY</SelectItem>
                        <SelectItem value="Mumbai, India">Mumbai, India</SelectItem>
                        <SelectItem value="London, UK">London, UK</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Budget Range</label>
                    <Select value={filters.budgetRange} onValueChange={(value) => setFilters(prev => ({ ...prev, budgetRange: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Budgets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Budgets</SelectItem>
                        <SelectItem value="low">Under ₹10L</SelectItem>
                        <SelectItem value="medium">₹10L - ₹50L</SelectItem>
                        <SelectItem value="high">Above ₹50L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full border-border/80 bg-surface-elevated/50 text-foreground hover:text-primary hover:border-primary/40 hover:bg-surface-hover"
                      onClick={() => setFilters({
                        projectType: "all",
                        category: "all",
                        status: "all",
                        location: "all",
                        budgetRange: "all"
                      })}
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Details Dialog */}
        <Dialog open={showProjectDetails} onOpenChange={setShowProjectDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProject?.title}</DialogTitle>
              <DialogDescription>
                {selectedProject?.description}
              </DialogDescription>
            </DialogHeader>
            
            {selectedProject && (
              <div className="space-y-6">
                {/* Tabs for created projects */}
                {selectedProject.created_by === user?.id ? (
                  <Tabs value={projectDetailsTab} onValueChange={setProjectDetailsTab}>
                    <TabsList className="grid w-full grid-cols-1">
                      <TabsTrigger value="details">Project Details</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="details" className="space-y-6">
                      {/* Project Details Content */}
                      <div className="space-y-6">
                        {/* Project Overview */}
                        <div>
                          <h3 className="font-semibold mb-3 text-lg">Project Overview</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Type:</span>
                                <span className="font-medium">{selectedProject.project_type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Category:</span>
                                <span className="font-medium">{selectedProject.category}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status:</span>
                                <Badge variant="outline" className="capitalize">{selectedProject.status}</Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Location:</span>
                                <span className="font-medium">{selectedProject.location}</span>
                              </div>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Budget:</span>
                                <span className="font-mono font-medium text-primary">
                                  {formatBudget(selectedProject.budget_min, selectedProject.budget_max, selectedProject.budget_currency)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Duration:</span>
                                <span className="font-medium">
                                  {selectedProject.duration_minutes ? `${selectedProject.duration_minutes} minutes` : 
                                   selectedProject.episodes ? `${selectedProject.episodes} episodes` : 'Not specified'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Team Size:</span>
                                <span className="font-medium">{selectedProject.team_size} members</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Created:</span>
                                <span className="font-medium">{formatDate(selectedProject.created_at)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Full Description */}
                        <div>
                          <h3 className="font-semibold mb-3 text-lg">Project Description</h3>
                          <div className="bg-muted/40 p-4 rounded-lg border border-border">
                            <p className="text-foreground/90 leading-relaxed">
                              {selectedProject.description}
                            </p>
                          </div>
                        </div>

                        {/* Project Tags */}
                        {selectedProject.project_tags && selectedProject.project_tags.length > 0 && (
                          <div>
                            <h3 className="font-semibold mb-3 text-lg">Project Tags</h3>
                            <div className="flex flex-wrap gap-2">
                              {selectedProject.project_tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-sm px-3 py-1 bg-primary/10 text-primary hover:bg-primary/15 border border-primary/25">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Skills Required */}
                        <div>
                          <h3 className="font-semibold mb-3 text-lg">Skills Required</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedProject.skills_required?.map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                                {skill}
                              </Badge>
                            )) || <span className="text-muted-foreground">No skills specified</span>}
                          </div>
                        </div>

                        {/* Requirements */}
                        <div>
                          <h3 className="font-semibold mb-3 text-lg">Requirements</h3>
                          <div className="bg-muted/40 p-4 rounded-lg border border-border">
                            <ul className="space-y-2">
                              <li className="text-sm text-muted-foreground">Contact project creator for requirements</li>
                            </ul>
                          </div>
                        </div>

                        {/* Benefits */}
                        <div>
                          <h3 className="font-semibold mb-3 text-lg">Benefits & Perks</h3>
                          <div className="bg-surface-elevated/60 p-4 rounded-xl border border-border/80">
                            <p className="text-sm text-muted-foreground">Contact project creator for benefits</p>
                          </div>
                        </div>

                        {/* Timeline */}
                        <div>
                          <h3 className="font-semibold mb-3 text-lg">Project Timeline</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-muted/40 p-4 rounded-lg border border-border">
                              <p className="text-sm text-muted-foreground">Timeline information not available</p>
                            </div>
                          </div>
                        </div>

                        {/* Additional Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-semibold mb-3 text-lg">Target Audience</h3>
                            <div className="bg-muted/40 p-4 rounded-lg border border-border">
                              <p className="text-sm text-muted-foreground">Target audience not specified</p>
                            </div>
                          </div>
                          <div>
                            <h3 className="font-semibold mb-3 text-lg">Distribution Plan</h3>
                            <div className="bg-muted/40 p-4 rounded-lg border border-border">
                              <p className="text-sm text-muted-foreground">Distribution plan not specified</p>
                            </div>
                          </div>
                        </div>

                        {/* Production Notes */}
                        <div>
                          <h3 className="font-semibold mb-3 text-lg">Production Notes</h3>
                          <div className="bg-surface-elevated/60 p-4 rounded-xl border border-border/80">
                            <p className="text-sm text-muted-foreground">No production notes available</p>
                          </div>
                        </div>

                        {/* Contact Information */}
                        <div>
                          <h3 className="font-semibold mb-3 text-lg">Contact Information</h3>
                          <div className="bg-muted/40 p-4 rounded-lg border border-border">
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Email:</span>
                                <span className="font-medium text-muted-foreground">Contact information not available</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  // Regular project details for non-creators
                  <div className="space-y-6">
                    {/* Project Overview */}
                    <div>
                      <h3 className="font-semibold mb-3 text-lg">Project Overview</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Type:</span>
                            <span className="font-medium">{selectedProject.project_type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-medium">{selectedProject.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className="capitalize">{selectedProject.status}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Location:</span>
                            <span className="font-medium">{selectedProject.location}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Budget:</span>
                            <span className="font-mono font-medium text-primary">
                              {formatBudget(selectedProject.budget_min, selectedProject.budget_max, selectedProject.budget_currency)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Duration:</span>
                            <span className="font-medium">
                              {selectedProject.duration_minutes ? `${selectedProject.duration_minutes} minutes` : 
                               selectedProject.episodes ? `${selectedProject.episodes} episodes` : 'Not specified'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Team Size:</span>
                            <span className="font-medium">{selectedProject.team_size} members</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Created:</span>
                            <span className="font-medium">{formatDate(selectedProject.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Full Description */}
                    <div>
                      <h3 className="font-semibold mb-3 text-lg">Project Description</h3>
                      <div className="bg-muted/40 p-4 rounded-lg border border-border">
                        <p className="text-foreground/90 leading-relaxed">
                          {selectedProject.description}
                        </p>
                      </div>
                    </div>

                    {/* Project Tags */}
                    {selectedProject.project_tags && selectedProject.project_tags.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-3 text-lg">Project Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedProject.project_tags.map((tag: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-sm px-3 py-1 bg-primary/10 text-primary hover:bg-primary/15 border border-primary/25">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Skills Required */}
                    <div>
                      <h3 className="font-semibold mb-3 text-lg">Skills Required</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedProject.skills_required?.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                            {skill}
                          </Badge>
                        )) || <span className="text-muted-foreground">No skills specified</span>}
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div>
                      <h3 className="font-semibold mb-3 text-lg">Additional Information</h3>
                      <div className="bg-muted/40 p-4 rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">Contact the project creator for more details.</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      {appliedProjects.includes(selectedProject.id) ? (
                        <Button 
                          disabled
                          className="flex-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold opacity-100 disabled:opacity-100 cursor-default"
                        >
                          <Check className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
                          Applied
                        </Button>
                      ) : (selectedProject.created_by !== user?.id && selectedProject.allow_applicants === false) ? null : (
                        <Button 
                          className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                          onClick={() => handleJoinProject(selectedProject.id)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Join Project
                        </Button>
                      )}
                      <Button variant="outline" className="border-border/80 bg-surface-elevated/50 text-foreground hover:text-primary hover:border-primary/40 hover:bg-surface-hover" onClick={() => handleShareProject(selectedProject)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share Project
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
