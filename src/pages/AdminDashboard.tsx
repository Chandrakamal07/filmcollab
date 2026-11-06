import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  FileText, 
  BarChart3, 
  Shield,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar
} from "recharts";

interface UserTrendPoint {
  name: string;
  users: number;
}

interface CategoryPoint {
  name: string;
  value: number;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalProjects: 0,
    totalTickets: 0,
    totalTeamMembers: 0,
    totalCategories: 0,
    userTrendData: [] as UserTrendPoint[],
    categoryData: [] as CategoryPoint[],
  });

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // 1. Fetch profiles to compute users, team members, registration trend, and categories
        const { data: profiles, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, created_at, category, role");
        
        if (profilesErr) throw profilesErr;

        // 2. Fetch jobs count
        const { count: jobsCount } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true });
        
        // 3. Fetch projects count
        const { count: projectsCount } = await supabase
          .from("projects")
          .select("id", { count: "exact", head: true });

        // 4. Fetch tickets count
        const { count: ticketsCount } = await supabase
          .from("tickets")
          .select("id", { count: "exact", head: true });

        // 5. Fetch active staff members from admin_team_members & user_roles
        const [{ data: teamRows }, { data: roleRows }] = await Promise.all([
          supabase.from("admin_team_members").select("profile_id, status"),
          supabase.from("user_roles").select("user_id, role"),
        ]);

        const profilesList = profiles || [];
        const totalUsers = profilesList.length;
        const totalJobs = jobsCount || 0;
        const totalProjects = projectsCount || 0;
        const totalTickets = ticketsCount || 0;

        // Total team members (Active staff across admin_team_members, user_roles, and profiles.role)
        const activeStaffIds = new Set<string>();
        profilesList.forEach(p => {
          if (["admin", "moderator", "support"].includes(p.role?.toLowerCase() || "")) {
            activeStaffIds.add(p.id);
          }
        });
        (teamRows || []).forEach((t: any) => {
          if (t.profile_id && (t.status || "active").toLowerCase() === "active") {
            activeStaffIds.add(t.profile_id);
          }
        });
        (roleRows || []).forEach((r: any) => {
          if (r.user_id && ["admin", "moderator", "support"].includes((r.role || "").toLowerCase())) {
            activeStaffIds.add(r.user_id);
          }
        });
        const totalTeamMembers = activeStaffIds.size;

        // Calculate unique categories from profiles
        const uniqueCategoriesSet = new Set(
          profilesList.map(p => p.category).filter(Boolean)
        );
        const totalCategories = uniqueCategoriesSet.size;

        // Group users by category for distribution
        const categoryCounts: Record<string, number> = {};
        profilesList.forEach(p => {
          const cat = p.category || "Unassigned";
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        });

        const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
          name: name.length > 18 ? name.substring(0, 18) + "..." : name,
          value
        })).sort((a, b) => b.value - a.value);

        // Group users by registration date for user trend
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const registrationTrend: Record<string, number> = {};

        profilesList.forEach(p => {
          if (p.created_at) {
            const d = new Date(p.created_at);
            const month = monthNames[d.getMonth()] + " " + d.getFullYear().toString().substring(2);
            registrationTrend[month] = (registrationTrend[month] || 0) + 1;
          }
        });

        const userTrendData = Object.entries(registrationTrend).map(([name, value]) => ({
          name,
          users: value
        })).sort((a, b) => {
          return new Date(a.name) > new Date(b.name) ? 1 : -1;
        });

        setStats({
          totalUsers,
          totalJobs,
          totalProjects,
          totalTickets,
          totalTeamMembers,
          totalCategories,
          userTrendData,
          categoryData,
        });
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const adminStats = [
    {
      title: "Total Users",
      value: loading ? "..." : stats.totalUsers,
      icon: Users,
      description: "Active members in platform",
      color: "text-primary"
    },
    {
      title: "Total Jobs",
      value: loading ? "..." : stats.totalJobs,
      icon: FileText,
      description: "Career opportunities",
      color: "text-primary"
    },
    {
      title: "Total Projects",
      value: loading ? "..." : stats.totalProjects,
      icon: FileText,
      description: "Film & creative listings",
      color: "text-primary"
    },
    {
      title: "Total Tickets",
      value: loading ? "..." : stats.totalTickets,
      icon: Shield,
      description: "Pending support requests",
      color: "text-primary"
    },
    {
      title: "Total Team Members",
      value: loading ? "..." : stats.totalTeamMembers,
      icon: Users,
      description: "Authorized administrators",
      color: "text-primary"
    },
    {
      title: "Total Categories",
      value: loading ? "..." : stats.totalCategories,
      icon: FileText,
      description: "Creative industry sectors",
      color: "text-primary"
    }
  ];

  return (
    <AdminLayout pageTitle="Admin Dashboard">
      <div className="space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/60 pb-5">
          <div>
            <p className="noir-eyebrow mb-1">Executive Command</p>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
              Welcome back, {profile?.first_name || profile?.full_name || 'Admin'}!
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Here is your live system overview, user registration growth, and category distributions.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminStats.map((stat, index) => (
            <Card key={index} className="noir-card border-border/80 bg-card hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Registration Trend Graph */}
          <Card className="noir-card border-border/80 bg-card">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2 text-xl font-display font-bold">
                <TrendingUp className="h-5 w-5 text-primary" />
                User Registration Trend
              </CardTitle>
              <CardDescription>
                Growth of creative users on the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.userTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E9B457" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#E9B457" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))"
                    }}
                    labelClassName="font-semibold text-foreground"
                  />
                  <Area type="monotone" dataKey="users" stroke="#E9B457" strokeWidth={2} fillOpacity={1} fill="url(#userGrowthGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Users by Category Distribution Graph */}
          <Card className="noir-card border-border/80 bg-card">
            <CardHeader className="border-b border-border/60">
              <CardTitle className="flex items-center gap-2 text-xl font-display font-bold">
                <BarChart3 className="h-5 w-5 text-primary" />
                Users by Category
              </CardTitle>
              <CardDescription>
                Distribution of creative skills across registered users
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] pt-6">
              {stats.categoryData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No categories recorded yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.categoryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))"
                      }}
                      labelClassName="font-semibold text-foreground"
                    />
                    <Bar dataKey="value" name="Users" fill="#E9B457" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
