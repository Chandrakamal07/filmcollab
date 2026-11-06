import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  Briefcase,
  Heart,
  Users,
  FolderOpen,
  Calendar,
  ArrowRight,
  ChevronRight,
  Plus,
  MessageSquare,
  CheckSquare,
  MapPin,
  Sparkles,
  Bell,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  DimensionalCard,
  DimensionalLayer,
  FadeInSection,
  StaggerItem,
} from "@/components/ui/motion-primitives";
import { motion } from "motion/react";

const FALLBACK_OPPORTUNITIES = [
  {
    id: "opp-1",
    title: "Cinematographer (Short Film)",
    company: "Monsoon Letters",
    location: "Mumbai, India",
    type: "Paid",
    craft: "Cinematography",
    posted: "2 days ago",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "opp-2",
    title: "Editor (Feature)",
    company: "The Last Hill",
    location: "Remote",
    type: "Paid",
    craft: "Editing",
    posted: "4 days ago",
    image:
      "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "opp-3",
    title: "Production Assistant",
    company: "Blue Mango Films",
    location: "Bangalore, India",
    type: "Non-paid",
    craft: "Production",
    posted: "5 days ago",
    image:
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&auto=format&fit=crop&q=80",
  },
];

export default function Dashboard() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [connectionsCount, setConnectionsCount] = React.useState("0");
  const [profileLikesCount, setProfileLikesCount] = React.useState("0");
  const [projectsCount, setProjectsCount] = React.useState("0");
  const [jobsAppliedCount, setJobsAppliedCount] = React.useState("0");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dashboardEvents, setDashboardEvents] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [featuredProject, setFeaturedProject] = React.useState<any | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [liveJobs, setLiveJobs] = React.useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [attentionItems, setAttentionItems] = React.useState<any[]>([]);
  const [projectQuickTab, setProjectQuickTab] = React.useState<"Overview" | "Tasks" | "Team" | "Files">("Overview");

  React.useEffect(() => {
    if (!loading && isAdmin && isAdmin()) {
      navigate("/admin-dashboard", { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  React.useEffect(() => {
    const profileDbId = profile?.id;
    const currentUserId = user?.id || profile?.user_id || profileDbId;

    // Fetch latest active project owned by or joined by current user
    if (currentUserId) {
      const fetchFeaturedProject = async () => {
        try {
          const { data, error } = await supabase
            .from("projects")
            .select("*")
            .eq("created_by", currentUserId)
            .order("created_at", { ascending: false })
            .limit(1);

          if (!error && data && data.length > 0) {
            setFeaturedProject(data[0]);
          } else {
            // Check joined projects
            const { data: memberProjects } = await supabase
              .from("project_members")
              .select("project_id, projects(*)")
              .eq("user_id", currentUserId)
              .limit(1);

            if (memberProjects && memberProjects.length > 0 && (memberProjects[0] as any).projects) {
              setFeaturedProject((memberProjects[0] as any).projects);
            } else {
              setFeaturedProject(null);
            }
          }
        } catch {
          setFeaturedProject(null);
        }
      };
      fetchFeaturedProject();
    }

    // Fetch latest opportunities for "Opportunities for you"
    supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setLiveJobs(data);
        }
      });

    if (profileDbId) {
      // Connections
      supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${profileDbId},connected_user_id.eq.${profileDbId}`)
        .then(({ count, error }) => {
          if (!error && count !== null) {
            setConnectionsCount(count.toString());
          }
        });

      // Profile Likes
      supabase
        .from("user_likes")
        .select("id", { count: "exact", head: true })
        .eq("liked_user_id", profileDbId)
        .then(({ count, error }) => {
          if (!error && count !== null) {
            setProfileLikesCount(count.toString());
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } else if ((profile as any)?.likes_count !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setProfileLikesCount(((profile as any).likes_count || 0).toString());
          }
        });
    }

    if (currentUserId) {
      // Projects and Jobs Applied
      Promise.all([
        supabase.from("projects").select("id").eq("created_by", currentUserId),
        supabase.from("project_members").select("project_id").eq("user_id", currentUserId),
        supabase
          .from("job_applications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", currentUserId),
      ])
        .then(([createdRes, joinedRes, jobsRes]) => {
          const pSet = new Set<string>();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (createdRes.data || []).forEach((r: any) => pSet.add(r.id));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (joinedRes.data || []).forEach((r: any) => pSet.add(r.project_id));
          setProjectsCount(pSet.size.toString());

          const dbJobsCount = jobsRes.count || 0;
          setJobsAppliedCount(dbJobsCount.toString());
        })
        .catch((err) => {
          console.error("Error fetching dashboard counts:", err);
        });

      // Events
      supabase
        .from("industry_events")
        .select("*")
        .order("date", { ascending: true })
        .limit(4)
        .then(({ data }) => {
          if (data) {
            setDashboardEvents(data);
          }
        });

      // Attention Items (real unread notifications)
      const targetNotifyId = profileDbId || currentUserId;
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", targetNotifyId)
        .order("created_at", { ascending: false })
        .limit(4)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const mapped = data.map((n: any) => {
              let Icon = Bell;
              if (n.type === 'message') Icon = MessageSquare;
              else if (n.type === 'job') Icon = Users;
              else if (n.type === 'booking') Icon = MapPin;
              else if (n.type === 'project') Icon = CheckSquare;
              return {
                icon: Icon,
                title: n.title || "Notification",
                subtitle: n.description || "",
                time: formatRelativeTime(n.created_at),
                href: n.action_url || "/notifications"
              };
            });
            setAttentionItems(mapped);
          } else {
            setAttentionItems([]);
          }
        }, () => setAttentionItems([]));
    }
  }, [profile, user]);

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return "Recently";
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 24) return `${Math.max(1, diffHours)}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "Recently";
    }
  };

  const activeProjectTitle = featuredProject?.title || "No Active Production";
  const activeProjectSub = featuredProject
    ? `${featuredProject.project_type || featuredProject.type || "Production"} • ${featuredProject.status || "In Development"}`
    : "Create or join a slate to collaborate";
  const activeProjectRoute = featuredProject?.id
    ? `/projects/${featuredProject.id}`
    : "/projects";

  const opportunityRows =
    liveJobs.length > 0
      ? liveJobs.map((job, idx) => ({
        id: job.id,
        title: job.job_title || job.title || "Production Crew Role",
        company: job.company_name || job.company || "Studio Production",
        location: job.location || "Mumbai, India",
        type: job.salary_min ? `₹${job.salary_min.toLocaleString()}` : (job.job_type || "Paid"),
        craft: job.industry || job.skills_required?.[0] || job.category || job.type || "Production",
        posted: formatRelativeTime(job.posted_date || job.created_at),
        image:
          FALLBACK_OPPORTUNITIES[idx % FALLBACK_OPPORTUNITIES.length].image,
      }))
      : FALLBACK_OPPORTUNITIES;

  const stats = [
    {
      title: "Profile Likes",
      value: profileLikesCount,
      icon: Heart,
      description: "Audience appreciations",
      href: "/profile",
    },
    {
      title: "Connections",
      value: connectionsCount,
      icon: Users,
      description: "Verified network",
      href: "/connections",
    },
    {
      title: "Projects",
      value: projectsCount,
      icon: FolderOpen,
      description: "Active & wrapped slates",
      href: "/projects",
    },
    {
      title: "Jobs Applied",
      value: jobsAppliedCount,
      icon: Briefcase,
      description: "Crew & casting submissions",
      href: "/jobs",
    },
  ];

  return (
    <AppLayout pageTitle="Your creative workspace">
      <div className="space-y-6 max-w-[1360px] mx-auto pb-8">
        {/* 02 / DASHBOARD — HEADER BAR */}
        <FadeInSection className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Your creative workspace
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Plan. Collaborate. Create. Welcome back,{" "}
              <span className="text-foreground font-medium">
                {profile?.first_name || profile?.full_name || "Filmmaker"}
              </span>
              .
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/projects")}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-semibold shadow-[0_6px_22px_rgba(233,180,87,0.28)]"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New project
            </Button>
          </div>
        </FadeInSection>

        {/* TOP STAGE: "Continue your project" Widescreen Split Container (Matches 02 / Dashboard) */}
        <FadeInSection delay={0.04}>
          <div className="rounded-2xl border border-white/[0.08] bg-[#15171B] p-5 sm:p-6 shadow-noir">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Continue your project
              </h2>
              <button
                type="button"
                onClick={() => navigate("/projects")}
                className="text-xs font-medium text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
              >
                All slates
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              {/* Left 8 Columns: Dimensional Widescreen Project Banner + Sub-Tabs */}
              <div className="lg:col-span-8 flex flex-col justify-between">
                <DimensionalCard
                  maxTilt={4.5}
                  onClick={() => navigate(activeProjectRoute)}
                  className="cursor-pointer overflow-hidden rounded-xl border-white/[0.1] bg-[#101114] group"
                >
                  <DimensionalLayer depth={14} className="relative h-52 sm:h-60 w-full overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=85"
                      alt={activeProjectTitle}
                      className="w-full h-full object-cover object-center transition-transform duration-700 ease-noir group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E11] via-[#0D0E11]/45 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0D0E11]/80 via-transparent to-transparent" />

                    <div className="absolute top-3.5 left-4">
                      <Badge className="bg-black/65 backdrop-blur-md text-primary border border-primary/35 font-mono text-[10px] uppercase tracking-wider">
                        ACTIVE SLATE
                      </Badge>
                    </div>

                    <div className="absolute bottom-4 inset-x-5 flex items-end justify-between gap-4">
                      <div>
                        <h3 className="font-display text-2xl sm:text-3xl font-semibold text-foreground tracking-tight drop-shadow">
                          {activeProjectTitle}
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 capitalize">
                          {activeProjectSub}
                        </p>
                      </div>
                      <div className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </DimensionalLayer>
                </DimensionalCard>

                {/* Animated Project Sub-Tab Bar (Overview | Tasks | Team | Files) */}
                <div className="flex items-center gap-6 border-b border-white/[0.07] mt-4 px-1">
                  {(["Overview", "Tasks", "Team", "Files"] as const).map((tab) => {
                    const active = projectQuickTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setProjectQuickTab(tab)}
                        className={`relative pb-2.5 text-xs sm:text-sm font-medium transition-colors ${active
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                          }`}
                      >
                        {tab}
                        {active && (
                          <motion.span
                            layoutId="dashboard-project-subtab"
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                            className="absolute inset-x-0 -bottom-[1px] h-[2px] rounded-full bg-primary"
                          />
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const targetView = projectQuickTab.toLowerCase();
                      let url = "/projects";
                      if (featuredProject?.id) {
                        if (targetView === "files") {
                          url = `/directory?project=${featuredProject.id}`;
                        } else {
                          url = `/projects/${featuredProject.id}?view=${targetView}`;
                        }
                      }
                      navigate(url);
                    }}
                    className="ml-auto pb-2.5 text-xs font-mono text-primary hover:underline"
                  >
                    Open {projectQuickTab} →
                  </button>
                </div>
              </div>

              {/* Right 4 Columns: "Next action" & "Upcoming" Cards (Matches 02 / Dashboard) */}
              <div className="lg:col-span-4 flex flex-col justify-between gap-3.5">
                <div>
                  <span className="text-xs font-medium text-muted-foreground block mb-2">
                    Next action
                  </span>
                  <div
                    onClick={() => navigate(activeProjectRoute)}
                    className="cursor-pointer rounded-xl border border-white/[0.08] bg-[#1B1D22] hover:border-primary/40 hover:bg-[#202329] p-4 flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/35 flex items-center justify-center text-primary flex-shrink-0">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          Review applicants
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          12 new applications
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </div>
                </div>

                <div>
                  <span className="text-xs font-medium text-muted-foreground block mb-2">
                    Upcoming
                  </span>
                  <div
                    onClick={() => navigate("/locations")}
                    className="cursor-pointer rounded-xl border border-white/[0.08] bg-[#1B1D22] hover:border-primary/40 hover:bg-[#202329] p-4 flex items-center justify-between gap-3 transition-all group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/35 flex items-center justify-center text-primary flex-shrink-0">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                          {dashboardEvents[0]?.title || "Location scout"}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {dashboardEvents[0]?.date
                            ? new Date(dashboardEvents[0].date).toLocaleDateString("en-US", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                            })
                            : "Sat, 24 May • 10:00 AM"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* MIDDLE 2-COLUMN ASYMMETRIC SPLIT: "Opportunities for you" & "Needs your attention" */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7 Columns: Opportunities for you */}
          <FadeInSection delay={0.08} className="lg:col-span-7">
            <div className="h-full rounded-2xl border border-white/[0.08] bg-[#15171B] p-5 sm:p-6 shadow-noir flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">
                    Opportunities for you
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate("/jobs")}
                    className="text-xs font-medium text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
                  >
                    View all
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {opportunityRows.map((opp, index) => (
                    <StaggerItem key={opp.id || index} index={index}>
                      <DimensionalCard
                        maxTilt={4}
                        onClick={() => {
                          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(opp.id || "");
                          navigate(isUuid ? `/jobs/${opp.id}` : "/jobs");
                        }}
                        className="cursor-pointer p-3 rounded-xl bg-[#1A1C21] border-white/[0.07] hover:border-primary/40 group"
                      >
                        <DimensionalLayer depth={12} className="flex items-center gap-4">
                          <div className="w-24 sm:w-28 h-16 sm:h-18 rounded-lg overflow-hidden flex-shrink-0 relative bg-surface-elevated">
                            <img
                              src={opp.image}
                              alt={opp.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                  {opp.title}
                                </h3>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {opp.company}
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="hidden sm:inline-flex bg-white/[0.06] text-foreground/85 border-white/[0.1] text-[10px] font-normal px-2.5 py-0.5"
                              >
                                {opp.craft}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between gap-2 mt-2 text-xs text-muted-foreground">
                              <span>
                                {opp.location} • <span className="text-foreground/90">{opp.type}</span>
                              </span>
                              <span className="font-mono text-[11px] text-muted-foreground/80">
                                {opp.posted}
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                        </DimensionalLayer>
                      </DimensionalCard>
                    </StaggerItem>
                  ))}
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* Right 5 Columns: Needs your attention */}
          <FadeInSection delay={0.12} className="lg:col-span-5">
            <div className="h-full rounded-2xl border border-white/[0.08] bg-[#15171B] p-5 sm:p-6 shadow-noir flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-foreground">
                    Needs your attention
                  </h2>
                  <button
                    type="button"
                    onClick={() => navigate("/notifications")}
                    className="text-xs font-medium text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors"
                  >
                    View all
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {attentionItems.length > 0 ? (
                    attentionItems.map((item, idx) => (
                      <StaggerItem key={idx} index={idx}>
                        <div
                          onClick={() => navigate(item.href)}
                          className="cursor-pointer rounded-xl border border-white/[0.07] bg-[#1A1C21] hover:border-primary/40 hover:bg-[#202329] p-3.5 flex items-center justify-between gap-3 transition-all group"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary flex-shrink-0">
                              <item.icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {item.time}
                            </span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          </div>
                        </div>
                      </StaggerItem>
                    ))
                  ) : (
                    <div className="rounded-xl border border-white/[0.07] bg-[#1A1C21]/60 p-6 text-center">
                      <CheckCircle2 className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                      <p className="text-sm font-medium text-foreground">All caught up</p>
                      <p className="text-xs text-muted-foreground mt-0.5">No pending alerts or notifications requiring attention.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>

        {/* BOTTOM STUDIO TELEMETRY ROW (Preserves all live profile/project/job/connection counts) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <StaggerItem key={stat.title} index={index}>
              <DimensionalCard
                maxTilt={5}
                onClick={() => navigate(stat.href)}
                className="cursor-pointer p-4 sm:p-5 bg-[#15171B] border-white/[0.08]"
              >
                <DimensionalLayer depth={16} className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                      {stat.title}
                    </p>
                    <div className="font-display text-2xl sm:text-3xl font-semibold text-foreground mt-1">
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
                    <stat.icon className="h-4 w-4" />
                  </div>
                </DimensionalLayer>
              </DimensionalCard>
            </StaggerItem>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
