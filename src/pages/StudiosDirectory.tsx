import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CategoryDropdown } from "@/components/ui/category-dropdown";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  Film,
  Video,
  Calendar,
  Search,
  MessageCircle,
  Heart,
  Bookmark,
  Eye,
  MapPin,
  Globe,
  Award,
  Sparkles,
  Star,
  Users,
  Phone,
  Mail,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  ArrowLeft,
  Share2,
  Flag,
  Upload,
  ThumbsUp,
  Clock,
  Filter,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  GraduationCap
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Company, JobPosting, AuditionPosting, InternshipPosting, Application, Review, Project, TeamMember } from "../types/studios";
import { CATEGORIES, SERVICES, STATES, CITIES, LANGUAGES, INITIAL_COMPANIES, STATE_CITY_MAP } from "./studios-data";

export default function StudiosDirectory() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // Load companies from localStorage or initial state
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem("studios_directory_companies");
    return saved ? JSON.parse(saved) : INITIAL_COMPANIES;
  });

  // Load applications
  const [applications, setApplications] = useState<Application[]>(() => {
    const saved = localStorage.getItem("studios_directory_applications");
    return saved ? JSON.parse(saved) : [];
  });

  // Followed & Saved company IDs
  const [followedIds, setFollowedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("studios_directory_followed");
    return saved ? JSON.parse(saved) : [];
  });

  const [savedIds, setSavedIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("studios_directory_saved");
    return saved ? JSON.parse(saved) : [];
  });

  // Persist states
  useEffect(() => {
    localStorage.setItem("studios_directory_companies", JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem("studios_directory_applications", JSON.stringify(applications));
  }, [applications]);

  useEffect(() => {
    localStorage.setItem("studios_directory_followed", JSON.stringify(followedIds));
  }, [followedIds]);

  useEffect(() => {
    localStorage.setItem("studios_directory_saved", JSON.stringify(savedIds));
  }, [savedIds]);

  // Current Active Tab (All, Featured/Trending, Hiring, Auditions, Internships, My Workspace)
  const [activeTab, setActiveTab] = useState<string>("all");

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [filterVerified, setFilterVerified] = useState(false);
  const [filterHiring, setFilterHiring] = useState(false);
  const [filterAuditions, setFilterAuditions] = useState(false);
  const [filterInternships, setFilterInternships] = useState(false);
  const [filterFreshers, setFilterFreshers] = useState(false);
  const [minRating, setMinRating] = useState("all");
  const [companySize, setCompanySize] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [filterCollab, setFilterCollab] = useState(false);
  const [yearsInIndustry, setYearsInIndustry] = useState("all");
  const [filterRecentlyJoined, setFilterRecentlyJoined] = useState(false);

  // Selected company for detailed view
  const [viewingCompany, setViewingCompany] = useState<Company | null>(null);

  // Modal Triggers
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isApplicationOpen, setIsApplicationOpen] = useState(false);
  const [isManageWorkspace, setIsManageWorkspace] = useState(false);

  // Application target details
  const [applicationTarget, setApplicationTarget] = useState<{
    id: string;
    title: string;
    type: "job" | "audition" | "internship";
    companyId: string;
    companyName: string;
  } | null>(null);

  // Contact target company
  const [contactCompany, setContactCompany] = useState<Company | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });

  // New application form state
  const [appForm, setAppForm] = useState({
    name: "",
    email: "",
    phone: "",
    experience: "",
    coverLetter: "",
    resumeUrl: "",
    demoReelUrl: ""
  });

  // Review Form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // Registration Form state
  const [regForm, setRegForm] = useState({
    name: "",
    category: CATEGORIES[0],
    description: "",
    establishedYear: new Date().getFullYear().toString(),
    founder: "",
    email: "",
    phone: "",
    website: "",
    facebook: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    address: "",
    city: STATE_CITY_MAP[STATES[0]][0],
    state: STATES[0],
    country: "India",
    mapsLocation: "",
    gstNumber: "",
    workingHours: "09:00 AM - 06:00 PM (Mon-Fri)",
    zipCode: "",
    officeOpenTime: "09:00",
    officeCloseTime: "18:00",
    servicesSelected: [] as string[]
  });

  // Quick helper to see if user owns a company
  const userCompany = companies.find(c => c.userId === user?.id);
  const isOwner = !!(viewingCompany && user && (viewingCompany.userId === user.id || (userCompany && userCompany.id === viewingCompany.id)));

  // Workspace Creation Post States
  const [postType, setPostType] = useState<"job" | "audition" | "internship" | "project" | "team" | "gallery">("job");
  
  // Workspace specific states
  const [newJob, setNewJob] = useState({ position: "", experience: "", location: "", salary: "", description: "" });
  const [newAudition, setNewAudition] = useState({ role: "", ageRange: "", gender: "Any", language: "", location: "", description: "" });
  const [newInternship, setNewInternship] = useState({ role: "", duration: "", type: "Paid" as "Paid" | "Unpaid", location: "", description: "" });
  const [newProject, setNewProject] = useState({ title: "", year: "", role: "", description: "" });
  const [newTeam, setNewTeam] = useState({ name: "", role: "" });
  const [newGalleryUrl, setNewGalleryUrl] = useState("");

  // Edit Dialog States for Studios Details page
  const [isEditAboutOpen, setIsEditAboutOpen] = useState(false);
  const [isEditProjectsOpen, setIsEditProjectsOpen] = useState(false);
  const [isUploadMediaOpen, setIsUploadMediaOpen] = useState(false);

  // Temporary Form States for Edit dialogs
  const [editAboutForm, setEditAboutForm] = useState({
    name: "",
    category: "",
    description: "",
    founder: "",
    establishedYear: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    mapsLocation: "",
    workingHours: "",
    city: "",
    state: "",
    country: "",
    gstNumber: "",
    services: [] as string[]
  });
  const [newCrewMember, setNewCrewMember] = useState({ name: "", role: "" });
  const [newProjForm, setNewProjForm] = useState({ title: "", year: "", role: "", description: "" });
  const [activeViewTab, setActiveViewTab] = useState("about");
  const [mediaUrlInput, setMediaUrlInput] = useState("");

  const [isPostJobDialogOpen, setIsPostJobDialogOpen] = useState(false);
  const [isCreateEventDialogOpen, setIsCreateEventDialogOpen] = useState(false);
  const [isCreateCourseDialogOpen, setIsCreateCourseDialogOpen] = useState(false);

  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const [selectedProjectForView, setSelectedProjectForView] = useState<Project | null>(null);
  const [isViewProjectDetailsOpen, setIsViewProjectDetailsOpen] = useState(false);

  const [jobForm, setJobForm] = useState({ position: "", experience: "", location: "", salary: "", description: "" });
  const [eventForm, setEventForm] = useState({ title: "", description: "", date: "", location: "", isOnline: false, price: "" });
  const [courseForm, setCourseForm] = useState({ title: "", description: "", duration: "", instructor: "", price: "", level: "Beginner", category: "Cinematography" });

  const [isEditBannerOpen, setIsEditBannerOpen] = useState(false);
  const [isEditLogoOpen, setIsEditLogoOpen] = useState(false);
  const [logoInput, setLogoInput] = useState("");

  useEffect(() => {
    if (viewingCompany) {
      setLogoInput(viewingCompany.logo || "");
    }
  }, [viewingCompany]);

  // Helper to update viewing company and general list
  const updateViewingCompany = (updated: Company) => {
    setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
    setViewingCompany(updated);
  };

  // Quick stat counters
  const stats = {
    totalStudios: companies.length,
    openAuditions: companies.reduce((acc, c) => acc + c.auditions.length, 0),
    hiringNow: companies.reduce((acc, c) => acc + c.jobs.length, 0),
    internships: companies.reduce((acc, c) => acc + c.internships.length, 0),
  };

  // Filter and Search Logic
  const filteredCompanies = companies.filter(company => {
    // Directory Tab Filter
    if (activeTab === "created" && company.userId !== user?.id) {
      return false;
    }
    if (activeTab === "saved" && !savedIds.includes(company.id)) {
      return false;
    }

    // Search Bar matching
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          company.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          company.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    // Dropdown Filters
    const matchesCategory = selectedCategory === "all" || company.category === selectedCategory;
    const matchesCity = selectedCity === "all" || company.city === selectedCity;
    const matchesState = selectedState === "all" || company.state === selectedState;
    const matchesLanguage = selectedLanguage === "all" || company.languages.includes(selectedLanguage);

    // Switches & Badges
    const matchesVerified = !filterVerified || company.verified;
    const matchesHiring = !filterHiring || company.jobs.length > 0 || company.hiringNow;
    const matchesAuditions = !filterAuditions || company.auditions.length > 0 || company.openAuditions;
    const matchesInternships = !filterInternships || company.internships.length > 0 || company.internshipsAvailable;
    const matchesFreshers = !filterFreshers || company.acceptingFreshers;

    // Rating
    const matchesRating = minRating === "all" || company.rating >= parseFloat(minRating);

    // Company Size Filter
    let matchesSize = true;
    if (companySize !== "all") {
      if (companySize === "small") matchesSize = company.employeeCount < 20;
      else if (companySize === "medium") matchesSize = company.employeeCount >= 20 && company.employeeCount < 100;
      else if (companySize === "large") matchesSize = company.employeeCount >= 100;
    }

    const matchesCollab = !filterCollab || company.openForCollaboration;
    const matchesRecentlyJoined = !filterRecentlyJoined || company.recentlyAdded;

    let matchesYears = true;
    if (yearsInIndustry !== "all") {
      const currentYear = new Date().getFullYear();
      const years = currentYear - company.establishedYear;
      if (yearsInIndustry === "0-5") matchesYears = years <= 5;
      else if (yearsInIndustry === "5-10") matchesYears = years > 5 && years <= 10;
      else if (yearsInIndustry === "10+") matchesYears = years > 10;
    }

    return matchesSearch && matchesCategory && matchesCity && matchesState && matchesLanguage && 
           matchesVerified && matchesHiring && matchesAuditions && matchesInternships && matchesFreshers && 
           matchesRating && matchesSize && matchesCollab && matchesRecentlyJoined && matchesYears;
  });

  // Action: Reset Filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCity("all");
    setSelectedState("all");
    setSelectedLanguage("all");
    setFilterVerified(false);
    setFilterHiring(false);
    setFilterAuditions(false);
    setFilterInternships(false);
    setFilterFreshers(false);
    setMinRating("all");
    setCompanySize("all");
    toast({
      title: "Filters cleared",
      description: "Showing all registered companies.",
    });
  };

  // Action: Follow / Unfollow
  const handleFollow = (companyId: string) => {
    if (followedIds.includes(companyId)) {
      setFollowedIds(prev => prev.filter(id => id !== companyId));
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, followersCount: Math.max(0, c.followersCount - 1) } : c));
      toast({
        title: "Unfollowed",
        description: "You stopped following this company.",
      });
    } else {
      setFollowedIds(prev => [...prev, companyId]);
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, followersCount: c.followersCount + 1 } : c));
      toast({
        title: "Following",
        description: "You are now following this company for future updates!",
      });
    }
  };

  // Action: Save / Unsave
  const handleSave = (companyId: string) => {
    if (savedIds.includes(companyId)) {
      setSavedIds(prev => prev.filter(id => id !== companyId));
      toast({
        title: "Removed",
        description: "Removed company from your saved list.",
      });
    } else {
      setSavedIds(prev => [...prev, companyId]);
      toast({
        title: "Saved",
        description: "Added company to your saved folder.",
      });
    }
  };

  // Action: Share
  const handleShare = (company: Company) => {
    const url = `${window.location.origin}/studios?id=${company.id}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied!",
      description: `Share link for "${company.name}" copied to clipboard.`,
    });
  };

  // Action: Contact Submit
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      toast({
        title: "Error",
        description: "Please fill out all contact fields.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Message Sent",
      description: `Your message has been dispatched to ${contactCompany?.name}. They will respond to you shortly!`,
    });
    setIsContactOpen(false);
    setContactForm({ name: "", email: "", message: "" });
  };

  // Action: Leave Review
  const handleAddReview = (e: React.FormEvent, companyId: string) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      toast({
        title: "Error",
        description: "Please write a comment before submitting.",
        variant: "destructive"
      });
      return;
    }

    const newRev: Review = {
      id: "r_" + Date.now(),
      author: user?.email ? user.email.split("@")[0] : "Anonymous Guest",
      rating: reviewRating,
      comment: reviewComment,
      date: new Date().toISOString().split("T")[0]
    };

    setCompanies(prev => prev.map(c => {
      if (c.id === companyId) {
        const updatedReviews = [newRev, ...c.reviews];
        const avgRating = parseFloat((updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1));
        return {
          ...c,
          reviews: updatedReviews,
          reviewsCount: updatedReviews.length,
          rating: avgRating
        };
      }
      return c;
    }));

    toast({
      title: "Review Posted!",
      description: "Thank you for sharing your feedback.",
    });

    setReviewComment("");
    setReviewRating(5);
  };

  // Action: Apply Open Opportunity
  const handleOpenApply = (target: { id: string; title: string; type: "job" | "audition" | "internship"; companyId: string; companyName: string }) => {
    setApplicationTarget(target);
    setAppForm({
      name: "",
      email: user?.email || "",
      phone: "",
      experience: "",
      coverLetter: "",
      resumeUrl: "",
      demoReelUrl: ""
    });
    setIsApplicationOpen(true);
  };

  const handleApplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appForm.name || !appForm.email || !appForm.phone || !appForm.experience || !appForm.coverLetter) {
      toast({
        title: "Incomplete Fields",
        description: "Please fill in all required fields to submit your application.",
        variant: "destructive"
      });
      return;
    }

    if (!applicationTarget) return;

    const newApp: Application = {
      id: "app_" + Date.now(),
      opportunityId: applicationTarget.id,
      opportunityTitle: applicationTarget.title,
      type: applicationTarget.type,
      companyId: applicationTarget.companyId,
      companyName: applicationTarget.companyName,
      applicantName: appForm.name,
      applicantEmail: appForm.email,
      applicantPhone: appForm.phone,
      experienceYears: appForm.experience,
      coverLetter: appForm.coverLetter,
      resumeUrl: appForm.resumeUrl,
      demoReelUrl: appForm.demoReelUrl,
      status: "Pending",
      date: new Date().toISOString().split("T")[0]
    };

    setApplications(prev => [newApp, ...prev]);
    setIsApplicationOpen(false);

    toast({
      title: "Application Submitted Successfully!",
      description: `Your application for "${applicationTarget.title}" was delivered to ${applicationTarget.companyName}.`,
    });
  };

  // Action: Register Company
  const handleRegisterCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regForm.name || !regForm.description || !regForm.email || !regForm.phone || !regForm.address) {
      toast({
        title: "Required Fields Missing",
        description: "Please provide Company Name, Description, Contact details, and Address.",
        variant: "destructive"
      });
      return;
    }

    const brandNewCompany: Company = {
      id: "company_" + Date.now(),
      name: regForm.name,
      logo: regForm.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 3),
      coverImage: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80",
      category: regForm.category,
      description: regForm.description,
      establishedYear: parseInt(regForm.establishedYear) || new Date().getFullYear(),
      founder: regForm.founder || "Not Specified",
      services: regForm.servicesSelected.length > 0 ? regForm.servicesSelected : ["Film Production"],
      languages: [],
      email: regForm.email,
      phone: regForm.phone,
      website: regForm.website || "https://www.filmcollab.com",
      socials: {
        facebook: regForm.facebook,
        instagram: regForm.instagram,
        twitter: regForm.twitter,
        linkedin: regForm.linkedin
      },
      address: regForm.address + (regForm.zipCode ? `, ${regForm.zipCode}` : ""),
      city: regForm.city,
      state: regForm.state,
      country: "India",
      gstNumber: regForm.gstNumber,
      mapsLocation: regForm.mapsLocation,
      workingHours: `${regForm.officeOpenTime} - ${regForm.officeCloseTime}`,
      verified: false,
      hiringNow: false,
      openAuditions: false,
      internshipsAvailable: false,
      acceptingFreshers: true,
      employeeCount: 1,
      projectsCompleted: 0,
      followersCount: 0,
      rating: 5.0,
      reviewsCount: 0,
      featured: false,
      trending: false,
      recentlyAdded: true,
      gallery: [],
      projects: [],
      team: [],
      reviews: [],
      jobs: [],
      auditions: [],
      internships: [],
      userId: user?.id
    };

    setCompanies(prev => [brandNewCompany, ...prev]);
    setIsRegisterOpen(false);
    toast({
      title: "Company Registered!",
      description: `Welcome to the directory, ${regForm.name}! You can now manage opportunities from your workspace.`,
    });
  };

  // Action: Workspace Addition Actions
  const handlePostWorkspaceItem = () => {
    if (!userCompany) return;

    if (postType === "job") {
      if (!newJob.position || !newJob.experience || !newJob.description) {
        toast({ title: "Incomplete Fields", description: "Position, experience, and description are required.", variant: "destructive" });
        return;
      }
      const item: JobPosting = {
        id: "job_" + Date.now(),
        companyId: userCompany.id,
        companyName: userCompany.name,
        ...newJob
      };
      setCompanies(prev => prev.map(c => c.id === userCompany.id ? { ...c, jobs: [item, ...c.jobs], hiringNow: true } : c));
      setNewJob({ position: "", experience: "", location: "", salary: "", description: "" });
      toast({ title: "Job Posted!", description: "Dynamic Job listing added to your studio profile." });
    } 
    
    else if (postType === "audition") {
      if (!newAudition.role || !newAudition.ageRange || !newAudition.description) {
        toast({ title: "Incomplete Fields", description: "Role, age, and description are required.", variant: "destructive" });
        return;
      }
      const item: AuditionPosting = {
        id: "aud_" + Date.now(),
        companyId: userCompany.id,
        companyName: userCompany.name,
        ...newAudition
      };
      setCompanies(prev => prev.map(c => c.id === userCompany.id ? { ...c, auditions: [item, ...c.auditions], openAuditions: true } : c));
      setNewAudition({ role: "", ageRange: "", gender: "Any", language: "", location: "", description: "" });
      toast({ title: "Audition Posted!", description: "Active Audition Call published successfully." });
    } 
    
    else if (postType === "internship") {
      if (!newInternship.role || !newInternship.duration || !newInternship.description) {
        toast({ title: "Incomplete Fields", description: "Role, duration, and description are required.", variant: "destructive" });
        return;
      }
      const item: InternshipPosting = {
        id: "int_" + Date.now(),
        companyId: userCompany.id,
        companyName: userCompany.name,
        ...newInternship
      };
      setCompanies(prev => prev.map(c => c.id === userCompany.id ? { ...c, internships: [item, ...c.internships], internshipsAvailable: true } : c));
      setNewInternship({ role: "", duration: "", type: "Paid", location: "", description: "" });
      toast({ title: "Internship Posted!", description: "New Internship opening added to your studio profile." });
    } 
    
    else if (postType === "project") {
      if (!newProject.title || !newProject.year || !newProject.role) {
        toast({ title: "Incomplete", description: "Title, Year, and Role are required.", variant: "destructive" });
        return;
      }
      const item: Project = { id: "p_" + Date.now(), ...newProject };
      setCompanies(prev => prev.map(c => c.id === userCompany.id ? { ...c, projects: [item, ...c.projects], projectsCompleted: c.projectsCompleted + 1 } : c));
      setNewProject({ title: "", year: "", role: "", description: "" });
      toast({ title: "Project Added!", description: "Showcase project posted successfully." });
    } 
    
    else if (postType === "team") {
      if (!newTeam.name || !newTeam.role) {
        toast({ title: "Incomplete", description: "Name and Role are required.", variant: "destructive" });
        return;
      }
      const item: TeamMember = { id: "t_" + Date.now(), ...newTeam };
      setCompanies(prev => prev.map(c => c.id === userCompany.id ? { ...c, team: [...c.team, item], employeeCount: c.employeeCount + 1 } : c));
      setNewTeam({ name: "", role: "" });
      toast({ title: "Team Member Added!", description: "Team lineup updated." });
    } 
    
    else if (postType === "gallery") {
      if (!newGalleryUrl.trim()) return;
      setCompanies(prev => prev.map(c => c.id === userCompany.id ? { ...c, gallery: [...c.gallery, newGalleryUrl] } : c));
      setNewGalleryUrl("");
      toast({ title: "Media Added!", description: "Image added to your studio gallery." });
    }
  };

  // Direct-Edit actions for studio detail page (owner)
  const handleOpenEditAbout = () => {
    if (!viewingCompany) return;
    setEditAboutForm({
      name: viewingCompany.name || "",
      category: viewingCompany.category || "",
      description: viewingCompany.description || "",
      founder: viewingCompany.founder || "",
      establishedYear: viewingCompany.establishedYear?.toString() || "",
      email: viewingCompany.email || "",
      phone: viewingCompany.phone || "",
      address: viewingCompany.address || "",
      website: viewingCompany.website || "",
      mapsLocation: viewingCompany.mapsLocation || "",
      workingHours: viewingCompany.workingHours || "",
      city: viewingCompany.city || "",
      state: viewingCompany.state || "",
      country: viewingCompany.country || "India",
      gstNumber: viewingCompany.gstNumber || "",
      services: viewingCompany.services || []
    });
    setNewCrewMember({ name: "", role: "" });
    setIsEditAboutOpen(true);
  };

  const handleSaveAbout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCompany) return;
    const updated = {
      ...viewingCompany,
      name: editAboutForm.name,
      category: editAboutForm.category,
      description: editAboutForm.description,
      founder: editAboutForm.founder,
      establishedYear: parseInt(editAboutForm.establishedYear) || viewingCompany.establishedYear,
      email: editAboutForm.email,
      phone: editAboutForm.phone,
      address: editAboutForm.address,
      website: editAboutForm.website,
      mapsLocation: editAboutForm.mapsLocation,
      workingHours: editAboutForm.workingHours,
      city: editAboutForm.city,
      state: editAboutForm.state,
      country: editAboutForm.country,
      gstNumber: editAboutForm.gstNumber,
      services: editAboutForm.services
    };
    updateViewingCompany(updated);
    setIsEditAboutOpen(false);
    toast({ title: "Studio Details updated!", description: "Studio details have been updated successfully." });
  };

  const handleAddCrewMember = () => {
    if (!viewingCompany) return;
    if (!newCrewMember.name || !newCrewMember.role) {
      toast({ title: "Fields required", description: "Crew name and role are required.", variant: "destructive" });
      return;
    }
    const newMember = {
      id: "crew_" + Date.now(),
      name: newCrewMember.name,
      role: newCrewMember.role
    };
    const updated = {
      ...viewingCompany,
      team: [...viewingCompany.team, newMember],
      employeeCount: viewingCompany.employeeCount + 1
    };
    updateViewingCompany(updated);
    setNewCrewMember({ name: "", role: "" });
    toast({ title: "Crew member added!", description: `${newMember.name} is now added to the core crew.` });
  };

  const handleDeleteCrewMember = (memberId: string) => {
    if (!viewingCompany) return;
    const updated = {
      ...viewingCompany,
      team: viewingCompany.team.filter(m => m.id !== memberId),
      employeeCount: Math.max(1, viewingCompany.employeeCount - 1)
    };
    updateViewingCompany(updated);
    toast({ title: "Crew member removed!", description: "The crew member has been removed." });
  };

  const handleAddProjectDirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCompany) return;
    if (!newProjForm.title || !newProjForm.year || !newProjForm.role) {
      toast({ title: "Fields required", description: "Title, year, and role are required.", variant: "destructive" });
      return;
    }

    if (editingProjectId) {
      const updatedProjects = viewingCompany.projects.map(p => {
        if (p.id === editingProjectId) {
          return {
            ...p,
            title: newProjForm.title,
            year: newProjForm.year,
            role: newProjForm.role,
            description: newProjForm.description
          };
        }
        return p;
      });
      const updated = {
        ...viewingCompany,
        projects: updatedProjects
      };
      updateViewingCompany(updated);
      setNewProjForm({ title: "", year: "", role: "", description: "" });
      setEditingProjectId(null);
      setIsEditProjectsOpen(false);
      toast({ title: "Project updated!", description: `"${newProjForm.title}" has been updated.` });
    } else {
      const projItem = {
        id: "p_" + Date.now(),
        title: newProjForm.title,
        year: newProjForm.year,
        role: newProjForm.role,
        description: newProjForm.description
      };
      const updated = {
        ...viewingCompany,
        projects: [projItem, ...viewingCompany.projects],
        projectsCompleted: viewingCompany.projectsCompleted + 1
      };
      updateViewingCompany(updated);
      setNewProjForm({ title: "", year: "", role: "", description: "" });
      toast({ title: "Project added!", description: `"${projItem.title}" has been added to your catalog.` });
    }
  };

  const handleEditProject = (proj: Project) => {
    setNewProjForm({
      title: proj.title,
      year: proj.year,
      role: proj.role,
      description: proj.description || ""
    });
    setEditingProjectId(proj.id);
    setIsEditProjectsOpen(true);
  };

  const handleViewProjectDetails = (proj: Project) => {
    setSelectedProjectForView(proj);
    setIsViewProjectDetailsOpen(true);
  };

  const handleDeleteProjectDirect = (projId: string) => {
    if (!viewingCompany) return;
    const updated = {
      ...viewingCompany,
      projects: viewingCompany.projects.filter(p => p.id !== projId),
      projectsCompleted: Math.max(0, viewingCompany.projectsCompleted - 1)
    };
    updateViewingCompany(updated);
    toast({ title: "Project removed!", description: "The project has been deleted from your catalog." });
  };

  const handleDeleteOppDirect = (type: "job" | "audition" | "internship", itemId: string) => {
    if (!viewingCompany) return;
    const updated = { ...viewingCompany };
    if (type === "job") {
      updated.jobs = updated.jobs.filter(j => j.id !== itemId);
      updated.hiringNow = updated.jobs.length > 0;
    } else if (type === "audition") {
      updated.auditions = updated.auditions.filter(a => a.id !== itemId);
      updated.openAuditions = updated.auditions.length > 0;
    } else if (type === "internship") {
      updated.internships = updated.internships.filter(i => i.id !== itemId);
      updated.internshipsAvailable = updated.internships.length > 0;
    }
    updateViewingCompany(updated);
    toast({ title: "Opportunity removed!", description: "The listing has been successfully deleted." });
  };

  const handleAddMediaUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCompany) return;
    if (!mediaUrlInput.trim()) {
      toast({ title: "URL required", description: "Please enter a valid image URL.", variant: "destructive" });
      return;
    }
    const updated = {
      ...viewingCompany,
      gallery: [...viewingCompany.gallery, mediaUrlInput.trim()]
    };
    updateViewingCompany(updated);
    setMediaUrlInput("");
    setIsUploadMediaOpen(false);
    toast({ title: "Media uploaded!", description: "New image added to your media gallery." });
  };

  const handleDeleteMediaDirect = (indexToDelete: number) => {
    if (!viewingCompany) return;
    const updated = {
      ...viewingCompany,
      gallery: viewingCompany.gallery.filter((_, idx) => idx !== indexToDelete)
    };
    updateViewingCompany(updated);
    toast({ title: "Media removed!", description: "Image deleted from gallery." });
  };

  const handlePostJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCompany) return;
    if (!jobForm.position || !jobForm.experience || !jobForm.description) {
      toast({ title: "Incomplete Fields", description: "Position, experience, and description are required.", variant: "destructive" });
      return;
    }

    if (editingJobId) {
      const updatedJobs = (viewingCompany.jobs || []).map(job => {
        if (job.id === editingJobId) {
          return {
            ...job,
            position: jobForm.position,
            experience: jobForm.experience,
            location: jobForm.location || viewingCompany.city,
            salary: jobForm.salary,
            description: jobForm.description
          };
        }
        return job;
      });
      const updated = {
        ...viewingCompany,
        jobs: updatedJobs
      };
      updateViewingCompany(updated);
      setJobForm({ position: "", experience: "", location: "", salary: "", description: "" });
      setEditingJobId(null);
      setIsPostJobDialogOpen(false);
      toast({ title: "Job Updated!", description: `"${jobForm.position}" updated successfully.` });
    } else {
      const item: JobPosting = {
        id: "job_" + Date.now(),
        companyId: viewingCompany.id,
        companyName: viewingCompany.name,
        position: jobForm.position,
        experience: jobForm.experience,
        location: jobForm.location || viewingCompany.city,
        salary: jobForm.salary,
        description: jobForm.description
      };
      const updated = {
        ...viewingCompany,
        jobs: [item, ...(viewingCompany.jobs || [])],
        hiringNow: true
      };
      updateViewingCompany(updated);
      setJobForm({ position: "", experience: "", location: "", salary: "", description: "" });
      setIsPostJobDialogOpen(false);
      toast({ title: "Job Posted!", description: `"${item.position}" added successfully.` });
    }
  };

  const handleEditJob = (job: JobPosting) => {
    setJobForm({
      position: job.position,
      experience: job.experience,
      location: job.location || "",
      salary: job.salary || "",
      description: job.description
    });
    setEditingJobId(job.id);
    setIsPostJobDialogOpen(true);
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCompany) return;
    if (!eventForm.title || !eventForm.description || !eventForm.date || !eventForm.location) {
      toast({ title: "Incomplete Fields", description: "Title, description, date, and location are required.", variant: "destructive" });
      return;
    }

    if (editingEventId) {
      const updatedEvents = (viewingCompany.events || []).map(evt => {
        if (evt.id === editingEventId) {
          return {
            ...evt,
            title: eventForm.title,
            description: eventForm.description,
            date: eventForm.date,
            location: eventForm.location,
            isOnline: eventForm.isOnline,
            price: eventForm.price || "Free"
          };
        }
        return evt;
      });
      const updated = {
        ...viewingCompany,
        events: updatedEvents
      };
      updateViewingCompany(updated);
      setEventForm({ title: "", description: "", date: "", location: "", isOnline: false, price: "" });
      setEditingEventId(null);
      setIsCreateEventDialogOpen(false);
      toast({ title: "Event Updated!", description: `"${eventForm.title}" updated successfully.` });
    } else {
      const item = {
        id: "evt_" + Date.now(),
        companyId: viewingCompany.id,
        companyName: viewingCompany.name,
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date,
        location: eventForm.location,
        isOnline: eventForm.isOnline,
        attendees: 0,
        price: eventForm.price || "Free"
      };
      const updated = {
        ...viewingCompany,
        events: [item, ...(viewingCompany.events || [])]
      };
      updateViewingCompany(updated);
      setEventForm({ title: "", description: "", date: "", location: "", isOnline: false, price: "" });
      setIsCreateEventDialogOpen(false);
      toast({ title: "Event Created!", description: `"${item.title}" added successfully.` });
    }
  };

  const handleEditEvent = (event: any) => {
    setEventForm({
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      isOnline: event.isOnline || false,
      price: event.price || ""
    });
    setEditingEventId(event.id);
    setIsCreateEventDialogOpen(true);
  };

  const handleDeleteEventDirect = (eventId: string) => {
    if (!viewingCompany) return;
    const updated = {
      ...viewingCompany,
      events: (viewingCompany.events || []).filter(e => e.id !== eventId)
    };
    updateViewingCompany(updated);
    toast({ title: "Event removed!", description: "The event has been successfully deleted." });
  };

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCompany) return;
    if (!courseForm.title || !courseForm.description || !courseForm.duration || !courseForm.instructor) {
      toast({ title: "Incomplete Fields", description: "Title, description, duration, and instructor are required.", variant: "destructive" });
      return;
    }

    if (editingCourseId) {
      const updatedCourses = (viewingCompany.courses || []).map(crs => {
        if (crs.id === editingCourseId) {
          return {
            ...crs,
            title: courseForm.title,
            description: courseForm.description,
            duration: courseForm.duration,
            instructor: courseForm.instructor,
            price: courseForm.price || "Free",
            level: courseForm.level,
            category: courseForm.category
          };
        }
        return crs;
      });
      const updated = {
        ...viewingCompany,
        courses: updatedCourses
      };
      updateViewingCompany(updated);
      setCourseForm({ title: "", description: "", duration: "", instructor: "", price: "", level: "Beginner", category: "Cinematography" });
      setEditingCourseId(null);
      setIsCreateCourseDialogOpen(false);
      toast({ title: "Course Updated!", description: `"${courseForm.title}" updated successfully.` });
    } else {
      const item = {
        id: "crs_" + Date.now(),
        companyId: viewingCompany.id,
        companyName: viewingCompany.name,
        title: courseForm.title,
        description: courseForm.description,
        duration: courseForm.duration,
        instructor: courseForm.instructor,
        price: courseForm.price || "Free",
        enrolled: 0,
        level: courseForm.level,
        category: courseForm.category
      };
      const updated = {
        ...viewingCompany,
        courses: [item, ...(viewingCompany.courses || [])]
      };
      updateViewingCompany(updated);
      setCourseForm({ title: "", description: "", duration: "", instructor: "", price: "", level: "Beginner", category: "Cinematography" });
      setIsCreateCourseDialogOpen(false);
      toast({ title: "Course Created!", description: `"${item.title}" added successfully.` });
    }
  };

  const handleEditCourse = (course: any) => {
    setCourseForm({
      title: course.title,
      description: course.description,
      duration: course.duration,
      instructor: course.instructor,
      price: course.price || "",
      level: course.level || "Beginner",
      category: course.category || "Cinematography"
    });
    setEditingCourseId(course.id);
    setIsCreateCourseDialogOpen(true);
  };

  const handleDeleteCourseDirect = (courseId: string) => {
    if (!viewingCompany) return;
    const updated = {
      ...viewingCompany,
      courses: (viewingCompany.courses || []).filter(c => c.id !== courseId)
    };
    updateViewingCompany(updated);
    toast({ title: "Course removed!", description: "The course has been successfully deleted." });
  };

  const handleUpdateLogo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewingCompany || !logoInput.trim()) return;
    const updated = {
      ...viewingCompany,
      logo: logoInput.trim()
    };
    updateViewingCompany(updated);
    setIsEditLogoOpen(false);
    toast({ title: "Logo Updated", description: "Your studio logo/emoji has been updated." });
  };

  // Action: Workspace Application Status update
  const handleUpdateAppStatus = (appId: string, nextStatus: "Reviewed" | "Shortlisted" | "Rejected") => {
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: nextStatus } : a));
    toast({
      title: "Status Updated",
      description: `Applicant has been successfully marked as: ${nextStatus}.`,
    });
  };

  // Action: Workspace Verify Company
  const handleVerifyCompanyWorkspace = () => {
    if (!userCompany) return;
    setCompanies(prev => prev.map(c => c.id === userCompany.id ? { ...c, verified: true } : c));
    toast({
      title: "Studio Verified!",
      description: "Congratulations! Your upload documents have been verified. Standard verification badge applied.",
    });
  };

  // Sort Logic
  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    if (sortBy === "recommended") return b.rating - a.rating;
    if (sortBy === "popular") return b.reviewsCount - a.reviewsCount;
    if (sortBy === "highest_rated") return b.rating - a.rating;
    if (sortBy === "recently_added") return b.establishedYear - a.establishedYear;
    if (sortBy === "most_projects") return b.projectsCompleted - a.projectsCompleted;
    if (sortBy === "most_followers") return b.followersCount - a.followersCount;
    if (sortBy === "alphabetical") return a.name.localeCompare(b.name);
    return 0;
  });

  const allHiringPosts = sortedCompanies.flatMap(c => c.jobs);
  const allAuditionPosts = sortedCompanies.flatMap(c => c.auditions);
  const allInternshipPosts = sortedCompanies.flatMap(c => c.internships);

  return (
    <AppLayout pageTitle="Companies Directory">
      <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-in fade-in duration-300">
        
        {/* VIEWING PROFILE OVERLAY (FULL SCREEN CARD SWITCHER) */}
        {viewingCompany ? (
          <div className="space-y-6">
            {/* Back Header */}
            <Button
              variant="ghost"
              className="flex items-center gap-2 pl-0 text-muted-foreground hover:text-primary hover:bg-transparent -ml-2"
              onClick={() => {
                setViewingCompany(null);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Directory</span>
            </Button>

            {/* Profile Frame */}
            <div className="bg-card text-card-foreground rounded-2xl border border-border/80 shadow-noir overflow-hidden">
              {/* Cover Banner */}
              <div className="h-48 md:h-64 w-full relative bg-surface-elevated">
                <img
                  src={viewingCompany.coverImage}
                  alt={viewingCompany.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                {isOwner && (
                  <button
                    onClick={() => setIsEditBannerOpen(true)}
                    className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all duration-200 backdrop-blur-sm shadow-md z-10"
                    title="Edit Cover Banner"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                )}
                
                {/* Logo & Headline */}
                <div className="absolute bottom-6 left-6 md:left-10 flex flex-col md:flex-row items-start md:items-end gap-4 md:gap-6 text-white w-[calc(100%-48px)]">
                  <div className="relative group">
                    <div className="h-20 w-20 md:h-24 md:w-24 rounded-2xl bg-primary text-primary-foreground border-4 border-card flex items-center justify-center font-display font-bold text-2xl shadow-md overflow-hidden">
                      {viewingCompany.logo ? (viewingCompany.logo.length <= 4 ? viewingCompany.logo : <img src={viewingCompany.logo} alt={viewingCompany.name} className="w-full h-full object-cover" />) : <Building2 className="h-5 w-5" />}
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => setIsEditLogoOpen(true)}
                        className="absolute inset-0 bg-black/40 hover:bg-black/60 text-white rounded-2xl transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 border-4 border-transparent"
                        title="Edit Logo"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-primary text-primary-foreground border-none font-semibold">{viewingCompany.category}</Badge>
                      {viewingCompany.verified && (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          <span>Verified</span>
                        </Badge>
                      )}
                    </div>
                    <h1 className="text-2xl md:text-4xl font-display font-bold tracking-tight drop-shadow-sm">{viewingCompany.name}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm opacity-90">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span>{viewingCompany.city}, {viewingCompany.state}</span>
                      </div>
                      <div>•</div>
                      <div className="font-mono">Est. {viewingCompany.establishedYear}</div>
                      <div>•</div>
                      <div className="flex items-center gap-1 text-primary font-mono font-semibold">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span>{viewingCompany.rating} ({viewingCompany.reviewsCount} reviews)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Bar Control */}
              <div className="px-6 md:px-10 py-4 border-b border-border/80 flex flex-wrap justify-between items-center gap-4 bg-surface-elevated">
                <div className="flex items-center gap-6 text-sm font-mono text-muted-foreground">
                  <div><strong className="text-foreground font-bold">{viewingCompany.projectsCompleted}</strong> Projects</div>
                  <div><strong className="text-foreground font-bold">{viewingCompany.employeeCount}</strong> Crew</div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="outline"
                    className="border-border/80 bg-card text-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                    onClick={() => handleSave(viewingCompany.id)}
                  >
                    <Bookmark className={`h-4 w-4 ${savedIds.includes(viewingCompany.id) ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border/80 bg-card text-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                    onClick={() => {
                      setContactCompany(viewingCompany);
                      setIsContactOpen(true);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    <span>Contact</span>
                  </Button>
                  {isOwner && (
                    <Button variant="outline" className="border-border/80 bg-card text-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer" onClick={handleOpenEditAbout}>
                      <Edit className="h-4 w-4 mr-2" />
                      <span>Edit Studio</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-border/80 bg-card text-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                    onClick={() => handleShare(viewingCompany)}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Profile Details Area */}
              <div className="px-4 py-4 md:p-10">
                <Tabs value={activeViewTab} onValueChange={setActiveViewTab} className="space-y-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
                    {/* Desktop View */}
                    <TabsList className="bg-surface-elevated border border-border/80 p-1 rounded-xl hidden md:inline-flex flex-wrap h-auto gap-1">
                      <TabsTrigger value="about" className="rounded-lg text-xs font-semibold py-2 px-4 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">About & Crew</TabsTrigger>
                      <TabsTrigger value="projects" className="rounded-lg text-xs font-semibold py-2 px-4 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Projects</TabsTrigger>
                      <TabsTrigger value="media" className="rounded-lg text-xs font-semibold py-2 px-4 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Media</TabsTrigger>
                      <TabsTrigger value="jobs" className="rounded-lg text-xs font-semibold py-2 px-4 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Jobs</TabsTrigger>
                      <TabsTrigger value="events" className="rounded-lg text-xs font-semibold py-2 px-4 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Events</TabsTrigger>
                      <TabsTrigger value="courses" className="rounded-lg text-xs font-semibold py-2 px-4 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Courses</TabsTrigger>
                      <TabsTrigger value="reviews" className="rounded-lg text-xs font-semibold py-2 px-4 whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Reviews</TabsTrigger>
                    </TabsList>

                    {/* Mobile View */}
                    <div className="md:hidden w-full">
                      <Select value={activeViewTab} onValueChange={setActiveViewTab}>
                        <SelectTrigger className="w-full bg-surface-elevated border-border/80">
                          <SelectValue placeholder="Select tab" />
                        </SelectTrigger>
                        <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                          <SelectItem value="about">About & Crew</SelectItem>
                          <SelectItem value="projects">Projects</SelectItem>
                          <SelectItem value="media">Media</SelectItem>
                          <SelectItem value="jobs">Jobs</SelectItem>
                          <SelectItem value="events">Events</SelectItem>
                          <SelectItem value="courses">Courses</SelectItem>
                          <SelectItem value="reviews">Reviews</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isOwner && (
                      <div className="ml-auto flex gap-2 shrink-0">
                        {activeViewTab === "projects" && (
                          <Button variant="outline" size="sm" onClick={() => setIsEditProjectsOpen(true)} className="border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 h-9 gap-1.5 text-xs transition-colors cursor-pointer">
                            <Plus className="h-4 w-4 text-primary" />
                            <span>Manage Projects</span>
                          </Button>
                        )}
                        {activeViewTab === "media" && (
                          <Button variant="outline" size="sm" onClick={() => setIsUploadMediaOpen(true)} className="border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 h-9 gap-1.5 text-xs transition-colors cursor-pointer">
                            <Plus className="h-4 w-4 text-primary" />
                            <span>Upload Media</span>
                          </Button>
                        )}
                        {activeViewTab === "jobs" && (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/jobs?create=true&company_name=${encodeURIComponent(viewingCompany.name)}&company_id=${viewingCompany.id}`)} className="border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 h-9 gap-1.5 text-xs transition-colors cursor-pointer">
                            <Plus className="h-4 w-4 text-primary" />
                            <span>Post a New Job</span>
                          </Button>
                        )}
                        {activeViewTab === "events" && (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/industry-hub?create=events&company_id=${viewingCompany.id}`)} className="border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 h-9 gap-1.5 text-xs transition-colors cursor-pointer">
                            <Plus className="h-4 w-4 text-primary" />
                            <span>Create Event</span>
                          </Button>
                        )}
                        {activeViewTab === "courses" && (
                          <Button variant="outline" size="sm" onClick={() => navigate(`/industry-hub?create=courses&company_id=${viewingCompany.id}`)} className="border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 h-9 gap-1.5 text-xs transition-colors cursor-pointer">
                            <Plus className="h-4 w-4 text-primary" />
                            <span>Create Course</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ABOUT & CREW TAB */}
                  <TabsContent value="about" className="space-y-8 outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                        <div>
                          <h3 className="text-lg font-display font-bold text-foreground border-b border-border/60 pb-2 mb-3">About the Studio</h3>
                          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{viewingCompany.description}</p>
                        </div>

                        <div>
                          <h3 className="text-lg font-display font-bold text-foreground border-b border-border/60 pb-2 mb-3">Core Expertise</h3>
                          <div className="flex flex-wrap gap-2">
                            {viewingCompany.services.map(service => (
                              <Badge key={service} variant="secondary" className="bg-primary/15 text-primary border border-primary/30 text-sm px-3 py-1 font-medium">
                                {service}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Team members */}
                        <div>
                          <h3 className="text-lg font-display font-bold text-foreground border-b border-border/60 pb-2 mb-4">Core Team</h3>
                          {viewingCompany.team.length === 0 ? (
                            <p className="text-sm text-muted-foreground italic">No registered team members shown yet.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {viewingCompany.team.map(member => (
                                <div key={member.id} className="p-4 rounded-xl border border-border/80 bg-surface-elevated flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center font-bold text-primary">
                                    {member.name[0]}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-foreground text-sm">{member.name}</div>
                                    <div className="text-xs text-muted-foreground">{member.role}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Contact & Sidebar Details */}
                      <div className="bg-surface-elevated rounded-2xl p-6 border border-border/80 space-y-6">
                        <h4 className="font-display font-bold text-foreground text-base">Studio Details</h4>
                        
                        <div className="space-y-4 text-sm">
                          <div className="flex justify-between border-b pb-2 border-border/60">
                            <span className="text-muted-foreground">Founder</span>
                            <span className="font-semibold text-foreground/90">{viewingCompany.founder}</span>
                          </div>
                          <div className="flex justify-between border-b pb-2 border-border/60">
                            <span className="text-muted-foreground">Established</span>
                            <span className="font-mono font-semibold text-foreground/90">{viewingCompany.establishedYear}</span>
                          </div>
                          <div className="flex justify-between border-b pb-2 border-border/60">
                            <span className="text-muted-foreground">Working Hours</span>
                            <span className="font-mono font-semibold text-foreground/90 text-right">{viewingCompany.workingHours || "Not listed"}</span>
                          </div>
                          <div className="flex justify-between border-b pb-2 border-border/60">
                            <span className="text-muted-foreground">City & State</span>
                            <span className="font-semibold text-foreground/90">{viewingCompany.city}, {viewingCompany.state}</span>
                          </div>
                          <div className="flex justify-between border-b pb-2 border-border/60">
                            <span className="text-muted-foreground">Languages</span>
                            <span className="font-semibold text-foreground/90 text-right">{viewingCompany.languages.join(", ")}</span>
                          </div>
                        </div>

                        <div className="pt-2 space-y-3.5 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4 text-primary shrink-0" />
                            <a href={`mailto:${viewingCompany.email}`} className="hover:underline hover:text-primary truncate">{viewingCompany.email}</a>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4 text-primary shrink-0" />
                            <a href={`tel:${viewingCompany.phone}`} className="hover:underline hover:text-primary font-mono">{viewingCompany.phone}</a>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Globe className="h-4 w-4 text-primary shrink-0" />
                            <a href={viewingCompany.website} target="_blank" rel="noopener noreferrer" className="hover:underline hover:text-primary truncate flex items-center gap-1">
                              <span>Website</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <a 
                              href={viewingCompany.mapsLocation || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${viewingCompany.name} ${viewingCompany.address} ${viewingCompany.city}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs hover:underline hover:text-primary cursor-pointer"
                            >
                              {viewingCompany.address}, {viewingCompany.city}, {viewingCompany.country}
                            </a>
                          </div>
                        </div>

                        {/* Map Link */}
                        <a 
                          href={viewingCompany.mapsLocation || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${viewingCompany.name} ${viewingCompany.address} ${viewingCompany.city}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block h-36 rounded-xl overflow-hidden relative border border-border/80 hover:border-primary/40 transition cursor-pointer"
                        >
                          <div className="absolute inset-0 bg-card flex items-center justify-center flex-col text-center p-3">
                            <MapPin className="h-8 w-8 text-primary mb-1" />
                            <span className="text-[10px] font-mono font-bold text-foreground">CLICK TO VIEW ON GOOGLE MAPS</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-full">{viewingCompany.city}, {viewingCompany.state}</span>
                          </div>
                        </a>
                      </div>
                    </div>
                  </TabsContent>

                  {/* PROJECTS TAB */}
                  <TabsContent value="projects" className="space-y-8 outline-none">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4">
                        <h3 className="text-lg font-display font-bold text-foreground">Completed Projects & Catalog</h3>
                      </div>
                      {viewingCompany.projects.length === 0 ? (
                        <div className="p-8 text-center bg-surface-elevated rounded-xl border border-dashed border-border/80">
                          <Film className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No showcase projects registered yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {viewingCompany.projects.map(proj => (
                            <Card key={proj.id} className="border border-border/80 bg-surface-elevated overflow-hidden shadow-none hover:border-primary/40 transition-colors relative">
                              <CardHeader className="bg-card p-4 border-b border-border/60 flex flex-row items-start justify-between">
                                <div>
                                  <h4 
                                    className="font-display font-bold text-foreground pr-12 hover:text-primary hover:underline cursor-pointer transition-colors"
                                    onClick={() => handleViewProjectDetails(proj)}
                                  >
                                    {proj.title}
                                  </h4>
                                  <p className="text-xs text-muted-foreground font-medium">{proj.role}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge className="bg-primary/15 text-primary border border-primary/30 font-mono">{proj.year}</Badge>
                                  {isOwner && (
                                    <>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-surface-elevated p-0"
                                        onClick={() => handleEditProject(proj)}
                                        title="Edit Project"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 p-0"
                                        onClick={() => handleDeleteProjectDirect(proj.id)}
                                        title="Delete Project"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </CardHeader>
                              <CardContent className="p-4 text-sm text-muted-foreground">
                                {proj.description}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* MEDIA TAB */}
                  <TabsContent value="media" className="space-y-8 outline-none">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4">
                        <h3 className="text-lg font-display font-bold text-foreground">Studio Media Gallery</h3>
                      </div>
                      {viewingCompany.gallery.length === 0 ? (
                        <div className="p-8 text-center bg-surface-elevated rounded-xl border border-dashed border-border/80">
                          <Video className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No media gallery uploads available.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {viewingCompany.gallery.map((img, i) => (
                            <div key={i} className="aspect-video rounded-xl overflow-hidden bg-surface-elevated group relative border border-border/80 shadow-sm">
                              <img src={img} alt="Gallery item" className="w-full h-full object-cover transition duration-300 group-hover:scale-105" referrerPolicy="no-referrer" />
                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteMediaDirect(i)}
                                  className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                  title="Delete image"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* JOBS TAB */}
                  <TabsContent value="jobs" className="space-y-8 outline-none">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4">
                        <h3 className="text-lg font-display font-bold text-foreground">Open Job Positions</h3>
                      </div>
                      {(!viewingCompany.jobs || viewingCompany.jobs.length === 0) ? (
                        <div className="p-8 text-center bg-surface-elevated rounded-xl border border-dashed border-border/80">
                          <Briefcase className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No jobs posted yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewingCompany.jobs.map((job) => (
                            <Card key={job.id} className="border border-border/80 shadow-sm hover:border-primary/40 transition bg-surface-elevated text-card-foreground p-5 flex flex-col relative">
                              {isOwner && (
                                <div className="absolute top-3 right-3 flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/jobs?editJobId=${job.id}&company_id=${viewingCompany.id}&job_title=${encodeURIComponent(job.position)}&company_name=${encodeURIComponent(job.companyName)}&location=${encodeURIComponent(job.location)}&experience_level=${encodeURIComponent(job.experience)}&salary=${encodeURIComponent(job.salary || '')}&job_description=${encodeURIComponent(job.description)}`)}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteOppDirect("job", job.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              <h4 
                                className="font-display font-bold text-foreground text-lg mb-1 pr-16 hover:text-primary hover:underline cursor-pointer"
                                onClick={() => navigate(`/jobs?jobId=${job.id}`)}
                              >
                                {job.position}
                              </h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" /> {job.location}</span>
                                <span>•</span>
                                <span className="font-mono">Exp: {job.experience}</span>
                                {job.salary && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-primary font-mono">Salary: {job.salary}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-muted-foreground text-sm whitespace-pre-line line-clamp-4 flex-1">{job.description}</p>
                              {!isOwner && (
                                <div className="mt-4 pt-3 border-t border-border/60 flex justify-end">
                                  <Button className="bg-primary text-primary-foreground hover:bg-primary-hover text-xs h-8 font-semibold">
                                    Apply Now
                                  </Button>
                                </div>
                              )}
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* EVENTS TAB */}
                  <TabsContent value="events" className="space-y-8 outline-none">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4">
                        <h3 className="text-lg font-display font-bold text-foreground">Upcoming Events & Workshops</h3>
                      </div>
                      {(!viewingCompany.events || viewingCompany.events.length === 0) ? (
                        <div className="p-8 text-center bg-surface-elevated rounded-xl border border-dashed border-border/80">
                          <Calendar className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No events listed yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewingCompany.events.map((event) => (
                            <Card key={event.id} className="border border-border/80 shadow-sm hover:border-primary/40 transition bg-surface-elevated text-card-foreground p-5 flex flex-col relative">
                              {isOwner && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditEvent(event)}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteEventDirect(event.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mb-2 pr-16">
                                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                                  {event.isOnline ? "Online" : "In-Person"}
                                </Badge>
                                <span className="text-xs text-primary font-mono font-bold ml-auto">{event.price}</span>
                              </div>
                              <h4 
                                className="font-display font-bold text-foreground text-lg mb-1 hover:text-primary hover:underline cursor-pointer"
                                onClick={() => navigate(`/industry-hub?eventId=${event.id}`)}
                              >
                                {event.title}
                              </h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                                <span className="flex items-center gap-1 font-mono"><Calendar className="h-3 w-3 text-primary" /> {event.date}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-primary" /> {event.location}</span>
                              </div>
                              <p className="text-muted-foreground text-sm whitespace-pre-line line-clamp-4 flex-1">{event.description}</p>
                              <div className="mt-4 pt-3 border-t border-border/60 flex justify-between items-center">
                                <span className="text-xs font-mono text-muted-foreground">{event.attendees || 0} registered</span>
                                {!isOwner && (
                                  <Button className="bg-primary text-primary-foreground hover:bg-primary-hover text-xs h-8 font-semibold">
                                    Register Event
                                  </Button>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* COURSES TAB */}
                  <TabsContent value="courses" className="space-y-8 outline-none">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-4">
                        <h3 className="text-lg font-display font-bold text-foreground">Industry Courses</h3>
                      </div>
                      {(!viewingCompany.courses || viewingCompany.courses.length === 0) ? (
                        <div className="p-8 text-center bg-surface-elevated rounded-xl border border-dashed border-border/80">
                          <GraduationCap className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No courses published yet.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewingCompany.courses.map((course) => (
                            <Card key={course.id} className="border border-border/80 shadow-sm hover:border-primary/40 transition bg-surface-elevated text-card-foreground p-5 flex flex-col relative">
                              {isOwner && (
                                <div className="absolute top-3 right-3 flex items-center gap-1 z-10">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditCourse(course)}
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-card"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteCourseDirect(course.id)}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              <div className="flex items-center gap-2 mb-2 pr-16">
                                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                                  {course.category}
                                </Badge>
                                <Badge variant="outline" className="bg-card text-foreground border-border/80">{course.level}</Badge>
                                <span className="text-xs text-primary font-bold ml-auto font-mono">{course.price}</span>
                              </div>
                              <h4 
                                className="font-display font-bold text-foreground text-lg mb-1 hover:text-primary hover:underline cursor-pointer"
                                onClick={() => navigate(`/industry-hub?courseId=${course.id}`)}
                              >
                                {course.title}
                              </h4>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                                <span className="font-mono">Duration: {course.duration}</span>
                                <span>•</span>
                                <span>Instructor: {course.instructor}</span>
                              </div>
                              <p className="text-muted-foreground text-sm whitespace-pre-line line-clamp-4 flex-1">{course.description}</p>
                              <div className="mt-4 pt-3 border-t border-border/60 flex justify-between items-center">
                                <span className="text-xs font-mono text-muted-foreground">{course.enrolled || 0} enrolled</span>
                                {!isOwner && (
                                  <Button className="bg-primary text-primary-foreground hover:bg-primary-hover text-xs h-8 font-semibold">
                                    Enroll Now
                                  </Button>
                                )}
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* REVIEWS TAB */}
                  <TabsContent value="reviews" className="space-y-8 outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Left: Leave Review */}
                      <div className="space-y-4 bg-surface-elevated p-6 rounded-2xl border border-border/80">
                        <h4 className="font-display font-bold text-foreground">Add Feedback / Review</h4>
                        <form onSubmit={(e) => handleAddReview(e, viewingCompany.id)} className="space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Rating Scale</label>
                            <Select value={reviewRating.toString()} onValueChange={(val) => setReviewRating(parseInt(val))}>
                              <SelectTrigger className="w-full bg-card text-card-foreground border-border/80">
                                <SelectValue placeholder="Select star rating" />
                              </SelectTrigger>
                              <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                                <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent (5/5)</SelectItem>
                                <SelectItem value="4">⭐⭐⭐⭐ Good (4/5)</SelectItem>
                                <SelectItem value="3">⭐⭐⭐ Satisfactory (3/5)</SelectItem>
                                <SelectItem value="2">⭐⭐ Fair (2/5)</SelectItem>
                                <SelectItem value="1">⭐ Poor (1/5)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground">Your Comment</label>
                            <Textarea
                              placeholder="Write a clear recommendation or describe your experience collaborating with this studio..."
                              className="bg-card text-card-foreground border-border/80 min-h-24 text-sm"
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                            />
                          </div>

                          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-semibold">
                            Submit Review
                          </Button>
                        </form>
                      </div>

                      {/* Right: Reviews List */}
                      <div className="lg:col-span-2 space-y-4">
                        <h4 className="font-display font-bold text-foreground text-base">User Recommendations</h4>
                        
                        {viewingCompany.reviews.length === 0 ? (
                          <div className="p-8 text-center bg-surface-elevated border border-dashed border-border/80 rounded-xl">
                            <Star className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No recommendations posted yet. Be the first!</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {viewingCompany.reviews.map(rev => (
                              <div key={rev.id} className="p-4 rounded-xl border border-border/80 bg-surface-elevated space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                                      {rev.author[0].toUpperCase()}
                                    </div>
                                    <span className="font-semibold text-sm text-foreground/90">{rev.author}</span>
                                  </div>
                                  <span className="text-xs font-mono text-muted-foreground">{rev.date}</span>
                                </div>
                                <div className="flex gap-0.5 text-xs text-primary">
                                  {Array.from({ length: 5 }).map((_, idx) => (
                                    <Star key={idx} className={`h-3 w-3 ${idx < rev.rating ? "fill-current" : "opacity-20"}`} />
                                  ))}
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">{rev.comment}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        ) : (
          // DIRECTORY PORTAL MAIN LIST VIEW
          <div className="space-y-8">
            {isManageWorkspace ? (
              // WORKSPACE/MANAGEMENT VIEW
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 border-border/60">
                  <div className="space-y-1">
                    <p className="noir-eyebrow">Studio Operations</p>
                    <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                      <Building2 className="h-6 w-6 text-primary" />
                      <span>My Studio Workspace</span>
                    </h2>
                    <p className="text-sm text-muted-foreground">Manage your business profile, open listings, and direct submissions.</p>
                  </div>
                  <Button variant="outline" className="border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 h-10" onClick={() => setIsManageWorkspace(false)}>
                    <ArrowLeft className="h-4 w-4 mr-1.5" />
                    <span>Back to Directory</span>
                  </Button>
                </div>

                {!userCompany ? (
                  <Card className="p-8 text-center max-w-xl mx-auto space-y-4 border-border/80 bg-card shadow-noir">
                    <Building2 className="h-12 w-12 text-primary mx-auto" />
                    <div className="space-y-1">
                      <h3 className="text-xl font-display font-bold text-foreground">My Studio Workspace</h3>
                      <p className="text-sm text-muted-foreground">Do you own a casting house, production agency, film academy, camera supplier, or vfx setup?</p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      Register your business profile to showcase works, post audition calls, accept internships, manage followers, and view direct talent applications inside a unified dashboard!
                    </p>
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
                      onClick={() => setIsRegisterOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Create Company Profile Now</span>
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Workspace Owner Profile & Actions */}
                    <div className="space-y-6">
                      <Card className="border border-border/80 bg-card overflow-hidden shadow-noir">
                        <div className="h-24 bg-gradient-to-tr from-primary/30 via-primary/15 to-surface-elevated p-4 text-foreground relative border-b border-border/60">
                          <Badge className="absolute top-3 right-3 bg-primary/15 text-primary border border-primary/30 font-mono font-bold text-[10px] uppercase">Owner Workspace</Badge>
                        </div>
                        <CardContent className="p-5 relative pt-10">
                          <div className="absolute -top-10 left-5 h-16 w-16 bg-primary text-primary-foreground border-4 border-card rounded-xl flex items-center justify-center font-display font-bold text-lg shadow-sm overflow-hidden">
                            {userCompany.logo ? (userCompany.logo.length <= 4 ? userCompany.logo : <img src={userCompany.logo} alt={userCompany.name} className="w-full h-full object-cover" />) : <Building2 className="h-5 w-5" />}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <h3 className="font-display font-bold text-foreground text-lg">{userCompany.name}</h3>
                              {userCompany.verified ? (
                                <CheckCircle className="h-4 w-4 text-emerald-400 fill-current" />
                              ) : (
                                <Badge className="bg-surface-elevated text-muted-foreground border border-border/80 text-[10px]">Unverified</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{userCompany.category} • {userCompany.city}</p>
                            <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">{userCompany.description}</p>
                          </div>

                          {!userCompany.verified && (
                            <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg space-y-2">
                              <p className="text-[11px] text-foreground/90 leading-relaxed font-medium">Verify your studio to acquire a verified badge and gain priority placement in search outcomes.</p>
                              <Button size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary-hover text-xs h-8 font-semibold" onClick={handleVerifyCompanyWorkspace}>
                                Verify Studio Now
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Interactive Post Item Builder Form */}
                      <Card className="border border-border/80 bg-card shadow-noir p-5 space-y-4">
                        <h4 className="font-display font-bold text-foreground text-sm">Post Opportunities / Showcase Works</h4>
                        
                        <div className="grid grid-cols-3 gap-1 p-1 bg-surface-elevated border border-border/80 rounded-lg text-[11px] font-medium text-center text-muted-foreground">
                          <span className={`p-1.5 cursor-pointer rounded-md ${postType === "job" ? "bg-primary text-primary-foreground font-bold shadow-sm" : "hover:text-foreground"}`} onClick={() => setPostType("job")}>Job</span>
                          <span className={`p-1.5 cursor-pointer rounded-md ${postType === "audition" ? "bg-primary text-primary-foreground font-bold shadow-sm" : "hover:text-foreground"}`} onClick={() => setPostType("audition")}>Audition</span>
                          <span className={`p-1.5 cursor-pointer rounded-md ${postType === "internship" ? "bg-primary text-primary-foreground font-bold shadow-sm" : "hover:text-foreground"}`} onClick={() => setPostType("internship")}>Intern</span>
                          <span className={`p-1.5 cursor-pointer rounded-md ${postType === "project" ? "bg-primary text-primary-foreground font-bold shadow-sm" : "hover:text-foreground"}`} onClick={() => setPostType("project")}>Project</span>
                          <span className={`p-1.5 cursor-pointer rounded-md ${postType === "team" ? "bg-primary text-primary-foreground font-bold shadow-sm" : "hover:text-foreground"}`} onClick={() => setPostType("team")}>Team</span>
                          <span className={`p-1.5 cursor-pointer rounded-md ${postType === "gallery" ? "bg-primary text-primary-foreground font-bold shadow-sm" : "hover:text-foreground"}`} onClick={() => setPostType("gallery")}>Gallery</span>
                        </div>

                        <div className="space-y-3 pt-2">
                          {postType === "job" && (
                            <div className="space-y-2.5 text-xs">
                              <Input placeholder="Job Position (e.g. Video Editor)" value={newJob.position} onChange={(e) => setNewJob({ ...newJob, position: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Input placeholder="Experience Level (e.g. 2+ Years)" value={newJob.experience} onChange={(e) => setNewJob({ ...newJob, experience: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Input placeholder="Salary Offer (Optional)" value={newJob.salary} onChange={(e) => setNewJob({ ...newJob, salary: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Input placeholder="Location (e.g. Mumbai / Hybrid)" value={newJob.location} onChange={(e) => setNewJob({ ...newJob, location: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Textarea placeholder="Job description and requirements..." value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} className="min-h-20 text-xs bg-surface-elevated border-border/80" />
                            </div>
                          )}

                          {postType === "audition" && (
                            <div className="space-y-2.5 text-xs">
                              <Input placeholder="Role (e.g. Female Lead)" value={newAudition.role} onChange={(e) => setNewAudition({ ...newAudition, role: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Input placeholder="Age Limit (e.g. 18-25)" value={newAudition.ageRange} onChange={(e) => setNewAudition({ ...newAudition, ageRange: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Select value={newAudition.gender} onValueChange={(val) => setNewAudition({ ...newAudition, gender: val })}>
                                <SelectTrigger className="h-8 bg-surface-elevated border-border/80 text-xs">
                                  <SelectValue placeholder="Gender Preference" />
                                </SelectTrigger>
                                <SelectContent className="text-xs bg-card border-border/80">
                                  <SelectItem value="Any">Any Gender</SelectItem>
                                  <SelectItem value="Female">Female Only</SelectItem>
                                  <SelectItem value="Male">Male Only</SelectItem>
                                  <SelectItem value="Non-Binary">Non-Binary</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input placeholder="Audition Location (e.g. Studio 4 / Online)" value={newAudition.location} onChange={(e) => setNewAudition({ ...newAudition, location: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Input placeholder="Language required (e.g. Fluent Tamil)" value={newAudition.language} onChange={(e) => setNewAudition({ ...newAudition, language: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Textarea placeholder="Audition script cues, character description..." value={newAudition.description} onChange={(e) => setNewAudition({ ...newAudition, description: e.target.value })} className="min-h-20 text-xs bg-surface-elevated border-border/80" />
                            </div>
                          )}

                          {postType === "internship" && (
                            <div className="space-y-2.5 text-xs">
                              <Input placeholder="Internship Role (e.g. Writing Intern)" value={newInternship.role} onChange={(e) => setNewInternship({ ...newInternship, role: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Input placeholder="Duration (e.g. 3 Months)" value={newInternship.duration} onChange={(e) => setNewInternship({ ...newInternship, duration: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Select value={newInternship.type} onValueChange={(val) => setNewInternship({ ...newInternship, type: val as "Paid" | "Unpaid" })}>
                                <SelectTrigger className="h-8 bg-surface-elevated border-border/80 text-xs">
                                  <SelectValue placeholder="Paid or Unpaid" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                                  <SelectItem value="Paid">Paid Stipend</SelectItem>
                                  <SelectItem value="Unpaid">Unpaid Opportunity</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input placeholder="Location (e.g. Kochi Office)" value={newInternship.location} onChange={(e) => setNewInternship({ ...newInternship, location: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Textarea placeholder="Internship learning path and daily assistance tasks..." value={newInternship.description} onChange={(e) => setNewInternship({ ...newInternship, description: e.target.value })} className="min-h-20 text-xs bg-surface-elevated border-border/80" />
                            </div>
                          )}

                          {postType === "project" && (
                            <div className="space-y-2.5 text-xs">
                              <Input placeholder="Project Title" value={newProject.title} onChange={(e) => setNewProject({ ...newProject, title: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Input placeholder="Release Year (e.g. 2024)" value={newProject.year} onChange={(e) => setNewProject({ ...newProject, year: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Input placeholder="Your Company's Role (e.g. VFX & CGI)" value={newProject.role} onChange={(e) => setNewProject({ ...newProject, role: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Textarea placeholder="Short overview of execution..." value={newProject.description} onChange={(e) => setNewProject({ ...newProject, description: e.target.value })} className="min-h-16 text-xs bg-surface-elevated border-border/80" />
                            </div>
                          )}

                          {postType === "team" && (
                            <div className="space-y-2.5 text-xs">
                              <Input placeholder="Member Name" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                              <Input placeholder="Role (e.g. Executive Producer)" value={newTeam.role} onChange={(e) => setNewTeam({ ...newTeam, role: e.target.value })} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                            </div>
                          )}

                          {postType === "gallery" && (
                            <div className="space-y-2.5 text-xs">
                              <Input placeholder="Image URL (Unsplash/Direct link)" value={newGalleryUrl} onChange={(e) => setNewGalleryUrl(e.target.value)} className="h-8 bg-surface-elevated border-border/80 text-xs" />
                            </div>
                          )}

                          <Button className="w-full text-xs h-8 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold" onClick={handlePostWorkspaceItem}>
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            <span>Confirm Addition</span>
                          </Button>
                        </div>
                      </Card>
                    </div>

                    {/* Right Side: Applicants / Submissions inbox */}
                    <div className="lg:col-span-2 space-y-6">
                      <div className="flex justify-between items-center border-b border-border/60 pb-2">
                        <h3 className="font-display font-bold text-lg text-foreground">Direct Submissions Inbox</h3>
                        <Badge className="bg-primary/15 text-primary border border-primary/30 font-mono font-bold text-xs">
                          {applications.filter(a => a.companyId === userCompany.id).length} applications
                        </Badge>
                      </div>

                      {applications.filter(a => a.companyId === userCompany.id).length === 0 ? (
                        <div className="text-center py-16 bg-card text-card-foreground border border-dashed border-border/80 rounded-2xl">
                          <Mail className="h-10 w-10 text-muted-foreground/50 mx-auto mb-2" />
                          <h4 className="font-display font-bold text-foreground/90 text-sm">Inbox Empty</h4>
                          <p className="text-muted-foreground text-xs max-w-xs mx-auto mt-0.5">As soon as talents submit reels/resumes to your active listings, they will show up here.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {applications.filter(a => a.companyId === userCompany.id).map(app => (
                            <Card key={app.id} className="border border-border/80 p-5 space-y-3 shadow-noir bg-card text-card-foreground">
                              <div className="flex flex-wrap justify-between items-start gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold text-foreground text-sm">{app.applicantName}</h4>
                                    <Badge variant="outline" className={`text-[10px] py-0 h-4 px-1.5 font-mono font-bold ${
                                      app.status === "Pending" ? "bg-primary/15 text-primary border-primary/30" :
                                      app.status === "Shortlisted" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                                      app.status === "Reviewed" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                                      "bg-destructive/15 text-destructive border-destructive/30"
                                    }`}>
                                      {app.status}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">Applied for: <strong className="text-foreground font-bold">{app.opportunityTitle}</strong> ({app.type})</p>
                                  <p className="text-[10px] font-mono text-muted-foreground mt-0.5">Submitted on: {app.date} • Experience: {app.experienceYears} Years</p>
                                </div>
                                
                                {/* Contact references */}
                                <div className="text-right text-xs font-mono text-muted-foreground space-y-0.5">
                                  <div>{app.applicantEmail}</div>
                                  <div>{app.applicantPhone}</div>
                                </div>
                              </div>

                              <div className="p-3 bg-surface-elevated rounded-lg text-xs text-muted-foreground border border-border/60 leading-relaxed italic">
                                "{app.coverLetter}"
                              </div>

                              {/* Media attachment links */}
                              <div className="flex flex-wrap gap-4 text-xs">
                                {app.resumeUrl && (
                                  <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 font-semibold">
                                    <ExternalLink className="h-3 w-3" />
                                    <span>View Professional Resume</span>
                                  </a>
                                )}
                                {app.demoReelUrl && (
                                  <a href={app.demoReelUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 font-semibold">
                                    <Video className="h-3.5 w-3.5" />
                                    <span>Watch Talent Reel / Portfolio</span>
                                  </a>
                                )}
                              </div>

                              {/* Inbox State Controls */}
                              <div className="flex justify-end gap-2 border-t pt-2 border-border/60">
                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 text-[11px] h-7 px-3.5" onClick={() => handleUpdateAppStatus(app.id, "Rejected")}>
                                  Decline
                                </Button>
                                <Button size="sm" variant="outline" className="text-foreground border-border/80 bg-surface-elevated hover:border-primary/40 text-[11px] h-7 px-3.5" onClick={() => handleUpdateAppStatus(app.id, "Reviewed")}>
                                  Mark Reviewed
                                </Button>
                                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover text-[11px] h-7 px-4 font-bold" onClick={() => handleUpdateAppStatus(app.id, "Shortlisted")}>
                                  Shortlist Talent
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // MAIN LIST VIEW: list all studios with search, filter, and direct listing
              <div className="space-y-6">
                {/* Clean Header Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-5 border-border/60">
                  <div className="space-y-1">
                    <p className="noir-eyebrow">Production Infrastructure</p>
                    <h1 className="text-3xl font-display font-bold tracking-tight text-foreground">Companies Directory</h1>
                    <p className="text-sm text-muted-foreground">Discover and connect with verified casting houses, production studios, and post-facilities.</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
                    <Button
                      className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold px-5 shadow-sm h-10 flex-1 sm:flex-initial"
                      onClick={() => setIsRegisterOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-1.5" />
                      <span>Register Your Business</span>
                    </Button>
                  </div>
                </div>

                {/* Directory Navigation, Search & Filters Row */}
                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                    <TabsList className="bg-surface-elevated border border-border/80 p-1 rounded-xl w-full sm:w-[380px] grid grid-cols-3">
                      <TabsTrigger value="all" className="rounded-lg text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Companies
                      </TabsTrigger>
                      <TabsTrigger value="created" className="rounded-lg text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Registered
                      </TabsTrigger>
                      <TabsTrigger value="saved" className="rounded-lg text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        Saved
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="flex flex-col sm:flex-row gap-3 items-center w-full xl:w-auto">
                    <div className="relative w-full sm:w-64 shrink-0">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search companies..."
                        className="pl-9 h-10 border-border/80 bg-surface-elevated text-foreground"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 w-full sm:flex sm:w-auto">
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger className="w-full sm:w-[180px] h-10 bg-surface-elevated border-border/80 text-foreground shrink-0">
                          <SelectValue placeholder="Sort By" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border/80">
                          <SelectItem value="recommended">Recommended</SelectItem>
                          <SelectItem value="popular">Most Popular</SelectItem>
                          <SelectItem value="highest_rated">Highest Rated</SelectItem>
                          <SelectItem value="recently_added">Recently Added</SelectItem>
                          <SelectItem value="most_projects">Most Projects</SelectItem>
                          <SelectItem value="most_followers">Most Followers</SelectItem>
                          <SelectItem value="alphabetical">Alphabetical</SelectItem>
                        </SelectContent>
                      </Select>

                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" className="h-10 border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 px-4 shrink-0 w-full sm:w-auto">
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                            {(selectedCategory !== "all" || selectedCity !== "all" || selectedState !== "all" || selectedLanguage !== "all" || filterVerified || filterHiring || filterAuditions || filterInternships || filterFreshers || minRating !== "all" || companySize !== "all" || filterCollab || yearsInIndustry !== "all" || filterRecentlyJoined) && (
                              <Badge className="bg-primary text-primary-foreground rounded-full px-1 py-0 h-4 min-w-4 text-[10px] flex items-center justify-center ml-2">
                                !
                              </Badge>
                            )}
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="overflow-y-auto max-h-screen space-y-6 pr-4 bg-card border-l border-border/80">
                          <SheetHeader>
                            <SheetTitle className="font-display">Filter Directories</SheetTitle>
                            <SheetDescription>Calibrate properties to discover exact agencies, post houses, or rentals.</SheetDescription>
                          </SheetHeader>
                          
                          <div className="space-y-5 py-4">
                            {/* Category */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">Business Category</label>
                              <CategoryDropdown
                                value={selectedCategory === "all" ? "" : selectedCategory}
                                onChange={(val) => setSelectedCategory(val || "all")}
                                placeholder="All Categories"
                              />
                            </div>

                            {/* City */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">Metro City</label>
                              <Select value={selectedCity} onValueChange={setSelectedCity}>
                                <SelectTrigger className="w-full bg-surface-elevated border-border/80">
                                  <SelectValue placeholder="All Cities" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                                  <SelectItem value="all">All Cities</SelectItem>
                                  {CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* State */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">State Location</label>
                              <Select value={selectedState} onValueChange={setSelectedState}>
                                <SelectTrigger className="w-full bg-surface-elevated border-border/80">
                                  <SelectValue placeholder="All States" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                                  <SelectItem value="all">All States</SelectItem>
                                  {STATES.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Languages */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">Language Specialties</label>
                              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                <SelectTrigger className="w-full bg-surface-elevated border-border/80">
                                  <SelectValue placeholder="All Languages" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                                  <SelectItem value="all">All Languages</SelectItem>
                                  {LANGUAGES.map(lang => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Minimum rating */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">Minimum Rating</label>
                              <Select value={minRating} onValueChange={setMinRating}>
                                <SelectTrigger className="w-full bg-surface-elevated border-border/80">
                                  <SelectValue placeholder="All Ratings" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                                  <SelectItem value="all">Any Rating</SelectItem>
                                  <SelectItem value="4.5">⭐⭐⭐⭐+ 4.5 Stars & above</SelectItem>
                                  <SelectItem value="4.0">⭐⭐⭐⭐ 4.0 Stars & above</SelectItem>
                                  <SelectItem value="3.0">⭐⭐⭐ 3.0 Stars & above</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Company Size */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">Company Size (Crew count)</label>
                              <Select value={companySize} onValueChange={setCompanySize}>
                                <SelectTrigger className="w-full bg-surface-elevated border-border/80">
                                  <SelectValue placeholder="Any Size" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                                  <SelectItem value="all">Any Size</SelectItem>
                                  <SelectItem value="small">Boutique / Small (Under 20 crew)</SelectItem>
                                  <SelectItem value="medium">Mid-Size Studio (20 - 100 crew)</SelectItem>
                                  <SelectItem value="large">Large Enterprise (100+ crew)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Years in Industry */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-semibold text-muted-foreground">Years in Industry</label>
                              <Select value={yearsInIndustry} onValueChange={setYearsInIndustry}>
                                <SelectTrigger className="w-full bg-surface-elevated border-border/80">
                                  <SelectValue placeholder="Any Years" />
                                </SelectTrigger>
                                <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                                  <SelectItem value="all">Any</SelectItem>
                                  <SelectItem value="0-5">0 - 5 Years</SelectItem>
                                  <SelectItem value="5-10">5 - 10 Years</SelectItem>
                                  <SelectItem value="10+">10+ Years</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Switch options */}
                            <div className="space-y-3.5 pt-2">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Verified Companies Only</label>
                                <Switch checked={filterVerified} onCheckedChange={setFilterVerified} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Hiring Now</label>
                                <Switch checked={filterHiring} onCheckedChange={setFilterHiring} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Open Auditions</label>
                                <Switch checked={filterAuditions} onCheckedChange={setFilterAuditions} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Internships Available</label>
                                <Switch checked={filterInternships} onCheckedChange={setFilterInternships} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Accepting Freshers</label>
                                <Switch checked={filterFreshers} onCheckedChange={setFilterFreshers} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Open for Collaboration</label>
                                <Switch checked={filterCollab} onCheckedChange={setFilterCollab} />
                              </div>
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Recently Joined</label>
                                <Switch checked={filterRecentlyJoined} onCheckedChange={setFilterRecentlyJoined} />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2.5 pt-4 border-t border-border/60">
                            <Button variant="outline" className="flex-1 border-border/80 bg-surface-elevated" onClick={resetFilters}>Reset</Button>
                            <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-sm transition-all duration-200 cursor-pointer">Apply Filters</Button>
                          </div>
                        </SheetContent>
                      </Sheet>
                    </div>
                  </div>
                </div>

                {/* Studios Grid */}
                {filteredCompanies.length === 0 ? (
                  activeTab === "all" || activeTab === "created" ? (
                    <div className="mt-8 mb-8 bg-card border border-border/80 rounded-2xl p-8 text-center max-w-3xl mx-auto shadow-noir">
                      <Building2 className="h-10 w-10 text-primary mx-auto mb-4" />
                      <h2 className="text-2xl font-display font-bold text-foreground mb-2">Own a Film Industry Company?</h2>
                      <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                        Join FilmCollab&apos;s directory to get discovered by filmmakers, talent, and production houses looking for your services, equipment, or locations.
                      </p>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary-hover font-bold h-11 px-8" onClick={() => setIsRegisterOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Register Your Company
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-16 bg-card text-card-foreground rounded-2xl border border-dashed border-border/80">
                      <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                      <h3 className="text-lg font-display font-bold text-foreground/90">
                        No saved studios yet
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto mt-1">
                        Browse the directory and click the bookmark icon on any studio to save it for quick access.
                      </p>
                      <Button variant="outline" className="mt-4 border-border/80 bg-surface-elevated hover:border-primary/40" onClick={() => setActiveTab("all")}>
                        Browse All Studios
                      </Button>
                    </div>
                  )
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sortedCompanies.map(company => (
                        <Card key={company.id} className="border border-border/80 hover:border-primary/40 overflow-hidden shadow-noir transition duration-300 flex flex-col bg-card text-card-foreground group">
                          {/* Card Cover Header */}
                          <div className="h-36 relative bg-surface-elevated overflow-hidden">
                            <img src={company.coverImage} alt={company.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                            <Badge className="absolute top-3 right-3 bg-card/90 text-foreground border border-border/80 font-semibold text-[10px] hover:bg-card shadow-sm backdrop-blur-sm">
                              {company.category}
                            </Badge>
                            
                            {/* Floating Badges */}
                            <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5 w-full pr-4">
                              {company.verified && (
                                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 py-0.5 px-1.5 text-[9px] flex items-center gap-0.5 backdrop-blur-sm">
                                  <ShieldCheck className="h-2.5 w-2.5" />
                                  <span>Verified</span>
                                </Badge>
                              )}
                              {(company.hiringNow || company.jobs.length > 0) && (
                                <Badge className="bg-primary text-primary-foreground border-none py-0.5 px-1.5 text-[9px] font-semibold">
                                  Hiring Now
                                </Badge>
                              )}
                              {(company.openAuditions || company.auditions.length > 0) && (
                                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 py-0.5 px-1.5 text-[9px] backdrop-blur-sm">
                                  Auditions
                                </Badge>
                              )}
                              {(company.internshipsAvailable || company.internships.length > 0) && (
                                <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 py-0.5 px-1.5 text-[9px] backdrop-blur-sm">
                                  Internships
                                </Badge>
                              )}
                              {company.acceptingFreshers && (
                                <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 py-0.5 px-1.5 text-[9px] backdrop-blur-sm">
                                  Freshers
                                </Badge>
                              )}
                              {company.openForCollaboration && (
                                <Badge className="bg-pink-500/20 text-pink-300 border border-pink-500/30 py-0.5 px-1.5 text-[9px] backdrop-blur-sm">
                                  Collab
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Body details */}
                          <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-2">
                              <div className="flex items-start gap-3">
                                {/* Logo */}
                                <div className="h-10 w-10 bg-surface-elevated rounded-lg shrink-0 flex items-center justify-center font-display font-bold text-primary overflow-hidden border border-border/80 text-sm">
                                  {company.logo ? (company.logo.length <= 4 ? company.logo : <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />) : <Building2 className="h-5 w-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <h3 className="font-display font-bold text-foreground text-base hover:text-primary cursor-pointer transition truncate" onClick={() => setViewingCompany(company)}>
                                      {company.name}
                                    </h3>
                                    <span className="flex items-center gap-0.5 text-xs font-mono font-semibold text-foreground bg-surface-elevated px-1.5 py-0.5 rounded border border-border/80 shrink-0">
                                      <Star className="h-3 w-3 fill-primary text-primary" />
                                      <span>{company.rating}</span>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                                    <span className="truncate">{company.city}, {company.state}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-3">{company.description}</p>
                            </div>

                            <div className="space-y-3 pt-2">
                              {/* Service Tags list */}
                              <div className="flex flex-wrap gap-1">
                                {company.services.slice(0, 3).map(service => (
                                  <Badge key={service} variant="outline" className="text-[10px] text-muted-foreground border-border/80 bg-surface-elevated py-0 px-1.5 h-5">
                                    {service}
                                  </Badge>
                                ))}
                                {company.services.length > 3 && (
                                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground border-border/60 py-0 px-1.5 h-5">
                                    +{company.services.length - 3}
                                  </Badge>
                                )}
                              </div>

                              {/* Languages */}
                              <div className="flex flex-wrap gap-1">
                                {company.languages.slice(0, 3).map(lang => (
                                  <span key={lang} className="text-[10px] font-medium text-muted-foreground bg-surface-elevated border border-border/60 px-1.5 py-0.5 rounded">{lang}</span>
                                ))}
                              </div>

                              {/* Mini properties row */}
                              <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground border-t pt-3 border-border/60">
                                <span className="flex items-center gap-1"><Briefcase className="h-3 w-3 text-primary" /> {company.projectsCompleted} Projects</span>
                                <span className="flex items-center gap-1"><Users className="h-3 w-3 text-primary" /> {company.employeeCount} Team</span>
                                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary" /> {new Date().getFullYear() - company.establishedYear} Yrs</span>
                              </div>
                            </div>
                          </CardContent>

                          {/* Actions */}
                          <CardFooter className="p-4 pt-0 gap-2 flex-wrap sm:flex-nowrap">
                            <Button
                              variant="default"
                              className="flex-1 text-xs h-9 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-sm border-none transition-all duration-200 cursor-pointer"
                              onClick={() => setViewingCompany(company)}
                            >
                              View Profile
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 text-xs h-9 border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                              onClick={() => {
                                setContactCompany(company);
                                setIsContactOpen(true);
                              }}
                            >
                              Contact
                            </Button>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0 flex-1 sm:flex-none border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 transition-colors"
                                onClick={() => handleSave(company.id)}
                              >
                                <Bookmark className={`h-4 w-4 ${savedIds.includes(company.id) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0 flex-1 sm:flex-none border-border/80 bg-surface-elevated text-foreground hover:border-primary/40 transition-colors"
                                onClick={() => handleShare(company)}
                              >
                                <Share2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </div>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* DIALOGS & OVERLAY MODALS */}

        {/* VIEW PROJECT DETAILS DIALOG */}
        <Dialog open={isViewProjectDetailsOpen} onOpenChange={setIsViewProjectDetailsOpen}>
          <DialogContent className="max-w-md bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary/15 text-primary border border-primary/30 font-mono">
                  {selectedProjectForView?.year}
                </Badge>
                {selectedProjectForView?.role && (
                  <Badge variant="outline" className="border-border/80 bg-surface-elevated text-muted-foreground">
                    {selectedProjectForView?.role}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-display font-bold text-foreground">
                {selectedProjectForView?.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4 border-t border-border/60 text-sm text-muted-foreground">
              <div className="space-y-1.5">
                <h4 className="font-semibold text-foreground">Studio's Role / Contribution</h4>
                <p className="bg-surface-elevated p-2.5 rounded-lg border border-border/80 text-xs">
                  {selectedProjectForView?.role}
                </p>
              </div>
              {selectedProjectForView?.description && (
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-foreground">Project Description</h4>
                  <p className="whitespace-pre-line leading-relaxed text-xs text-muted-foreground bg-surface-elevated p-3 rounded-lg border border-border/80">
                    {selectedProjectForView?.description}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="pt-2 border-t border-border/60">
              <Button type="button" variant="outline" className="border-border/80 bg-surface-elevated" onClick={() => setIsViewProjectDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* POST JOB DIALOG */}
        <Dialog open={isPostJobDialogOpen} onOpenChange={(open) => {
          setIsPostJobDialogOpen(open);
          if (!open) {
            setEditingJobId(null);
            setJobForm({ position: "", experience: "", location: "", salary: "", description: "" });
          }
        }}>
          <DialogContent className="max-w-md bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="font-display">{editingJobId ? "Edit Job Details" : "Post a New Job"}</DialogTitle>
              <DialogDescription>
                {editingJobId ? "Modify the details of your job posting." : "Publish an open career opportunity under your company profile."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handlePostJob} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Position / Title</label>
                <Input
                  required
                  placeholder="e.g. Lead Video Editor"
                  value={jobForm.position}
                  onChange={(e) => setJobForm({ ...jobForm, position: e.target.value })}
                  className="bg-surface-elevated border-border/80"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Experience Required</label>
                  <Input
                    required
                    placeholder="e.g. 3+ years"
                    value={jobForm.experience}
                    onChange={(e) => setJobForm({ ...jobForm, experience: e.target.value })}
                    className="bg-surface-elevated border-border/80"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Salary Range</label>
                  <Input
                    placeholder="e.g. ₹50k - ₹80k/mo"
                    value={jobForm.salary}
                    onChange={(e) => setJobForm({ ...jobForm, salary: e.target.value })}
                    className="bg-surface-elevated border-border/80"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Location</label>
                <Input
                  placeholder={`e.g. Remote, or default to ${viewingCompany?.city || "Office"}`}
                  value={jobForm.location}
                  onChange={(e) => setJobForm({ ...jobForm, location: e.target.value })}
                  className="bg-surface-elevated border-border/80"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Job Description & Requirements</label>
                <Textarea
                  required
                  placeholder="Outline roles, responsibilities, and key qualification criteria..."
                  value={jobForm.description}
                  onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                  className="min-h-[100px] bg-surface-elevated border-border/80"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsPostJobDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold">
                  {editingJobId ? "Save Changes" : "Post Opportunity"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* CREATE EVENT DIALOG */}
        <Dialog open={isCreateEventDialogOpen} onOpenChange={(open) => {
          setIsCreateEventDialogOpen(open);
          if (!open) {
            setEditingEventId(null);
            setEventForm({ title: "", description: "", date: "", location: "", isOnline: false, price: "" });
          }
        }}>
          <DialogContent className="max-w-md bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="font-display">{editingEventId ? "Edit Event Details" : "Create Event"}</DialogTitle>
              <DialogDescription>
                {editingEventId ? "Modify your scheduled event details, date, and location." : "Schedule a workshop, masterclass, or networking meetup."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Event Title</label>
                <Input
                  required
                  placeholder="e.g. Motion Graphics Masterclass"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="bg-surface-elevated border-border/80"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Date & Time</label>
                  <Input
                    required
                    placeholder="e.g. July 25, 6:00 PM"
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="bg-surface-elevated border-border/80"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Ticket Price / Type</label>
                  <Input
                    placeholder="e.g. Free, or ₹499"
                    value={eventForm.price}
                    onChange={(e) => setEventForm({ ...eventForm, price: e.target.value })}
                    className="bg-surface-elevated border-border/80"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-y border-border/60">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold text-muted-foreground">Online Event?</label>
                  <p className="text-[10px] text-muted-foreground">Will this event take place online (e.g. via Zoom/Meet)?</p>
                </div>
                <Switch
                  checked={eventForm.isOnline}
                  onCheckedChange={(checked) => setEventForm({ ...eventForm, isOnline: checked })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Location / Meeting Link</label>
                <Input
                  required
                  placeholder={eventForm.isOnline ? "e.g. Google Meet Link" : "e.g. Main Studio Hall, Mumbai"}
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  className="bg-surface-elevated border-border/80"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Event Description</label>
                <Textarea
                  required
                  placeholder="Provide schedule details, speaker profiles, and learning goals..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="min-h-[100px] bg-surface-elevated border-border/80"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateEventDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold">
                  {editingEventId ? "Save Changes" : "Publish Event"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* CREATE COURSE DIALOG */}
        <Dialog open={isCreateCourseDialogOpen} onOpenChange={(open) => {
          setIsCreateCourseDialogOpen(open);
          if (!open) {
            setEditingCourseId(null);
            setCourseForm({ title: "", description: "", duration: "", instructor: "", price: "", level: "Beginner", category: "Cinematography" });
          }
        }}>
          <DialogContent className="max-w-md bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="font-display">{editingCourseId ? "Edit Course Details" : "Create Course"}</DialogTitle>
              <DialogDescription>
                {editingCourseId ? "Modify your course syllabus, category, duration, or price." : "Publish a certification course, editing bootcamp, or cinematography program."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Course Title</label>
                <Input
                  required
                  placeholder="e.g. DaVinci Resolve Masterclass"
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                  className="bg-surface-elevated border-border/80"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Course Duration</label>
                  <Input
                    required
                    placeholder="e.g. 6 Weeks (24 hours)"
                    value={courseForm.duration}
                    onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                    className="bg-surface-elevated border-border/80"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Instructor Name</label>
                  <Input
                    required
                    placeholder="e.g. Kabir Bose"
                    value={courseForm.instructor}
                    onChange={(e) => setCourseForm({ ...courseForm, instructor: e.target.value })}
                    className="bg-surface-elevated border-border/80"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Level</label>
                  <Select
                    value={courseForm.level}
                    onValueChange={(val) => setCourseForm({ ...courseForm, level: val })}
                  >
                    <SelectTrigger className="bg-surface-elevated border-border/80">
                      <SelectValue placeholder="Select Level" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/80">
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Course Price</label>
                  <Input
                    placeholder="e.g. Free, or ₹2,999"
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })}
                    className="bg-surface-elevated border-border/80"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Category</label>
                <Select
                  value={courseForm.category}
                  onValueChange={(val) => setCourseForm({ ...courseForm, category: val })}
                >
                  <SelectTrigger className="bg-surface-elevated border-border/80">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border/80">
                    <SelectItem value="Cinematography">Cinematography</SelectItem>
                    <SelectItem value="Editing">Editing</SelectItem>
                    <SelectItem value="Animation">Animation</SelectItem>
                    <SelectItem value="Sound Design">Sound Design</SelectItem>
                    <SelectItem value="Scriptwriting">Scriptwriting</SelectItem>
                    <SelectItem value="Direction">Direction</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Course Description & Syllabus Summary</label>
                <Textarea
                  required
                  placeholder="Outline the modules, skills taught, tools used, and certification details..."
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                  className="min-h-[100px] bg-surface-elevated border-border/80"
                />
              </div>
              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsCreateCourseDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold">
                  {editingCourseId ? "Save Changes" : "Publish Course"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* EDIT BANNER URL DIALOG */}
        <Dialog open={isEditBannerOpen} onOpenChange={setIsEditBannerOpen}>
          <DialogContent className="max-w-md p-6 bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="font-display">Update Cover Banner</DialogTitle>
              <DialogDescription>Select or drag and drop an image file to update your studio cover banner.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-xl p-6 bg-surface-elevated hover:border-primary/50 cursor-pointer transition-all duration-200">
                <Upload className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-semibold text-foreground">Upload Image File</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG, GIF</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64String = reader.result as string;
                      if (!viewingCompany) return;
                      const updated = {
                        ...viewingCompany,
                        coverImage: base64String
                      };
                      updateViewingCompany(updated);
                      setIsEditBannerOpen(false);
                      toast({ title: "Banner updated!", description: "Your studio cover banner has been successfully updated." });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsEditBannerOpen(false)}>Close</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* EDIT LOGO DIALOG */}
        <Dialog open={isEditLogoOpen} onOpenChange={setIsEditLogoOpen}>
          <DialogContent className="max-w-md p-6 bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="font-display">Update Company Logo</DialogTitle>
              <DialogDescription>Upload an image file, or enter an emoji / brand initials to represent your brand logo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-xl p-6 bg-surface-elevated hover:border-primary/50 cursor-pointer transition-all duration-200">
                <Upload className="h-8 w-8 text-primary mb-2" />
                <span className="text-sm font-semibold text-foreground">Upload Image / Logo File</span>
                <span className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG, GIF</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64String = reader.result as string;
                      if (!viewingCompany) return;
                      const updated = {
                        ...viewingCompany,
                        logo: base64String
                      };
                      updateViewingCompany(updated);
                      setIsEditLogoOpen(false);
                      toast({ title: "Logo updated!", description: "Your studio logo/profile picture has been successfully updated." });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border/60"></div>
                <span className="flex-shrink mx-4 text-muted-foreground text-xs font-mono font-semibold">OR</span>
                <div className="flex-grow border-t border-border/60"></div>
              </div>

              <form onSubmit={handleUpdateLogo} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Logo Characters / Emoji</label>
                  <Input
                    required
                    maxLength={4}
                    placeholder="e.g. Red, or 🎬"
                    value={logoInput}
                    onChange={(e) => setLogoInput(e.target.value)}
                    className="bg-surface-elevated border-border/80 text-center font-bold text-lg"
                  />
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setIsEditLogoOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold">Save Brand Initials</Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>

        {/* 1. CONTACT STUDIO DIALOG */}
        <Dialog open={isContactOpen} onOpenChange={setIsContactOpen}>
          <DialogContent className="max-w-md bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="font-display">Contact Studio: {contactCompany?.name}</DialogTitle>
              <DialogDescription>Your message will be delivered to their official administrator. Provide clear references.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Your Full Name</label>
                <Input
                  placeholder="e.g. Sreya Jayadevan"
                  className="bg-surface-elevated border-border/80"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Your Email Address</label>
                <Input
                  type="email"
                  placeholder="e.g. sreya@gmail.com"
                  className="bg-surface-elevated border-border/80"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Your Inquiry Message</label>
                <Textarea
                  placeholder="State your intent clearly: casting pitch, line production quotes, or booking rental slots..."
                  className="bg-surface-elevated border-border/80 min-h-24 text-sm"
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsContactOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold">Dispatch Message</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 2. DIRECT APPLICATION FOR LISTINGS (JOBS, AUDITIONS, INTERNSHIPS) */}
        <Dialog open={isApplicationOpen} onOpenChange={setIsApplicationOpen}>
          <DialogContent className="max-w-lg bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="font-display">Apply for: {applicationTarget?.title}</DialogTitle>
              <DialogDescription>Submit your profile dossier. Registered studio administrators can review your submission and contact you.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleApplySubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
                  <Input placeholder="e.g. Alan Kurian" className="bg-surface-elevated border-border/80 text-xs" value={appForm.name} onChange={(e) => setAppForm({ ...appForm, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Contact Email *</label>
                  <Input type="email" placeholder="e.g. alan@example.com" className="bg-surface-elevated border-border/80 text-xs" value={appForm.email} onChange={(e) => setAppForm({ ...appForm, email: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Phone Number *</label>
                  <Input placeholder="e.g. +91 98460 12345" className="bg-surface-elevated border-border/80 text-xs" value={appForm.phone} onChange={(e) => setAppForm({ ...appForm, phone: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Years of Relevant Experience *</label>
                  <Input placeholder="e.g. 3 Years, Fresh Graduate" className="bg-surface-elevated border-border/80 text-xs" value={appForm.experience} onChange={(e) => setAppForm({ ...appForm, experience: e.target.value })} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Cover Letter & Statement *</label>
                <Textarea placeholder="Explain why you are the perfect fit. Highlight any completed projects or unique talents." className="bg-surface-elevated border-border/80 min-h-20 text-xs leading-relaxed" value={appForm.coverLetter} onChange={(e) => setAppForm({ ...appForm, coverLetter: e.target.value })} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Resume Link / Portfolio Link (Optional)</label>
                <Input placeholder="e.g. https://drive.google.com/your-resume.pdf" className="bg-surface-elevated border-border/80 text-xs" value={appForm.resumeUrl} onChange={(e) => setAppForm({ ...appForm, resumeUrl: e.target.value })} />
              </div>

              {applicationTarget?.type === "audition" && (
                <div className="space-y-1.5 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                  <label className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Video className="h-3.5 w-3.5" />
                    <span>Casting Video Reel / Audition Tape URL *</span>
                  </label>
                  <Input placeholder="e.g. https://youtube.com/your-monologue-video" className="border-border/80 bg-card text-card-foreground text-xs" value={appForm.demoReelUrl} onChange={(e) => setAppForm({ ...appForm, demoReelUrl: e.target.value })} required />
                  <p className="text-[10px] text-muted-foreground mt-1">Casting agencies require a video tape (monologue, action reel, or previous scene clips) to qualify.</p>
                </div>
              )}

              {applicationTarget?.type !== "audition" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Demo Reel / Work Catalog link (Optional)</label>
                  <Input placeholder="e.g. https://vimeo.com/your-creative-work" className="bg-surface-elevated border-border/80 text-xs" value={appForm.demoReelUrl} onChange={(e) => setAppForm({ ...appForm, demoReelUrl: e.target.value })} />
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" className="text-xs" onClick={() => setIsApplicationOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-bold text-xs px-6">
                  Submit Dossier Application
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 3. BUSINESS REGISTRATION WIZARD DIALOG */}
        <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
          <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh] p-6 md:p-8 bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="text-xl md:text-2xl font-display font-bold">Register Film Industry Business</DialogTitle>
              <DialogDescription>Submit your studio, casting agency, production house, or post-facility details to get discovered.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleRegisterCompany} className="space-y-5 pt-2 text-xs">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Company Name *</label>
                  <Input placeholder="e.g. Madras VFX Hub" className="bg-surface-elevated border-border/80" value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Business Category *</label>
                  <Select value={regForm.category} onValueChange={(val) => setRegForm({ ...regForm, category: val })}>
                    <SelectTrigger className="bg-surface-elevated border-border/80">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/80">
                      {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Studio Description & Mission *</label>
                <Textarea placeholder="Explain your specialties, camera gear catalog, space sizes, and key historical productions completed..." className="bg-surface-elevated border-border/80 min-h-24 text-xs leading-relaxed" value={regForm.description} onChange={(e) => setRegForm({ ...regForm, description: e.target.value })} required />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Established Year</label>
                  <Input type="number" placeholder="e.g. 2018" className="bg-surface-elevated border-border/80" value={regForm.establishedYear} onChange={(e) => setRegForm({ ...regForm, establishedYear: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Founder Name / Managing Board</label>
                  <Input placeholder="e.g. Gauri Shanker" className="bg-surface-elevated border-border/80" value={regForm.founder} onChange={(e) => setRegForm({ ...regForm, founder: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Official Email *</label>
                  <Input type="email" placeholder="e.g. contact@hub.com" className="bg-surface-elevated border-border/80" value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Contact Hotline *</label>
                  <Input placeholder="e.g. +91 44 123 456" className="bg-surface-elevated border-border/80" value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} required />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Website Address</label>
                  <Input placeholder="e.g. https://www.studio.com" className="bg-surface-elevated border-border/80" value={regForm.website} onChange={(e) => setRegForm({ ...regForm, website: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">GST Number (Optional)</label>
                  <Input placeholder="e.g. 22AAAAA0000A1Z5" className="bg-surface-elevated border-border/80" value={regForm.gstNumber} onChange={(e) => setRegForm({ ...regForm, gstNumber: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Google Maps URL</label>
                  <Input placeholder="e.g. https://maps.google.com/?q=..." className="bg-surface-elevated border-border/80" value={regForm.mapsLocation} onChange={(e) => setRegForm({ ...regForm, mapsLocation: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Office Street Address *</label>
                  <Input placeholder="e.g. Plot 15, Panampilly Nagar" className="bg-surface-elevated border-border/80" value={regForm.address} onChange={(e) => setRegForm({ ...regForm, address: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">State *</label>
                  <Select value={regForm.state} onValueChange={(val) => setRegForm({ ...regForm, state: val, city: STATE_CITY_MAP[val] ? STATE_CITY_MAP[val][0] : "" })}>
                    <SelectTrigger className="bg-surface-elevated border-border/80">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/80">
                      {STATES.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">City *</label>
                  <Select value={regForm.city} onValueChange={(val) => setRegForm({ ...regForm, city: val })}>
                    <SelectTrigger className="bg-surface-elevated border-border/80">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/80">
                      {(STATE_CITY_MAP[regForm.state] || []).map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Zip Code *</label>
                  <Input placeholder="e.g. 500001" className="bg-surface-elevated border-border/80" value={regForm.zipCode} onChange={(e) => setRegForm({ ...regForm, zipCode: e.target.value })} required />
                </div>
              </div>

              <div className="p-4 bg-surface-elevated border border-border/80 rounded-xl space-y-4">
                <h4 className="font-bold text-foreground/90 text-xs border-b border-border/60 pb-1">Company Services & Timings</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-muted-foreground">Industry Services Offered</span>
                    <div className="h-32 overflow-y-auto border border-border/80 p-2 bg-card text-card-foreground rounded-lg space-y-1.5">
                      {SERVICES.map((s) => (
                        <div key={s} className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            id={`reg_s_${s}`}
                            checked={regForm.servicesSelected.includes(s)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRegForm({ ...regForm, servicesSelected: [...regForm.servicesSelected, s] });
                              } else {
                                setRegForm({ ...regForm, servicesSelected: regForm.servicesSelected.filter(item => item !== s) });
                              }
                            }}
                          />
                          <label htmlFor={`reg_s_${s}`} className="text-[10px] text-muted-foreground">{s}</label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Office Open Time</label>
                      <Input type="time" className="bg-card border-border/80 font-mono" value={regForm.officeOpenTime} onChange={(e) => setRegForm({ ...regForm, officeOpenTime: e.target.value })} required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Office Close Time</label>
                      <Input type="time" className="bg-card border-border/80 font-mono" value={regForm.officeCloseTime} onChange={(e) => setRegForm({ ...regForm, officeCloseTime: e.target.value })} required />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsRegisterOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-bold px-6">
                  Register & Create Portfolio
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* EDIT ABOUT & CREW DIALOG */}
        <Dialog open={isEditAboutOpen} onOpenChange={setIsEditAboutOpen}>
          <DialogContent className="max-w-xl overflow-y-auto max-h-[85vh] p-6 text-xs bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="text-lg font-display font-bold">Edit Studio Details & Crew</DialogTitle>
              <DialogDescription>Update your studio description, operational year, and manage core crew.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveAbout} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Studio Name *</label>
                  <Input
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.name}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Category *</label>
                  <Select value={editAboutForm.category} onValueChange={(val) => setEditAboutForm({ ...editAboutForm, category: val })}>
                    <SelectTrigger className="bg-surface-elevated border-border/80 h-9">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/80">
                      {CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">City *</label>
                  <Select value={editAboutForm.city} onValueChange={(val) => setEditAboutForm({ ...editAboutForm, city: val })}>
                    <SelectTrigger className="bg-surface-elevated border-border/80 h-9">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/80">
                      {CITIES.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">State *</label>
                  <Select value={editAboutForm.state} onValueChange={(val) => setEditAboutForm({ ...editAboutForm, state: val })}>
                    <SelectTrigger className="bg-surface-elevated border-border/80 h-9">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/80">
                      {STATES.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">GST Number (Optional)</label>
                  <Input
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.gstNumber}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, gstNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Country</label>
                  <Input
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.country}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, country: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Email Address</label>
                  <Input
                    type="email"
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.email}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Phone Number</label>
                  <Input
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.phone}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Website URL</label>
                  <Input
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.website}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, website: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Working Hours</label>
                  <Input
                    className="bg-surface-elevated border-border/80 h-9"
                    placeholder="e.g. 09:00 AM - 06:00 PM"
                    value={editAboutForm.workingHours}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, workingHours: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Full Address</label>
                  <Input
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.address}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, address: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Google Maps URL</label>
                  <Input
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.mapsLocation}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, mapsLocation: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Core Expertise (Services)</label>
                <div className="h-32 overflow-y-auto border border-border/80 p-2 bg-surface-elevated text-card-foreground rounded-lg space-y-1.5">
                  {SERVICES.map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        id={`edit_s_${s}`}
                        checked={editAboutForm.services.includes(s)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditAboutForm({ ...editAboutForm, services: [...editAboutForm.services, s] });
                          } else {
                            setEditAboutForm({ ...editAboutForm, services: editAboutForm.services.filter(item => item !== s) });
                          }
                        }}
                      />
                      <label htmlFor={`edit_s_${s}`} className="text-xs text-muted-foreground">{s}</label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Studio Description *</label>
                <Textarea
                  className="bg-surface-elevated border-border/80 min-h-24 text-xs"
                  value={editAboutForm.description}
                  onChange={(e) => setEditAboutForm({ ...editAboutForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Founder / Managing Board</label>
                  <Input
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.founder}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, founder: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Established Year</label>
                  <Input
                    type="number"
                    className="bg-surface-elevated border-border/80 h-9"
                    value={editAboutForm.establishedYear}
                    onChange={(e) => setEditAboutForm({ ...editAboutForm, establishedYear: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t border-border/60 pt-4 mt-2 space-y-3">
                <h4 className="font-display font-bold text-foreground text-sm">Manage Core Crew</h4>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1.5">
                    <label className="font-semibold text-muted-foreground">Crew Name</label>
                    <Input
                      placeholder="e.g. Stephen Spielberg"
                      className="bg-surface-elevated border-border/80 h-8"
                      value={newCrewMember.name}
                      onChange={(e) => setNewCrewMember({ ...newCrewMember, name: e.target.value })}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="font-semibold text-muted-foreground">Crew Role</label>
                    <Input
                      placeholder="e.g. Lead Director"
                      className="bg-surface-elevated border-border/80 h-8"
                      value={newCrewMember.role}
                      onChange={(e) => setNewCrewMember({ ...newCrewMember, role: e.target.value })}
                    />
                  </div>
                  <Button type="button" size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover h-8" onClick={handleAddCrewMember}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Add</span>
                  </Button>
                </div>

                {viewingCompany && viewingCompany.team.length > 0 && (
                  <div className="border border-border/80 rounded-lg p-2 bg-surface-elevated max-h-40 overflow-y-auto space-y-2 mt-2">
                    {viewingCompany.team.map((member) => (
                      <div key={member.id} className="flex justify-between items-center bg-card text-card-foreground p-2 rounded border border-border/60 shadow-sm">
                        <div>
                          <div className="font-bold text-foreground/90">{member.name}</div>
                          <div className="text-muted-foreground text-[10px]">{member.role}</div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 text-destructive hover:text-destructive p-0"
                          onClick={() => handleDeleteCrewMember(member.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsEditAboutOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* EDIT PROJECTS DIALOG */}
        <Dialog open={isEditProjectsOpen} onOpenChange={(open) => {
          setIsEditProjectsOpen(open);
          if (!open) {
            setEditingProjectId(null);
            setNewProjForm({ title: "", year: "", role: "", description: "" });
          }
        }}>
          <DialogContent className="max-w-xl overflow-y-auto max-h-[85vh] p-6 text-xs bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="text-lg font-display font-bold">{editingProjectId ? "Edit Project Details" : "Add New Project"}</DialogTitle>
              <DialogDescription>
                {editingProjectId ? "Modify the information of your showcase project." : "Add new completed films, portfolios, commercials to showcase."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddProjectDirect} className="space-y-4 pt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Project Title *</label>
                  <Input
                    placeholder="e.g. Baahubali Re-VFX"
                    className="bg-surface-elevated border-border/80 h-9"
                    value={newProjForm.title}
                    onChange={(e) => setNewProjForm({ ...newProjForm, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Release Year *</label>
                  <Input
                    placeholder="e.g. 2024"
                    className="bg-surface-elevated border-border/80 h-9"
                    value={newProjForm.year}
                    onChange={(e) => setNewProjForm({ ...newProjForm, year: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Studio's Role / Contribution *</label>
                <Input
                  placeholder="e.g. Lead Colorist & CGI Post Facility"
                  className="bg-surface-elevated border-border/80 h-9"
                  value={newProjForm.role}
                  onChange={(e) => setNewProjForm({ ...newProjForm, role: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Short Project Description</label>
                <Textarea
                  placeholder="Explain production scales, technology used, cameras, and budget..."
                  className="bg-surface-elevated border-border/80 min-h-16 text-xs"
                  value={newProjForm.description}
                  onChange={(e) => setNewProjForm({ ...newProjForm, description: e.target.value })}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold">
                  {!editingProjectId && <Plus className="h-4 w-4 mr-1.5" />}
                  <span>{editingProjectId ? "Save Changes" : "Add Project Entry"}</span>
                </Button>
              </div>
            </form>

            <div className="flex justify-end pt-4 border-t border-border/60 mt-4">
              <Button type="button" variant="outline" className="border-border/80 bg-surface-elevated" onClick={() => setIsEditProjectsOpen(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* UPLOAD MEDIA DIALOG */}
        <Dialog open={isUploadMediaOpen} onOpenChange={setIsUploadMediaOpen}>
          <DialogContent className="max-w-md p-6 bg-card border-border/80 shadow-noir">
            <DialogHeader>
              <DialogTitle className="text-lg font-display font-bold text-foreground">Upload Studio Media</DialogTitle>
              <DialogDescription>Select or drag and drop an image from your system folders/gallery to showcase in your studio media section.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-xl p-8 bg-surface-elevated hover:border-primary/50 cursor-pointer transition-all duration-200">
                <Upload className="h-10 w-10 text-primary mb-2" />
                <span className="text-sm font-semibold text-foreground">Choose file or drag here</span>
                <span className="text-xs text-muted-foreground mt-1">Supports PNG, JPG, JPEG, GIF</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64String = reader.result as string;
                      if (!viewingCompany) return;
                      const updated = {
                        ...viewingCompany,
                        gallery: [...(viewingCompany.gallery || []), base64String]
                      };
                      updateViewingCompany(updated);
                      setIsUploadMediaOpen(false);
                      toast({ title: "Media uploaded!", description: "Your image has been added to the studio gallery." });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border/60"></div>
                <span className="flex-shrink mx-4 text-muted-foreground text-xs font-mono font-semibold">OR</span>
                <div className="flex-grow border-t border-border/60"></div>
              </div>

              <form onSubmit={handleAddMediaUrl} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground text-xs">Image Web URL</label>
                  <Input
                    type="url"
                    placeholder="e.g. https://images.unsplash.com/photo-..."
                    className="bg-surface-elevated border-border/80 h-9"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="ghost" onClick={() => setIsUploadMediaOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover font-bold">Add Image URL</Button>
                </DialogFooter>
              </form>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
