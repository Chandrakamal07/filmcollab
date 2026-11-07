import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Search,
  Plus,
  Calendar,
  MapPin,
  Users,
  Clock,
  UserPlus,
  Share2,
  Bookmark,
  Edit,
  X,
  FileText,
  ChevronLeft,
  MoveLeft,
  MoveRight,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface News {
  id: number | string;
  title: string;
  description: string;
  category: string;
  createdDate: string;
  createdBy: string;
  user_id?: string | null;
}

interface Event {
  id: number | string;
  title: string;
  description: string;
  date: string;
  location: string;
  isOnline: boolean;
  attendees: number;
  price: string;
  createdBy: string;
  user_id?: string | null;
  googleMapsLink?: string | null;
  meetingLink?: string | null;
  registrationLink?: string | null;
}

interface Course {
  id: number | string;
  title: string;
  description: string;
  duration: string;
  instructor: string;
  createdBy: string;
  price: string;
  enrolled: number;
  level: string;
  category: string;
  user_id?: string | null;
  link?: string | null;
  website_link?: string | null;
}

export default function IndustryHubPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("news");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [selectedPostType, setSelectedPostType] = useState("news");
  const [showNewsDetail, setShowNewsDetail] = useState(false);
  const [showEventDetail, setShowEventDetail] = useState(false);
  const [showCourseDetail, setShowCourseDetail] = useState(false);
  const [selectedNews, setSelectedNews] = useState<News | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [createdFilter, setCreatedFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  // Database-backed state lists
  const [newsList, setNewsList] = useState<News[]>([]);
  const [eventsList, setEventsList] = useState<Event[]>([]);
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields state
  const [editingItem, setEditingItem] = useState<{ id: string | number; type: string } | null>(null);
  const [formFields, setFormFields] = useState({
    // News
    newsTitle: "",
    newsCategory: "Technology",
    newsDescription: "",

    // Events
    eventTitle: "",
    eventDate: "",
    eventPrice: "Free",
    eventLocation: "",
    eventType: "In-Person",
    eventDescription: "",
    eventGoogleMapsLink: "",
    eventMeetingLink: "",
    eventRegistrationLink: "",

    // Courses
    courseTitle: "",
    courseDuration: "",
    coursePrice: "",
    courseLevel: "Beginner",
    courseCategory: "Cinematography",
    courseInstructor: "",
    courseDescription: "",
  });

  const sampleNews: News[] = [
    {
      id: 1,
      title: "New Film Technology Revolutionizes Production",
      description: "Latest advancements in film technology are changing how movies are made, offering new creative possibilities for filmmakers.",
      category: "Technology",
      createdDate: "2024-12-15",
      createdBy: "Tech News Team"
    },
    {
      id: 2,
      title: "Streaming Platforms Invest in Regional Content",
      description: "Major streaming platforms are increasing investments in regional language content to capture diverse audiences.",
      category: "Industry",
      createdDate: "2024-12-14",
      createdBy: "Industry Analyst"
    },
    {
      id: 3,
      title: "Virtual Production Takes Center Stage",
      description: "Virtual production techniques are becoming mainstream, offering cost-effective alternatives to traditional filming.",
      category: "Production",
      createdDate: "2024-12-13",
      createdBy: "Production Expert"
    },
    {
      id: 4,
      title: "AI Tools Transform Post-Production",
      description: "Artificial intelligence is revolutionizing post-production workflows, making editing faster and more efficient.",
      category: "Technology",
      createdDate: "2024-12-12",
      createdBy: "AI Specialist"
    }
  ];

  const sampleEvents: Event[] = [
    {
      id: 1,
      title: "Film Industry Networking Event",
      description: "Connect with industry professionals and explore collaboration opportunities in film production.",
      date: "2024-12-20",
      location: "Mumbai, India",
      isOnline: false,
      createdBy: "Film Producers Guild",
      attendees: 45,
      price: "₹500",
      googleMapsLink: "https://maps.google.com/?q=Mumbai",
      registrationLink: "https://example.com/register-networking"
    },
    {
      id: 2,
      title: "Digital Content Creation Workshop",
      description: "Learn the latest techniques in digital content creation and social media marketing.",
      date: "2024-12-25",
      location: "Online",
      isOnline: true,
      createdBy: "Digital Creators Hub",
      attendees: 120,
      price: "₹1,000",
      meetingLink: "https://zoom.us/j/123456789",
      registrationLink: "https://example.com/register-workshop"
    },
    {
      id: 3,
      title: "VFX Masterclass",
      description: "Advanced VFX techniques and industry insights from leading professionals.",
      date: "2024-12-30",
      location: "Bangalore, India",
      isOnline: false,
      createdBy: "VFX Society",
      attendees: 30,
      price: "₹2,500",
      googleMapsLink: "https://maps.google.com/?q=Bangalore",
      registrationLink: "https://example.com/register-vfx"
    },
    {
      id: 4,
      title: "Screenwriting Workshop",
      description: "Master the art of storytelling and script development with industry experts.",
      date: "2025-01-05",
      location: "Delhi, India",
      isOnline: false,
      createdBy: "Screenwriters Association",
      attendees: 25,
      price: "₹3,000",
      googleMapsLink: "https://maps.google.com/?q=Delhi",
      registrationLink: "https://example.com/register-screenwriting"
    }
  ];

  const sampleCourses: Course[] = [
    {
      id: 1,
      title: "Advanced Cinematography",
      description: "Master the art of cinematography with hands-on training and industry insights.",
      duration: "8 weeks",
      instructor: "Rajesh Kumar",
      createdBy: "Film Academy India",
      price: "₹15,000",
      enrolled: 85,
      level: "Advanced",
      category: "Cinematography"
    },
    {
      id: 2,
      title: "Screenwriting Fundamentals",
      description: "Learn the basics of screenwriting and storytelling for film and television.",
      duration: "6 weeks",
      instructor: "Priya Sharma",
      createdBy: "Creative Writing Institute",
      price: "₹8,000",
      enrolled: 120,
      level: "Beginner",
      category: "Writing"
    },
    {
      id: 3,
      title: "Digital Marketing for Filmmakers",
      description: "Essential digital marketing strategies for promoting films and building audience.",
      duration: "4 weeks",
      instructor: "Amit Patel",
      createdBy: "Digital Marketing Pro",
      price: "₹6,000",
      enrolled: 95,
      level: "Intermediate",
      category: "Marketing"
    },
    {
      id: 4,
      title: "Film Production Management",
      description: "Comprehensive course on managing film productions from pre to post-production.",
      duration: "10 weeks",
      instructor: "Deepak Verma",
      createdBy: "Production Management Institute",
      price: "₹20,000",
      enrolled: 45,
      level: "Advanced",
      category: "Production"
    }
  ];

  // Fetch dynamic database data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch news
      const { data: newsData, error: newsError } = await supabase
        .from("industry_news")
        .select("*")
        .order("created_at", { ascending: false });

      if (newsError) {
        console.warn("Could not fetch industry_news (table might not exist yet)", newsError);
      } else if (newsData) {
        const mappedNews: News[] = (newsData as any[]).map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          createdDate: new Date(item.created_at).toISOString().split('T')[0],
          createdBy: item.created_by,
          user_id: item.user_id
        }));
        setNewsList(mappedNews);
      }

      // 2. Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from("industry_events")
        .select("*")
        .order("created_at", { ascending: false });

      if (eventsError) {
        console.warn("Could not fetch industry_events (table might not exist yet)", eventsError);
      } else if (eventsData) {
        const mappedEvents: Event[] = (eventsData as any[]).map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          date: item.date,
          location: item.location,
          isOnline: item.is_online,
          attendees: item.attendees || 0,
          price: item.price,
          createdBy: item.created_by,
          user_id: item.user_id,
          googleMapsLink: item.google_maps_link || null,
          meetingLink: item.meeting_link || null,
          registrationLink: item.registration_link || null
        }));
        setEventsList(mappedEvents);
      }

      // 3. Fetch courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("industry_courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (coursesError) {
        console.warn("Could not fetch industry_courses (table might not exist yet)", coursesError);
      } else if (coursesData) {
        const mappedCourses: Course[] = (coursesData as any[]).map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          duration: item.duration,
          instructor: item.instructor,
          createdBy: item.created_by,
          price: item.price,
          enrolled: item.enrolled || 0,
          level: item.level,
          category: item.category,
          user_id: item.user_id,
          website_link: item.website_link || item.link || null,
          link: item.link || item.website_link || null
        }));
        setCoursesList(mappedCourses);
      }
    } catch (err) {
      console.error("Error in fetchData", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const createType = params.get("create");
    if (createType === "events" || createType === "courses") {
      setSelectedPostType(createType);
      // setShowCreatePopup(true);
      // Clean up URL query parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("eventId");
    if (eventId) {
      const foundEvent = (eventsList.length > 0 ? eventsList : sampleEvents).find(e => e.id === eventId);
      if (foundEvent) {
        setSelectedEvent(foundEvent);
        setShowEventDetail(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    const courseId = params.get("courseId");
    if (courseId) {
      const foundCourse = (coursesList.length > 0 ? coursesList : sampleCourses).find(c => c.id === courseId);
      if (foundCourse) {
        setSelectedCourse(foundCourse);
        setShowCourseDetail(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [eventsList, coursesList]);

  // Determine lists to show (fall back to static samples if DB tables don't exist yet or are completely empty)
  const displayNews = newsList.length > 0 ? newsList : sampleNews;
  const displayEvents = eventsList.length > 0 ? eventsList : sampleEvents;
  const displayCourses = coursesList.length > 0 ? coursesList : sampleCourses;

  const filteredNews = displayNews.filter(news =>
    news.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    news.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    news.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEvents = displayEvents.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCourses = displayCourses.filter(course =>
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.instructor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Owned created content filter
  const myNews = newsList.filter(item => item.user_id === user?.id);
  const myEvents = eventsList.filter(item => item.user_id === user?.id);
  const myCourses = coursesList.filter(item => item.user_id === user?.id);
  const totalMyItems = myNews.length + myEvents.length + myCourses.length;

  const allMyItems = [
    ...myNews.map(item => ({ ...item, type: "news" })),
    ...myEvents.map(item => ({ ...item, type: "events", category: "Event", createdDate: item.date })),
    ...myCourses.map(item => ({ ...item, type: "courses", createdDate: "N/A" }))
  ];

  // Apply created tab filter
  const filteredMyItems = allMyItems.filter(item => {
    if (createdFilter !== "all" && item.type !== createdFilter) return false;

    // Apply date range
    if (dateRange.from && item.createdDate !== "N/A" && item.createdDate < dateRange.from) return false;
    if (dateRange.to && item.createdDate !== "N/A" && item.createdDate > dateRange.to) return false;

    return true;
  });

  // Navigation for news
  const currentNewsIndex = selectedNews ? filteredNews.findIndex(n => n.id === selectedNews.id) : -1;
  const hasPrevNews = currentNewsIndex > 0;
  const hasNextNews = currentNewsIndex !== -1 && currentNewsIndex < filteredNews.length - 1;

  const handlePrevNews = () => {
    if (hasPrevNews) {
      setSelectedNews(filteredNews[currentNewsIndex - 1]);
    }
  };

  const handleNextNews = () => {
    if (hasNextNews) {
      setSelectedNews(filteredNews[currentNewsIndex + 1]);
    }
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormFields({
      newsTitle: "",
      newsCategory: "Technology",
      newsDescription: "",
      eventTitle: "",
      eventDate: "",
      eventPrice: "Free",
      eventLocation: "",
      eventType: "In-Person",
      eventDescription: "",
      eventGoogleMapsLink: "",
      eventMeetingLink: "",
      eventRegistrationLink: "",
      courseTitle: "",
      courseDuration: "",
      coursePrice: "",
      courseLevel: "Beginner",
      courseCategory: "Cinematography",
      courseInstructor: "",
      courseDescription: "",
    });
  };

  const handleEditClick = (item: any, type: string) => {
    navigate(`/industry-hub/new?type=${type}&edit=${item.id}`);
  };

  const handleDelete = async (id: string | number, type: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      let table = "";
      if (type === "news") table = "industry_news";
      else if (type === "events") table = "industry_events";
      else if (type === "courses") table = "industry_courses";

      const { error } = await (supabase as any)
        .from(table)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Deleted successfully", description: "Your post was deleted from the Industry Hub." });
      fetchData();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      toast({
        title: "Error deleting item",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to post content.",
        variant: "destructive"
      });
      return;
    }

    const creatorName = profile?.full_name || user.email || "Anonymous";

    setLoading(true);
    try {
      if (selectedPostType === "news") {
        if (!formFields.newsTitle.trim() || !formFields.newsDescription.trim()) {
          toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
          setLoading(false);
          return;
        }

        const payload = {
          title: formFields.newsTitle,
          category: formFields.newsCategory,
          description: formFields.newsDescription,
          created_by: creatorName,
          user_id: user.id
        };

        if (editingItem && editingItem.type === "news") {
          const { error } = await supabase
            .from("industry_news")
            .update(payload)
            .eq("id", String(editingItem.id));

          if (error) throw error;
          toast({ title: "News updated successfully" });
        } else {
          const { error } = await supabase
            .from("industry_news")
            .insert([payload]);

          if (error) throw error;
          toast({ title: "News posted successfully" });
        }
      } else if (selectedPostType === "events") {
        if (!formFields.eventTitle.trim() || !formFields.eventDate || !formFields.eventLocation.trim() || !formFields.eventDescription.trim()) {
          toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
          setLoading(false);
          return;
        }

        // Additional validation based on type
        if (formFields.eventType === "In-Person" && !formFields.eventLocation.trim()) {
          toast({ title: "Validation Error", description: "Please enter a location/address for the in-person event.", variant: "destructive" });
          setLoading(false);
          return;
        } else if (formFields.eventType === "Online" && !formFields.eventMeetingLink.trim()) {
          toast({ title: "Validation Error", description: "Please enter a meeting link for the online event.", variant: "destructive" });
          setLoading(false);
          return;
        }

        const payload: Record<string, string | boolean | null | undefined> = {
          title: formFields.eventTitle,
          date: formFields.eventDate,
          price: formFields.eventPrice || "Free",
          location: formFields.eventLocation,
          is_online: formFields.eventType === "Online",
          description: formFields.eventDescription,
          created_by: creatorName,
          user_id: user.id,
          google_maps_link: formFields.eventType === "In-Person" ? (formFields.eventGoogleMapsLink || null) : null,
          meeting_link: formFields.eventType === "Online" ? (formFields.eventMeetingLink || null) : null,
          registration_link: formFields.eventRegistrationLink || null
        };

        if (editingItem && editingItem.type === "events") {
          let { error } = await supabase
            .from("industry_events")
            .update(payload as any)
            .eq("id", String(editingItem.id));

          if (error && error.code === "42703") {
            // Fallback if columns don't exist yet
            console.warn("New event columns don't exist. Falling back to old schema.", error);
            const fallbackPayload = { ...payload };
            delete fallbackPayload.google_maps_link;
            delete fallbackPayload.meeting_link;
            delete fallbackPayload.registration_link;

            const result = await supabase
              .from("industry_events")
              .update(fallbackPayload as any)
              .eq("id", String(editingItem.id));
            error = result.error;

            toast({
              title: "Event updated with limits",
              description: "Event saved successfully. Please run the updated SQL in setup_industry_hub.sql in your Supabase dashboard to support Google Maps, Meeting, and Registration links.",
              variant: "default"
            });
          } else if (error) {
            throw error;
          } else {
            toast({ title: "Event updated successfully" });
          }
        } else {
          let { error } = await supabase
            .from("industry_events")
            .insert([payload as any]);

          if (error && error.code === "42703") {
            // Fallback if columns don't exist yet
            console.warn("New event columns don't exist. Falling back to old schema.", error);
            const fallbackPayload = { ...payload };
            delete fallbackPayload.google_maps_link;
            delete fallbackPayload.meeting_link;
            delete fallbackPayload.registration_link;

            const result = await supabase
              .from("industry_events")
              .insert([fallbackPayload as any]);
            error = result.error;

            toast({
              title: "Event created with limits",
              description: "Event saved successfully. Please run the updated SQL in setup_industry_hub.sql in your Supabase dashboard to support Google Maps, Meeting, and Registration links.",
              variant: "default"
            });
          } else if (error) {
            throw error;
          } else {
            toast({ title: "Event created successfully" });
          }
        }
      } else if (selectedPostType === "courses") {
        if (!formFields.courseTitle.trim() || !formFields.courseDuration.trim() || !formFields.coursePrice.trim() || !formFields.courseInstructor.trim() || !formFields.courseDescription.trim()) {
          toast({ title: "Validation Error", description: "Please fill all required fields", variant: "destructive" });
          setLoading(false);
          return;
        }

        const payload = {
          title: formFields.courseTitle,
          duration: formFields.courseDuration,
          price: formFields.coursePrice,
          instructor: formFields.courseInstructor,
          level: formFields.courseLevel,
          category: formFields.courseCategory,
          description: formFields.courseDescription,
          created_by: creatorName,
          user_id: user.id
        };

        if (editingItem && editingItem.type === "courses") {
          const { error } = await supabase
            .from("industry_courses")
            .update(payload)
            .eq("id", String(editingItem.id));

          if (error) throw error;
          toast({ title: "Course updated successfully" });
        } else {
          const { error } = await supabase
            .from("industry_courses")
            .insert([payload]);

          if (error) throw error;
          toast({ title: "Course created successfully" });
        }
      }

      // Reset form & reload
      resetForm();
      setShowCreatePopup(false);
      fetchData();
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred while saving. Please ensure the database tables are setup.";
      toast({
        title: "Error saving item",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const isViewingNewsDetail = !!(showNewsDetail && selectedNews);
  const isViewingEventDetail = !!(showEventDetail && selectedEvent);
  const isViewingCourseDetail = !!(showCourseDetail && selectedCourse);
  const isViewingAnyDetail = isViewingNewsDetail || isViewingEventDetail || isViewingCourseDetail;

  return (
    <AppLayout>
      <div className="space-y-4 bg-background min-h-screen p-4 -m-4 text-foreground">
        {/* Header */}
        {!isViewingAnyDetail && (
          <div className="bg-card text-card-foreground p-6 rounded-xl shadow-noir border border-border/80">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="noir-eyebrow mb-1">Editorial & Academy</p>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-1">Industry Hub</h1>
                <p className="text-muted-foreground text-sm">
                  Stay updated with industry news, events, and educational opportunities
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder={`Search ${activeTab === "news" ? "news" : activeTab === "events" ? "events" : "courses"}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 border-border/80 rounded-lg focus:border-primary text-sm bg-surface-elevated text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={selectedPostType} onValueChange={setSelectedPostType}>
                    <SelectTrigger className="w-full sm:w-32 h-9 border-border/80 rounded-lg text-sm bg-surface-elevated text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/80">
                      <SelectItem value="news">News</SelectItem>
                      <SelectItem value="events">Events</SelectItem>
                      <SelectItem value="courses">Courses</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(`/industry-hub/new?type=${selectedPostType}`)}
                    className="h-9 px-3.5 bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg text-sm font-semibold shadow-sm transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Post
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* If viewing a detail, show the detail page. Otherwise, show Tabs + Tab Content */}
        {isViewingNewsDetail && selectedNews ? (
          <div className="bg-card text-card-foreground rounded-xl shadow-noir p-6 border border-border/80 space-y-6">
            {/* News Detail Header */}
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowNewsDetail(false);
                  setSelectedNews(null);
                }}
                className="w-fit flex items-center gap-1.5 text-muted-foreground hover:text-primary hover:bg-surface-elevated transition-colors"
              >
                <ChevronLeft className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Back to Industry Hub</span>
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevNews}
                  disabled={!hasPrevNews}
                  className="flex items-center gap-1 border-border/80 bg-surface-elevated hover:border-primary/50 hover:text-primary text-foreground transition-colors disabled:opacity-50"
                >
                  <MoveLeft className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Previous News</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextNews}
                  disabled={!hasNextNews}
                  className="flex items-center gap-1 border-border/80 bg-surface-elevated hover:border-primary/50 hover:text-primary text-foreground transition-colors disabled:opacity-50"
                >
                  <span className="hidden sm:inline">Next News</span>
                  <MoveRight className="w-4 h-4 sm:ml-1" />
                </Button>
              </div>
            </div>

            {/* News Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                  {selectedNews.category}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">{selectedNews.createdDate}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground leading-tight tracking-tight flex-1">
                  {selectedNews.title}
                </h1>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Link copied!", description: "Industry Hub link copied to clipboard." });
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm font-medium"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share News
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast({ title: "Saved to bookmarks!", description: "You can find saved insights in your profile." })}
                    className="border-border/80 bg-surface-elevated hover:border-primary/50 hover:text-primary text-foreground shadow-sm transition-colors"
                  >
                    <Bookmark className="w-4 h-4 mr-2" />
                    Save to Bookmarks
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-surface-elevated p-3.5 rounded-lg border border-border/80">
                <UserPlus className="w-4 h-4 text-primary" />
                <span>Written by <span className="font-semibold text-foreground">{selectedNews.createdBy}</span></span>
                <span className="mx-2">•</span>
                <Calendar className="w-4 h-4 text-primary" />
                <span>Published on <span className="font-mono">{selectedNews.createdDate}</span></span>
              </div>

              <div className="prose max-w-none dark:prose-invert text-foreground/90 text-base leading-relaxed whitespace-pre-line pt-2">
                {selectedNews.description}
              </div>
            </div>

            {/* News Actions */}
            {user && selectedNews.user_id === user.id && (
              <div className="flex justify-end gap-2 border-t border-border/60 pt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleEditClick(selectedNews, "news");
                    setShowNewsDetail(false);
                  }}
                  className="border-border/80 bg-surface-elevated hover:border-primary/50 hover:text-primary text-foreground"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    handleDelete(selectedNews.id, "news");
                    setShowNewsDetail(false);
                  }}
                  className="text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        ) : isViewingEventDetail && selectedEvent ? (
          <div className="bg-card text-card-foreground rounded-xl shadow-noir p-6 border border-border/80 space-y-6">
            {/* Event Detail Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowEventDetail(false);
                  setSelectedEvent(null);
                }}
                className="w-fit flex items-center gap-1.5 text-muted-foreground hover:text-primary hover:bg-surface-elevated transition-colors"
              >
                <ChevronLeft className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Back to Industry Hub</span>
              </Button>
              {user && selectedEvent.user_id === user.id && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleEditClick(selectedEvent, "events");
                      setShowEventDetail(false);
                    }}
                    className="h-9 px-3 border-border/80 bg-surface-elevated hover:border-primary/50 hover:text-primary text-foreground text-sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleDelete(selectedEvent.id, "events");
                      setShowEventDetail(false);
                    }}
                    className="h-9 px-3 text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {/* Event Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                  {selectedEvent.isOnline ? "Online" : "In-Person"}
                </Badge>
                <Badge variant="outline" className="border-border/80 bg-surface-elevated text-foreground font-mono">
                  {selectedEvent.price}
                </Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground leading-tight tracking-tight flex-1">
                  {selectedEvent.title}
                </h1>
                <div className="flex items-center gap-2 shrink-0">
                  {selectedEvent.registrationLink ? (
                    <a
                      href={selectedEvent.registrationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary text-primary-foreground hover:bg-primary-hover font-semibold rounded-lg text-sm flex items-center justify-center gap-2 h-9 px-4 shadow-sm transition-all"
                    >
                      <Calendar className="w-4 h-4" />
                      Register Now
                    </a>
                  ) : (
                    <Button
                      onClick={() => toast({ title: "Booking successful!", description: `You have successfully booked a spot for: ${selectedEvent.title}` })}
                      className="bg-primary text-primary-foreground hover:bg-primary-hover h-9 px-4 rounded-lg font-semibold text-sm shadow-sm"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Book Now
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Link copied!", description: "Event link copied to clipboard." });
                    }}
                    className="border-border/80 bg-surface-elevated hover:border-primary/50 hover:text-primary h-9 px-4 text-foreground shadow-sm"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Event
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-surface-elevated p-4 rounded-xl border border-border/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/15 rounded-lg text-primary">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date & Time</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{selectedEvent.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/15 rounded-lg text-primary">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-semibold text-foreground truncate max-w-[150px]">{selectedEvent.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/15 rounded-lg text-primary">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attendees</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{selectedEvent.attendees} attending</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/15 rounded-lg text-primary">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Organizer</p>
                    <p className="text-sm font-semibold text-foreground truncate max-w-[150px]">{selectedEvent.createdBy}</p>
                  </div>
                </div>
              </div>

              {/* Links Display Panel */}
              {(selectedEvent.googleMapsLink || selectedEvent.meetingLink || selectedEvent.registrationLink) && (
                <div className="p-5 bg-primary/10 border border-primary/30 rounded-xl space-y-3">
                  <h4 className="text-xs font-mono font-bold text-primary uppercase tracking-wider">Event Resource Links</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    {!selectedEvent.isOnline && selectedEvent.googleMapsLink && (
                      <div className="flex flex-col gap-1 p-3 bg-card text-card-foreground border border-border/80 rounded-lg">
                        <span className="text-xs text-muted-foreground font-medium">Google Maps Directions:</span>
                        <a
                          href={selectedEvent.googleMapsLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-semibold text-sm mt-0.5"
                        >
                          View Map Venue
                          <span className="text-xs">↗</span>
                        </a>
                      </div>
                    )}
                    {selectedEvent.isOnline && selectedEvent.meetingLink && (
                      <div className="flex flex-col gap-1 p-3 bg-card text-card-foreground border border-border/80 rounded-lg">
                        <span className="text-xs text-muted-foreground font-medium">Virtual Meeting Room:</span>
                        <a
                          href={selectedEvent.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-semibold text-sm mt-0.5"
                        >
                          Join Online Link
                          <span className="text-xs">↗</span>
                        </a>
                      </div>
                    )}
                    {selectedEvent.registrationLink && (
                      <div className="flex flex-col gap-1 p-3 bg-card text-card-foreground border border-border/80 rounded-lg">
                        <span className="text-xs text-muted-foreground font-medium">External Registration Form:</span>
                        <a
                          href={selectedEvent.registrationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 font-semibold text-sm mt-0.5"
                        >
                          Registration Portal
                          <span className="text-xs">↗</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="prose max-w-none dark:prose-invert text-foreground/90 text-base leading-relaxed whitespace-pre-line pt-2">
                {selectedEvent.description}
              </div>
            </div>
          </div>
        ) : isViewingCourseDetail && selectedCourse ? (
          <div className="bg-card text-card-foreground rounded-xl shadow-noir p-6 border border-border/80 space-y-6">
            {/* Course Detail Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowCourseDetail(false);
                  setSelectedCourse(null);
                }}
                className="w-fit flex items-center gap-1.5 text-muted-foreground hover:text-primary hover:bg-surface-elevated transition-colors"
              >
                <ChevronLeft className="w-4 h-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Back to Industry Hub</span>
              </Button>
              {user && selectedCourse.user_id === user.id && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleEditClick(selectedCourse, "courses");
                      setShowCourseDetail(false);
                    }}
                    className="h-9 px-3 border-border/80 bg-surface-elevated hover:border-primary/50 hover:text-primary text-foreground text-sm"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleDelete(selectedCourse.id, "courses");
                      setShowCourseDetail(false);
                    }}
                    className="h-9 px-3 text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/10 text-sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {/* Course Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border/80 bg-surface-elevated text-foreground">{selectedCourse.level}</Badge>
                <Badge variant="secondary" className="bg-primary/15 text-primary border border-primary/30">{selectedCourse.category}</Badge>
                <Badge variant="outline" className="text-primary border-primary/30 font-mono font-bold">{selectedCourse.price}</Badge>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground leading-tight tracking-tight flex-1">
                  {selectedCourse.title}
                </h1>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={() => {
                      const targetLink = selectedCourse.website_link || selectedCourse.link;
                      const isValidHttpUrl = (str?: string | null) => {
                        if (!str || !str.startsWith('http')) return false;
                        try {
                          const url = new URL(str);
                          return url.protocol === "http:" || url.protocol === "https:";
                        } catch {
                          return false;
                        }
                      };
                      if (targetLink && targetLink.startsWith('http') && isValidHttpUrl(targetLink)) {
                        window.open(targetLink, '_blank', 'noopener,noreferrer');
                      } else {
                        toast({
                          title: "External Provider Registration",
                          description: `Registration for "${selectedCourse.title}" is hosted externally by the curriculum provider. Link will be made active upon class schedule confirmation.`
                        });
                      }
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary-hover h-9 px-4 rounded-lg font-semibold text-sm shadow-sm"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Register via Provider
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Link copied!", description: "Course link copied to clipboard." });
                    }}
                    className="border-border/80 bg-surface-elevated hover:border-primary/50 hover:text-primary h-9 px-4 text-foreground shadow-sm"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Course
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-surface-elevated p-4 rounded-xl border border-border/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/15 rounded-lg text-primary">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{selectedCourse.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/15 rounded-lg text-primary">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="text-sm font-mono font-semibold text-foreground">{selectedCourse.enrolled} enrolled</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/15 rounded-lg text-primary">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Provider</p>
                    <p className="text-sm font-semibold text-foreground truncate max-w-[150px]">{selectedCourse.createdBy}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary/15 rounded-lg text-primary">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Instructor</p>
                    <p className="text-sm font-semibold text-foreground truncate max-w-[150px]">{selectedCourse.instructor}</p>
                  </div>
                </div>
              </div>

              <div className="prose max-w-none dark:prose-invert text-foreground/90 text-base leading-relaxed whitespace-pre-line pt-2">
                {selectedCourse.description}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="bg-card text-card-foreground rounded-xl shadow-noir border border-border/80">
              <div className="flex w-full overflow-x-auto scrollbar-none border-b border-border/60 px-4">
                {[
                  { id: "news", label: "Industry News", count: filteredNews.length },
                  { id: "events", label: "Events", count: filteredEvents.length },
                  { id: "courses", label: "Courses", count: filteredCourses.length },
                  { id: "created", label: "Created By Me", count: totalMyItems }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3.5 border-b-2 font-medium transition-colors relative flex items-center text-sm whitespace-nowrap shrink-0 ${activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {tab.label}
                    <span className={`ml-2 text-xs font-mono px-1.5 py-0.5 rounded-full ${activeTab === tab.id
                        ? "bg-primary/15 text-primary"
                        : "bg-surface-elevated text-muted-foreground"
                      }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="bg-card text-card-foreground rounded-xl shadow-noir p-5 min-h-[500px] border border-border/80">
              {loading && <div className="text-center py-8 text-sm font-mono text-primary">Loading live updates...</div>}

              {/* Industry News & Insights Tab */}
              {activeTab === "news" && (
                <div className="space-y-4">
                  {filteredNews.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredNews.map((news) => (
                        <Card
                          key={news.id}
                          className="bg-surface-elevated text-card-foreground border border-border/80 hover:border-primary/40 shadow-sm hover:shadow-noir transition-all rounded-xl cursor-pointer flex flex-col justify-between group"
                          onClick={() => {
                            setSelectedNews(news);
                            setShowNewsDetail(true);
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 rounded-md px-2 py-0.5 text-xs">
                                {news.category}
                              </Badge>
                            </div>
                            <CardTitle className="text-lg font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                              {news.title}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground line-clamp-3 mt-1.5 leading-relaxed">
                              {news.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3 mt-2">
                              <div className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3 h-3 text-primary" />
                                <span>{news.createdDate}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <UserPlus className="w-3 h-3 text-primary" />
                                <span className="truncate max-w-[120px]">By {news.createdBy}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-display font-semibold mb-2 text-foreground">No news found</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        {searchQuery ? "Try adjusting your search terms" : "Be the first to share industry insights and news"}
                      </p>
                      {!searchQuery && (
                        <Button
                          onClick={() => navigate('/industry-hub/new?type=news')}
                          className="bg-primary text-primary-foreground hover:bg-primary-hover"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create First News
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Events Tab */}
              {activeTab === "events" && (
                <div className="space-y-4">
                  {filteredEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredEvents.map((event) => (
                        <Card
                          key={event.id}
                          className="bg-surface-elevated text-card-foreground border border-border/80 hover:border-primary/40 shadow-sm hover:shadow-noir transition-all rounded-xl cursor-pointer flex flex-col justify-between group"
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowEventDetail(true);
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                                {event.isOnline ? "Online" : "In-Person"}
                              </Badge>
                              <Badge variant="outline" className="border-border/80 bg-card text-foreground font-mono">
                                {event.price}
                              </Badge>
                            </div>
                            <CardTitle className="text-lg font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {event.title}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground line-clamp-3 mt-1 leading-relaxed">
                              {event.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-1.5 border-t border-border/60 pt-3 mt-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3 text-primary" />
                                  <span>{event.date}</span>
                                </div>
                                <div className="flex items-center gap-1 font-mono">
                                  <Users className="w-3 h-3 text-primary" />
                                  <span>{event.attendees} attending</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-primary" />
                                  <span className="truncate max-w-[110px]">{event.location}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <UserPlus className="w-3 h-3 text-primary" />
                                  <span className="truncate max-w-[110px]">By {event.createdBy}</span>
                                </div>
                              </div>
                              <div className="pt-2">
                                {event.registrationLink ? (
                                  <a
                                    href={event.registrationLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-xs h-8 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold rounded-md flex items-center justify-center gap-1 shadow-sm transition-all"
                                  >
                                    Register Now ↗
                                  </a>
                                ) : (
                                  <Button
                                    size="sm"
                                    className="w-full text-xs h-8 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toast({ title: "Booking successful!", description: `You have successfully booked a spot for: ${event.title}` });
                                    }}
                                  >
                                    Book Now
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-display font-semibold mb-2 text-foreground">No events found</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        {searchQuery ? "Try adjusting your search terms" : "Be the first to create an industry event"}
                      </p>
                      {!searchQuery && (
                        <Button
                          onClick={() => navigate('/industry-hub/new?type=events')}
                          className="bg-primary text-primary-foreground hover:bg-primary-hover"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Event
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Courses Tab */}
              {activeTab === "courses" && (
                <div className="space-y-4">
                  {filteredCourses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredCourses.map((course) => (
                        <Card
                          key={course.id}
                          className="bg-surface-elevated text-card-foreground border border-border/80 hover:border-primary/40 shadow-sm hover:shadow-noir transition-all rounded-xl cursor-pointer flex flex-col justify-between group"
                          onClick={() => {
                            setSelectedCourse(course);
                            setShowCourseDetail(true);
                          }}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="border-border/80 bg-card text-foreground">{course.level}</Badge>
                              <Badge variant="secondary" className="bg-primary/15 text-primary border border-primary/30">{course.category}</Badge>
                            </div>
                            <CardTitle className="text-lg font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {course.title}
                            </CardTitle>
                            <CardDescription className="text-xs text-muted-foreground line-clamp-3 mt-1 leading-relaxed">
                              {course.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-1.5 border-t border-border/60 pt-3 mt-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-primary" />
                                  <span>{course.duration}</span>
                                </div>
                                <div className="flex items-center gap-1 font-mono">
                                  <Users className="w-3 h-3 text-primary" />
                                  <span>{course.enrolled} enrolled</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <UserPlus className="w-3 h-3 text-primary" />
                                  <span className="truncate max-w-[110px]">By {course.createdBy}</span>
                                </div>
                                <span className="font-mono font-semibold text-primary text-xs">{course.price}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                                <UserPlus className="w-3 h-3 text-primary" />
                                <span className="truncate max-w-[180px]">Instructor: {course.instructor}</span>
                              </div>
                              <Button
                                size="sm"
                                className="w-full mt-2 text-xs h-8 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const targetLink = course.website_link || course.link;
                                  const isValidHttpUrl = (str?: string | null) => {
                                    if (!str || !str.startsWith('http')) return false;
                                    try {
                                      const url = new URL(str);
                                      return url.protocol === "http:" || url.protocol === "https:";
                                    } catch {
                                      return false;
                                    }
                                  };
                                  if (targetLink && targetLink.startsWith('http') && isValidHttpUrl(targetLink)) {
                                    window.open(targetLink, '_blank', 'noopener,noreferrer');
                                  } else {
                                    toast({
                                      title: "External Provider Registration",
                                      description: `Registration for "${course.title}" is hosted externally by the curriculum provider. Link will be made active upon class schedule confirmation.`
                                    });
                                  }
                                }}
                              >
                                Register via Provider
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Bookmark className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                      <h3 className="text-lg font-display font-semibold mb-2 text-foreground">No courses found</h3>
                      <p className="text-muted-foreground mb-4 text-sm">
                        {searchQuery ? "Try adjusting your search terms" : "Be the first to create an industry course"}
                      </p>
                      {!searchQuery && (
                        <Button
                          onClick={() => navigate('/industry-hub/new?type=courses')}
                          className="bg-primary text-primary-foreground hover:bg-primary-hover"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Course
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Created Tab */}
              {activeTab === "created" && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-4 items-center justify-between border-b border-border/60 pb-3 mb-2">
                    <div className="flex flex-wrap gap-4 items-center">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-foreground">Filter by:</label>
                        <Select value={createdFilter} onValueChange={setCreatedFilter}>
                          <SelectTrigger className="w-32 bg-surface-elevated border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border/80">
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="news">News</SelectItem>
                            <SelectItem value="events">Events</SelectItem>
                            <SelectItem value="courses">Courses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-foreground">Date Range:</label>
                        <Input
                          type="date"
                          value={dateRange.from}
                          onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                          className="w-40 bg-surface-elevated border-border/80 font-mono text-xs"
                        />
                        <span className="text-sm text-muted-foreground">to</span>
                        <Input
                          type="date"
                          value={dateRange.to}
                          onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                          className="w-40 bg-surface-elevated border-border/80 font-mono text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setDateRange({ from: "", to: "" }); setCreatedFilter("all"); }}
                      className="text-xs h-8 border-border/80 bg-surface-elevated hover:border-primary/40"
                    >
                      Clear Filters
                    </Button>
                  </div>

                  {/* Table */}
                  <div className="border border-border/80 rounded-xl bg-surface-elevated text-card-foreground overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-card border-b border-border/80">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                            <th className="px-4 py-3 text-left text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Created Date</th>
                            <th className="px-4 py-3 text-left text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {filteredMyItems.length > 0 ? (
                            filteredMyItems.map((item) => (
                              <tr key={`${item.type}-${item.id}`} className="hover:bg-card/60 transition-colors">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <Badge variant="outline" className="bg-card text-foreground border-border/80 capitalize">
                                    {item.type}
                                  </Badge>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-foreground max-w-xs truncate">
                                  {item.title}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                  {item.category}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-muted-foreground">
                                  {item.createdDate}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <Badge variant="default" className="bg-primary/15 text-primary border border-primary/30">
                                    Active
                                  </Badge>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleEditClick(item, item.type)}
                                      className="border-border/80 bg-card hover:border-primary/50 hover:text-primary"
                                    >
                                      <Edit className="w-3 h-3 mr-1" />
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDelete(item.id, item.type)}
                                      className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive hover:bg-destructive/10"
                                    >
                                      <X className="w-3 h-3 mr-1" />
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center py-12 text-sm text-muted-foreground">
                                {user ? "You haven't posted any items yet." : "Please sign in to view and manage your posted items."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Unified Create/Edit Popup */}
        {showCreatePopup && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card text-foreground rounded-xl max-w-xl w-full max-h-[85vh] overflow-y-auto border border-border/80 shadow-noir">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
                  <h2 className="text-lg font-display font-bold text-foreground">
                    {editingItem ? "Edit" : "Create"} {selectedPostType === "news" ? "News & Insights" : selectedPostType === "events" ? "Event" : "Course"}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCreatePopup(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Post Type Selector (Only allowed if creating new) */}
                {!editingItem && (
                  <div className="mb-4">
                    <label className="text-sm font-medium mb-1 block text-foreground">Post Type</label>
                    <Select value={selectedPostType} onValueChange={setSelectedPostType}>
                      <SelectTrigger className="w-full bg-surface-elevated border-border/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border/80">
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="events">Events</SelectItem>
                        <SelectItem value="courses">Courses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Dynamic Form Based on Post Type */}
                {selectedPostType === "news" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Title *</label>
                      <Input
                        placeholder="Enter news title"
                        value={formFields.newsTitle}
                        onChange={(e) => setFormFields(prev => ({ ...prev, newsTitle: e.target.value }))}
                        className="bg-surface-elevated border-border/80"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Category *</label>
                      <select
                        className="w-full px-3 py-2 border border-border/80 rounded-md text-sm bg-surface-elevated text-foreground h-10"
                        value={formFields.newsCategory}
                        onChange={(e) => setFormFields(prev => ({ ...prev, newsCategory: e.target.value }))}
                      >
                        <option>Technology</option>
                        <option>Industry</option>
                        <option>Production</option>
                        <option>Marketing</option>
                        <option>Events</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Description *</label>
                      <textarea
                        className="w-full px-3 py-2 border border-border/80 rounded-md text-sm bg-surface-elevated text-foreground min-h-[120px]"
                        placeholder="Enter news description..."
                        value={formFields.newsDescription}
                        onChange={(e) => setFormFields(prev => ({ ...prev, newsDescription: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border/60">
                      <Button
                        disabled={loading}
                        onClick={handleSave}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
                      >
                        {loading ? "Saving..." : editingItem ? "Update News" : "Post News"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreatePopup(false)} className="border-border/80 bg-surface-elevated hover:border-primary/40">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {selectedPostType === "events" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Event Title *</label>
                      <Input
                        placeholder="Enter event title"
                        value={formFields.eventTitle}
                        onChange={(e) => setFormFields(prev => ({ ...prev, eventTitle: e.target.value }))}
                        className="bg-surface-elevated border-border/80"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Date *</label>
                        <Input
                          type="date"
                          value={formFields.eventDate}
                          onChange={(e) => setFormFields(prev => ({ ...prev, eventDate: e.target.value }))}
                          className="bg-surface-elevated border-border/80"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Price *</label>
                        <Input
                          placeholder="e.g., ₹500"
                          value={formFields.eventPrice}
                          onChange={(e) => setFormFields(prev => ({ ...prev, eventPrice: e.target.value }))}
                          className="bg-surface-elevated border-border/80"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Event Type</label>
                      <select
                        className="w-full px-3 py-2 border border-border/80 rounded-md text-sm bg-surface-elevated text-foreground h-10"
                        value={formFields.eventType}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormFields(prev => ({
                            ...prev,
                            eventType: val,
                            eventLocation: val === "Online" ? "Online" : prev.eventLocation === "Online" ? "" : prev.eventLocation
                          }));
                        }}
                      >
                        <option>In-Person</option>
                        <option>Online</option>
                      </select>
                    </div>

                    {formFields.eventType === "In-Person" ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-foreground">Location / Address *</label>
                          <Input
                            placeholder="Enter physical address or venue"
                            value={formFields.eventLocation}
                            onChange={(e) => setFormFields(prev => ({ ...prev, eventLocation: e.target.value }))}
                            className="bg-surface-elevated border-border/80"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-foreground">Google Maps Link</label>
                          <Input
                            placeholder="https://maps.google.com/..."
                            value={formFields.eventGoogleMapsLink}
                            onChange={(e) => setFormFields(prev => ({ ...prev, eventGoogleMapsLink: e.target.value }))}
                            className="bg-surface-elevated border-border/80"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Meeting Link *</label>
                        <Input
                          placeholder="https://zoom.us/j/... or Google Meet link"
                          value={formFields.eventMeetingLink}
                          onChange={(e) => setFormFields(prev => ({ ...prev, eventMeetingLink: e.target.value }))}
                          className="bg-surface-elevated border-border/80"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Registration Link</label>
                      <Input
                        placeholder="https://example.com/register-event"
                        value={formFields.eventRegistrationLink}
                        onChange={(e) => setFormFields(prev => ({ ...prev, eventRegistrationLink: e.target.value }))}
                        className="bg-surface-elevated border-border/80"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Description *</label>
                      <textarea
                        className="w-full px-3 py-2 border border-border/80 rounded-md text-sm bg-surface-elevated text-foreground min-h-[100px]"
                        placeholder="Enter event description..."
                        value={formFields.eventDescription}
                        onChange={(e) => setFormFields(prev => ({ ...prev, eventDescription: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border/60">
                      <Button
                        disabled={loading}
                        onClick={handleSave}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
                      >
                        {loading ? "Saving..." : editingItem ? "Update Event" : "Create Event"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreatePopup(false)} className="border-border/80 bg-surface-elevated hover:border-primary/40">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {selectedPostType === "courses" && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Course Title *</label>
                      <Input
                        placeholder="Enter course title"
                        value={formFields.courseTitle}
                        onChange={(e) => setFormFields(prev => ({ ...prev, courseTitle: e.target.value }))}
                        className="bg-surface-elevated border-border/80"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Duration *</label>
                        <Input
                          placeholder="e.g., 8 weeks"
                          value={formFields.courseDuration}
                          onChange={(e) => setFormFields(prev => ({ ...prev, courseDuration: e.target.value }))}
                          className="bg-surface-elevated border-border/80"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Price *</label>
                        <Input
                          placeholder="e.g., ₹15,000"
                          value={formFields.coursePrice}
                          onChange={(e) => setFormFields(prev => ({ ...prev, coursePrice: e.target.value }))}
                          className="bg-surface-elevated border-border/80"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Level *</label>
                        <select
                          className="w-full px-3 py-2 border border-border/80 rounded-md text-sm bg-surface-elevated text-foreground h-10"
                          value={formFields.courseLevel}
                          onChange={(e) => setFormFields(prev => ({ ...prev, courseLevel: e.target.value }))}
                        >
                          <option>Beginner</option>
                          <option>Intermediate</option>
                          <option>Advanced</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium text-foreground">Category *</label>
                        <select
                          className="w-full px-3 py-2 border border-border/80 rounded-md text-sm bg-surface-elevated text-foreground h-10"
                          value={formFields.courseCategory}
                          onChange={(e) => setFormFields(prev => ({ ...prev, courseCategory: e.target.value }))}
                        >
                          <option>Cinematography</option>
                          <option>Writing</option>
                          <option>Marketing</option>
                          <option>Production</option>
                          <option>Editing</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Instructor *</label>
                      <Input
                        placeholder="Enter instructor name"
                        value={formFields.courseInstructor}
                        onChange={(e) => setFormFields(prev => ({ ...prev, courseInstructor: e.target.value }))}
                        className="bg-surface-elevated border-border/80"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-foreground">Description *</label>
                      <textarea
                        className="w-full px-3 py-2 border border-border/80 rounded-md text-sm bg-surface-elevated text-foreground min-h-[100px]"
                        placeholder="Enter course description..."
                        value={formFields.courseDescription}
                        onChange={(e) => setFormFields(prev => ({ ...prev, courseDescription: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-2 pt-3 border-t border-border/60">
                      <Button
                        disabled={loading}
                        onClick={handleSave}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
                      >
                        {loading ? "Saving..." : editingItem ? "Update Course" : "Create Course"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreatePopup(false)} className="border-border/80 bg-surface-elevated hover:border-primary/40">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
