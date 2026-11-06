import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Search, UserPlus, UserCog, Shield, CheckCircle, XCircle, Trash2, Mail
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ADMIN_PAGES = ["Users", "Posts", "Projects", "Jobs", "Communities", "Directory", "Tickets"];

export default function AdminTeam() {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [memberEmail, setMemberEmail] = useState("");
  const [newMember, setNewMember] = useState({
    role: "Moderator",
    status: "Active",
    permissions: {} as Record<string, { view: boolean; edit: boolean; delete: boolean }>
  });

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_team_members')
        .select(`
          *,
          profile:profiles(id, email, full_name, username, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (e) {
      toast({ title: "Error fetching team members", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const handleAddMember = async () => {
    if (!memberEmail) {
      toast({ title: "Please enter an email", variant: "destructive" });
      return;
    }
    
    setIsSaving(true);
    try {
      // Find user by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email')
        .eq('email', memberEmail)
        .maybeSingle();
        
      if (profileError || !profileData) {
        toast({ title: "User not found with this email", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      const targetAuthUserId = profileData.user_id || profileData.id;

      const { data: memberInsertData, error } = await supabase
        .from('admin_team_members')
        .insert({
          user_id: targetAuthUserId,
          profile_id: profileData.id,
          role: newMember.role,
          status: newMember.status,
          permissions: newMember.permissions
        })
        .select("id");

      if (error) throw error;
      if (!memberInsertData || memberInsertData.length === 0) {
        throw new Error("Failed to insert team member. Permission denied.");
      }

      // Provision corresponding database role in user_roles so server RLS permits administrative operations
      await supabase.from('user_roles').upsert({
        user_id: targetAuthUserId,
        role: 'admin'
      }, { onConflict: 'user_id' });
      
      toast({ title: "Team member added successfully!" });
      setIsAddDialogOpen(false);
      fetchTeamMembers();
    } catch (error: any) {
      toast({ title: "Failed to add team member", description: error?.message || "Operation failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Remove this member from the team?")) return;
    try {
      const member = teamMembers.find(m => m.id === id);
      const { data, error } = await supabase.from('admin_team_members').delete().eq('id', id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("Member not found or permission denied.");
      }
      if (member?.user_id) {
        await supabase.from('user_roles').delete().eq('user_id', member.user_id);
      }
      setTeamMembers(prev => prev.filter(m => m.id !== id));
      toast({ title: "Member removed" });
    } catch (e: any) {
      toast({ title: "Failed to remove member", description: e?.message || "Operation failed", variant: "destructive" });
    }
  };

  const togglePermission = (page: string, action: 'view' | 'edit' | 'delete') => {
    setNewMember(prev => {
      const currentPerms = prev.permissions[page] || { view: false, edit: false, delete: false };
      const newPerms = { ...currentPerms, [action]: !currentPerms[action] };
      if (action !== 'view' && newPerms[action]) {
        newPerms.view = true;
      }
      return {
        ...prev,
        permissions: { ...prev.permissions, [page]: newPerms }
      };
    });
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "Admin": return "bg-primary/15 text-primary border border-primary/30";
      case "Moderator": return "bg-sky-500/15 text-sky-400 border border-sky-500/30";
      default: return "bg-surface-elevated text-muted-foreground border border-border/80";
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    return status === "Active"
      ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
      : "bg-destructive/15 text-destructive border border-destructive/30";
  };

  const filteredMembers = teamMembers.filter(member => {
    const profileName = member.profile?.full_name || "";
    const profileEmail = member.profile?.email || "";
    const matchesSearch = profileName.toLowerCase().includes(searchTerm.toLowerCase()) || profileEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || member.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === "all" || member.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <AdminLayout pageTitle="Team Members" pageName="Team Members">
      <div className="space-y-6">
        <div className="border-b border-border/60 pb-5">
          <p className="noir-eyebrow mb-1">Access & Roles</p>
          <h1 className="text-3xl font-display font-bold text-foreground">Team Members</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your team members and their roles</p>
        </div>

        <Card className="noir-card border-border/80 bg-card">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
            <CardTitle className="text-2xl font-display">Team Members</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border/80">
                <DialogHeader>
                  <DialogTitle className="font-display">Add New Team Member</DialogTitle>
                  <DialogDescription>
                    Provide the email address of an existing user and configure their page permissions.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>User Email</Label>
                    <Input
                      type="email"
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="Enter user's email address"
                      className="bg-surface-elevated border-border/80"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select value={newMember.role} onValueChange={(value) => setNewMember({ ...newMember, role: value })}>
                        <SelectTrigger className="bg-surface-elevated border-border/80"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Moderator">Moderator</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={newMember.status} onValueChange={(value) => setNewMember({ ...newMember, status: value })}>
                        <SelectTrigger className="bg-surface-elevated border-border/80"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="mt-6 border-t border-border/60 pt-4">
                    <Label className="text-lg font-display font-semibold mb-2 block">Page Permissions</Label>
                    <div className="space-y-3">
                      {ADMIN_PAGES.map(page => (
                        <div key={page} className="flex items-center justify-between p-3 border border-border/80 bg-surface-elevated rounded-lg">
                          <span className="font-medium w-32 text-foreground">{page}</span>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={newMember.permissions[page]?.view || false} onCheckedChange={() => togglePermission(page, 'view')} />
                              <span className="text-sm text-foreground">View</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={newMember.permissions[page]?.edit || false} onCheckedChange={() => togglePermission(page, 'edit')} />
                              <span className="text-sm text-foreground">Edit</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox checked={newMember.permissions[page]?.delete || false} onCheckedChange={() => togglePermission(page, 'delete')} />
                              <span className="text-sm text-destructive">Delete</span>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleAddMember} disabled={isSaving}>
                    {isSaving ? 'Adding...' : 'Add Member'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 bg-surface-elevated border-border/80" />
              </div>
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Role:</label>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-[140px] bg-surface-elevated border-border/80"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-muted-foreground">Status:</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px] bg-surface-elevated border-border/80"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border border-border/80 rounded-xl overflow-hidden bg-surface-elevated/40">
              <Table>
                <TableHeader className="bg-surface-elevated">
                  <TableRow className="border-border/70">
                    <TableHead>Member</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                  ) : filteredMembers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No team members found</TableCell></TableRow>
                  ) : filteredMembers.map((member) => (
                    <TableRow key={member.id} className="border-border/60 hover:bg-surface-hover/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                            <UserCog className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{member.profile?.full_name || "Unknown User"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground font-mono text-xs">
                          <Mail className="h-4 w-4 text-primary" />
                          <span>{member.profile?.email || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getRoleBadgeStyle(member.role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={getStatusBadgeStyle(member.status)}>
                          {member.status === "Active" ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMember(member.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground font-mono">
              <span>Showing {filteredMembers.length} members</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
