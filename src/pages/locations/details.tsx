import { useParams, useNavigate } from "react-router-dom";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { encryptForRecipientOrThrow, getOrInitUserE2EE } from "@/lib/e2ee";

import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { 
  ArrowLeft, 
  MapPin, 
  Share2, 
  Heart,
  Shield,
  MessageSquare,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  AlertCircle,
  Loader2,
  Edit
} from "lucide-react";

export default function LocationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  
  const [location, setLocation] = useState<any>(null);
  const [creatorName, setCreatorName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBlockedLocation, setIsBlockedLocation] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // Lightbox State
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Modals state
  const [isEnquireOpen, setIsEnquireOpen] = useState(false);
  const [enquiryMessage, setEnquiryMessage] = useState('');
  
  const [isBookVisitOpen, setIsBookVisitOpen] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [visitStartTime, setVisitStartTime] = useState('');
  const [visitEndTime, setVisitEndTime] = useState('');
  const [visitMessage, setVisitMessage] = useState('');
  
  const [isViewVisitsOpen, setIsViewVisitsOpen] = useState(false);
  const [siteVisits, setSiteVisits] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSiteVisits = async () => {
    try {
      const { data, error } = await supabase
        .from('property_site_visits')
        .select('*, user:user_id(full_name, first_name, last_name, avatar_url, email, phone)')
        .eq('location_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSiteVisits(data || []);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load site visits');
    }
  };

  const handleEnquire = async () => {
    if (!user) return toast.error("Please login to send an enquiry");
    if (!enquiryMessage.trim()) return toast.error("Message is required");
    setIsSubmitting(true);
    try {
      // Resolve receiver profile ID and public key via public_profiles (M11, M14, M15)
      let receiverProfileId = location.created_by;
      let receiverPublicKey: string | null = null;
      const { data: recProfile } = await supabase
        .from('public_profiles')
        .select('id, public_key')
        .or(`id.eq.${location.created_by},user_id.eq.${location.created_by}`)
        .limit(1)
        .maybeSingle();
      if (recProfile?.id) {
        receiverProfileId = recProfile.id;
        receiverPublicKey = recProfile.public_key ?? null;
      } else {
        const { data: rxProfile } = await supabase
          .from('public_profiles')
          .select('id, public_key')
          .eq('id', receiverProfileId)
          .maybeSingle();
        if (rxProfile?.id) {
          receiverProfileId = rxProfile.id;
          receiverPublicKey = rxProfile.public_key ?? null;
        }
      }

      let senderProfileId = profile?.id;
      let senderPublishedKey = profile?.public_key;
      if (!senderProfileId && user?.id) {
        const { data: sProf } = await supabase.from('profiles').select('id, public_key').or(`id.eq.${user.id},user_id.eq.${user.id}`).limit(1).maybeSingle();
        if (sProf?.id) {
          senderProfileId = sProf.id;
          senderPublishedKey = sProf.public_key;
        }
      }
      senderProfileId = senderProfileId || user.id;

      // Mandatory E2EE key initialization and sender public key publication (M14, M15)
      const { privKey, pubKeyStr } = await getOrInitUserE2EE(senderProfileId);
      if (!senderPublishedKey || senderPublishedKey !== pubKeyStr) {
        const { error: pubKeyErr } = await supabase
          .from('profiles')
          .update({ public_key: pubKeyStr })
          .eq('id', senderProfileId);
        if (pubKeyErr) {
          throw new Error(`Failed to publish sender encryption key: ${pubKeyErr.message}`);
        }
      }

      // Mandatory fail-closed encryption: never fall back to plaintext on missing or malformed key (M14, M15)
      const { envelope: messageContent } = await encryptForRecipientOrThrow({
        senderPrivateKey: privKey,
        recipientPublicKeyJwkOrStr: receiverPublicKey,
        plaintext: enquiryMessage.trim()
      });

      const clientUuid = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 1. Insert encrypted message
      const { error: msgErr } = await supabase.from('messages').insert({
        sender_id: senderProfileId,
        receiver_id: receiverProfileId,
        content: messageContent,
        type: 'property_enquiry',
        client_message_id: clientUuid
      });
      if (msgErr) throw msgErr;

      // 2. Insert notification (secondary, authorized server RPC)
      try {
        const { error: notifRpcErr } = await supabase.rpc('send_authorized_notification', {
          p_recipient_id: receiverProfileId,
          p_title: 'New Property Enquiry',
          p_message: `Someone sent an enquiry for ${location.name}`,
          p_type: 'message',
          p_link: `/locations/${location.id}`
        });
        if (notifRpcErr) {
          console.warn("Secondary notification could not be delivered:", notifRpcErr);
        }
      } catch (notifErr) {
        console.warn("Secondary notification could not be delivered:", notifErr);
      }

      toast.success("Enquiry sent successfully!");
      setIsEnquireOpen(false);
      setEnquiryMessage('');
    } catch (e: any) {
      toast.error(e.message || "Failed to send enquiry");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBookVisit = async () => {
    if (!user) return toast.error("Please login to book a visit");
    if (selectedDays.length === 0 || !visitStartTime || !visitEndTime) {
      return toast.error("Please select at least one preferred day, and provide start and end time");
    }
    setIsSubmitting(true);
    try {
      let ownerProfileId = location.created_by;
      const { data: oProfile } = await supabase
        .from('public_profiles')
        .select('id')
        .or(`id.eq.${location.created_by},user_id.eq.${location.created_by}`)
        .limit(1)
        .maybeSingle();
      if (oProfile?.id) {
        ownerProfileId = oProfile.id;
      }

      const { error: visitErr } = await supabase.from('property_site_visits').insert({
        location_id: id || '',
        user_id: user.id,
        owner_id: location.created_by || null,
        selected_day: selectedDays.join(', '),
        selected_time: `${visitStartTime} to ${visitEndTime}`,
        message: visitMessage.trim(),
        status: 'pending'
      } as any);

      if (visitErr) throw visitErr;

      // Notify owner via authorized server RPC
      try {
        const { error: notifRpcErr } = await supabase.rpc('send_authorized_notification', {
          p_recipient_id: ownerProfileId,
          p_title: 'New Site Visit Request',
          p_message: `Someone requested a site visit for ${location.name}`,
          p_type: 'booking',
          p_link: `/locations/${location.id}`
        });
        if (notifRpcErr) {
          console.warn("Secondary site visit notification could not be delivered:", notifRpcErr);
        }
      } catch (notifErr) {
        console.warn("Secondary site visit notification could not be delivered:", notifErr);
      }

      toast.success("Site visit requested successfully!");
      setIsBookVisitOpen(false);
      setSelectedDays([]);
      setVisitStartTime('');
      setVisitEndTime('');
      setVisitMessage('');
    } catch (e: any) {
      toast.error(e.message || "Failed to book site visit");
    } finally {
      setIsSubmitting(false);
    }
  };


  useEffect(() => {
    fetchLocationDetails();
  }, [id, user]);

  const fetchLocationDetails = async () => {
    setIsLoading(true);
    try {
      if (!id) return;
      
      // Fetch location
      const { data: locData, error: locError } = await supabase
        .from('shooting_locations')
        .select('*')
        .eq('id', id)
        .single();
        
      if (locError) throw locError;

      const isBlocked = locData.status === 'blocked' || (locData.tags && locData.tags.includes('Blocked'));
      const isOwner = locData.created_by === user?.id;
      const adminAccess = isAdmin();

      if (isBlocked && !isOwner && !adminAccess) {
        setIsBlockedLocation(true);
        setLocation(null);
        return;
      }

      setLocation(locData);

      if (locData && locData.created_by) {
        const { data: profile } = await supabase.from('public_profiles').select('full_name, first_name, last_name').or(`id.eq.${locData.created_by},user_id.eq.${locData.created_by}`).limit(1).maybeSingle();
        if (profile) {
          setCreatorName(profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || locData.owner_name);
        } else {
          setCreatorName(locData.owner_name);
        }
      }

      // Fetch likes
      const { data: likesData, error: likesError } = await supabase
        .from('shooting_location_likes')
        .select('*')
        .eq('location_id', id);

      if (likesError) throw likesError;
      
      setLikesCount(likesData.length);
      setIsWishlisted(user ? likesData.some(like => like.user_id === user.id) : false);

    } catch (error) {
      console.error("Error fetching location details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLike = async () => {
    if (!user) return;
    
    const currentlyWishlisted = isWishlisted;
    // Optimistic UI update
    setIsWishlisted(!currentlyWishlisted);
    setLikesCount(prev => prev + (currentlyWishlisted ? -1 : 1));

    try {
      if (currentlyWishlisted) {
        const { error } = await supabase
          .from('shooting_location_likes')
          .delete()
          .eq('location_id', id)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shooting_location_likes')
          .insert({ location_id: id, user_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update
      setIsWishlisted(currentlyWishlisted);
      setLikesCount(prev => prev + (currentlyWishlisted ? 1 : -1));
      toast.error("Could not update wishlist");
    }
  };

  const openLightbox = (index: number) => {
    setSelectedImageIndex(index);
    document.body.style.overflow = 'hidden'; 
  };

  const closeLightbox = () => {
    setSelectedImageIndex(null);
    document.body.style.overflow = 'auto';
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null && location?.images) {
      setSelectedImageIndex((prev) => (prev! + 1) % location.images.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedImageIndex !== null && location?.images) {
      setSelectedImageIndex((prev) => (prev! === 0 ? location.images.length - 1 : prev! - 1));
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (isBlockedLocation) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center space-y-4 max-w-md mx-auto text-center px-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="font-display text-2xl font-bold text-foreground">Location Unavailable</h2>
          <p className="text-sm text-muted-foreground">
            This shooting location is currently unavailable or undergoing moderation review.
          </p>
          <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => navigate("/locations")}>
            Back to Locations
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!location) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
          <h2 className="font-display text-2xl font-bold text-foreground">Location not found</h2>
          <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={() => navigate("/locations")}>Back to Locations</Button>
        </div>
      </AppLayout>
    );
  }

  // Fallback images if none in DB (since image_url is a single string in DB for now)
  const images = location.image_url 
    ? [location.image_url] 
    : [
        "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200",
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800"
      ];

  const mapUrl = `https://maps.google.com/?q=${encodeURIComponent(location.city + ', ' + location.state)}`;

  return (
    <AppLayout>
      <div className="flex-1 max-w-6xl mx-auto w-full space-y-6 p-6">
        
        {/* Top Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button variant="ghost" onClick={() => navigate("/locations")} className="w-fit -ml-4 text-muted-foreground hover:text-foreground hover:bg-surface-elevated">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Locations
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border/80 bg-surface-elevated hover:bg-surface-hover"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Location link copied to clipboard!");
              }}
            >
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            {(user?.id === location.created_by || user?.id === location.profile_id || user?.id === location.user_id) && (
              <Button variant="outline" size="sm" className="border-border/80 bg-surface-elevated hover:bg-surface-hover" onClick={() => navigate(`/locations/new?edit=${location.id}`)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            )}
            {/* Functional Like Button replacing Save */}
            <Button 
              variant={isWishlisted ? "default" : "outline"}
              size="sm"
              className={cn(
                isWishlisted
                  ? "bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/30"
                  : "border-border/80 bg-surface-elevated hover:bg-surface-hover"
              )}
              onClick={toggleLike}
            >
              <Heart className={`mr-2 h-4 w-4 ${isWishlisted ? "fill-destructive text-destructive" : ""}`} /> 
              {isWishlisted ? "Liked" : "Like"} (<span className="font-mono">{likesCount}</span>)
            </Button>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2.5">
            <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border border-primary/30 font-mono uppercase tracking-wider text-xs">
              {location.type}
            </Badge>
            {location.tags && location.tags.map((tag: string, idx: number) => (
              <Badge key={idx} variant="secondary" className="bg-surface-elevated text-muted-foreground font-normal border border-border/80">{tag}</Badge>
            ))}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">{location.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Listed by <span className="font-medium text-foreground">{creatorName || location.owner_name || 'Verified Owner'}</span>
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-2.5 text-sm text-muted-foreground">
            <span className="flex items-center"><MapPin className="h-4 w-4 mr-1.5 text-primary" /> {location.city}, {location.state}</span>
            {location.address && <span className="flex items-center text-muted-foreground">• {location.address} {location.landmark ? ` (Near ${location.landmark})` : ''}</span>}
            <a 
              href={mapUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center text-primary hover:underline font-medium"
            >
              <ExternalLink className="h-4 w-4 mr-1" /> View on Google Maps
            </a>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 rounded-2xl overflow-hidden h-[400px] border border-border/80 shadow-noir bg-card">
          <div className="md:col-span-2 h-full overflow-hidden" onClick={() => openLightbox(0)}>
            <img src={images[0]} alt="Main" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" />
          </div>
          <div className="hidden md:flex flex-col gap-2.5 h-full">
            <div className="w-full h-[calc(50%-5px)] overflow-hidden">
              <img src={images[1] || images[0]} alt="Gallery 1" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500 cursor-pointer" onClick={() => openLightbox(1)} />
            </div>
            <div className="relative w-full h-[calc(50%-5px)] group cursor-pointer overflow-hidden" onClick={() => openLightbox(2)}>
              <img src={images[2] || images[0]} alt="Gallery 2" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              {images.length > 3 && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="text-white font-mono font-semibold text-lg">+{images.length - 3} More Photos</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 pt-4">
          
          {/* Main Content (Left Column) */}
          <div className="md:col-span-2 space-y-8">
            
            {/* Description */}
            <section>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-3">About this location</h2>
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{location.description}</p>
            </section>
            
            <hr className="border-border/60" />
            
            <section>
              <h2 className="font-display text-2xl font-semibold text-foreground mb-3 flex items-center">
                <MapPin className="mr-2.5 h-5 w-5 text-primary" />
                Location Details
              </h2>
              <div className="bg-surface-elevated rounded-xl p-5 border border-border/80 space-y-3">
                {location.address && (
                  <div>
                    <span className="text-muted-foreground block text-xs font-mono uppercase tracking-wider">Full Address</span>
                    <span className="font-medium text-foreground">{location.address}</span>
                  </div>
                )}
                {location.landmark && (
                  <div>
                    <span className="text-muted-foreground block text-xs font-mono uppercase tracking-wider">Nearest Landmark</span>
                    <span className="font-medium text-foreground">{location.landmark}</span>
                  </div>
                )}
                {location.address && (
                  <div className="pt-2">
                    <a href={location.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address + ' ' + location.city)}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center text-sm font-medium">
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Open in Google Maps
                    </a>
                  </div>
                )}
              </div>
            </section>
            
            <hr className="border-border/60" />

            {/* Availability Timings */}
            {location.timings && (
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-3 flex items-center">
                  <Clock className="mr-2.5 h-5 w-5 text-primary" />
                  Availability Timings
                </h2>
                <div className="flex items-start gap-3 bg-surface-elevated p-6 rounded-xl border border-border/80 text-base">
                  <div className="w-full">
                    <div className="text-muted-foreground space-y-4">
                      {(() => {
                        try {
                          const timings = typeof location.timings === 'string' ? JSON.parse(location.timings) : location.timings;
                          if (Array.isArray(timings)) {
                            return timings.map((timing: any, i: number) => (
                              <div key={i} className="flex flex-col gap-2 border-l-4 border-primary pl-4 py-1">
                                <span className="font-mono font-semibold text-foreground text-lg">{timing.from} to {timing.to}</span>
                                <div className="flex flex-wrap gap-2">
                                  {timing.days.map((day: string, idx: number) => (
                                    <span key={idx} className="text-xs font-mono bg-card text-foreground border border-border/80 px-3 py-1 rounded-full shadow-sm">
                                      {day}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ));
                          }
                          return <span>{location.timings}</span>;
                        } catch (e) {
                          return <span>{location.timings}</span>;
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <hr className="border-border/60" />

            {/* Instructions */}
            {location.instructions && (
              <section>
                <h2 className="font-display text-2xl font-semibold text-foreground mb-3 flex items-center">
                  <AlertCircle className="mr-2.5 h-5 w-5 text-primary" /> 
                  Property Instructions & Rules
                </h2>
                <div className="bg-primary/10 rounded-xl p-5 border border-primary/30">
                  <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{location.instructions}</p>
                </div>
              </section>
            )}

          </div>

          {/* Sidebar (Right Column) */}
          <div className="relative">
            <div className="sticky top-6 space-y-6">
              
              {/* Pricing Card */}
              <Card className="bg-card border-primary/30 shadow-noir rounded-xl">
                <CardContent className="p-6 space-y-6">
                  <div>
                    <div className="flex items-end gap-1.5 mb-1">
                      <span className="font-mono text-3xl font-bold text-foreground">₹{location.price ? Number(location.price).toLocaleString() : '0'}</span>
                      <span className="text-muted-foreground pb-1">/ {(location.price_type || 'per_day').replace(/^per[_\s]*/i, '').replace('Per ', '')}</span>
                    </div>
                    {location.price_hour && (
                      <div className="text-sm font-mono text-muted-foreground mt-1">
                        ₹{Number(location.price_hour).toLocaleString()} / Hour
                      </div>
                    )}
                    {location.security_deposit && (
                      <div className="text-sm font-mono text-muted-foreground mt-1">
                        Security Deposit: ₹{Number(location.security_deposit).toLocaleString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <Button className="w-full bg-primary text-primary-foreground hover:bg-primary-hover font-medium h-12 text-base transition-colors shadow-noir" onClick={() => setIsEnquireOpen(true)}>
                      Enquire Now
                    </Button>
                    <Button variant="outline" className="w-full h-12 text-base border-primary/40 text-primary bg-primary/5 hover:bg-primary/15 font-medium transition-colors" onClick={() => setIsBookVisitOpen(true)}>
                      Book Site Visit
                    </Button>
                    {user?.id === location.created_by && (
                      <Button variant="ghost" className="w-full text-primary hover:bg-primary/10" onClick={() => {
                        setIsViewVisitsOpen(true);
                        fetchSiteVisits();
                      }}>
                        View site visitings
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center pt-2 border-t border-border/60">
                    <Shield className="h-4 w-4 text-primary" /> Secure enquiry via FilmCollab
                  </div>
                </CardContent>
              </Card>

              {/* Contact Card */}
              <Card className="bg-card border-border/80 shadow-noir rounded-xl">
                <CardContent className="px-4 py-4 md:p-6">
                  <h3 className="font-display font-semibold text-lg text-foreground mb-4 border-b border-border/60 pb-2">Contact Information</h3>
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <div>
                      <span className="text-muted-foreground block text-xs font-mono uppercase tracking-wider">Name</span>
                      <span className="font-medium text-foreground">{creatorName || location.owner_name}</span>
                    </div>
                    {location.phone && (
                      <div className="pt-2">
                        <span className="text-muted-foreground block text-xs font-mono uppercase tracking-wider">Mobile Number</span>
                        <span className="font-mono font-medium text-foreground">📞 {location.phone}</span>
                      </div>
                    )}
                    {location.email && (
                      <div className="pt-2">
                        <span className="text-muted-foreground block text-xs font-mono uppercase tracking-wider">Email</span>
                        <span className="font-medium text-foreground">✉️ {location.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

        </div>
      </div>

      
      {/* Enquire Modal */}
      <Dialog open={isEnquireOpen} onOpenChange={setIsEnquireOpen}>
        <DialogContent className="bg-card border-border/80 shadow-noir">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-foreground">Send Enquiry</DialogTitle>
            <DialogDescription>Send a message directly to the owner of this property.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea 
                placeholder="Hi, I am interested in booking this property for..." 
                value={enquiryMessage} 
                onChange={e => setEnquiryMessage(e.target.value)}
                rows={4}
                className="bg-surface-elevated border-border/80"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border/80 bg-surface-elevated" onClick={() => setIsEnquireOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={handleEnquire} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Book Visit Modal */}
      <Dialog open={isBookVisitOpen} onOpenChange={setIsBookVisitOpen}>
        <DialogContent className="sm:max-w-lg w-full bg-card border-border/80 shadow-noir">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-foreground">Book Site Visit</DialogTitle>
            <DialogDescription>Select your preferred day(s) and time window for visiting the property.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Multiselect Days */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Preferred Day(s)</Label>
                <span className="text-xs font-mono text-muted-foreground">
                  {selectedDays.length === 0 ? "Select 1 or more days" : `${selectedDays.length} day(s) selected`}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const isSelected = selectedDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        setSelectedDays(prev => 
                          prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                        );
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer select-none",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-surface-elevated hover:bg-surface-hover text-muted-foreground hover:text-foreground border-border/80"
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
                >
                  + All Weekdays
                </button>
                <span className="text-muted-foreground text-[11px]">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedDays(['Saturday', 'Sunday'])}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
                >
                  + Weekends
                </button>
                <span className="text-muted-foreground text-[11px]">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedDays(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
                >
                  + All Days
                </button>
              </div>
            </div>

            {/* Redesigned Time Window */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Time Window
                </Label>
                <span className="text-xs text-muted-foreground">Operating hours</span>
              </div>

              <div className="bg-surface-elevated border border-border/80 rounded-xl p-3.5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium block">
                      From (Start)
                    </span>
                    <Input
                      type="time"
                      value={visitStartTime}
                      onChange={e => setVisitStartTime(e.target.value)}
                      className="bg-card border-border/80 h-10 px-3 text-sm rounded-lg font-mono focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground font-medium block">
                      To (End)
                    </span>
                    <Input
                      type="time"
                      value={visitEndTime}
                      onChange={e => setVisitEndTime(e.target.value)}
                      className="bg-card border-border/80 h-10 px-3 text-sm rounded-lg font-mono focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="pt-2 border-t border-border/50">
                  <span className="text-[11px] text-muted-foreground block mb-1.5 font-medium">Quick Slots:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: 'Morning (9 AM - 12 PM)', start: '09:00', end: '12:00' },
                      { label: 'Afternoon (1 PM - 4 PM)', start: '13:00', end: '16:00' },
                      { label: 'Evening (4 PM - 7 PM)', start: '16:00', end: '19:00' },
                    ].map(slot => (
                      <button
                        key={slot.label}
                        type="button"
                        onClick={() => {
                          setVisitStartTime(slot.start);
                          setVisitEndTime(slot.end);
                        }}
                        className={cn(
                          "text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer",
                          visitStartTime === slot.start && visitEndTime === slot.end
                            ? "bg-primary/15 text-primary border-primary/50 font-medium"
                            : "bg-card hover:bg-surface-hover text-muted-foreground hover:text-foreground border-border/70"
                        )}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message (Optional)</Label>
              <Textarea 
                placeholder="Any specific requirements..." 
                value={visitMessage} 
                onChange={e => setVisitMessage(e.target.value)}
                className="bg-surface-elevated border-border/80"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border/80 bg-surface-elevated" onClick={() => setIsBookVisitOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary-hover" onClick={handleBookVisit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Request Visit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Visits Modal */}
      <Dialog open={isViewVisitsOpen} onOpenChange={setIsViewVisitsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-card border-border/80 shadow-noir">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-foreground">Site Visit Requests</DialogTitle>
            <DialogDescription>List of users who requested a site visit for this property.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {siteVisits.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No site visit requests yet.</p>
            ) : (
              siteVisits.map(visit => (
                <div key={visit.id} className="border border-border/80 rounded-xl p-4 space-y-2 bg-surface-elevated">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg text-foreground">{visit.user?.full_name || visit.user?.first_name || 'Anonymous User'}</h4>
                      <p className="text-sm text-muted-foreground">{visit.user?.email} {visit.user?.phone ? ` • ${visit.user.phone}` : ''}</p>
                    </div>
                    <Badge variant={visit.status === 'pending' ? 'outline' : 'default'} className="font-mono uppercase text-[10px]">
                      {visit.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div><span className="text-muted-foreground">Requested Day:</span> <span className="font-medium text-foreground">{visit.selected_day}</span></div>
                    <div><span className="text-muted-foreground">Requested Time:</span> <span className="font-mono font-medium text-foreground">{visit.selected_time}</span></div>
                  </div>
                  {visit.message && (
                    <div className="mt-2 text-sm bg-card text-card-foreground p-3 rounded-lg border border-border/80">
                      <span className="text-muted-foreground block mb-1 text-xs font-mono uppercase">Message:</span>
                      {visit.message}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Overlay */}
      {selectedImageIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <Button 
            variant="ghost" 
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full h-12 w-12 p-0"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>

          <Button 
            variant="ghost" 
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-14 w-14 p-0 hidden md:flex"
            onClick={prevImage}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>

          <img 
            src={images[selectedImageIndex]} 
            alt="Gallery preview" 
            className="max-h-[90vh] max-w-full object-contain select-none"
            onClick={(e) => e.stopPropagation()} 
          />

          <Button 
            variant="ghost" 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-14 w-14 p-0 hidden md:flex"
            onClick={nextImage}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          {/* Mobile navigation overlays */}
          <div className="absolute inset-y-0 left-0 w-1/3 md:hidden" onClick={prevImage} />
          <div className="absolute inset-y-0 right-0 w-1/3 md:hidden" onClick={nextImage} />

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 bg-black/60 font-mono px-4 py-1 rounded-full text-sm">
            {selectedImageIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
