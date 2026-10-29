import React from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  Briefcase,
  Heart,
  Users,
  FolderOpen,
  TrendingUp,
  Calendar,
  Image,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FadeInSection, StaggerItem } from "@/components/ui/motion-primitives";

export default function Dashboard() {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [connectionsCount, setConnectionsCount] = React.useState("0");
  const [profileLikesCount, setProfileLikesCount] = React.useState("0");
  const [projectsCount, setProjectsCount] = React.useState("0");
  const [jobsAppliedCount, setJobsAppliedCount] = React.useState("0");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dashboardEvents, setDashboardEvents] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!loading && isAdmin && isAdmin()) {
      navigate("/admin-dashboard", { replace: true });
    }
  }, [loading, isAdmin, navigate]);

  React.useEffect(() => {
    const profileDbId = profile?.id;
    const currentUserId = user?.id || profile?.user_id || profileDbId;

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
    }
  }, [profile, user]);

  const stats = [
    {
      title: "Profile Likes",
      value: profileLikesCount,
      icon: Heart,
      description: "Total profile likes",
    },
    {
      title: "Connections",
      value: connectionsCount,
      icon: Users,
      description: "Network size",
    },
    {
      title: "Projects",
      value: projectsCount,
      icon: FolderOpen,
      description: "Created & joined",
    },
    {
      title: "Jobs Applied",
      value: jobsAppliedCount,
      icon: Briefcase,
      description: "Total jobs applied",
    },
  ];

  const quickActions = [
    {
      title: "Post a Job",
      description: "Share new opportunities",
      icon: Briefcase,
      href: "/jobs",
    },
    {
      title: "Start Project",
      description: "Create a new collaboration",
      icon: FolderOpen,
      href: "/projects",
    },
    {
      title: "Find Connections",
      description: "Discover new professionals",
      icon: Users,
      href: "/discover",
    },
    {
      title: "Directory",
      description: "Explore portfolio & files",
      icon: Image,
      href: "/directory",
    },
  ];

  return (
    <AppLayout pageTitle="Dashboard">
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Welcome Header */}
        <FadeInSection className="rounded-xl border border-border/80 bg-card p-6 md:p-7 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Studio Command Center
              </span>
              <h1 className="noir-heading-workspace mt-1">
                Welcome back, {profile?.first_name || profile?.full_name || "User"}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Here's what's happening in your film industry network today.
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
                View Profile
              </Button>
              <Button size="sm" onClick={() => navigate("/projects")}>
                Explore Projects
              </Button>
            </div>
          </div>
        </FadeInSection>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {stats.map((stat, index) => (
            <StaggerItem key={index} index={index} liftOnHover>
              <Card className="h-full border-border/80 bg-card hover:border-primary/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className="h-8 w-8 rounded-lg border border-primary/25 bg-primary/10 flex items-center justify-center text-primary">
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="font-display text-3xl font-semibold text-foreground">
                    {stat.value}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <FadeInSection delay={0.05}>
            <Card className="h-full border-border/80 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Get started with these popular actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {quickActions.map((action, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 justify-between text-left border-border/70 bg-surface-elevated/60 hover:bg-surface-hover hover:border-primary/40 group"
                      onClick={() => navigate(action.href)}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="p-2.5 rounded-lg border border-primary/30 bg-primary/12 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          <action.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground text-sm">
                            {action.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {action.description}
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeInSection>

          {/* Events */}
          <FadeInSection delay={0.1}>
            <Card className="h-full border-border/80 bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2.5 text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  Ongoing & Upcoming Events
                </CardTitle>
                <CardDescription>
                  Stay updated with current and upcoming industry events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardEvents.length > 0 ? (
                    dashboardEvents.map((event, index) => {
                      const eventDate = new Date(event.date);
                      const isOngoing =
                        eventDate.toDateString() === new Date().toDateString();
                      const status = isOngoing ? "Live Now" : "Upcoming";
                      const time = event.date;

                      return (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 bg-surface-elevated/50 hover:bg-surface-hover hover:border-primary/35 transition-colors cursor-pointer"
                          onClick={() => navigate("/industry-hub")}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              isOngoing ? "bg-primary animate-pulse" : "bg-primary/60"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="text-sm font-medium text-foreground truncate">
                                {event.title}
                              </div>
                              <Badge
                                variant={isOngoing ? "default" : "outline"}
                                className="text-[11px] whitespace-nowrap"
                              >
                                {status}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                              {event.description}
                            </div>
                            <div className="text-[11px] text-muted-foreground/80 truncate">
                              {event.location} • {time}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-8 border border-dashed border-border/70 rounded-xl">
                      No events found.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </FadeInSection>
        </div>
      </div>
    </AppLayout>
  );
}
