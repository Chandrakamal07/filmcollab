"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/app-layout";
import { 
  Search,
  Filter,
  Users,
  MessageSquare,
  Heart,
  Share2,
  MoreHorizontal,
  MapPin,
  Calendar,
  Clock,
  Star,
  UserPlus,
  Building2,
  Camera,
  Mic,
  PenTool,
  Scissors,
  Music,
  Palette,
  TrendingUp,
  Award,
  Globe,
  Hash,
  Bookmark,
  Eye,
  ThumbsUp,
  MessageCircle,
  Send,
  Image,
  Video,
  FileText,
  Plus,
  Settings,
  Bell,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Linkedin,
  Twitter,
  Instagram,
  Youtube,
  ExternalLink,
  X
} from "lucide-react";

export default function CommunityPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("groups");
  const [searchQuery, setSearchQuery] = useState("");
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const communityStats = [
    { number: "50K+", label: "Active Members" },
    { number: "1.2K+", label: "Groups" },
    { number: "15K+", label: "Discussions" },
    { number: "500+", label: "Events This Month" }
  ];

  const featuredMembers = [
    {
      id: 1,
      name: "Sarah Johnson",
      role: "Independent Filmmaker",
      avatar: "SJ",
      location: "Los Angeles, CA",
      skills: ["Directing", "Screenwriting", "Producing"],
      projects: 12,
      connections: 847,
      verified: true,
      online: true
    },
    {
      id: 2,
      name: "Michael Chen",
      role: "Cinematographer",
      avatar: "MC",
      location: "New York, NY",
      skills: ["Cinematography", "Lighting", "Camera Operation"],
      projects: 28,
      connections: 1234,
      verified: true,
      online: false
    },
    {
      id: 3,
      name: "Emma Rodriguez",
      role: "Production Designer",
      avatar: "ER",
      location: "Atlanta, GA",
      skills: ["Set Design", "Art Direction", "Props"],
      projects: 19,
      connections: 567,
      verified: true,
      online: true
    },
    {
      id: 4,
      name: "David Kim",
      role: "Sound Designer",
      avatar: "DK",
      location: "Vancouver, BC",
      skills: ["Sound Design", "Audio Mixing", "Foley"],
      projects: 34,
      connections: 892,
      verified: true,
      online: false
    }
  ];

  const trendingGroups = [
    {
      id: 1,
      name: "Independent Filmmakers Network",
      description: "A community for independent filmmakers to share resources, collaborate, and support each other.",
      members: 2847,
      posts: 156,
      category: "Filmmaking",
      tags: ["independent", "filmmaking", "collaboration"]
    },
    {
      id: 2,
      name: "Women in Film",
      description: "Empowering women in the film industry through networking, mentorship, and advocacy.",
      members: 1892,
      posts: 89,
      category: "Networking",
      tags: ["women", "empowerment", "mentorship"]
    },
    {
      id: 3,
      name: "Documentary Filmmakers",
      description: "Connect with documentary filmmakers, share stories, and discuss the art of non-fiction storytelling.",
      members: 1245,
      posts: 203,
      category: "Documentary",
      tags: ["documentary", "storytelling", "non-fiction"]
    },
    {
      id: 4,
      name: "Film Students & Alumni",
      description: "Network with fellow film students and alumni from top film schools around the world.",
      members: 3421,
      posts: 267,
      category: "Education",
      tags: ["students", "alumni", "education"]
    }
  ];

  const recentDiscussions = [
    {
      id: 1,
      title: "Best practices for remote collaboration on film projects",
      author: "Alex Thompson",
      avatar: "AT",
      replies: 23,
      views: 156,
      likes: 45,
      time: "2 hours ago",
      tags: ["collaboration", "remote-work", "tips"]
    },
    {
      id: 2,
      title: "How to pitch your documentary to streaming platforms",
      author: "Maria Garcia",
      avatar: "MG",
      replies: 18,
      views: 89,
      likes: 32,
      time: "5 hours ago",
      tags: ["documentary", "pitching", "streaming"]
    },
    {
      id: 3,
      title: "Equipment recommendations for low-budget productions",
      author: "James Wilson",
      avatar: "JW",
      replies: 31,
      views: 234,
      likes: 67,
      time: "1 day ago",
      tags: ["equipment", "budget", "recommendations"]
    },
    {
      id: 4,
      title: "Building a strong portfolio as a cinematographer",
      author: "Lisa Park",
      avatar: "LP",
      replies: 15,
      views: 123,
      likes: 28,
      time: "2 days ago",
      tags: ["portfolio", "cinematography", "career"]
    }
  ];

  const upcomingEvents = [
    {
      id: 1,
      title: "Virtual Film Festival Networking",
      date: "Dec 15, 2024",
      time: "7:00 PM EST",
      type: "Virtual",
      attendees: 156,
      category: "Networking"
    },
    {
      id: 2,
      title: "Documentary Filmmaking Workshop",
      date: "Dec 18, 2024",
      time: "2:00 PM PST",
      type: "In-Person",
      location: "Los Angeles, CA",
      attendees: 45,
      category: "Workshop"
    },
    {
      id: 3,
      title: "Screenwriting Masterclass",
      date: "Dec 20, 2024",
      time: "6:00 PM EST",
      type: "Virtual",
      attendees: 89,
      category: "Education"
    },
    {
      id: 4,
      title: "Film Industry Meetup",
      date: "Dec 22, 2024",
      time: "8:00 PM PST",
      type: "In-Person",
      location: "New York, NY",
      attendees: 67,
      category: "Networking"
    }
  ];

  const joinedGroups = [
    {
      id: 8,
      name: "Independent Filmmakers Network",
      description: "A community for independent filmmakers to share resources, collaborate, and support each other.",
      members: 2847,
      posts: 156,
      category: "Filmmaking",
      tags: ["independent", "filmmaking", "collaboration"],
      joinedDate: "2024-11-20",
      role: "Member"
    },
    {
      id: 9,
      name: "Women in Film",
      description: "Empowering women in the film industry through networking, mentorship, and advocacy.",
      members: 1892,
      posts: 89,
      category: "Networking",
      tags: ["women", "empowerment", "mentorship"],
      joinedDate: "2024-11-18",
      role: "Member"
    },
    {
      id: 10,
      name: "Documentary Filmmakers",
      description: "Connect with documentary filmmakers, share stories, and discuss the art of non-fiction storytelling.",
      members: 1245,
      posts: 203,
      category: "Documentary",
      tags: ["documentary", "storytelling", "non-fiction"],
      joinedDate: "2024-11-15",
      role: "Member"
    },
    {
      id: 11,
      name: "Film Students & Alumni",
      description: "Network with fellow film students and alumni from top film schools around the world.",
      members: 3421,
      posts: 267,
      category: "Education",
      tags: ["students", "alumni", "education"],
      joinedDate: "2024-11-12",
      role: "Member"
    },
    {
      id: 12,
      name: "Cinematography Masters",
      description: "Advanced cinematography techniques and equipment discussions for professional DOPs.",
      members: 89,
      posts: 156,
      category: "Technical",
      tags: ["cinematography", "technical", "advanced"],
      joinedDate: "2024-11-10",
      role: "Member"
    },
    {
      id: 13,
      name: "Sound Design Community",
      description: "Share audio techniques, discuss sound design, and collaborate on audio projects.",
      members: 456,
      posts: 78,
      category: "Audio",
      tags: ["sound", "audio", "design"],
      joinedDate: "2024-11-08",
      role: "Member"
    }
  ];

  const handleGroupClick = (group) => {
    if (activeTab === "created") {
      // Navigate to group details page for created groups
      navigate(`/community/group/${group.id}`);
    } else if (activeTab === "joined") {
      // Navigate to joined group details page for joined groups
      navigate(`/community/joined-group/${group.id}`);
    } else {
      // Show popup for trending groups
      setSelectedGroup(group);
      setShowGroupDetails(true);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5 bg-background min-h-screen p-4 md:p-6">
        {/* Header */}
        <div className="bg-card p-5 rounded-xl shadow-noir border border-border/80">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <p className="noir-eyebrow text-primary mb-1">Guilds & Collectives</p>
              <h1 className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">Community</h1>
              <p className="text-muted-foreground text-sm">
                Connect with film professionals, join groups, and participate in discussions
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search groups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-surface-elevated border-border/80 rounded-lg text-sm"
                />
              </div>
              <Button variant="outline" className="h-9 px-3 border-border/80 bg-surface-elevated text-foreground hover:bg-surface-hover rounded-lg text-sm">
                <Filter className="w-4 h-4 mr-1.5" />
                Filters
              </Button>
              <Button className="h-9 px-4 bg-primary text-primary-foreground hover:bg-primary-hover rounded-lg text-sm shadow-noir font-medium">
                <Plus className="w-4 h-4 mr-1.5" />
                Create Group
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-noir border border-border/80">
          <div className="flex border-b border-border/60 px-4">
            <button
              onClick={() => setActiveTab("groups")}
              className={`px-4 py-3 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "groups"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => setActiveTab("joined")}
              className={`px-4 py-3 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "joined"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Joined
            </button>
            <button
              onClick={() => setActiveTab("created")}
              className={`px-4 py-3 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "created"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Created
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "groups" && (
          <div className="bg-card rounded-xl shadow-noir border border-border/80 p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground">Trending Groups</h2>
                <Button variant="outline" size="sm" className="border-border/80 bg-surface-elevated text-foreground hover:bg-surface-hover text-xs h-8">
                  Browse All Groups
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trendingGroups.map((group) => (
                  <Card 
                    key={group.id} 
                    className="bg-surface-elevated border-border/80 hover:border-primary/40 shadow-noir transition-all rounded-xl cursor-pointer group"
                    onClick={() => handleGroupClick(group)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="font-display text-base text-foreground group-hover:text-primary transition-colors">{group.name}</CardTitle>
                          <CardDescription className="mt-1 text-muted-foreground text-xs leading-relaxed">
                            {group.description}
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-6 w-6 p-0">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-3 mb-3 font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-primary/80" />
                          <span>{group.members.toLocaleString()} members</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-primary/80" />
                          <span>{group.posts} posts</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {group.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-[11px] bg-primary/10 text-primary border border-primary/25 font-mono">
                            #{tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-8 text-xs font-medium">
                          Join Group
                        </Button>
                        <Button size="sm" variant="outline" className="border-border/80 bg-card hover:bg-surface-hover h-8 w-8 p-0">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "joined" && (
          <div className="bg-card rounded-xl shadow-noir border border-border/80 p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground">My Joined Groups</h2>
                <Button variant="outline" size="sm" className="border-border/80 bg-surface-elevated text-foreground hover:bg-surface-hover text-xs h-8">
                  Browse More Groups
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {joinedGroups.map((group) => (
                  <Card 
                    key={group.id} 
                    className="bg-surface-elevated border-border/80 hover:border-primary/40 shadow-noir transition-all rounded-xl cursor-pointer group"
                    onClick={() => handleGroupClick(group)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="font-display text-base text-foreground group-hover:text-primary transition-colors">{group.name}</CardTitle>
                          <CardDescription className="mt-1 text-muted-foreground text-xs leading-relaxed">
                            {group.description}
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-6 w-6 p-0">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-3 mb-3 font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-primary/80" />
                          <span>{group.members.toLocaleString()} members</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-primary/80" />
                          <span>{group.posts} posts</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {group.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-[11px] bg-primary/10 text-primary border border-primary/25 font-mono">
                            #{tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono text-muted-foreground mb-3">
                        <span>Joined: {group.joinedDate}</span>
                        <Badge variant="outline" className="text-[10px] bg-primary/15 text-primary border-primary/30 uppercase">
                          {group.role}
                        </Badge>
                      </div>

                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-8 text-xs font-medium">
                          Open Group
                        </Button>
                        <Button size="sm" variant="outline" className="border-border/80 bg-card hover:bg-surface-hover h-8 w-8 p-0">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "created" && (
          <div className="bg-card rounded-xl shadow-noir border border-border/80 p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-foreground">My Created Groups</h2>
                <Button className="bg-primary text-primary-foreground hover:bg-primary-hover h-8 text-xs font-medium">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Create New Group
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {joinedGroups.filter(g => g.role === 'Admin').map((group) => (
                  <Card 
                    key={group.id} 
                    className="bg-surface-elevated border-border/80 hover:border-primary/40 shadow-noir transition-all rounded-xl cursor-pointer group"
                    onClick={() => handleGroupClick(group)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="font-display text-base text-foreground group-hover:text-primary transition-colors">{group.name}</CardTitle>
                          <CardDescription className="mt-1 text-muted-foreground text-xs leading-relaxed">
                            {group.description}
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-6 w-6 p-0">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-3 mb-3 font-mono text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 text-primary/80" />
                          <span>{group.members.toLocaleString()} members</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-primary/80" />
                          <span>{group.posts} posts</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {group.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-[11px] bg-primary/10 text-primary border border-primary/25 font-mono">
                            #{tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover h-8 text-xs font-medium">
                          Manage Group
                        </Button>
                        <Button size="sm" variant="outline" className="border-border/80 bg-card hover:bg-surface-hover h-8 w-8 p-0">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Group Details Popup */}
        {showGroupDetails && selectedGroup && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border/80 shadow-noir rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4 border-b border-border/60 pb-3">
                  <h2 className="font-display text-xl font-bold text-foreground">{selectedGroup.name}</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowGroupDetails(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Group Description */}
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">Description</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{selectedGroup.description}</p>
                  </div>

                  {/* Group Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-surface-elevated p-3 rounded-xl text-center border border-border/80">
                      <div className="text-lg font-mono font-bold text-primary">{selectedGroup.members.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Members</div>
                    </div>
                    <div className="bg-surface-elevated p-3 rounded-xl text-center border border-border/80">
                      <div className="text-lg font-mono font-bold text-primary">{selectedGroup.posts}</div>
                      <div className="text-xs text-muted-foreground">Posts</div>
                    </div>
                    <div className="bg-surface-elevated p-3 rounded-xl text-center border border-border/80">
                      <div className="text-lg font-mono font-bold text-primary">{selectedGroup.category}</div>
                      <div className="text-xs text-muted-foreground">Category</div>
                    </div>
                    <div className="bg-surface-elevated p-3 rounded-xl text-center border border-border/80">
                      <div className="text-lg font-mono font-bold text-primary">{selectedGroup.status || 'Active'}</div>
                      <div className="text-xs text-muted-foreground">Status</div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="font-semibold mb-2 text-foreground">Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedGroup.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-surface-elevated text-muted-foreground border border-border/80 font-mono">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Additional Details for Created Groups */}
                  {selectedGroup.createdBy && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold mb-2 text-foreground">Created By</h3>
                        <p className="text-muted-foreground text-sm">{selectedGroup.createdBy}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2 text-foreground">Created Date</h3>
                        <p className="text-muted-foreground text-sm font-mono">{selectedGroup.createdDate}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t border-border/60">
                    {selectedGroup.createdBy ? (
                      <>
                        <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover">
                          <Settings className="w-4 h-4 mr-2" />
                          Manage Group
                        </Button>
                        <Button variant="outline" className="border-border/80 bg-surface-elevated hover:bg-surface-hover" onClick={() => setShowGroupDetails(false)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Group
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary-hover">
                          <UserPlus className="w-4 h-4 mr-2" />
                          Join Group
                        </Button>
                        <Button variant="outline" className="border-border/80 bg-surface-elevated hover:bg-surface-hover" onClick={() => setShowGroupDetails(false)}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Group
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
