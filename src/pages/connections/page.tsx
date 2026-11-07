"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Search, Users, UserPlus, Clock, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FadeInSection, StaggerItem } from "@/components/ui/motion-primitives";

interface Connection {
  id: string;
  name: string;
  role: string;
  location: string;
  connectedAt?: number;
  avatar: string;
  avatar_url?: string;
  connection_id?: string;
}

interface PendingRequest {
  id: string;
  name: string;
  role: string;
  location: string;
  avatar: string;
  avatar_url?: string;
  direction: "received" | "sent";
  requestedAt: number;
  connection_id?: string;
}

interface Suggestion {
  id: string;
  name: string;
  role: string;
  location: string;
  avatar: string;
  avatar_url?: string;
  mutuals?: number;
}

type TabKey = "all" | "pending";
type SortKey = "recent" | "az" | "location";

export default function ConnectionsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [pendingView, setPendingView] = useState<"received" | "sent">("received");
  const [categories, setCategories] = useState<string[]>([
    "Producer",
    "Colorist",
    "Editor",
    "Cinematographer",
    "Sound Designer",
    "Composer",
    "VFX Artist",
    "Gaffer",
    "1st AC",
  ]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!profile?.id) {
      const guestSession = localStorage.getItem("guest_session");
      if (guestSession) {
        const storedConns = localStorage.getItem("guest_connections");
        const storedPending = localStorage.getItem("guest_pending");
        if (storedConns) setConnections(JSON.parse(storedConns));
        else setConnections([]);

        if (storedPending) setPending(JSON.parse(storedPending));
        else setPending([]);
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: connData, error: connError } = await supabase
        .from("connections")
        .select("*")
        .or(`user_id.eq.${profile.id},connected_user_id.eq.${profile.id}`);

      if (connError) throw connError;

      const { data: profilesData, error: profilesError } = await supabase
        .from("public_profiles")
        .select("*");

      if (profilesError) throw profilesError;

      const profileMap = new Map();
      profilesData?.forEach((p) => {
        profileMap.set(p.id, p);
      });

      const loadedConnections: Connection[] = [];
      const loadedPending: PendingRequest[] = [];

      connData?.forEach((c) => {
        const otherUserId = c.user_id === profile.id ? c.connected_user_id : c.user_id;
        const otherProfile = profileMap.get(otherUserId);

        if (!otherProfile) return;

        const initials = otherProfile.full_name
          ? otherProfile.full_name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()
          : "U";

        if (c.status === "accepted") {
          loadedConnections.push({
            id: otherProfile.id,
            connection_id: c.id,
            name: otherProfile.full_name || "Anonymous",
            role: otherProfile.category || otherProfile.role || "Creator",
            location: otherProfile.location || "Unknown",
            connectedAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
            avatar: initials,
            avatar_url: otherProfile.avatar_url || undefined,
          });
        } else if (c.status === "pending") {
          loadedPending.push({
            id: otherProfile.id,
            connection_id: c.id,
            name: otherProfile.full_name || "Anonymous",
            role: otherProfile.category || otherProfile.role || "Creator",
            location: otherProfile.location || "Unknown",
            avatar: initials,
            avatar_url: otherProfile.avatar_url || undefined,
            direction: c.user_id === profile.id ? "sent" : "received",
            requestedAt: c.created_at ? new Date(c.created_at).getTime() : Date.now(),
          });
        }
      });

      const existingUserIds = new Set([
        ...loadedConnections.map((c) => c.id),
        ...loadedPending.map((p) => p.id),
      ]);

      setConnections(loadedConnections);
      setPending(loadedPending);

      const extraSuggestions =
        profilesData
          ?.filter((p) => {
            if (p.id === profile.id) return false;
            if (existingUserIds.has(p.id)) return false;
            const roleLower = (p.role || "").toLowerCase();
            if (roleLower === "admin") return false;
            return true;
          })
          .slice(0, 4)
          .map((p) => {
            const initials = p.full_name
              ? p.full_name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase()
              : "U";
            return {
              id: p.id,
              name: p.full_name || "Anonymous",
              role: p.category || p.role || "Creator",
              location: p.location || "Unknown",
              avatar: initials,
              avatar_url: p.avatar_url || undefined,
              mutuals: Math.floor(Math.random() * 8) + 1,
            };
          }) || [];

      setSuggestions(extraSuggestions);
    } catch (err) {
      console.error("Error loading connections:", err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  useEffect(() => {
    const fetchDBCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("name")
          .order("name", { ascending: true });
        if (error) {
          console.error("Error fetching categories:", error);
          return;
        }
        if (data && data.length > 0) {
          const names = data.map((item) => item.name);
          setCategories(names);
        }
      } catch (err) {
        console.error("Error in fetchDBCategories:", err);
      }
    };
    fetchDBCategories();
  }, []);

  const filteredConnections = useMemo(() => {
    const q = search.toLowerCase();
    let items = connections.filter(
      (c) => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q),
    );
    if (selectedCategories.length > 0) {
      items = items.filter((c) => selectedCategories.includes(c.role));
    }
    if (sortBy === "recent") {
      items = items.sort((a, b) => (b.connectedAt ?? 0) - (a.connectedAt ?? 0));
    } else if (sortBy === "az") {
      items = items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "location") {
      items = items.sort((a, b) => a.location.localeCompare(b.location));
    }
    return items;
  }, [connections, search, sortBy, selectedCategories]);

  function handleOpenProfile(id: string) {
    navigate(`/profile/${id}`);
  }

  function handleMessage(id: string) {
    localStorage.setItem("active_chat_recipient_id", id);
    navigate("/messages");
  }

  async function handleRemove(id: string) {
    const conn = connections.find((c) => c.id === id);
    if (!conn) return;

    if (profile?.id) {
      try {
        const { error } = await supabase
          .from("connections")
          .delete()
          .or(
            `and(user_id.eq.${id},connected_user_id.eq.${profile.id}),and(user_id.eq.${profile.id},connected_user_id.eq.${id})`,
          );

        if (error) throw error;
        toast({
          title: "Connection removed",
          description: `Removed connection with ${conn.name}.`,
        });
        fetchConnections();
      } catch (err) {
        console.error("Error removing connection:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to remove connection.",
        });
      }
    } else {
      setConnections((prev) => prev.filter((c) => c.id !== id));
      const updatedConns = connections.filter((c) => c.id !== id);
      localStorage.setItem("guest_connections", JSON.stringify(updatedConns));
      toast({
        title: "Connection removed",
        description: `Removed connection with ${conn.name}.`,
      });
    }
  }

  async function handleAccept(requestId: string) {
    const req = pending.find((p) => p.id === requestId);
    if (!req) return;

    if (profile?.id) {
      try {
        const { error } = await supabase
          .from("connections")
          .update({ status: "accepted" })
          .or(
            `and(user_id.eq.${requestId},connected_user_id.eq.${profile.id}),and(user_id.eq.${profile.id},connected_user_id.eq.${requestId})`,
          );

        if (error) throw error;
        toast({
          title: "Connection request accepted",
          description: `You are now connected with ${req.name}!`,
        });
        fetchConnections();
      } catch (err) {
        console.error("Error accepting request:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to accept connection request.",
        });
      }
    } else {
      setPending((prev) => prev.filter((p) => p.id !== requestId));
      setConnections((prev) => [
        {
          id: req.id,
          name: req.name,
          role: req.role,
          location: req.location,
          avatar: req.avatar,
          connectedAt: Date.now(),
        },
        ...prev,
      ]);
      const updatedPending = pending.filter((p) => p.id !== requestId);
      const updatedConns = [
        {
          id: req.id,
          name: req.name,
          role: req.role,
          location: req.location,
          avatar: req.avatar,
          connectedAt: Date.now(),
        },
        ...connections,
      ];
      localStorage.setItem("guest_connections", JSON.stringify(updatedConns));
      localStorage.setItem("guest_pending", JSON.stringify(updatedPending));
      toast({
        title: "Connection request accepted",
        description: `You are now connected with ${req.name}!`,
      });
    }
  }

  async function handleDecline(requestId: string) {
    const req = pending.find((p) => p.id === requestId);
    if (!req) return;

    if (profile?.id) {
      try {
        const { error } = await supabase
          .from("connections")
          .delete()
          .or(
            `and(user_id.eq.${requestId},connected_user_id.eq.${profile.id}),and(user_id.eq.${profile.id},connected_user_id.eq.${requestId})`,
          );

        if (error) throw error;
        toast({
          title: "Request declined",
          description: `Declined connection request from ${req.name}.`,
        });
        fetchConnections();
      } catch (err) {
        console.error("Error declining request:", err);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to decline request.",
        });
      }
    } else {
      setPending((prev) => prev.filter((p) => p.id !== requestId));
      const updatedPending = pending.filter((p) => p.id !== requestId);
      localStorage.setItem("guest_pending", JSON.stringify(updatedPending));
      toast({
        title: "Request declined",
        description: `Declined connection request from ${req.name}.`,
      });
    }
  }

  return (
    <AppLayout pageTitle="Connections">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <FadeInSection className="bg-card p-6 rounded-xl shadow-soft border border-border/80">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="noir-heading-workspace mb-1">Connections</h1>
              <p className="text-muted-foreground text-sm">
                Manage your professional network and discover new connections
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or profession"
                  className="pl-9 h-9 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Sort</label>
                <select
                  className="px-3 py-1.5 border border-input rounded-lg text-xs bg-surface-base text-foreground focus:border-primary focus:outline-none h-9"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortKey)}
                >
                  <option value="recent">Recently Added</option>
                  <option value="az">A–Z</option>
                  <option value="location">Location</option>
                </select>
              </div>

              {/* Category Multiselect Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className="h-9 text-xs gap-1.5 flex items-center"
                >
                  <span>Category</span>
                  {selectedCategories.length > 0 && (
                    <Badge className="h-4 min-w-[16px] px-1 text-[10px]">
                      {selectedCategories.length}
                    </Badge>
                  )}
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>

                {categoryDropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setCategoryDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-52 bg-popover border border-border/80 rounded-xl shadow-noir z-20 p-2 space-y-1 max-h-64 overflow-y-auto">
                      <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider border-b border-border/60 mb-1">
                        Select Categories
                      </div>
                      {categories.map((cat) => {
                        const isChecked = selectedCategories.includes(cat);
                        return (
                          <label
                            key={cat}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-hover rounded-lg cursor-pointer text-xs select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setSelectedCategories(
                                    selectedCategories.filter((item) => item !== cat),
                                  );
                                } else {
                                  setSelectedCategories([...selectedCategories, cat]);
                                }
                              }}
                              className="accent-primary rounded border-border"
                            />
                            <span className="text-foreground">{cat}</span>
                          </label>
                        );
                      })}
                      {selectedCategories.length > 0 && (
                        <div className="pt-1.5 border-t border-border/60 flex justify-end">
                          <button
                            onClick={() => setSelectedCategories([])}
                            className="text-[10px] font-semibold text-destructive hover:underline px-2 py-0.5"
                          >
                            Clear All
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-soft border border-border/80">
          <div className="flex border-b border-border/70 px-4">
            <button
              className={`px-4 py-3.5 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("all")}
            >
              All Connections ({connections.length})
            </button>
            <button
              className={`px-4 py-3.5 border-b-2 font-medium transition-colors text-sm ${
                activeTab === "pending"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("pending")}
            >
              Pending Requests ({pending.length})
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "all" && (
          <div className="bg-card rounded-xl shadow-soft p-6 border border-border/80">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">All Connections</h2>
            </div>
            {filteredConnections.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border/70 rounded-xl">
                You have no connections yet. Start connecting with others to grow your network.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredConnections.map((c, idx) => (
                  <StaggerItem key={c.id} index={idx} liftOnHover>
                    <div className="border border-border/80 rounded-xl p-4 bg-surface-elevated/50 hover:border-primary/40 flex flex-col gap-3 transition-all">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => handleOpenProfile(c.id)}
                      >
                        <Avatar className="w-11 h-11 border border-primary/30">
                          {c.avatar_url && (
                            <AvatarImage
                              src={c.avatar_url}
                              alt={c.name}
                              className="object-cover"
                            />
                          )}
                          <AvatarFallback className="bg-primary/15 text-primary font-semibold text-sm">
                            {c.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold truncate text-foreground text-sm">
                            {c.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {c.role} • {c.location}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border/60">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {c.connectedAt ? new Date(c.connectedAt).toLocaleDateString() : "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMessage(c.id)}
                            className="h-7 px-2.5 text-xs"
                          >
                            Message
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemove(c.id)}
                            className="h-7 px-2.5 text-xs"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </StaggerItem>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "pending" && (
          <div className="bg-card rounded-xl shadow-soft p-6 border border-border/80">
            <div className="flex items-center justify-between border-b border-border/70 pb-4 mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Pending Requests</h2>
              </div>
              <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-border/70">
                <button
                  onClick={() => setPendingView("received")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    pendingView === "received"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Received
                </button>
                <button
                  onClick={() => setPendingView("sent")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    pendingView === "sent"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sent
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {pending
                  .filter((p) => p.direction === pendingView)
                  .filter(
                    (p) => selectedCategories.length === 0 || selectedCategories.includes(p.role),
                  )
                  .map((p, idx) => (
                    <StaggerItem key={p.id} index={idx} liftOnHover>
                      <div className="border border-border/80 rounded-xl p-4 bg-surface-elevated/50 hover:border-primary/40 flex flex-col gap-3 transition-all">
                        <div
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => handleOpenProfile(p.id)}
                        >
                          <Avatar className="w-11 h-11 border border-primary/30">
                            {p.avatar_url && (
                              <AvatarImage
                                src={p.avatar_url}
                                alt={p.name}
                                className="object-cover"
                              />
                            )}
                            <AvatarFallback className="bg-primary/15 text-primary font-semibold text-sm">
                              {p.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-semibold truncate text-foreground text-sm">
                              {p.name}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {p.role} • {p.location}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-border/60">
                          <div className="text-[11px] text-muted-foreground">
                            Requested {new Date(p.requestedAt).toLocaleDateString()}
                          </div>
                          {p.direction === "received" ? (
                            <div className="flex items-center gap-1.5">
                              <Button
                                size="sm"
                                onClick={() => handleAccept(p.id)}
                                className="h-7 px-2.5 text-xs font-semibold"
                              >
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDecline(p.id)}
                                className="h-7 px-2.5 text-xs"
                              >
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                              Awaiting response
                            </Badge>
                          )}
                        </div>
                      </div>
                    </StaggerItem>
                  ))}
              </div>

              {pending
                .filter((p) => p.direction === pendingView)
                .filter(
                  (p) => selectedCategories.length === 0 || selectedCategories.includes(p.role),
                ).length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground border border-dashed border-border/70 rounded-xl">
                  No {pendingView} requests.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
