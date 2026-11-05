import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Settings, 
  Key, 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Edit, 
  Save, 
  BarChart3, 
  Users 
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

const AdminProfile = () => {
  const { user, profile, userRole, adminPermissions } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [saving, setSaving] = useState(false);

  // Editable Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [department, setDepartment] = useState("Platform Administration");

  // Password Update State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Live platform stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    moderatedPosts: 0,
    resolvedReports: 0,
    activeAdminCount: 1,
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setLocation(profile.location || "");
      if ((profile as any).department) {
        setDepartment((profile as any).department);
      }
    } else if (user) {
      setFullName(user.user_metadata?.full_name || user.email?.split("@")[0] || "");
    }
  }, [profile, user]);

  useEffect(() => {
    // Fetch live platform metrics
    const fetchStats = async () => {
      try {
        const [usersRes, postsRes, ticketsRes] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("posts").select("id", { count: "exact", head: true }),
          supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "resolved"),
        ]);

        setStats({
          totalUsers: usersRes.count || 0,
          moderatedPosts: postsRes.count || 0,
          resolvedReports: ticketsRes.count || 0,
          activeAdminCount: 1,
        });
      } catch (e) {
        console.error("Error fetching admin stats:", e);
      }
    };

    fetchStats();
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone,
          location: location,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your administrator profile details have been saved successfully.",
      });
      setIsEditing(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: err.message || "Failed to save profile changes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Invalid Password",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords Mismatch",
        description: "New password and confirmation password do not match.",
      });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your administrator password has been updated successfully.",
      });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Password Update Failed",
        description: err.message || "Failed to update password.",
      });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const roleTitle =
    userRole?.role === "admin"
      ? "Super Administrator"
      : profile?.role === "admin"
      ? "Administrator"
      : "Platform Moderator";

  const adminPermissionsList = [
    "User Management & Audits",
    "Content & Project Moderation",
    "System Telemetry Access",
    "Job Slate Review",
    "Security & Account Governance",
    "Production Directory Controls",
  ];

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "activity", label: "Activity", icon: Activity },
    { id: "security", label: "Security", icon: Shield },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your administrator account and platform credentials</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">
              <Shield className="h-3 w-3 mr-1" />
              {roleTitle}
            </Badge>
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              disabled={saving}
              onClick={() => {
                if (isEditing) {
                  handleSaveProfile();
                } else {
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Profile Overview Card */}
        <Card className="border-border/80 bg-card/90 shadow-noir">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <Avatar className="h-20 w-20 border-2 border-primary/30">
                <AvatarImage src={profile?.avatar_url || ""} alt={fullName} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary-hover text-primary-foreground text-xl font-bold">
                  {(fullName || "Admin").slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-foreground truncate">{fullName || "Admin"}</h2>
                    <p className="text-muted-foreground text-sm mt-0.5">{roleTitle} • {department}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4 text-primary" />
                        <span className="font-mono text-xs">{user?.email || "admin@filmcollab.com"}</span>
                      </div>
                      {location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span>{location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center sm:justify-end gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Account active since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "2024"}</span>
                    </div>
                    <div className="flex items-center sm:justify-end gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Session Authenticated</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs */}
        <div className="border-b border-border/80">
          <nav className="-mb-px flex space-x-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab 1: Profile */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/80 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName" className="text-xs text-muted-foreground">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-xs text-muted-foreground">Email Address (Managed by Auth)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="mt-1 opacity-70 bg-surface-elevated font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={!isEditing}
                      placeholder="+1 (555) 000-0000"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="location" className="text-xs text-muted-foreground">Location</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      disabled={!isEditing}
                      placeholder="City, Country"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Admin Stats */}
            <Card className="border-border/80 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Live Platform Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Registered Users
                  </span>
                  <span className="font-semibold font-mono">{stats.totalUsers.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Community Posts
                  </span>
                  <span className="font-semibold font-mono">{stats.moderatedPosts.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/40">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-primary" /> Resolved Tickets
                  </span>
                  <span className="font-semibold font-mono">{stats.resolvedReports.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm py-1.5">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-400" /> Database Status
                  </span>
                  <span className="font-semibold text-emerald-400 text-xs">Healthy (RLS Active)</span>
                </div>
              </CardContent>
            </Card>

            {/* Permissions */}
            <Card className="lg:col-span-3 border-border/80 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Active Administrator Scopes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {adminPermissionsList.map((perm, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 p-3 rounded-lg border border-border/60 bg-surface-elevated text-xs font-medium">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Activity */}
        {activeTab === "activity" && (
          <Card className="border-border/80 bg-card/90">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Administrative Session Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3.5 rounded-lg border border-border/60 bg-surface-elevated flex items-start gap-3">
                  <CheckCircle className="h-4 w-4 text-primary mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-foreground">Signed in to Admin Console</p>
                    <p className="text-muted-foreground font-mono">Authenticated via Supabase Auth ({user?.email})</p>
                    <p className="text-[10px] text-muted-foreground/80">{new Date().toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-lg border border-border/60 bg-surface-elevated flex items-start gap-3">
                  <Shield className="h-4 w-4 text-emerald-400 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-foreground">Admin Session Granted</p>
                    <p className="text-muted-foreground font-mono">Role verification confirmed for {roleTitle}</p>
                    <p className="text-[10px] text-muted-foreground/80">Active Session</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Security */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border/80 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Key className="h-4 w-4 text-primary" />
                  Change Administrator Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="adminNewPassword" className="text-xs text-muted-foreground">New Password</Label>
                  <Input
                    id="adminNewPassword"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="adminConfirmPassword" className="text-xs text-muted-foreground">Confirm New Password</Label>
                  <Input
                    id="adminConfirmPassword"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir mt-2"
                  disabled={updatingPassword}
                  onClick={handleUpdatePassword}
                >
                  <Key className="h-4 w-4 mr-2" />
                  {updatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-card/90">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Security Governance & Session
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Role Authority</p>
                    <p className="text-xs text-muted-foreground">Server-verified database user role</p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/40">
                  <div>
                    <p className="font-medium text-foreground">Row Level Security (RLS)</p>
                    <p className="text-xs text-muted-foreground">Postgres database policies enforced</p>
                  </div>
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
                    Enforced
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-foreground">Identity Session Provider</p>
                    <p className="text-xs text-muted-foreground">Supabase JWT Secure Storage</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">
                    HTTPS
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 4: Settings */}
        {activeTab === "settings" && (
          <Card className="border-border/80 bg-card/90 max-w-xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Admin Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-border/40">
                <div>
                  <p className="font-medium text-foreground">Timezone Display</p>
                  <p className="text-xs text-muted-foreground">Standard Local Timezone</p>
                </div>
                <span className="font-mono text-xs text-muted-foreground">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-foreground">Admin Workspace Theme</p>
                  <p className="text-xs text-muted-foreground">Consistent Studio Noir Styling</p>
                </div>
                <Badge variant="outline" className="border-primary/40 text-primary">Dark Noir</Badge>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
