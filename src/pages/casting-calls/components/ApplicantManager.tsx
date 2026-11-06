import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCastingCalls } from "@/hooks/use-casting-calls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, UserCheck, UserX, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface ApplicantManagerProps {
  castingCallId: string;
}

export function ApplicantManager({ castingCallId }: ApplicantManagerProps) {
  const navigate = useNavigate();
  const { getCastingCallApplicants, changeApplicantStatus } = useCastingCalls();
  const applicants = getCastingCallApplicants(castingCallId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filtering
  const filteredApplicants = applicants.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.profession.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const interestedCount = applicants.filter(a => a.status === "Interested").length;
  const confirmedCount = applicants.filter(a => a.status === "Confirmed").length;
  const rejectedCount = applicants.filter(a => a.status === "Rejected").length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredApplicants.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkAction = (status: "Confirmed" | "Rejected") => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach(id => changeApplicantStatus(id, status));
    setSelectedIds([]);
    toast.success(`Marked ${selectedIds.length} applicants as ${status}`);
  };

  const handleSingleAction = (id: string, status: "Confirmed" | "Rejected") => {
    changeApplicantStatus(id, status);
    toast.success(`Applicant marked as ${status}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Interested":
        return <Badge className="bg-blue-500">Interested</Badge>;
      case "Confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "Rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-card text-card-foreground rounded-xl shadow-sm border overflow-hidden">
      <div className="p-6 border-b border-border/60">
        <h2 className="text-2xl font-bold text-foreground mb-6">Applicant Management</h2>
        
        {/* Stats Row */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-lg border border-blue-100 dark:border-blue-900/40">
            <span className="text-blue-600 font-bold mr-2">{interestedCount}</span>
            <span className="text-sm text-blue-800 dark:text-blue-300">Pending</span>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 px-4 py-2 rounded-lg border border-green-100 dark:border-green-900/40">
            <span className="text-green-600 font-bold mr-2">{confirmedCount}</span>
            <span className="text-sm text-green-800 dark:text-green-300">Confirmed</span>
          </div>
          <div className="bg-red-50 dark:bg-red-950/30 px-4 py-2 rounded-lg border border-red-100 dark:border-red-900/40">
            <span className="text-red-600 font-bold mr-2">{rejectedCount}</span>
            <span className="text-sm text-red-800 dark:text-red-300">Rejected</span>
          </div>
          <div className="bg-muted/40 px-4 py-2 rounded-lg border border-border ml-auto">
            <span className="text-foreground font-bold mr-2">{applicants.length}</span>
            <span className="text-sm text-muted-foreground">Total Applications</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search applicants..." 
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="text-green-600 border-green-300 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-950/30"
              disabled={selectedIds.length === 0}
              onClick={() => handleBulkAction("Confirmed")}
            >
              <UserCheck className="w-4 h-4 mr-2" /> Confirm Selected
            </Button>
            <Button 
              variant="outline" 
              className="text-red-600 border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/30"
              disabled={selectedIds.length === 0}
              onClick={() => handleBulkAction("Rejected")}
            >
              <UserX className="w-4 h-4 mr-2" /> Reject Selected
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox 
                  checked={filteredApplicants.length > 0 && selectedIds.length === filteredApplicants.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Applicant</TableHead>
              <TableHead>Match Score</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Applied Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplicants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No applicants found.
                </TableCell>
              </TableRow>
            ) : (
              filteredApplicants.map(app => (
                <TableRow key={app.id} className="hover:bg-muted/40">
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={selectedIds.includes(app.id)}
                      onCheckedChange={(checked) => handleSelect(app.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img src={app.profilePhoto} alt={app.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <p className="font-medium text-foreground">{app.name}</p>
                        <p className="text-xs text-muted-foreground">{app.profession} • {app.experience}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${app.matchScore >= 80 ? 'bg-green-500' : app.matchScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                          style={{ width: `${app.matchScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">{app.matchScore}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.location}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(app.appliedDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(app.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="View Portfolio" 
                        className="h-8 w-8"
                        onClick={() => {
                          if (app.portfolioUrl) {
                            window.open(app.portfolioUrl, "_blank", "noopener,noreferrer");
                          } else {
                            toast.info("No external portfolio link provided by applicant.");
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title="Message" 
                        className="h-8 w-8"
                        onClick={() => {
                          if (app.userId) {
                            navigate(`/messages?recipient=${app.userId}`);
                          } else {
                            toast.error("Applicant user account unavailable.");
                          }
                        }}
                      >
                        <MessageCircle className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      {app.status === "Interested" && (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Confirm" 
                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleSingleAction(app.id, "Confirmed")}
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Reject" 
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleSingleAction(app.id, "Rejected")}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
