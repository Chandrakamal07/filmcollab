import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/app-layout";
import { DimensionalCard } from "@/components/ui/motion-primitives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useAuth } from "@/hooks/use-auth";
import { 
  ArrowLeft, 
  MapPin, 
  Clock, 
  IndianRupee, 
  Users, 
  Calendar,
  Building,
  Briefcase,
  Star,
  Share2,
  Bookmark,
  Film,
  Tv,
  UserPlus,
  Heart,
  Eye,
  MessageCircle,
  CheckSquare,
  Plus,
  Send,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  AlertCircle,
  Settings,
  FileText,
  Globe,
  Award,
  Instagram,
  Mail,
  Phone,
  Lock,
  LayoutGrid,
  List as ListIcon,
  FolderOpen,
  MoreHorizontal
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  title: string;
  description: string | null;
  project_type: string;
  category: string;
  status: string;
  location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  duration_minutes: number | null;
  episodes: number | null;
  team_size: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  featured: boolean;
  popular: boolean;
  likes_count: number;
  is_member: boolean;
  is_liked: boolean;
  is_saved: boolean;
  is_creator?: boolean;
  allow_applicants?: boolean;
  full_description?: string;
  production_notes?: string;
  target_audience?: string;
  distribution_plan?: string;
  timeline?: string;
  requirements?: string;
  benefits?: string;
  contact_info?: string;
  hiring_categories?: string[];
}

interface ProjectMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  joined_date: string;
  user_id?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  assigned_to: string | null;
  assigned_by: string | null;
  assigned_to_profile?: {
    full_name: string | null;
    username: string | null;
  };
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  created_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  message: string;
  timestamp: string;
}

interface Applicant {
  id: string;
  name: string;
  email: string;
  role: string;
  experience: string;
  skills: string[];
  applied_date: string;
  status: 'pending' | 'accepted' | 'rejected';
  avatar: string;
}

export default function ProjectDetails() {
  const { profile, isAdmin } = useAuth();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const initialView = searchParams.get("view") || searchParams.get("tab");
    if (initialView && ["overview", "tasks", "chat", "team", "applicants"].includes(initialView)) {
      return initialView;
    }
    return "overview";
  });

  // Synchronize active workspace view whenever query parameters change
  useEffect(() => {
    const viewParam = searchParams.get("view") || searchParams.get("tab");
    if (viewParam && ["overview", "tasks", "chat", "team", "applicants"].includes(viewParam)) {
      setActiveTab(viewParam);
    }
  }, [searchParams]);
  const [taskViewMode, setTaskViewMode] = useState<"board" | "list">("board");
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isHireConfirmOpen, setIsHireConfirmOpen] = useState(false);
  const [targetHireState, setTargetHireState] = useState(false);
  const [editingSections, setEditingSections] = useState<{ [key: string]: boolean }>({});
  const [sectionValues, setSectionValues] = useState<{ [key: string]: string }>({});
  const [editForm, setEditForm] = useState({
    title: "",
    project_type: "",
    category: "",
    status: "",
    project_status: "Public",
    location: "",
    team_size: 5,
    budget_min: "" as string | number,
    budget_max: "" as string | number,
    budget_currency: "₹",
    duration_minutes: "" as string | number,
    episodes: "" as string | number,
  });
  const [sourceTab, setSourceTab] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [chatMessages, activeTab]);

  // Realtime subscription and polling fallback for chat messages
  useEffect(() => {
    if (!projectId) return;
    
    const subscription = supabase.channel("project_messages_channel")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "project_messages", filter: `project_id=eq.${projectId}` }, (payload) => {
        const newData = payload.new;
        
        setChatMessages(prev => {
          if (prev.some(m => m.id === newData.id || (m.user_id === newData.sender_id && m.message === newData.content && new Date(newData.created_at).getTime() - new Date(m.timestamp).getTime() < 5000))) {
             return prev;
          }
          
          const formattedMessage = {
            id: newData.id,
            user_id: newData.sender_id,
            user_name: "Unknown", 
            user_avatar: "U",
            message: newData.content,
            timestamp: newData.created_at
          };
          return [...prev, formattedMessage];
        });
      })
      .subscribe();
      
    // Polling fallback to guarantee updates even if Realtime drops events due to RLS
    const intervalId = setInterval(async () => {
      const { data } = await supabase
        .from("project_messages")
        .select("id, content, created_at, sender_id, profiles:sender_id(full_name, username)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
        
      if (data) {
        const formattedMessages = data.map(m => ({
          id: m.id,
          user_id: m.sender_id,
          user_name: (m.profiles as any)?.full_name || (m.profiles as any)?.username || "Unknown",
          user_avatar: ((m.profiles as any)?.full_name || (m.profiles as any)?.username || "U").substring(0, 2).toUpperCase(),
          message: m.content,
          timestamp: m.created_at
        }));
        
        setChatMessages(prev => {
          if (prev.length === formattedMessages.length && prev[prev.length-1]?.id === formattedMessages[formattedMessages.length-1]?.id) {
            return prev;
          }
          return formattedMessages;
        });
      }
    }, 5000);
      
    return () => {
      supabase.removeChannel(subscription);
      clearInterval(intervalId);
    };
  }, [projectId]);

  // Realtime subscription and polling fallback for project tasks
  useEffect(() => {
    if (!projectId) return;

    const subscription = supabase.channel("project_tasks_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "project_tasks", filter: `project_id=eq.${projectId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newTask = payload.new as Task;
          setTasks(prev => {
            if (prev.some(t => t.id === newTask.id)) return prev;
            return [newTask, ...prev];
          });
        } else if (payload.eventType === 'UPDATE') {
          const updatedTask = payload.new as Task;
          setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
        } else if (payload.eventType === 'DELETE') {
          const deletedTask = payload.old as Task;
          setTasks(prev => prev.filter(t => t.id !== deletedTask.id));
        }
      })
      .subscribe();
      
    // Polling fallback to guarantee updates even if Realtime drops events due to RLS
    const intervalId = setInterval(async () => {
      const { data } = await supabase
        .from("project_tasks")
        .select("*, assigned_to_profile:profiles!assigned_to(full_name, username)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
        
      if (data) {
        setTasks(prev => {
          if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
          return data as unknown as Task[];
        });
      }
    }, 5000);
      
    return () => {
      supabase.removeChannel(subscription);
      clearInterval(intervalId);
    };
  }, [projectId]);
  
  const [newMessage, setNewMessage] = useState("");
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium" as "low" | "medium" | "high",
    due_date: ""
  });

  const [dbMembers, setDbMembers] = useState<ProjectMember[]>([]);
  const [localProjectMembers, setLocalProjectMembers] = useState<ProjectMember[]>([]);

  const projectMembers: ProjectMember[] = [...dbMembers, ...localProjectMembers];

  // Permissions
  const isProjectCreator = Boolean(
    (currentUser && project?.created_by === currentUser.id) || 
    project?.is_creator
  );
  const isProjectAdmin = isAdmin();
  const currentUserRole = (
    dbMembers.find(m => m.user_id === currentUser?.id)?.role || ''
  ).toLowerCase();
  const isTeamHead = 
    isProjectCreator || 
    isProjectAdmin || 
    currentUserRole === 'creator' || 
    currentUserRole === 'admin' || 
    currentUserRole === 'team head' || 
    currentUserRole === 'lead';
  const isTeamMember = isProjectCreator || isProjectAdmin || isMember;
  const canCreateTasks = isTeamHead;

  const assignableMembers = [
    ...(project?.created_by && !projectMembers.some(m => m.user_id === project.created_by)
      ? [{
          id: project.created_by,
          user_id: project.created_by,
          name: (project as any).creator_name || (project as any).creator_username || "Project Creator",
          role: "Creator",
          avatar: "CR",
          joined_date: project.created_at
        }]
      : []),
    ...projectMembers.filter(m => m.role !== "Applicant")
  ];

  // If user is not a member, ensure they cannot stay on member-only tabs
  useEffect(() => {
    if (!loading && !isTeamMember && ["tasks", "chat", "team"].includes(activeTab)) {
      setActiveTab("overview");
    }
  }, [loading, isTeamMember, activeTab]);

  // Hardcoded projects data
  const hardcodedProjects: Project[] = [
    {
      id: "proj-1",
      title: "Indie Film Production",
      description: "An independent film exploring themes of identity and belonging in modern society.",
      project_type: "Film",
      category: "Drama",
      status: "ongoing",
      location: "Los Angeles, CA",
      budget_min: 500000,
      budget_max: 1000000,
      budget_currency: "₹",
      duration_minutes: 120,
      episodes: null,
      team_size: 8,
      created_by: "user-1",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
      featured: true,
      popular: false,
      likes_count: 45,
      is_member: false,
      is_liked: false,
      is_saved: false,
      full_description: "This independent film project explores the complex themes of identity, belonging, and self-discovery in contemporary society. Set against the backdrop of a bustling metropolis, the story follows the journey of a young artist who must navigate the challenges of pursuing their dreams while maintaining their authentic self. The film combines elements of drama and psychological thriller to create a compelling narrative that resonates with audiences of all ages.",
      production_notes: "Production is scheduled to begin in March 2024 with principal photography expected to last 6 weeks. We are looking for experienced crew members who are passionate about independent cinema and willing to work collaboratively in a creative environment.",
      target_audience: "Young adults aged 18-35, film festival audiences, independent cinema enthusiasts",
      distribution_plan: "Film festival circuit, streaming platforms, limited theatrical release",
      timeline: "Pre-production: Feb-Mar 2024, Production: Mar-Apr 2024, Post-production: May-Jul 2024, Release: Aug 2024",
      requirements: "Experience in independent film production, strong communication skills, ability to work in fast-paced environment, creative problem-solving abilities",
      benefits: "Creative freedom, networking opportunities, portfolio building, festival recognition potential, collaborative work environment",
      contact_info: "Email: producer@indiefilm.com, Phone: +1 (555) 123-4567"
    },
    {
      id: "proj-2",
      title: "Web Series: Digital Nomads",
      description: "A comedy web series following digital nomads as they work and travel around the world.",
      project_type: "Television",
      category: "Comedy",
      status: "planning",
      location: "Remote",
      budget_min: 200000,
      budget_max: 500000,
      budget_currency: "₹",
      duration_minutes: null,
      episodes: 8,
      team_size: 12,
      created_by: "user-2",
      created_at: "2024-01-14T09:00:00Z",
      updated_at: "2024-01-14T09:00:00Z",
      featured: false,
      popular: true,
      likes_count: 78,
      is_member: true,
      is_liked: true,
      is_saved: true,
      full_description: "Digital Nomads is a comedy web series that follows a group of remote workers as they navigate the challenges and adventures of working while traveling the world. Each episode explores different aspects of the digital nomad lifestyle, from finding reliable WiFi in exotic locations to dealing with time zone differences and cultural misunderstandings.",
      production_notes: "The series will be shot in multiple international locations, requiring a flexible and adaptable crew. We're looking for team members who are comfortable with travel and can work in various cultural contexts.",
      target_audience: "Digital nomads, remote workers, travel enthusiasts, comedy fans aged 25-45",
      distribution_plan: "YouTube, streaming platforms, social media marketing",
      timeline: "Pre-production: Jan-Feb 2024, Production: Mar-Jun 2024, Post-production: Jul-Sep 2024, Release: Oct 2024",
      requirements: "Travel experience preferred, adaptability to different cultures, strong communication skills, experience with remote collaboration",
      benefits: "Travel opportunities, international networking, diverse cultural experiences, flexible work schedule",
      contact_info: "Email: casting@digitalnomads.com, Phone: +1 (555) 234-5678"
    },
    {
      id: "proj-3",
      title: "Documentary: Climate Change Impact",
      description: "A documentary examining the real-world impact of climate change on coastal communities.",
      project_type: "Film",
      category: "Documentary",
      status: "ongoing",
      location: "Miami, FL",
      budget_min: 300000,
      budget_max: 600000,
      budget_currency: "₹",
      duration_minutes: 90,
      episodes: null,
      team_size: 6,
      created_by: "user-3",
      created_at: "2024-01-13T08:00:00Z",
      updated_at: "2024-01-13T08:00:00Z",
      featured: false,
      popular: false,
      likes_count: 32,
      is_member: false,
      is_liked: false,
      is_saved: false,
      full_description: "This documentary project aims to shed light on the real-world impact of climate change on coastal communities. Through intimate interviews and powerful visuals, we'll explore how rising sea levels, increased storm intensity, and environmental degradation are affecting the lives of people who call these areas home.",
      production_notes: "Documentary filming requires sensitivity and respect for the communities we're documenting. We need crew members who understand the importance of ethical storytelling and can work with vulnerable populations.",
      target_audience: "Environmental activists, documentary film enthusiasts, policy makers, general public interested in climate issues",
      distribution_plan: "Film festivals, educational institutions, streaming platforms, environmental organizations",
      timeline: "Research: Jan-Feb 2024, Production: Mar-May 2024, Post-production: Jun-Aug 2024, Release: Sep 2024",
      requirements: "Documentary experience, environmental awareness, sensitivity to vulnerable communities, strong research skills",
      benefits: "Meaningful impact, environmental advocacy, educational value, festival potential",
      contact_info: "Email: director@climatefilm.com, Phone: +1 (555) 345-6789"
    },
    {
      id: "proj-4",
      title: "Music Video Production",
      description: "High-energy music video for an upcoming pop artist's latest single.",
      project_type: "Film",
      category: "Music Video",
      status: "planning",
      location: "New York, NY",
      budget_min: 100000,
      budget_max: 250000,
      budget_currency: "₹",
      duration_minutes: 4,
      episodes: null,
      team_size: 15,
      created_by: "user-4",
      created_at: "2024-01-12T07:00:00Z",
      updated_at: "2024-01-12T07:00:00Z",
      featured: false,
      popular: true,
      likes_count: 89,
      is_member: false,
      is_liked: false,
      is_saved: false,
      full_description: "This music video project will showcase the artist's latest single with a high-energy, visually stunning production. The concept involves multiple locations, choreography, and special effects to create an engaging visual experience that complements the song's upbeat tempo and contemporary pop sound.",
      production_notes: "Fast-paced production schedule with multiple location shoots. Looking for experienced crew who can work efficiently under tight deadlines while maintaining high production values.",
      target_audience: "Pop music fans aged 16-35, music video enthusiasts, social media audiences",
      distribution_plan: "YouTube, music streaming platforms, social media promotion, music television",
      timeline: "Pre-production: Jan 2024, Production: Feb 2024, Post-production: Mar 2024, Release: Apr 2024",
      requirements: "Music video experience, ability to work under tight deadlines, creative problem-solving, experience with special effects",
      benefits: "High-profile project, portfolio enhancement, networking with music industry professionals, creative collaboration",
      contact_info: "Email: producer@musicvideo.com, Phone: +1 (555) 456-7890"
    },
    {
      id: "proj-5",
      title: "Corporate Training Video",
      description: "Professional training video series for corporate onboarding and skill development.",
      project_type: "Television",
      category: "Corporate",
      status: "ongoing",
      location: "Chicago, IL",
      budget_min: 150000,
      budget_max: 300000,
      budget_currency: "₹",
      duration_minutes: null,
      episodes: 12,
      team_size: 8,
      created_by: "user-5",
      created_at: "2024-01-11T06:00:00Z",
      updated_at: "2024-01-11T06:00:00Z",
      featured: false,
      popular: false,
      likes_count: 23,
      is_member: true,
      is_liked: false,
      is_saved: true,
      full_description: "This corporate training video series will provide comprehensive onboarding and skill development content for a Fortune 500 company. The series covers topics including company culture, technical skills, leadership development, and workplace safety protocols.",
      production_notes: "Professional corporate environment requiring polished, high-quality production values. Content must be engaging while maintaining educational effectiveness and corporate brand standards.",
      target_audience: "Corporate employees, HR professionals, training departments, new hires",
      distribution_plan: "Internal corporate platform, learning management systems, HR departments",
      timeline: "Pre-production: Jan-Feb 2024, Production: Mar-May 2024, Post-production: Jun-Jul 2024, Release: Aug 2024",
      requirements: "Corporate video experience, understanding of adult learning principles, professional demeanor, experience with educational content",
      benefits: "Stable corporate client, professional portfolio, consistent work schedule, competitive compensation",
    },
    {
      id: "user-created-1",
      title: "My Indie Film Project",
      description: "A personal passion project about family relationships and cultural identity. Looking for talented actors and crew members to bring this story to life.",
      project_type: "Film",
      category: "Feature Film",
      status: "pre-production",
      location: "Mumbai, India",
      budget_min: 3000000,
      budget_max: 5000000,
      budget_currency: "₹",
      duration_minutes: 110,
      episodes: null,
      team_size: 6,
      created_by: "current-user",
      created_at: "2024-12-10T09:00:00Z",
      updated_at: "2024-12-16T14:30:00Z",
      featured: false,
      popular: false,
      likes_count: 15,
      is_member: true,
      is_liked: false,
      is_saved: false,
      full_description: "This is a deeply personal indie film project that explores the complex dynamics of family relationships and cultural identity in modern India. The story follows a young protagonist who must navigate between traditional family expectations and personal dreams, creating a narrative that resonates with audiences across different cultural backgrounds. We're looking for passionate actors and crew members who can bring authenticity and emotional depth to this meaningful story.",
      production_notes: "This project is currently in pre-production phase. We're looking for experienced crew members who understand the nuances of indie filmmaking and can work within budget constraints while maintaining high production values. The project requires sensitivity to cultural themes and authentic storytelling.",
      target_audience: "Young adults aged 18-35, film festival audiences, independent cinema enthusiasts, audiences interested in cultural identity themes",
      distribution_plan: "Film festival circuit, independent cinema releases, streaming platforms, cultural events",
      timeline: "Pre-production: Dec 2024 - Feb 2025, Production: Mar - Apr 2025, Post-production: May - Jul 2025, Release: Aug 2025",
      requirements: "Experience in indie film production, understanding of cultural themes, ability to work with limited budgets, strong communication skills, passion for meaningful storytelling",
      benefits: "Creative freedom, meaningful project, festival recognition potential, portfolio building, networking with indie filmmakers, cultural impact",
      contact_info: "Email: indieproducer@filmcollab.com, Phone: +91 98765 43210"
    },
    {
      id: "user-created-2",
      title: "Tech Startup Documentary",
      description: "Documenting the journey of young entrepreneurs building innovative tech solutions in India. Seeking experienced documentary filmmakers.",
      project_type: "Documentary",
      category: "Documentary",
      status: "production",
      location: "Bangalore, India",
      budget_min: 1800000,
      budget_max: 2800000,
      budget_currency: "₹",
      duration_minutes: 85,
      episodes: null,
      team_size: 4,
      created_by: "current-user",
      created_at: "2024-11-20T11:15:00Z",
      updated_at: "2024-12-14T16:45:00Z",
      featured: false,
      popular: false,
      likes_count: 22,
      is_member: true,
      is_liked: false,
      is_saved: false,
      full_description: "This documentary project chronicles the inspiring journey of young Indian entrepreneurs who are building innovative tech solutions to address real-world problems. The film follows multiple startup founders as they navigate the challenges of building companies, securing funding, and making a positive impact on society through technology.",
      production_notes: "Currently in production phase. We need experienced documentary filmmakers who can capture authentic moments and tell compelling stories. The project involves filming in various tech hubs across India and requires understanding of startup culture and technology.",
      target_audience: "Entrepreneurs, tech enthusiasts, startup community, investors, general audience interested in innovation and entrepreneurship",
      distribution_plan: "Tech conferences, startup events, streaming platforms, educational institutions, business schools",
      timeline: "Production: Nov 2024 - Mar 2025, Post-production: Apr - Jun 2025, Release: Jul 2025",
      requirements: "Documentary filmmaking experience, understanding of startup ecosystem, ability to work with tech-savvy subjects, strong storytelling skills",
      benefits: "Access to startup ecosystem, networking opportunities, portfolio enhancement, potential for follow-up projects, industry recognition",
      contact_info: "Email: docproducer@filmcollab.com, Phone: +91 98765 43211"
    },
    {
      id: "user-created-3",
      title: "Short Film: The Last Letter",
      description: "A touching short film about a grandfather writing letters to his grandchildren. Perfect for film festival submissions.",
      project_type: "Short Film",
      category: "Short Film",
      status: "post-production",
      location: "Delhi, India",
      budget_min: 400000,
      budget_max: 600000,
      budget_currency: "₹",
      duration_minutes: 12,
      episodes: null,
      team_size: 3,
      created_by: "current-user",
      created_at: "2024-10-15T08:30:00Z",
      updated_at: "2024-12-12T10:20:00Z",
      featured: false,
      popular: false,
      likes_count: 8,
      is_member: true,
      is_liked: false,
      is_saved: false,
      full_description: "The Last Letter is an emotionally resonant short film that tells the story of an elderly grandfather who writes heartfelt letters to his grandchildren, sharing life lessons and family memories. The film explores themes of family bonds, generational wisdom, and the power of written communication in our digital age.",
      production_notes: "Currently in post-production phase. The film has been shot and is being edited. We're looking for skilled editors who can enhance the emotional impact of the story through careful pacing and visual storytelling.",
      target_audience: "Film festival audiences, families, older adults, audiences interested in intergenerational stories",
      distribution_plan: "Film festivals, family events, educational screenings, streaming platforms",
      timeline: "Post-production: Oct 2024 - Jan 2025, Festival submissions: Feb - Mar 2025, Release: Apr 2025",
      requirements: "Short film editing experience, understanding of emotional storytelling, ability to work with limited footage, festival submission knowledge",
      benefits: "Festival recognition potential, emotional storytelling experience, portfolio enhancement, networking with indie filmmakers",
      contact_info: "Email: shortfilm@filmcollab.com, Phone: +91 98765 43212"
    },
    {
      id: "user-created-4",
      title: "Web Series: Urban Tales",
      description: "An anthology web series exploring modern urban life in Indian cities. Each episode focuses on different characters and their struggles.",
      project_type: "Web Series",
      category: "Web Series",
      status: "planning",
      location: "Mumbai, India",
      budget_min: 2500000,
      budget_max: 4000000,
      budget_currency: "₹",
      duration_minutes: null,
      episodes: 6,
      team_size: 10,
      created_by: "current-user",
      created_at: "2024-12-05T13:45:00Z",
      updated_at: "2024-12-15T11:30:00Z",
      featured: false,
      popular: false,
      likes_count: 18,
      is_member: true,
      is_liked: false,
      is_saved: false,
      full_description: "Urban Tales is an anthology web series that explores the diverse experiences of people living in modern Indian cities. Each episode focuses on different characters and their unique struggles, dreams, and relationships, creating a mosaic of urban life that reflects the complexity and vibrancy of contemporary India.",
      production_notes: "Currently in planning phase. We're developing scripts and assembling the creative team. Looking for experienced writers, directors, and producers who understand urban storytelling and can work on episodic content.",
      target_audience: "Young urban adults aged 20-40, streaming platform audiences, people interested in contemporary Indian culture and urban life",
      distribution_plan: "Streaming platforms, web series festivals, social media promotion, urban cultural events",
      timeline: "Planning: Dec 2024 - Feb 2025, Pre-production: Mar - Apr 2025, Production: May - Aug 2025, Post-production: Sep - Nov 2025, Release: Dec 2025",
      requirements: "Web series experience, understanding of urban themes, episodic storytelling skills, ability to work with diverse characters and stories",
      benefits: "Creative storytelling opportunities, streaming platform exposure, portfolio building, networking with web series creators",
      contact_info: "Email: urbantales@filmcollab.com, Phone: +91 98765 43213"
    }
  ];

  // Hardcoded data for tasks, chat, and applicants
  const hardcodedTasks: Task[] = [
    {
      id: "task-1",
      title: "Script Review and Finalization",
      description: "Review the final draft of the script and make necessary revisions before production begins.",
      assigned_to: "Sarah Johnson",
      assigned_by: "Project Creator",
      status: "in-progress",
      priority: "high",
      due_date: "2024-12-25",
      created_at: "2024-12-15T10:00:00Z"
    },
    {
      id: "task-2",
      title: "Location Scouting",
      description: "Find and secure filming locations for the Mumbai scenes.",
      assigned_to: "Michael Chen",
      assigned_by: "Project Creator",
      status: "pending",
      priority: "medium",
      due_date: "2024-12-30",
      created_at: "2024-12-16T09:00:00Z"
    },
    {
      id: "task-3",
      title: "Equipment Rental",
      description: "Arrange rental of camera equipment and lighting for the shoot.",
      assigned_to: "Emily Rodriguez",
      assigned_by: "Project Creator",
      status: "completed",
      priority: "high",
      due_date: "2024-12-20",
      created_at: "2024-12-10T14:00:00Z"
    }
  ];

  const hardcodedChatMessages: ChatMessage[] = [
    {
      id: "msg-1",
      user_id: "user-1",
      user_name: "Sarah Johnson",
      user_avatar: "SJ",
      message: "Hey team! Just finished reviewing the script. It looks great, but I have a few suggestions for the dialogue in scene 3.",
      timestamp: "2024-12-16T10:30:00Z"
    },
    {
      id: "msg-2",
      user_id: "user-2",
      user_name: "Michael Chen",
      user_avatar: "MC",
      message: "Thanks Sarah! I'll take a look at those suggestions. Also, I found some great locations in Bandra for the family scenes.",
      timestamp: "2024-12-16T11:15:00Z"
    },
    {
      id: "msg-3",
      user_id: "user-3",
      user_name: "Emily Rodriguez",
      user_avatar: "ER",
      message: "Perfect! I've secured the camera equipment. We'll have everything we need for the shoot next week.",
      timestamp: "2024-12-16T12:00:00Z"
    },
    {
      id: "msg-4",
      user_id: "user-4",
      user_name: "David Kim",
      user_avatar: "DK",
      message: "Great work everyone! The pre-production is coming together nicely. Let's schedule a team meeting for tomorrow to discuss the shooting schedule.",
      timestamp: "2024-12-16T13:45:00Z"
    }
  ];

  const hardcodedApplicants: Applicant[] = [
    {
      id: "app-1",
      name: "Priya Sharma",
      email: "priya.sharma@email.com",
      role: "Actor",
      experience: "5 years",
      skills: ["Acting", "Dancing", "Voice Modulation"],
      applied_date: "2024-12-14",
      status: "pending",
      avatar: "PS"
    },
    {
      id: "app-2",
      name: "Rajesh Kumar",
      email: "rajesh.kumar@email.com",
      role: "Cinematographer",
      experience: "8 years",
      skills: ["Cinematography", "Lighting", "Camera Operation"],
      applied_date: "2024-12-13",
      status: "accepted",
      avatar: "RK"
    },
    {
      id: "app-3",
      name: "Anita Singh",
      email: "anita.singh@email.com",
      role: "Production Assistant",
      experience: "2 years",
      skills: ["Production Management", "Coordination", "Logistics"],
      applied_date: "2024-12-12",
      status: "pending",
      avatar: "AS"
    }
  ];

  const handleJoinProject = async () => {
    if (!currentUser) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to join projects.",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from("project_members")
        .insert({
          project_id: projectId,
          user_id: currentUser.id,
          role: "Applicant"
        });

      if (error) throw error;

      if (project && project.created_by && project.created_by !== currentUser.id) {
        let creatorProfileId = project.created_by;
        const { data: cProf } = await supabase.from('profiles').select('id').or(`id.eq.${project.created_by},user_id.eq.${project.created_by}`).limit(1).maybeSingle();
        if (cProf?.id) creatorProfileId = cProf.id;

        supabase.from("notifications").insert({
          user_id: creatorProfileId,
          title: "New Project Application",
          description: `Someone applied to join your project: ${project.title}`,
          type: "project",
          action_url: `/projects?projectId=${project.id}`
        }).then(({ error: notifError }) => {
          if (notifError) console.error("Notification error:", notifError);
        });
      }

      toast({
        title: "Application sent",
        description: "You have successfully applied to join this project."
      });
    } catch (err) {
      console.error("Error joining project:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply to project."
      });
    }
  };


  const handleLeaveProject = async () => {
    if (!currentUser) return;
    try {
      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("user_id", currentUser.id);

      if (error) throw error;

      setIsMember(false);
      if (project) {
        setProject({ ...project, is_member: false });
      }
      toast({
        title: "Left project",
        description: "You have left this project."
      });
    } catch (err) {
      console.error("Error leaving project:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave project."
      });
    }
  };

  const handleDeleteMember = async (memberId: string, isDbMember: boolean, userId?: string) => {
    try {
      if (isDbMember) {
        const { error } = await supabase
          .from("project_members")
          .delete()
          .eq("id", memberId);

        if (error) throw error;

        setDbMembers(prev => prev.filter(m => m.id !== memberId));
      } else {
        setLocalProjectMembers(prev => prev.filter(m => m.id !== memberId));
      }

      toast({
        title: "Success",
        description: "Member removed from project.",
      });
    } catch (err) {
      console.error("Error removing member:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to remove member.",
      });
    }
  };

  const handleToggleHiringCategory = async (categoryName: string) => {
    if (!project) return;
    
    const currentCategories = project.hiring_categories || [];
    let updatedCategories: string[];
    if (currentCategories.includes(categoryName)) {
      updatedCategories = currentCategories.filter(c => c !== categoryName);
    } else {
      updatedCategories = [...currentCategories, categoryName];
    }

    try {
      const { error } = await supabase
        .from("projects")
        .update({ hiring_categories: updatedCategories })
        .eq("id", projectId);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, hiring_categories: updatedCategories } : null);
      toast({
        title: "Success",
        description: "Hiring role updated.",
      });
    } catch (err) {
      console.error("Error updating hiring roles:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update hiring roles.",
      });
    }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) throw error;

      toast({
        title: "Project Deleted",
        description: "The project has been successfully deleted.",
      });
      navigate("/projects");
    } catch (err) {
      console.error("Error deleting project:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete project.",
      });
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title: editForm.title,
          location: editForm.location,
          project_type: editForm.project_type,
          category: editForm.category,
          status: editForm.status,
          project_status: editForm.project_status,
          team_size: projectMembers.length,
          budget_min: editForm.budget_min ? Number(editForm.budget_min) : null,
          budget_max: editForm.budget_max ? Number(editForm.budget_max) : null,
          budget_currency: editForm.budget_currency,
          duration_minutes: editForm.duration_minutes ? Number(editForm.duration_minutes) : null,
          episodes: editForm.episodes ? Number(editForm.episodes) : null,
        })
        .eq("id", projectId);

      if (error) throw error;

      setProject(prev => prev ? {
        ...prev,
        title: editForm.title,
        location: editForm.location,
        project_type: editForm.project_type,
        category: editForm.category,
        status: editForm.status,
        project_status: editForm.project_status,
        team_size: projectMembers.length,
        budget_min: editForm.budget_min ? Number(editForm.budget_min) : null,
        budget_max: editForm.budget_max ? Number(editForm.budget_max) : null,
        budget_currency: editForm.budget_currency,
        duration_minutes: editForm.duration_minutes ? Number(editForm.duration_minutes) : null,
        episodes: editForm.episodes ? Number(editForm.episodes) : null,
      } : null);

      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Project details updated successfully.",
      });
    } catch (err) {
      console.error("Error updating project:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update project details.",
      });
    }
  };

  const handleToggleHire = (newState: boolean) => {
    setTargetHireState(newState);
    setIsHireConfirmOpen(true);
  };

  const handleConfirmHire = async () => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ allow_applicants: targetHireState })
        .eq("id", projectId);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, allow_applicants: targetHireState } : null);
      setIsHireConfirmOpen(false);
      toast({
        title: "Success",
        description: targetHireState ? "Hiring has been enabled (Allow Applicants)." : "Hiring has been disabled.",
      });
    } catch (err) {
      console.error("Error updating hiring state:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update hiring state.",
      });
    }
  };

  const startEditingSection = (sectionKey: string, currentValue: string) => {
    setEditingSections(prev => ({ ...prev, [sectionKey]: true }));
    setSectionValues(prev => ({ ...prev, [sectionKey]: currentValue }));
  };

  const cancelEditingSection = (sectionKey: string) => {
    setEditingSections(prev => ({ ...prev, [sectionKey]: false }));
  };

  const saveSection = async (sectionKey: string, dbColumn: string) => {
    const newValue = sectionValues[sectionKey] || "";
    try {
      const { error } = await supabase
        .from("projects")
        .update({ [dbColumn]: newValue } as any)
        .eq("id", projectId);

      if (error) throw error;

      setProject(prev => prev ? { ...prev, [sectionKey]: newValue } : null);
      setEditingSections(prev => ({ ...prev, [sectionKey]: false }));
      toast({
        title: "Section updated",
        description: "The section has been successfully updated.",
      });
    } catch (err) {
      console.error(`Error updating section ${sectionKey}:`, err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update section.",
      });
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    toast({
      title: isLiked ? "Unliked" : "Liked",
      description: isLiked ? "Project removed from liked projects." : "Project added to liked projects."
    });
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Unsaved" : "Saved",
      description: isSaved ? "Project removed from saved projects." : "Project added to saved projects."
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: project?.title || "Project",
      text: `Check out this project: ${project?.title}`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link copied",
          description: "Project link has been copied to clipboard."
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!canCreateTasks) {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "Only the project creator or team head can create and assign tasks."
      });
      return;
    }

    if (!newTask.title || !newTask.description || !project || !currentUser) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields."
      });
      return;
    }

    try {
      const { data, error } = await supabase.from("project_tasks").insert({
        project_id: project.id,
        title: newTask.title,
        description: newTask.description,
        assigned_to: newTask.assigned_to || null,
        assigned_by: currentUser.id,
        status: "pending",
        priority: newTask.priority,
        due_date: newTask.due_date || null
      }).select("*, assigned_to_profile:profiles!assigned_to(full_name, username)").single();

      if (error) throw error;

      setTasks(prev => [data as unknown as Task, ...prev]);
      setNewTask({
        title: "",
        description: "",
        assigned_to: "",
        priority: "medium",
        due_date: ""
      });
      setShowCreateTask(false);
      
      toast({
        title: "Task created",
        description: "New task has been created successfully."
      });
    } catch (err) {
      console.error("Error creating task:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create task."
      });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: Task['status']) => {
    const previousStatus = tasks.find(t => t.id === taskId)?.status;
    // Optimistic UI update
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, status } : task
    ));
    
    try {
      const { data, error } = await supabase
        .from("project_tasks")
        .update({ status })
        .eq("id", taskId)
        .select("id");
      
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Task not found or access denied.");
      }
      
      toast({
        title: "Task updated",
        description: `Task status updated to ${status}.`
      });
    } catch (err: any) {
      console.error("Error updating task status:", err);
      // Revert optimistic update
      if (previousStatus) {
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: previousStatus } : task
        ));
      }
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "Failed to update task status."
      });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !project) return;
    
    const content = newMessage;
    setNewMessage("");

    // Optimistic UI update
    const userName = profile?.full_name || currentUser.email?.split('@')[0] || "Unknown User";
    const userAvatar = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().substring(0, 2);
    const tempMsg = {
      id: `temp-${Date.now()}`,
      user_id: currentUser.id,
      user_name: userName,
      user_avatar: userAvatar,
      message: content,
      timestamp: new Date().toISOString()
    };
    setChatMessages(prev => [...prev, tempMsg]);

    try {
      const { data, error } = await supabase.from("project_messages").insert({
        project_id: project.id,
        sender_id: profile?.id || currentUser.id,
        content: content
      }).select().single();

      if (error) throw error;

      // Extract mentions using regex
      const mentionRegex = /@(\w+)/g;
      const mentions = [...content.matchAll(mentionRegex)].map(m => m[1]);
      
      const mentionedUsers = [...dbMembers];
      if (project.created_by && project.created_by !== currentUser.id) {
        mentionedUsers.push({ user_id: project.created_by, role: 'Creator', full_name: (project as any)?.creator_name || "", username: (project as any)?.creator_username || "", id: '', name: '', avatar: '', joined_date: '' } as any);
      }

      const notificationsToInsert = [];
      
      for (const u of mentionedUsers) {
        const name = (u as any).name?.toLowerCase() || "";
        const fullName = (u as any).full_name?.toLowerCase() || "";
        const username = (u as any).username?.toLowerCase() || "";
        const role = (u as any).role?.toLowerCase() || "";
        
        let isMentioned = false;
        if (mentions.some(m => name.includes(m.toLowerCase()) || fullName.includes(m.toLowerCase()) || username.includes(m.toLowerCase()) || role.includes(m.toLowerCase()))) {
          isMentioned = true;
        }
        
        // Match exact multi-word strings after @ symbol
        if (name && content.toLowerCase().includes(`@${name}`)) isMentioned = true;
        if (fullName && content.toLowerCase().includes(`@${fullName}`)) isMentioned = true;
        if (username && content.toLowerCase().includes(`@${username}`)) isMentioned = true;
        if (role && content.toLowerCase().includes(`@${role}`)) isMentioned = true;
        
        if (isMentioned && u.user_id !== currentUser.id) {
          if (!notificationsToInsert.some(n => n.user_id === u.user_id)) {
            notificationsToInsert.push({
              user_id: u.user_id,
              title: "Mentioned in Chat",
              description: `${userName} mentioned you in ${project.title}`,
              type: "project",
              action_url: `/projects/${project.id}?tab=chat`
            });
          }
        }
      }
      
      if (notificationsToInsert.length > 0) {
        await supabase.from("notifications").insert(notificationsToInsert);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      // Remove optimistic message on fail
      setChatMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    
    // @mention detection
    const cursor = e.target.selectionStart || 0;
    setCursorPos(cursor);
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@(\w*)$/);
    
    if (match) {
      setMentionQuery(match[1]);
      setMentionOpen(true);
    } else {
      setMentionOpen(false);
    }
  };

  const insertMention = (username: string) => {
    const textBefore = newMessage.slice(0, cursorPos).replace(/@\w*$/, `@${username} `);
    const textAfter = newMessage.slice(cursorPos);
    setNewMessage(textBefore + textAfter);
    setMentionOpen(false);
    chatInputRef.current?.focus();
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <strong key={i} className="text-yellow-600 dark:text-yellow-400 font-bold">{part}</strong>;
      }
      return part;
    });
  };

  const handleAcceptApplicant = async (applicantId: string) => {
    try {
      // Fetch user_id first to send notification
      const { data: memberData, error: fetchErr } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("id", applicantId)
        .single();
        
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from("project_members")
        .update({ role: "Member" })
        .eq("id", applicantId);
        
      if (error) throw error;
      
      const acceptedApplicant = applicants.find(a => a.id === applicantId);
      
      setApplicants(prev => prev.filter(applicant => applicant.id !== applicantId));
      
      if (acceptedApplicant) {
        setDbMembers(prev => [...prev, {
          id: acceptedApplicant.id,
          user_id: memberData.user_id,
          name: acceptedApplicant.name,
          role: "Member",
          avatar: acceptedApplicant.avatar,
          joined_date: new Date().toISOString()
        }]);

        // Send notification to the user
        let targetProfileId = memberData.user_id;
        const { data: tProf } = await supabase.from('profiles').select('id').or(`id.eq.${memberData.user_id},user_id.eq.${memberData.user_id}`).limit(1).maybeSingle();
        if (tProf?.id) targetProfileId = tProf.id;

        await supabase.from("notifications").insert({
          user_id: targetProfileId,
          title: "Application Accepted",
          description: `Your application to join ${project?.title || 'the project'} has been accepted!`,
          type: "application_update",
          status: "unread",
          action_url: `/projects/${projectId}`
        });
      }
      
      toast({
        title: "Applicant accepted",
        description: "The applicant has been accepted to the project."
      });
    } catch (err) {
      console.error("Error accepting applicant:", err);
      toast({
        title: "Error",
        description: "Could not accept applicant. Please run the RLS SQL to allow creators to manage members.",
        variant: "destructive"
      });
    }
  };

  const handleRejectApplicant = async (applicantId: string) => {
    try {
      // Fetch user_id first to send notification
      const { data: memberData } = await supabase
        .from("project_members")
        .select("user_id")
        .eq("id", applicantId)
        .single();

      const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("id", applicantId);
        
      if (error) throw error;
      
      setApplicants(prev => prev.filter(applicant => applicant.id !== applicantId));
      
      if (memberData?.user_id) {
        let targetProfileId = memberData.user_id;
        const { data: tProf } = await supabase.from('profiles').select('id').or(`id.eq.${memberData.user_id},user_id.eq.${memberData.user_id}`).limit(1).maybeSingle();
        if (tProf?.id) targetProfileId = tProf.id;

        // Send notification to the user
        await supabase.from("notifications").insert({
          user_id: targetProfileId,
          title: "Application Status Update",
          description: `Your application to join ${project?.title || 'the project'} was not accepted at this time.`,
          type: "application_update",
          status: "unread"
        });
      }
      
      toast({
        title: "Applicant rejected",
        description: "The applicant has been rejected."
      });
    } catch (err) {
      console.error("Error rejecting applicant:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject applicant. Please run the RLS SQL."
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatBudget = (min: number | null, max: number | null, currency: string) => {
    if (!min && !max) return "Budget not specified";
    if (min && max) return `${currency}${(min / 100000).toFixed(1)}L - ${currency}${(max / 100000).toFixed(1)}L`;
    if (min) return `${currency}${(min / 100000).toFixed(1)}L+`;
    return `${currency}${(max! / 100000).toFixed(1)}L`;
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


      

  useEffect(() => {
    const fetchProjectDetails = async () => {
      // Get the source tab from URL parameters
      const tabParam = searchParams.get('tab');
      setSourceTab(tabParam || '');
      
      if (!projectId) {
        setLoading(false);
        return;
      }

      const foundProject = hardcodedProjects.find(project => project.id === projectId);
      
      if (foundProject) {
        setProject(foundProject);
        setIsSaved(foundProject.is_saved);
        setIsLiked(foundProject.is_liked);
        setIsMember(foundProject.is_member);
        setTasks(hardcodedTasks);
        setChatMessages(hardcodedChatMessages);
        setApplicants(hardcodedApplicants);
        setLoading(false);
      } else {
        try {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("id", projectId)
            .maybeSingle();

          if (error) {
            console.error("Error fetching project:", error);
            throw error;
          }

          if (data) {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
            
            let isProjectLiked = false;
            if (user) {
              const { data: likeData } = await supabase
                .from("project_likes")
                .select("*")
                .eq("project_id", projectId)
                .eq("user_id", user.id);
              isProjectLiked = likeData && likeData.length > 0;
            }

            let isProjectSaved = false;
            if (user) {
              const saved = localStorage.getItem(`saved_projects_${user.id}`);
              if (saved) {
                isProjectSaved = JSON.parse(saved).includes(projectId);
              }
            }

            let isUserMember = false;
            if (user) {
              const { data: memberData } = await supabase
                .from("project_members")
                .select("*")
                .eq("project_id", projectId)
                .eq("user_id", user.id);
              isUserMember = Boolean(memberData && memberData.some((m: any) => m.role !== "Applicant"));
            }

            const isProjectCreator = user ? data.created_by === user.id : false;
            if (isProjectCreator) {
              isUserMember = true;
            }

            // Self-heal: If the creator isn't in project_members, they might be blocked by RLS from seeing applicants.
            if (isProjectCreator && !isUserMember && user) {
              const { error: healError } = await supabase.from("project_members").insert({
                project_id: projectId,
                user_id: user.id,
                role: "Creator"
              });
              if (!healError) {
                isUserMember = true;
              } else {
                console.error("Self-heal error:", healError);
              }
            }

            let fetchedMembers: ProjectMember[] = [];
            let fetchedApplicants: Applicant[] = [];
            try {
              const { data: membersData, error: membersError } = await supabase
                .from("project_members")
                .select("id, user_id, role, joined_at")
                .eq("project_id", projectId);

              if (membersData && !membersError) {
                const userIds = (membersData as Array<{ user_id: string }>).map((m) => m.user_id).filter(Boolean);
                if (userIds.length > 0) {
                  const { data: profilesData } = await supabase
                    .from("profiles")
                    .select("id, full_name, username, category")
                    .in("id", userIds);

                  const profileMap: Record<string, { id: string; full_name?: string | null; username?: string | null; category?: string | null }> = {};
                  if (profilesData) {
                    (profilesData as Array<{ id: string; full_name?: string | null; username?: string | null; category?: string | null }>).forEach(p => {
                      profileMap[p.id] = p;
                    });
                  }

                  const allMembers = (membersData as Array<{ id: string; user_id: string; role: string | null; joined_at: string | null }>).map((m) => {
                    const p = profileMap[m.user_id];
                    const name = p?.full_name || p?.username || "Unknown User";
                    return {
                      id: m.id,
                      user_id: m.user_id,
                      name: name,
                      role: m.role || p?.category || "Member",
                      avatar: name.substring(0, 2).toUpperCase(),
                      joined_date: m.joined_at || new Date().toISOString()
                    };
                  });
                  
                  fetchedMembers = allMembers.filter(m => m.role !== "Applicant");
                  fetchedApplicants = allMembers.filter(m => m.role === "Applicant").map(m => ({
                    id: m.id,
                    name: m.name,
                    email: "Hidden",
                    role: m.role,
                    experience: "Not specified",
                    skills: [],
                    applied_date: m.joined_date,
                    status: 'pending' as const,
                    avatar: m.avatar
                  }));
                }
              }
            } catch (err) {
              console.error("Error fetching project members:", err);
            }
            setDbMembers(fetchedMembers);
            setApplicants(fetchedApplicants);

            const dbProject: Project = {
              id: data.id,
              title: data.title,
              description: data.description,
              project_type: data.project_type,
              category: data.category,
              status: data.status,
              location: data.location,
              budget_min: data.budget_min ? Number(data.budget_min) : null,
              budget_max: data.budget_max ? Number(data.budget_max) : null,
              budget_currency: data.budget_currency || "₹",
              duration_minutes: data.duration_minutes ? Number(data.duration_minutes) : null,
              episodes: data.episodes ? Number(data.episodes) : null,
              team_size: data.team_size || 5,
              created_by: data.created_by,
              created_at: data.created_at,
              updated_at: data.updated_at || data.created_at,
              featured: data.featured || false,
              popular: data.popular || false,
              likes_count: 0,
              is_member: isUserMember,
              is_creator: isProjectCreator,
              is_liked: isProjectLiked,
              is_saved: isProjectSaved,
              allow_applicants: data.allow_applicants !== false,
              hiring_categories: data.hiring_categories || [],
              full_description: data.description || "",
              requirements: data.skills_required ? data.skills_required.join(", ") : "None specified",
              production_notes: data.production_notes || "None specified",
              target_audience: data.target_audience || "None specified",
              distribution_plan: data.distribution_plan || "None specified",
              timeline: data.timeline || "None specified",
              benefits: data.benefits || "None specified",
              contact_info: data.contact_info || "None specified",
            };

            setProject(dbProject);
            setEditForm({
              title: data.title || "",
              project_type: data.project_type || "",
              category: data.category || "",
              status: data.status || "planning",
              project_status: data.project_status || "Public",
              location: data.location || "",
              team_size: data.team_size || 5,
              budget_min: data.budget_min !== null ? Number(data.budget_min) : "",
              budget_max: data.budget_max !== null ? Number(data.budget_max) : "",
              budget_currency: data.budget_currency || "₹",
              duration_minutes: data.duration_minutes !== null ? Number(data.duration_minutes) : "",
              episodes: data.episodes !== null ? Number(data.episodes) : "",
            });
            setIsSaved(dbProject.is_saved);
            setIsLiked(dbProject.is_liked);
            setIsMember(dbProject.is_member);
            
            // Fetch project tasks
            const { data: tasksData, error: tasksError } = await supabase
              .from("project_tasks")
              .select("*, assigned_to_profile:profiles!assigned_to(full_name, username)")
              .eq("project_id", projectId)
              .order("created_at", { ascending: false });
              
            if (tasksError) {
              console.error("Error fetching tasks:", tasksError);
              setTasks([]);
            } else if (tasksData) {
              setTasks(tasksData as unknown as Task[]);
            } else {
              setTasks([]);
            }
            
            // Fetch actual chat messages for the project
            const { data: messagesData } = await supabase
              .from("project_messages")
              .select("id, content, created_at, sender_id, profiles:sender_id(full_name, username)")
              .eq("project_id", projectId)
              .order("created_at", { ascending: true });
              
            if (messagesData) {
              const formattedMessages = messagesData.map(data => ({
                id: data.id,
                user_id: data.sender_id,
                user_name: (data.profiles as any)?.full_name || (data.profiles as any)?.username || "Unknown",
                user_avatar: ((data.profiles as any)?.full_name || (data.profiles as any)?.username || "U").substring(0, 2).toUpperCase(),
                message: data.content,
                timestamp: data.created_at
              }));
              setChatMessages(formattedMessages);
            } else {
              setChatMessages([]);
            }
            
            setApplicants([]);
            setLoading(false);
          } else {
            setLoading(false);
            toast({
              variant: "destructive",
              title: "Project not found",
              description: "The requested project could not be found."
            });
          }
        } catch (err) {
          console.error("Error fetching project details from database:", err);
          setLoading(false);
          toast({
            variant: "destructive",
            title: "Project not found",
            description: "The requested project could not be found."
          });
        }
      }
    };

    fetchProjectDetails();
  }, [projectId, searchParams, toast]);

  const renderEditableSection = (
    title: string,
    sectionKey: string,
    dbColumn: string,
    currentValue: string,
    icon?: React.ReactNode
  ) => {
    const isEditing = editingSections[sectionKey];
    const editedValue = sectionValues[sectionKey] !== undefined ? sectionValues[sectionKey] : currentValue;

    return (
      <Card className="border-border/80 bg-card text-card-foreground shadow-noir rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            {icon}
            {title}
          </CardTitle>
          {project?.is_creator && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditingSection(sectionKey, currentValue)}
              className="text-primary hover:text-primary-hover hover:bg-primary/10"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <Textarea
                value={editedValue}
                onChange={(e) => setSectionValues(prev => ({ ...prev, [sectionKey]: e.target.value }))}
                className="min-h-[120px] border-border/80 bg-surface-elevated/50 focus-visible:ring-primary"
                placeholder={`Enter ${title.toLowerCase()}...`}
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelEditingSection(sectionKey)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                  onClick={async () => {
                    if (dbColumn === "skills_required") {
                      try {
                        const skillsArray = editedValue.split(",").map((s: string) => s.trim()).filter(Boolean);
                        const { error } = await supabase
                          .from("projects")
                          .update({ skills_required: skillsArray })
                          .eq("id", projectId);

                        if (error) throw error;

                        setProject(prev => prev ? { ...prev, requirements: skillsArray.join(", ") } : null);
                        setEditingSections(prev => ({ ...prev, [sectionKey]: false }));
                        toast({
                          title: "Section updated",
                          description: "The section has been successfully updated.",
                        });
                      } catch (err) {
                        console.error("Error updating skills:", err);
                        toast({
                          variant: "destructive",
                          title: "Error",
                          description: "Failed to update requirements.",
                        });
                      }
                    } else {
                      await saveSection(sectionKey, dbColumn);
                    }
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            sectionKey === "requirements" || sectionKey === "target_audience" ? (
              <div className="flex flex-wrap gap-2">
                {currentValue && currentValue !== "None specified" ? (
                  currentValue.split(",").map((item, idx) => {
                    const trimmed = item.trim();
                    if (!trimmed) return null;
                    return (
                      <Badge 
                        key={idx} 
                        variant="secondary" 
                        className="bg-primary/10 text-primary border border-primary/25 hover:bg-primary/15"
                      >
                        {trimmed}
                      </Badge>
                    );
                  })
                ) : (
                  <p className="text-muted-foreground text-sm italic">None specified</p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                {currentValue || "None specified"}
              </p>
            )
          )}
        </CardContent>
      </Card>
    );
  };

  interface TimelineEvent {
    date: string;
    notes: string;
  }

  const renderContactSection = () => {
    const sectionKey = "contact_info";
    const isEditing = editingSections[sectionKey];
    
    // Parse contact_info safely
    let contactData = { name: "", email: "", phone: "", website: "", instagram: "", whatsapp: "" };
    try {
      if (project?.contact_info) {
        contactData = JSON.parse(project.contact_info);
      }
    } catch (e) {
      contactData.name = project?.contact_info || "";
    }

    const draftValue = sectionValues[sectionKey];
    let draftData = contactData;
    if (isEditing && draftValue) {
      try {
        draftData = JSON.parse(draftValue);
      } catch (e) {
        draftData = { name: draftValue, email: "", phone: "", website: "", instagram: "", whatsapp: "" };
      }
    }

    return (
      <Card className="border-border/80 bg-card text-card-foreground shadow-noir rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Users className="h-5 w-5 text-primary" />
            Contact Information
          </CardTitle>
          {project?.is_creator && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditingSection(sectionKey, JSON.stringify(contactData))}
              className="text-primary hover:text-primary-hover hover:bg-primary/10"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Name</label>
                  <Input
                    value={draftData.name || ""}
                    onChange={(e) => {
                      const updated = { ...draftData, name: e.target.value };
                      setSectionValues(prev => ({ ...prev, [sectionKey]: JSON.stringify(updated) }));
                    }}
                    placeholder="Contact Name"
                    className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                  <Input
                    type="email"
                    value={draftData.email || ""}
                    onChange={(e) => {
                      const updated = { ...draftData, email: e.target.value };
                      setSectionValues(prev => ({ ...prev, [sectionKey]: JSON.stringify(updated) }));
                    }}
                    placeholder="contact@example.com"
                    className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Phone Number</label>
                  <Input
                    value={draftData.phone || ""}
                    onChange={(e) => {
                      const updated = { ...draftData, phone: e.target.value };
                      setSectionValues(prev => ({ ...prev, [sectionKey]: JSON.stringify(updated) }));
                    }}
                    placeholder="+91 XXXXX XXXXX"
                    className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Website Link</label>
                  <Input
                    value={draftData.website || ""}
                    onChange={(e) => {
                      const updated = { ...draftData, website: e.target.value };
                      setSectionValues(prev => ({ ...prev, [sectionKey]: JSON.stringify(updated) }));
                    }}
                    placeholder="https://example.com"
                    className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Instagram Link</label>
                  <Input
                    value={draftData.instagram || ""}
                    onChange={(e) => {
                      const updated = { ...draftData, instagram: e.target.value };
                      setSectionValues(prev => ({ ...prev, [sectionKey]: JSON.stringify(updated) }));
                    }}
                    placeholder="https://instagram.com/profile"
                    className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">WhatsApp Link / Number</label>
                  <Input
                    value={draftData.whatsapp || ""}
                    onChange={(e) => {
                      const updated = { ...draftData, whatsapp: e.target.value };
                      setSectionValues(prev => ({ ...prev, [sectionKey]: JSON.stringify(updated) }));
                    }}
                    placeholder="WhatsApp link or phone number"
                    className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelEditingSection(sectionKey)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                  onClick={() => saveSection(sectionKey, "contact_info")}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-2.5 text-sm">
                <span className="font-semibold text-muted-foreground w-24">Name:</span>
                <span className="text-foreground">{contactData.name || <span className="text-muted-foreground/70 italic">Not specified</span>}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="font-semibold text-muted-foreground w-24">Email:</span>
                <span className="text-foreground">
                  {contactData.email ? (
                    <a href={`mailto:${contactData.email}`} className="text-primary hover:underline">{contactData.email}</a>
                  ) : (
                    <span className="text-muted-foreground/70 italic">Not specified</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="font-semibold text-muted-foreground w-24">Phone:</span>
                <span className="text-foreground">{contactData.phone || <span className="text-muted-foreground/70 italic">Not specified</span>}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="font-semibold text-muted-foreground w-24">Website:</span>
                <span className="text-foreground">
                  {contactData.website ? (
                    <a href={contactData.website.startsWith('http') ? contactData.website : `https://${contactData.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{contactData.website}</a>
                  ) : (
                    <span className="text-muted-foreground/70 italic">Not specified</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="font-semibold text-muted-foreground w-24">Instagram:</span>
                <span className="text-foreground">
                  {contactData.instagram ? (
                    <a href={contactData.instagram.startsWith('http') ? contactData.instagram : `https://instagram.com/${contactData.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{contactData.instagram}</a>
                  ) : (
                    <span className="text-muted-foreground/70 italic">Not specified</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <span className="font-semibold text-muted-foreground w-24">WhatsApp:</span>
                <span className="text-foreground">
                  {contactData.whatsapp ? (
                    contactData.whatsapp.startsWith('http') || contactData.whatsapp.startsWith('https') ? (
                      <a href={contactData.whatsapp} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Chat on WhatsApp</a>
                    ) : (
                      <a href={`https://wa.me/${contactData.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{contactData.whatsapp}</a>
                    )
                  ) : (
                    <span className="text-muted-foreground/70 italic">Not specified</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderTimelineSection = () => {
    const sectionKey = "timeline";
    const isEditing = editingSections[sectionKey];
    
    let timelineEvents: TimelineEvent[] = [];
    try {
      if (project?.timeline) {
        const parsed = JSON.parse(project.timeline);
        if (Array.isArray(parsed)) {
          timelineEvents = parsed;
        } else {
          timelineEvents = [{ date: "", notes: project.timeline }];
        }
      }
    } catch (e) {
      if (project?.timeline) {
        timelineEvents = [{ date: "", notes: project.timeline }];
      }
    }

    const draftValue = sectionValues[sectionKey];
    let draftEvents: TimelineEvent[] = timelineEvents;
    if (isEditing && draftValue) {
      try {
        const parsed = JSON.parse(draftValue);
        if (Array.isArray(parsed)) {
          draftEvents = parsed;
        }
      } catch (e) {
        // Fallback
      }
    }

    const handleAddEvent = () => {
      const newEvents = [...draftEvents, { date: "", notes: "" }];
      setSectionValues(prev => ({ ...prev, [sectionKey]: JSON.stringify(newEvents) }));
    };

    const handleUpdateEvent = (index: number, field: keyof TimelineEvent, value: string) => {
      const newEvents = draftEvents.map((event, idx) => {
        if (idx === index) {
          return { ...event, [field]: value };
        }
        return event;
      });
      setSectionValues(prev => ({ ...prev, [sectionKey]: JSON.stringify(newEvents) }));
    };

    const handleRemoveEvent = (index: number) => {
      const newEvents = draftEvents.filter((_, idx) => idx !== index);
      setSectionValues(prev => ({ ...prev, [sectionKey]: JSON.stringify(newEvents) }));
    };

    return (
      <Card className="border-border/80 bg-card text-card-foreground shadow-noir rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-foreground text-lg">
            <Calendar className="h-5 w-5 text-primary" />
            Timeline
          </CardTitle>
          {project?.is_creator && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startEditingSection(sectionKey, JSON.stringify(timelineEvents))}
              className="text-primary hover:text-primary-hover hover:bg-primary/10"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              {draftEvents.map((event, index) => (
                <div key={index} className="flex gap-4 items-start border-b border-border/60 pb-4 last:border-0 last:pb-0">
                  <div className="w-1/3 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Date</label>
                    <Input
                      type="date"
                      value={event.date}
                      onChange={(e) => handleUpdateEvent(index, "date", e.target.value)}
                      className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Notes / Milestones</label>
                    <Textarea
                      value={event.notes}
                      onChange={(e) => handleUpdateEvent(index, "notes", e.target.value)}
                      placeholder="Enter notes for this day..."
                      className="min-h-[60px] border-border/80 bg-surface-elevated/50 focus:border-primary"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEvent(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEvent}
                className="w-full border-dashed border-primary/40 hover:border-primary text-primary hover:bg-primary/10"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Timeline Milestone
              </Button>

              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelEditingSection(sectionKey)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
                  onClick={() => saveSection(sectionKey, "timeline")}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {timelineEvents.length > 0 ? (
                <div className="relative pl-6 border-l-2 border-primary/35 ml-3 space-y-6">
                  {timelineEvents.map((event, index) => (
                    <div key={index} className="relative">
                      <span className="absolute -left-[31px] top-1.5 bg-primary border-4 border-card rounded-full w-4 h-4 shadow-sm"></span>
                      <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded border border-primary/25 w-fit shrink-0">
                          {event.date ? new Date(event.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : "Date TBD"}
                        </span>
                        <p className="text-sm text-foreground/90 flex-1 whitespace-pre-wrap leading-relaxed mt-0.5">
                          {event.notes || <span className="text-muted-foreground/70 italic">No notes specified</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm italic">None specified</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <AppLayout pageTitle="Project Details">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading project details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return (
      <AppLayout pageTitle="Project Not Found">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Project Not Found</h1>
            <p className="text-muted-foreground mb-6">The requested project could not be found.</p>
            <Button 
              onClick={() => navigate("/projects")}
              className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Projects
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const isCategoryMatched = !project?.hiring_categories || 
    project.hiring_categories.length === 0 || 
    (profile?.category && project.hiring_categories.some(c => c.toLowerCase() === profile.category.toLowerCase()));

  return (
    <AppLayout pageTitle={`${project.title} - Project Details`}>
      <div className="max-w-[1440px] mx-auto pb-8">
        <div className="flex flex-col xl:flex-row gap-6 items-start">
          {/* LEFT ZONE: Contextual Project Sub-Sidebar matching 04 / Project workspace */}
          <aside className="hidden xl:flex xl:w-56 flex-col shrink-0 gap-4 sticky top-20">
            <button
              type="button"
              onClick={() => navigate("/projects")}
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to projects
            </button>

            {/* Mini Project Identity Card */}
            <div className="rounded-xl border border-border/80 bg-card/90 p-3 flex items-center gap-3 shadow-soft">
              <div className="h-11 w-14 rounded-lg overflow-hidden bg-surface-elevated border border-border/70 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=400&q=80"
                  alt={project.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-serif font-bold text-foreground truncate">
                  {project.title}
                </div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5 capitalize">
                  {project.project_type} • {project.status}
                </div>
              </div>
            </div>

            {/* Vertical Workspace Navigation Pills */}
            <nav className="flex flex-col gap-1">
              {[
                { id: "overview", label: "Overview", icon: LayoutGrid, locked: false },
                { id: "tasks", label: "Tasks", icon: CheckSquare, locked: !isTeamMember },
                { id: "team", label: "Team", icon: Users, locked: !isTeamMember },
                { id: "chat", label: "Chat", icon: MessageCircle, locked: !isTeamMember },
                ...(sourceTab === "created"
                  ? [{ id: "applicants", label: "Applicants", icon: UserPlus, locked: false }]
                  : []),
              ].map((navItem) => {
                const Icon = navItem.icon;
                const active = activeTab === navItem.id;
                return (
                  <button
                    key={navItem.id}
                    type="button"
                    onClick={() => {
                      if (navItem.locked) {
                        toast({
                          variant: "destructive",
                          title: "Member Only Access",
                          description:
                            "You must be an accepted team member of this project to access this section.",
                        });
                        return;
                      }
                      setActiveTab(navItem.id);
                    }}
                    className={cn(
                      "relative flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors text-left",
                      active
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface-hover/50",
                      navItem.locked && "opacity-50"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="project-workspace-side-pill"
                        className="absolute inset-0 rounded-lg bg-primary/12 border border-primary/30"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2.5">
                      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground")} />
                      <span>{navItem.label}</span>
                    </span>
                    {navItem.locked && <Lock className="relative z-10 h-3 w-3 opacity-70" />}
                  </button>
                );
              })}

              {project.is_creator && (
                <button
                  type="button"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover/50 transition-colors text-left mt-2 border-t border-border/50 pt-3"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </button>
              )}
            </nav>
          </aside>

          {/* CENTER + RIGHT PRODUCTION WORKSPACE STAGE */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Mobile Back Button */}
            <div className="flex xl:hidden justify-between items-center gap-4 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/projects")}
                className="flex items-center gap-2 border-border/80 bg-surface-elevated/50 text-xs"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Projects
              </Button>
            </div>

            {/* Widescreen 21:9 Cinema Project Banner matching 04 / Project workspace */}
            <DimensionalCard
              tiltStrength={2}
              className="relative rounded-2xl overflow-hidden border border-border/80 bg-card shadow-noir"
            >
              <div className="relative min-h-[200px] sm:min-h-[230px] w-full overflow-hidden flex flex-col justify-end p-6 sm:p-7">
                <img
                  src="https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?auto=format&fit=crop&w=1600&q=85"
                  alt={project.title}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#111317] via-[#111317]/65 to-black/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#111317]/90 via-[#111317]/40 to-transparent" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="space-y-2.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur-md border border-primary/40 text-[10px] font-mono uppercase tracking-[0.18em] text-primary">
                        {project.project_type} • {project.status}
                      </span>
                      {project.location && (
                        <span className="px-2.5 py-0.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 text-[10px] text-white/80 flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-primary" />
                          {project.location}
                        </span>
                      )}
                    </div>

                    <h1 className="font-serif text-2xl sm:text-4xl font-bold text-white tracking-tight">
                      {project.title}
                    </h1>

                    <p className="text-xs sm:text-sm text-white/80 line-clamp-2 leading-relaxed">
                      {project.description ||
                        "A cinematic collaboration exploring character, atmosphere, and visual storytelling."}
                    </p>

                    {/* Crew Avatar Stack + Invite / Join CTA */}
                    <div className="flex items-center gap-3 pt-1">
                      <div className="flex -space-x-2">
                        {[
                          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
                          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
                          "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80",
                          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
                        ].map((av, i) => (
                          <img
                            key={i}
                            src={av}
                            alt="Crew member"
                            className="h-7 w-7 rounded-full object-cover ring-2 ring-[#121417]"
                          />
                        ))}
                        <span className="h-7 px-2 rounded-full bg-surface-elevated/90 ring-2 ring-[#121417] text-[10px] font-mono text-white/90 flex items-center justify-center">
                          +{Math.max(1, (project.team_size || 5) - 4)}
                        </span>
                      </div>

                      {project.allow_applicants && !project.is_creator && !isMember && isCategoryMatched ? (
                        <Button
                          size="sm"
                          onClick={handleJoinProject}
                          className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Join Project
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleShare}
                          className="h-7 px-3 text-xs rounded-lg bg-black/55 backdrop-blur-md border-white/20 text-white hover:bg-white/10"
                        >
                          Invite
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right Banner Actions: Edit Project & Share */}
                  <div className="flex items-center gap-2 shrink-0">
                    {project.is_creator && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditDialogOpen(true)}
                        className="h-9 px-3.5 rounded-lg bg-black/60 backdrop-blur-md border-white/20 text-white hover:bg-white/15 text-xs font-medium"
                      >
                        Edit project
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShare}
                      title="Share project"
                      className="h-9 w-9 p-0 rounded-lg bg-black/60 backdrop-blur-md border-white/20 text-white hover:bg-white/15"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </DimensionalCard>

            {/* Project Details with Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(val) => {
                if (!isTeamMember && ["tasks", "chat", "team"].includes(val)) {
                  toast({
                    variant: "destructive",
                    title: "Member Only Access",
                    description:
                      "You must be an accepted team member of this project to access this section.",
                  });
                  return;
                }
                setActiveTab(val);
              }}
              className="w-full"
            >
              {/* Studio Noir V2 Underline Tab Bar */}
              <div className="flex items-center justify-between border-b border-border/70 px-1">
                <TabsList className="bg-transparent border-0 p-0 h-auto gap-6 justify-start">
                  {[
                    { id: "overview", label: "Overview", locked: false },
                    { id: "tasks", label: "Tasks", locked: !isTeamMember },
                    { id: "team", label: "Team", locked: !isTeamMember },
                    { id: "chat", label: "Chat", locked: !isTeamMember },
                    ...(sourceTab === "created"
                      ? [{ id: "applicants", label: "Applicants", locked: false }]
                      : []),
                  ].map((t) => (
                    <TabsTrigger
                      key={t.id}
                      value={t.id}
                      disabled={t.locked}
                      className="relative bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground hover:text-foreground rounded-none px-1 py-3 text-xs font-medium transition-colors flex items-center gap-1.5 border-b-2 border-transparent data-[state=active]:border-primary"
                    >
                      <span>{t.label}</span>
                      {t.locked && <Lock className="h-3 w-3 opacity-70 shrink-0" />}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="grid grid-cols-1 2xl:grid-cols-12 gap-5 items-start pt-4">
                <div
                  className={cn(
                    "space-y-6 min-w-0",
                    isTeamMember && activeTab !== "chat" ? "2xl:col-span-8" : "2xl:col-span-12"
                  )}
                >
                  {/* Overview Tab */}
                  <TabsContent value="overview" className="space-y-6 mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="lg:col-span-2 space-y-6">
                {/* Project Header Info in Overview */}
                <Card className="border-border/80 bg-card text-card-foreground shadow-noir rounded-xl overflow-hidden">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex flex-wrap justify-between items-start gap-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="w-full mb-1"><span className="noir-eyebrow">Production Overview</span></div>
                          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight text-foreground">{project?.title}</h2>
                          {project?.featured && (
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                              <Star className="h-3 w-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                          {project?.popular && (
                            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {getTypeIcon(project?.project_type || "")}
                          <span className="font-medium">{project?.project_type} • {project?.category}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{project?.location || "No location specified"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(project?.status || "")}`}></div>
                          <span className="text-sm text-muted-foreground capitalize">{project?.status}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Project Description */}
                {renderEditableSection(
                  "Project Description",
                  "full_description",
                  "description",
                  project?.full_description || project?.description || "",
                  <Briefcase className="h-5 w-5 text-primary" />
                )}

                {/* Production Notes */}
                {renderEditableSection(
                  "Production Notes",
                  "production_notes",
                  "production_notes",
                  project?.production_notes || "",
                  <FileText className="h-5 w-5 text-primary" />
                )}

                {/* Target Audience */}
                {renderEditableSection(
                  "Target Audience",
                  "target_audience",
                  "target_audience",
                  project?.target_audience || "",
                  <Users className="h-5 w-5 text-primary" />
                )}

                {/* Distribution Plan */}
                {renderEditableSection(
                  "Distribution Plan",
                  "distribution_plan",
                  "distribution_plan",
                  project?.distribution_plan || "",
                  <Globe className="h-5 w-5 text-primary" />
                )}

                {/* Timeline */}
                {renderTimelineSection()}

                {/* Requirements */}
                {renderEditableSection(
                  "Requirements",
                  "requirements",
                  "skills_required",
                  project?.requirements || "",
                  <AlertCircle className="h-5 w-5 text-primary" />
                )}
              </div>

              <div className="space-y-6">
                {/* Project Info */}
                <Card className="border-border/80 bg-card text-card-foreground shadow-noir rounded-xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-foreground">Project Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Budget Range</p>
                        <p className="text-sm text-muted-foreground">
                          {formatBudget(project?.budget_min, project?.budget_max, project?.budget_currency || "₹")}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Duration</p>
                        <p className="text-sm text-muted-foreground">
                          {project?.duration_minutes ? `${project.duration_minutes} minutes` : 
                           project?.episodes ? `${project.episodes} episodes` : 'Not specified'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Team Size</p>
                        <p className="text-sm text-muted-foreground">{project?.team_size} members</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Created Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(project?.created_at || "")}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">Hire Members</p>
                          <p className="text-xs text-muted-foreground">
                            {project?.allow_applicants ? "Hiring is Active" : "Hiring is Inactive"}
                          </p>
                        </div>
                      </div>
                      {project?.is_creator ? (
                        <Switch
                          checked={!!project?.allow_applicants}
                          onCheckedChange={(checked) => handleToggleHire(checked)}
                        />
                      ) : (
                        <Switch
                          checked={!!project?.allow_applicants}
                          disabled
                          className="opacity-75"
                        />
                      )}
                    </div>

                    {/* Category Multiselect and Selected Chips */}
                    {project?.allow_applicants && (
                      <div className="pt-4 border-t border-border/60 space-y-3 animate-fade-in">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Required Crew Roles</p>
                        {project?.is_creator ? (
                          <div className="space-y-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="w-full justify-between border-border/80 text-xs text-foreground bg-surface-elevated/50 hover:bg-surface-hover"
                                >
                                  <span>
                                    {project?.hiring_categories && project.hiring_categories.length > 0 
                                      ? `Select Roles (${project.hiring_categories.length} selected)`
                                      : "Select Roles..."}
                                  </span>
                                  <Plus className="h-3 w-3 text-primary ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-56 p-2 bg-popover text-popover-foreground border border-border shadow-md rounded-md z-50">
                                <div className="space-y-1 max-h-60 overflow-y-auto">
                                  {[
                                    "Director", 
                                    "Actor", 
                                    "Writer", 
                                    "Cinematographer", 
                                    "Producer", 
                                    "Editor", 
                                    "Sound Designer", 
                                    "Composer", 
                                    "VFX Artist", 
                                    "Art Director", 
                                    "Makeup Artist"
                                  ].map((cat) => {
                                    const isSelected = project?.hiring_categories?.includes(cat);
                                    return (
                                      <div 
                                        key={cat} 
                                        className="flex items-center gap-2 p-1.5 hover:bg-surface-hover rounded cursor-pointer transition-colors"
                                        onClick={() => handleToggleHiringCategory(cat)}
                                      >
                                        <Checkbox 
                                          checked={isSelected} 
                                          onCheckedChange={() => handleToggleHiringCategory(cat)}
                                          className="border-primary/50 text-primary focus:ring-primary"
                                        />
                                        <span className="text-xs font-medium text-foreground/90 select-none">{cat}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        ) : null}

                        {/* Chips list */}
                        <div className="flex flex-wrap gap-1.5">
                          {project?.hiring_categories && project.hiring_categories.length > 0 ? (
                            project.hiring_categories.map((cat, idx) => (
                              <Badge 
                                key={idx} 
                                variant="secondary" 
                                className="bg-primary/10 text-primary border border-primary/25 text-[11px] font-medium flex items-center gap-1"
                              >
                                {cat}
                                {project?.is_creator && (
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleHiringCategory(cat);
                                    }}
                                    className="ml-1 text-primary hover:text-primary-hover font-bold"
                                  >
                                    ×
                                  </button>
                                )}
                              </Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground/70 italic">No role specified (open to all)</p>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                {/* Contact Information */}
                {renderContactSection()}

                {/* Action Buttons */}
                <Card className="border-border/80 bg-card text-card-foreground shadow-noir rounded-xl overflow-hidden">
                  <CardContent className="pt-6">
                    {project?.is_creator ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="destructive"
                            className="w-full bg-red-600 hover:bg-red-700 text-white animate-fade-in"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Project
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-red-600">Delete Project</DialogTitle>
                          </DialogHeader>
                          <p className="text-sm text-muted-foreground my-4">
                            Are you sure you want to delete this project? This action is permanent and cannot be undone. All project data and associations will be permanently removed.
                          </p>
                          <div className="flex justify-end gap-2">
                            <DialogTrigger asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogTrigger>
                            <Button variant="destructive" onClick={handleDeleteProject}>
                              Confirm Delete
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : isMember ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="w-full border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 hover:text-red-700"
                          >
                            Leave Project
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Leave Project</DialogTitle>
                          </DialogHeader>
                          <p className="text-sm text-muted-foreground my-4">
                            Are you sure you want to leave this project? You will no longer be listed as a team member.
                          </p>
                          <div className="flex justify-end gap-2">
                            <DialogTrigger asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogTrigger>
                            <Button variant="destructive" onClick={handleLeaveProject}>
                              Confirm Leave
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (project?.allow_applicants && !project?.is_creator && isCategoryMatched) ? (
                      <Button 
                        className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-medium animate-fade-in" 
                        onClick={handleJoinProject}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Join Project
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            {!isTeamMember ? (
              <Card className="border-border/80 p-8 text-center bg-card text-card-foreground shadow-noir rounded-xl">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Team Members Only</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Tasks are private to the members of this project. Only accepted team members can access task assignments and progress tracking.
                </p>
              </Card>
            ) : (
              <>
                <div className="flex flex-wrap justify-between items-center gap-3">
                  {/* Board / List View Switcher matching 04 / Project workspace */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-surface-base border border-border/80">
                    {(
                      [
                        { id: "board", label: "Board", icon: LayoutGrid },
                        { id: "list", label: "List", icon: ListIcon },
                      ] as const
                    ).map((mode) => {
                      const Icon = mode.icon;
                      const active = taskViewMode === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setTaskViewMode(mode.id)}
                          className={cn(
                            "relative px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors",
                            active
                              ? "text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="task-view-pill"
                              className="absolute inset-0 rounded-md bg-primary shadow-sm"
                              transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            />
                          )}
                          <Icon className="relative z-10 h-3.5 w-3.5" />
                          <span className="relative z-10">{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {canCreateTasks && (
                    <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
                      <DialogTrigger asChild>
                        <Button className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-amber-glow">
                          <Plus className="h-3.5 w-3.5 mr-1.5" />
                          Add task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-foreground">Create New Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium text-foreground">Task Title</label>
                            <Input
                              value={newTask.title}
                              onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Enter task title"
                              className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground">Description</label>
                            <Textarea
                              value={newTask.description}
                              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Enter task description"
                              className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-foreground">Assign To</label>
                            <Select value={newTask.assigned_to} onValueChange={(value) => setNewTask(prev => ({ ...prev, assigned_to: value }))}>
                              <SelectTrigger className="border-border/80 bg-surface-elevated/50 focus:border-primary">
                                <SelectValue placeholder="Select team member" />
                              </SelectTrigger>
                              <SelectContent>
                                {assignableMembers.map((member) => (
                                  <SelectItem key={member.id} value={member.user_id || member.id}>
                                    {member.name} - {member.role}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Priority</label>
                      <Select value={newTask.priority} onValueChange={(value: "low" | "medium" | "high") => setNewTask(prev => ({ ...prev, priority: value }))}>
                        <SelectTrigger className="border-border/80 bg-surface-elevated/50 focus:border-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Due Date</label>
                      <Input
                        type="date"
                        value={newTask.due_date}
                        onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                        className="border-border/80 bg-surface-elevated/50 focus:border-primary"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowCreateTask(false)} className="border-border/80 hover:border-primary/40 hover:bg-surface-hover">
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTask} className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium">
                        Create Task
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {taskViewMode === "board" ? (
            /* 3-Column Production Kanban Board matching 04 / Project workspace */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              {(
                [
                  {
                    status: "pending" as const,
                    title: "To do",
                    dotColor: "bg-amber-400",
                  },
                  {
                    status: "in-progress" as const,
                    title: "In progress",
                    dotColor: "bg-sky-400",
                  },
                  {
                    status: "completed" as const,
                    title: "Done",
                    dotColor: "bg-emerald-400",
                  },
                ] as const
              ).map((col) => {
                const colTasks = tasks.filter((t) => t.status === col.status);
                return (
                  <div
                    key={col.status}
                    className="rounded-2xl border border-border/80 bg-card/85 p-3.5 space-y-3 min-h-[340px]"
                  >
                    <div className="flex items-center justify-between px-1 pb-1 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-2 w-2 rounded-full", col.dotColor)} />
                        <h4 className="text-xs font-semibold text-foreground">{col.title}</h4>
                        <span className="text-xs font-mono text-muted-foreground">
                          {colTasks.length}
                        </span>
                      </div>
                      <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground/60" />
                    </div>

                    <div className="space-y-2.5">
                      {colTasks.map((task) => {
                        const assigneeName =
                          task.assigned_to_profile?.full_name ||
                          task.assigned_to_profile?.username ||
                          (typeof task.assigned_to === "string" && task.assigned_to.length < 24
                            ? task.assigned_to
                            : "Crew");
                        return (
                          <DimensionalCard
                            key={task.id}
                            tiltStrength={4}
                            className="rounded-xl border border-border/80 bg-surface-elevated/85 p-3.5 space-y-2.5 hover:border-primary/40 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2 min-w-0">
                                {col.status === "completed" && (
                                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                )}
                                <h5
                                  className={cn(
                                    "text-xs font-semibold text-foreground leading-snug",
                                    col.status === "completed" &&
                                      "line-through text-muted-foreground"
                                  )}
                                >
                                  {task.title}
                                </h5>
                              </div>
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                {task.description}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-medium capitalize border",
                                    task.priority === "high"
                                      ? "bg-red-500/15 text-red-400 border-red-500/30"
                                      : task.priority === "medium"
                                        ? "bg-primary/15 text-primary border-primary/30"
                                        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                  )}
                                >
                                  {task.priority}
                                </span>

                                {task.due_date && (
                                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {new Date(task.due_date).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Select
                                  value={task.status}
                                  onValueChange={(
                                    value: "pending" | "in-progress" | "completed"
                                  ) => handleUpdateTaskStatus(task.id, value)}
                                >
                                  <SelectTrigger className="h-6 px-2 text-[10px] border-border/70 bg-card/80 w-auto gap-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending" className="text-xs">
                                      To do
                                    </SelectItem>
                                    <SelectItem value="in-progress" className="text-xs">
                                      In progress
                                    </SelectItem>
                                    <SelectItem value="completed" className="text-xs">
                                      Done
                                    </SelectItem>
                                  </SelectContent>
                                </Select>

                                <div
                                  title={assigneeName}
                                  className="h-6 w-6 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-bold text-primary flex items-center justify-center shrink-0"
                                >
                                  {assigneeName
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                              </div>
                            </div>
                          </DimensionalCard>
                        );
                      })}

                      {colTasks.length === 0 && (
                        <div className="text-center py-8 rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground">
                          No tasks in {col.title.toLowerCase()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Accordion type="multiple" defaultValue={["in-progress", "pending"]} className="w-full space-y-4">
                {/* In Progress Section */}
                <AccordionItem value="in-progress" className="border-none">
                  <AccordionTrigger className="hover:no-underline bg-primary/10 px-4 py-3 rounded-xl border border-primary/30 text-foreground">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold text-foreground">In Progress ({tasks.filter(t => t.status === 'in-progress').length})</h4>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-4">
                      {tasks.filter(t => t.status === 'in-progress').map((task) => (
                        <Card key={task.id} className="border-border/80 bg-card text-card-foreground shadow-noir rounded-xl">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-foreground">{task.title}</h4>
                                  <Badge variant={
                                    task.priority === 'high' ? 'destructive' :
                                    task.priority === 'medium' ? 'default' : 'secondary'
                                  } className={
                                    task.priority === 'high' ? 'bg-destructive/15 text-destructive border border-destructive/30' :
                                    task.priority === 'medium' ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-elevated text-foreground border border-border/80'
                                  }>
                                    {task.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Assigned to: {task.assigned_to_profile?.full_name || task.assigned_to_profile?.username || "Unknown"}</span>
                                  <span>Due: {formatDate(task.due_date || "")}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select value={task.status} onValueChange={(value: "pending" | "in-progress" | "completed") => handleUpdateTaskStatus(task.id, value)}>
                                  <SelectTrigger className="w-36 border-border/80 bg-surface-elevated/50 focus:border-primary whitespace-nowrap [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">
                                      <div className="flex items-center gap-2">
                                        <Circle className="h-3 w-3" />
                                        Pending
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="in-progress">
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3" />
                                        In Progress
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="completed">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-3 w-3" />
                                        Completed
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {tasks.filter(t => t.status === 'in-progress').length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4 italic">No tasks currently in progress.</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Pending Section */}
                <AccordionItem value="pending" className="border-none">
                  <AccordionTrigger className="hover:no-underline bg-muted/40 px-4 py-3 rounded-lg border border-border text-foreground">
                    <div className="flex items-center gap-2">
                      <Circle className="h-5 w-5 text-muted-foreground" />
                      <h4 className="font-semibold text-foreground">Pending ({tasks.filter(t => t.status === 'pending').length})</h4>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-4">
                      {tasks.filter(t => t.status === 'pending').map((task) => (
                        <Card key={task.id} className="border-border bg-card text-card-foreground">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-foreground">{task.title}</h4>
                                  <Badge variant={
                                    task.priority === 'high' ? 'destructive' :
                                    task.priority === 'medium' ? 'default' : 'secondary'
                                  } className={
                                    task.priority === 'high' ? 'bg-destructive/15 text-destructive border border-destructive/30' :
                                    task.priority === 'medium' ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-elevated text-foreground border border-border/80'
                                  }>
                                    {task.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Assigned to: {task.assigned_to_profile?.full_name || task.assigned_to_profile?.username || "Unknown"}</span>
                                  <span>Due: {formatDate(task.due_date || "")}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select value={task.status} onValueChange={(value: "pending" | "in-progress" | "completed") => handleUpdateTaskStatus(task.id, value)}>
                                  <SelectTrigger className="w-36 border-border focus:border-primary whitespace-nowrap [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">
                                      <div className="flex items-center gap-2">
                                        <Circle className="h-3 w-3" />
                                        Pending
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="in-progress">
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3" />
                                        In Progress
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="completed">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-3 w-3" />
                                        Completed
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {tasks.filter(t => t.status === 'pending').length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4 italic">No pending tasks.</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Completed Section */}
                <AccordionItem value="completed" className="border-none">
                  <AccordionTrigger className="hover:no-underline bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/30">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                      <h4 className="font-semibold text-foreground">Completed ({tasks.filter(t => t.status === 'completed').length})</h4>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-4">
                      {tasks.filter(t => t.status === 'completed').map((task) => (
                        <Card key={task.id} className="border-emerald-500/30 bg-card/80 opacity-85 rounded-xl">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-foreground line-through">{task.title}</h4>
                                  <Badge variant={
                                    task.priority === 'high' ? 'destructive' :
                                    task.priority === 'medium' ? 'default' : 'secondary'
                                  } className={
                                    task.priority === 'high' ? 'bg-destructive/15 text-destructive border border-destructive/30' :
                                    task.priority === 'medium' ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-surface-elevated text-foreground border border-border/80'
                                  }>
                                    {task.priority}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <span>Assigned to: {task.assigned_to_profile?.full_name || task.assigned_to_profile?.username || "Unknown"}</span>
                                  <span>Due: {formatDate(task.due_date || "")}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Select value={task.status} onValueChange={(value: "pending" | "in-progress" | "completed") => handleUpdateTaskStatus(task.id, value)}>
                                  <SelectTrigger className="w-36 border-emerald-500/30 bg-surface-elevated/50 focus:border-emerald-500 whitespace-nowrap [&>span]:flex [&>span]:items-center [&>span]:gap-2">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">
                                      <div className="flex items-center gap-2">
                                        <Circle className="h-3 w-3" />
                                        Pending
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="in-progress">
                                      <div className="flex items-center gap-2">
                                        <AlertCircle className="h-3 w-3" />
                                        In Progress
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="completed">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle className="h-3 w-3" />
                                        Completed
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {tasks.filter(t => t.status === 'completed').length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4 italic">No completed tasks yet.</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
          )}
            </>
          )}
        </TabsContent>

          {/* Chat Tab */}
          <TabsContent value="chat" className="space-y-6">
            {!isTeamMember ? (
              <Card className="border-border/80 p-8 text-center bg-card text-card-foreground shadow-noir rounded-xl">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Team Members Only</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Team chat is private and accessible only to verified project team members.
                </p>
              </Card>
            ) : (
              <Card className="border-border/80 bg-card text-card-foreground overflow-hidden shadow-noir rounded-xl">
              <CardHeader className="border-b border-border bg-muted/20 py-4">
                <CardTitle className="flex items-center justify-between text-foreground">
                  <div className="flex items-center gap-2 text-base font-semibold">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    Team Chat
                  </div>
                  <span className="text-xs text-muted-foreground font-normal">
                    {chatMessages.length} messages
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex flex-col h-[calc(100vh-280px)] min-h-[400px] relative">
                {/* Messages List Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-background/50 min-h-0 flex flex-col">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2">
                      <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    chatMessages.map((message, index) => {
                      const isMe = message.user_id === "current-user" || message.user_id === currentUser?.id;
                      const initials = message.user_avatar || message.user_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "U";
                      
                      const msgDateStr = new Date(message.timestamp).toDateString();
                      const prevMsgDateStr = index > 0 ? new Date(chatMessages[index - 1].timestamp).toDateString() : "";
                      const showDateHeader = msgDateStr !== prevMsgDateStr;
                      
                      const formatDateHeader = (dateString: string) => {
                        const date = new Date(dateString);
                        const today = new Date();
                        const yesterday = new Date(today);
                        yesterday.setDate(yesterday.getDate() - 1);

                        if (date.toDateString() === today.toDateString()) return "Today";
                        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
                        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                      };

                      return (
                        <div key={message.id} className="w-full flex flex-col">
                          {showDateHeader && (
                            <div className="flex justify-center my-4">
                              <span className="bg-surface-elevated border border-border/80 text-muted-foreground font-mono text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
                                {formatDateHeader(message.timestamp)}
                              </span>
                            </div>
                          )}
                          <div className={cn("flex gap-3 max-w-[85%] w-full", isMe ? "ml-auto flex-row-reverse" : "mr-auto")}>
                          {/* Avatar */}
                          <Avatar className="h-8 w-8 shrink-0 border border-border/80">
                            <AvatarFallback className={cn(
                              "text-[10px] font-bold text-white",
                              isMe ? "bg-primary text-primary-foreground" : "bg-surface-elevated text-foreground"
                            )}>
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          
                          {/* Message bubble */}
                          <div className={cn("space-y-1 flex-1", isMe ? "text-right" : "text-left")}>
                            <div className={cn("flex items-baseline gap-2 mb-1", isMe ? "justify-end" : "justify-start")}>
                              <span className="text-xs font-semibold text-foreground">{message.user_name}</span>
                              <span className="text-[10px] text-muted-foreground">{formatDate(message.timestamp)}</span>
                            </div>
                            <div className={cn(
                              "p-3 rounded-2xl text-sm shadow-sm inline-block text-left",
                              isMe 
                                ? "bg-primary text-primary-foreground rounded-tr-none" 
                                : "bg-surface-elevated text-foreground border border-border/70 rounded-tl-none"
                            )}>
                                <p className="whitespace-pre-wrap break-words leading-relaxed">
                                  {message.message.split(/(@\S+)/g).map((part: string, i: number) => {
                                    if (part.startsWith('@')) {
                                      return <span key={i} className={cn("font-bold px-1 rounded-sm", isMe ? "bg-black/20 text-primary-foreground" : "bg-primary/15 text-primary")}>{part}</span>;
                                    }
                                    return part;
                                  })}
                                </p>
                            </div>
                          </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* @Mention Popover */}
                {mentionOpen && (
                  <div className="absolute bottom-20 left-4 w-64 bg-popover text-popover-foreground rounded-lg shadow-lg border border-border max-h-48 overflow-y-auto z-10 p-1">
                    {dbMembers.concat(project?.created_by ? [{ user_id: project.created_by, name: (project as any)?.creator_name || (project as any)?.creator_username } as any] : []).filter((u: any) => 
                      u.name?.toLowerCase().includes(mentionQuery.toLowerCase()) || 
                      u.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()) || 
                      u.username?.toLowerCase().includes(mentionQuery.toLowerCase())
                    ).map((u: any, i) => (
                      <div 
                        key={i}
                        className="flex items-center gap-2 p-2 hover:bg-surface-hover rounded cursor-pointer"
                        onClick={() => insertMention(u.name?.split(' ')[0] || u.full_name?.split(' ')[0] || u.username || "User")}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-primary/15 text-primary border border-primary/30">{u.name?.[0] || u.full_name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground">{u.name || u.full_name || u.username}</span>
                      </div>
                    ))}
                    {dbMembers.concat(project?.created_by ? [{ user_id: project.created_by, name: (project as any)?.creator_name || (project as any)?.creator_username } as any] : []).filter((u: any) => 
                      u.name?.toLowerCase().includes(mentionQuery.toLowerCase()) || 
                      u.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()) || 
                      u.username?.toLowerCase().includes(mentionQuery.toLowerCase())
                    ).length === 0 && (
                        <div className="p-2 text-sm text-muted-foreground text-center">No members found</div>
                    )}
                  </div>
                )}

                {/* Chat Input Section */}
                <div className="p-4 border-t border-border bg-card flex gap-2 shrink-0">
                  <Input
                    ref={chatInputRef}
                    value={newMessage}
                    onChange={handleMessageChange}
                    placeholder="Type a message... (Use @ to mention)"
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 border-border/80 focus:border-primary bg-surface-elevated/50 text-foreground"
                  />
                  <Button onClick={handleSendMessage} className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium shrink-0 shadow-sm transition-transform active:scale-95 px-3 sm:px-4">
                    <Send className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

          {/* Team Members Tab */}
          <TabsContent value="team" className="space-y-6">
            {!isTeamMember ? (
              <Card className="border-border/80 p-8 text-center bg-card text-card-foreground shadow-noir rounded-xl">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Team Members Only</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  The team member roster is private and accessible only to accepted project members.
                </p>
              </Card>
            ) : (
              <Card className="border-border/80 bg-card text-card-foreground shadow-noir rounded-xl overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Users className="h-5 w-5 text-primary" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectMembers.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 p-3 border rounded-xl border-border/80 bg-surface-elevated/40 text-card-foreground">
                      <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-full flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {member.avatar}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{member.name}</h4>
                        <p className="text-sm text-muted-foreground">{member.role}</p>
                        <p className="text-xs text-muted-foreground">Joined: {formatDate(member.joined_date)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="border-border/80 hover:border-primary/40 hover:bg-surface-hover px-2 sm:px-3">
                          <MessageCircle className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Message</span>
                        </Button>
                        {project?.is_creator && member.user_id !== currentUser?.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                title="Remove Member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {member.name} from the project? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteMember(member.id, !!member.user_id, member.user_id)}
                                  className="bg-red-500 text-white hover:bg-red-600 focus:ring-red-500"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

          {/* Applicants Tab (Only for created projects) */}
          {sourceTab === 'created' && (
            <TabsContent value="applicants" className="space-y-6">
              <Card className="border-border/80 bg-card text-card-foreground shadow-noir rounded-xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <UserPlus className="h-5 w-5 text-primary" />
                    Project Applicants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {applicants.length > 0 ? applicants.map((applicant) => (
                      <div key={applicant.id} className="flex items-center gap-4 p-4 border rounded-xl border-border/80 bg-surface-elevated/40 text-card-foreground">
                        <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-full flex items-center justify-center">
                          <span className="text-primary font-semibold">
                            {applicant.avatar}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{applicant.name}</h4>
                          <p className="text-sm text-muted-foreground">{applicant.email}</p>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>Role: {applicant.role}</span>
                            <span>Experience: {applicant.experience}</span>
                            <span>Applied: {formatDate(applicant.applied_date)}</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {applicant.skills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="text-xs border-primary/25 bg-primary/10 text-primary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Badge variant={
                            applicant.status === "accepted" ? "default" :
                            applicant.status === "rejected" ? "destructive" : "secondary"
                          } className={
                            applicant.status === "accepted" ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30" :
                            applicant.status === "rejected" ? "bg-destructive/15 text-destructive border border-destructive/30" : "bg-primary/15 text-primary border border-primary/30"
                          }>
                            {applicant.status}
                          </Badge>
                          {applicant.status === "pending" && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleAcceptApplicant(applicant.id)} className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium">
                                Accept
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleRejectApplicant(applicant.id)} className="border-border/80 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed border-border">
                        No applicants have applied to this project yet.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
                </div>

                {/* RIGHT ZONE: Persistent Live Project Chat Dock matching 04 / Project workspace */}
                {isTeamMember && activeTab !== "chat" && (
                  <aside className="2xl:col-span-4 rounded-2xl border border-border/80 bg-card/95 overflow-hidden shadow-noir flex flex-col h-[520px]">
                    <div className="px-4 py-3.5 border-b border-border/70 flex items-center justify-between bg-surface-base/70">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <h3 className="text-xs font-semibold text-foreground">Project chat</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("chat")}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Full view
                      </button>
                    </div>

                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                      {chatMessages.slice(-4).map((msg, idx) => (
                        <div key={msg.id || idx} className="flex items-start gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-bold text-primary flex items-center justify-center shrink-0 mt-0.5">
                            {msg.user_avatar || "CR"}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {msg.user_name}
                              </span>
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed break-words">
                              {msg.message}
                            </p>
                            {idx === 0 && (
                              <div className="mt-2 rounded-lg overflow-hidden border border-border/70 aspect-[16/9]">
                                <img
                                  src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80"
                                  alt="Location scout reference"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 border-t border-border/70 bg-surface-base/70 flex items-center gap-2">
                      <Input
                        value={newMessage}
                        onChange={handleMessageChange}
                        placeholder="Write a message..."
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        className="h-9 text-xs bg-card border-border/80 rounded-lg"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendMessage}
                        className="h-9 w-9 p-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </aside>
                )}
              </div>
            </Tabs>

        {/* Edit Project Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-bold tracking-tight">Edit Project Details</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateProject} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-sm font-semibold text-foreground">Project Title</label>
                  <Input 
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Project Type</label>
                  <Select 
                    value={editForm.project_type} 
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, project_type: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Film">Film</SelectItem>
                      <SelectItem value="Television">Television</SelectItem>
                      <SelectItem value="Web Series">Web Series</SelectItem>
                      <SelectItem value="Short Film">Short Film</SelectItem>
                      <SelectItem value="Documentary">Documentary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Your Role</label>
                  <Input 
                    required
                    value={editForm.category}
                    onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Location</label>
                  <Input 
                    value={editForm.location}
                    onChange={(e) => setEditForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Status</label>
                  <Select 
                    value={editForm.status} 
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, status: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planning">Planning</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Project Status</label>
                  <Select 
                    value={editForm.project_status} 
                    onValueChange={(val) => setEditForm(prev => ({ ...prev, project_status: val }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Public">Public</SelectItem>
                      <SelectItem value="Private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Budget Min</label>
                  <Input 
                    type="number"
                    value={editForm.budget_min}
                    onChange={(e) => setEditForm(prev => ({ ...prev, budget_min: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Budget Max</label>
                  <Input 
                    type="number"
                    value={editForm.budget_max}
                    onChange={(e) => setEditForm(prev => ({ ...prev, budget_max: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Budget Currency</label>
                  <Input 
                    value={editForm.budget_currency}
                    onChange={(e) => setEditForm(prev => ({ ...prev, budget_currency: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Duration (Minutes)</label>
                  <Input 
                    type="number"
                    value={editForm.duration_minutes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-foreground">Episodes count</label>
                  <Input 
                    type="number"
                    value={editForm.episodes}
                    onChange={(e) => setEditForm(prev => ({ ...prev, episodes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium">
                  Save Changes
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Toggle Hire (Allow Applicants) Confirm Dialog */}
        <Dialog open={isHireConfirmOpen} onOpenChange={setIsHireConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Allow Applicants</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {targetHireState 
                  ? "Are you sure you want to allow applicants for this project? If confirmed, other members will see the 'Join Project' option on cards and detail views." 
                  : "Are you sure you want to stop allowing applicants for this project?"}
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsHireConfirmOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmHire}
                className="bg-primary text-primary-foreground hover:bg-primary-hover font-medium"
              >
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}