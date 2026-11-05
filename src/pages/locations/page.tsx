import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MapPin, 
  Search, 
  Plus,
  Heart,
  User,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface Location {
  id: string;
  name: string;
  type: string;
  city: string;
  state: string;
  price: number;
  price_type: string;
  image_url: string;
  owner_name: string;
  likesCount: number;
  isWishlisted: boolean;
  tags?: string[];
}

export default function ShootingLocations() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [propertyTypeFilter, setPropertyTypeFilter] = useState("all");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const ITEMS_PER_PAGE = 12;

  useEffect(() => {
    fetchLocations();
  }, [user?.id]);

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all locations
      const { data: locationsData, error: locError } = await supabase
        .from('shooting_locations')
        .select('*')
        .order('created_at', { ascending: false });

      if (locError) throw locError;

      const filteredLocations = (locationsData || []).filter((l: any) => {
        const isBlocked = l.status === "blocked" || (l.tags && l.tags.includes("Blocked"));
        const isOwner = l.created_by === user?.id;
        const adminAccess = isAdmin();
        return !isBlocked || isOwner || adminAccess;
      });
      let likesData: any[] = [];
      try {
        // 2. Fetch all likes to calculate counts and user wishlist
        const { data: fetchLikesData, error: likesError } = await supabase
          .from('shooting_location_likes')
          .select('*');

        if (likesError) throw likesError;
        likesData = fetchLikesData || [];
      } catch (err) {
        console.warn("Could not fetch location likes, table may not exist yet.", err);
      }

      const formattedLocations: Location[] = filteredLocations.map(loc => {
        const locationLikes = likesData?.filter(like => like.location_id === loc.id) || [];
        const isWishlisted = user ? locationLikes.some(like => like.user_id === user.id) : false;
        
        return {
          id: loc.id,
          name: loc.name,
          type: loc.property_type || (loc as any).type,
          city: loc.city,
          state: loc.state,
          price: loc.daily_rate || loc.hourly_rate || (loc as any).price,
          price_type: (loc as any).price_type || 'per_day',
          image_url: loc.image_url,
          owner_name: loc.owner_name,
          likesCount: locationLikes.length,
          isWishlisted,
          tags: loc.tags || []
        };
      });

      setLocations(formattedLocations);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleWishlist = async (e: React.MouseEvent, id: string, isCurrentlyWishlisted: boolean) => {
    e.stopPropagation();
    if (!user) return; // Must be logged in

    // Optimistic update
    setLocations(prev => prev.map(loc => {
      if (loc.id === id) {
        return {
          ...loc,
          isWishlisted: !isCurrentlyWishlisted,
          likesCount: loc.likesCount + (isCurrentlyWishlisted ? -1 : 1)
        };
      }
      return loc;
    }));

    try {
      if (isCurrentlyWishlisted) {
        await supabase
          .from('shooting_location_likes')
          .delete()
          .eq('location_id', id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('shooting_location_likes')
          .insert({ location_id: id, user_id: user.id });
      }
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      fetchLocations(); // Revert on error
    }
  };

  // Apply filters
  let filteredLocations = locations;
  
  if (showWishlist) {
    filteredLocations = filteredLocations.filter(loc => loc.isWishlisted);
  } else {
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filteredLocations = filteredLocations.filter(loc => 
        loc.name.toLowerCase().includes(lowerSearch) || 
        loc.city.toLowerCase().includes(lowerSearch) ||
        loc.state.toLowerCase().includes(lowerSearch)
      );
    }
    
    if (propertyTypeFilter !== "all") {
      filteredLocations = filteredLocations.filter(loc => loc.type.toLowerCase().includes(propertyTypeFilter.toLowerCase()) || propertyTypeFilter.toLowerCase().includes(loc.type.toLowerCase()));
    }
    
    if (budgetFilter !== "all") {
      filteredLocations = filteredLocations.filter(loc => {
        if (budgetFilter === "hourly") return loc.price_type.toLowerCase().includes("hour");
        if (budgetFilter === "daily") return loc.price_type.toLowerCase().includes("day");
        return true;
      });
    }
  }

  // Pagination logic
  const totalPages = Math.ceil(filteredLocations.length / ITEMS_PER_PAGE);
  const displayedLocations = filteredLocations.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset pagination if filters change and current page is now empty
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredLocations.length, totalPages, currentPage]);


  return (
    <AppLayout>
      <div className="flex-1 space-y-6 px-0 py-2 md:p-8 md:pt-6">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <p className="noir-eyebrow text-primary mb-1">Location Scouting</p>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground">Shooting Locations</h1>
            <p className="text-muted-foreground text-sm mt-1">Discover and book architectural sets, studios, and unique properties for your next shoot.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              className={cn(
                "border-border/80 bg-surface-elevated hover:bg-surface-hover transition-colors",
                showWishlist ? "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setShowWishlist(!showWishlist);
                setCurrentPage(1);
              }}
            >
              <Heart className={cn("mr-2 h-4 w-4", showWishlist ? "fill-destructive text-destructive" : "")} />
              {showWishlist ? "View All" : "View Wishlist"}
            </Button>
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir font-medium"
              onClick={() => navigate("/locations/new")}
            >
              <Plus className="mr-2 h-4 w-4" />
              List Your Property
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        {!showWishlist && (
          <div className="bg-card text-card-foreground rounded-xl p-4 shadow-noir border border-border/80 flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input 
                placeholder="Search by location name, city, state..." 
                className="pl-10 h-10 bg-surface-elevated border-border/80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:flex md:w-auto">
              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger className="w-full md:w-[190px] h-10 bg-surface-elevated border-border/80">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/80">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="house">House / Villa</SelectItem>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="commercial">Commercial Building</SelectItem>
                  <SelectItem value="outdoor">Open Land / Forest</SelectItem>
                </SelectContent>
              </Select>
              <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                <SelectTrigger className="w-full md:w-[155px] h-10 bg-surface-elevated border-border/80">
                  <SelectValue placeholder="Budget" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/80">
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="hourly">Per Hour</SelectItem>
                  <SelectItem value="daily">Per Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p className="font-mono text-xs uppercase tracking-widest">Loading properties...</p>
          </div>
        ) : displayedLocations.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-border/80 bg-card/60">
            <Heart className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="font-display text-xl font-medium text-foreground">No properties found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {showWishlist ? "You haven't wishlisted any properties yet." : "Try adjusting your filters or search term."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {displayedLocations.map(location => (
              <Card
                key={location.id}
                className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-noir hover:border-primary/40 transition-all duration-300 group cursor-pointer flex flex-col"
                onClick={() => navigate(`/locations/${location.id}`)}
              >
                <div className="aspect-[4/3] relative overflow-hidden bg-surface-elevated">
                  <img 
                    src={location.image_url || "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800"} 
                    alt={location.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-60 pointer-events-none" />
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-background/85 text-foreground hover:bg-background/95 border border-border/80 backdrop-blur-md shadow-sm font-mono text-[11px] uppercase tracking-wider">
                      {location.type}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3">
                    <button 
                      onClick={(e) => toggleWishlist(e, location.id, location.isWishlisted)}
                      className="bg-background/85 backdrop-blur-md border border-border/70 rounded-full p-2.5 shadow-sm hover:bg-surface-elevated text-foreground transition-colors"
                    >
                      <Heart className={cn("h-4 w-4 transition-colors", location.isWishlisted ? "fill-destructive text-destructive" : "text-muted-foreground hover:text-foreground")} />
                    </button>
                  </div>
                </div>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="font-display text-lg font-medium line-clamp-1 text-foreground group-hover:text-primary transition-colors" title={location.name}>
                    {location.name}
                  </CardTitle>
                  <div className="flex flex-col gap-1.5 mt-1">
                    <div className="flex items-center text-muted-foreground text-xs">
                      <MapPin className="h-3.5 w-3.5 mr-1.5 shrink-0 text-primary/80" /> 
                      <span className="truncate">{location.city}, {location.state}</span>
                    </div>
                    {location.owner_name && (
                      <div className="flex items-center text-muted-foreground text-xs">
                        <User className="h-3.5 w-3.5 mr-1.5 shrink-0 text-muted-foreground/70" /> 
                        <span className="truncate">Listed by {location.owner_name}</span>
                      </div>
                    )}
                    {location.tags && location.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {location.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-surface-elevated border border-border/60 text-muted-foreground font-normal">
                            {tag}
                          </Badge>
                        ))}
                        {location.tags.length > 3 && (
                          <span className="text-[10px] font-mono text-muted-foreground">+{location.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 flex-1">
                  <div className="flex justify-between items-end pt-2 border-t border-border/50">
                    <div className="font-mono font-semibold text-foreground text-lg">
                      ₹{location.price.toLocaleString()} <span className="text-xs font-sans text-muted-foreground font-normal">/ {location.price_type.replace('Per ', '')}</span>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground flex items-center">
                      <Heart className="h-3 w-3 mr-1 fill-muted-foreground/40 text-muted-foreground/60" /> {location.likesCount}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="p-4 pt-0 mt-auto">
                  <Button 
                    variant="outline" 
                    className="w-full border-primary/40 text-primary bg-primary/5 hover:bg-primary hover:text-primary-foreground h-9 font-medium transition-colors" 
                    onClick={(e) => { e.stopPropagation(); navigate(`/locations/${location.id}`); }}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 pt-6 pb-8">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border/80 bg-surface-elevated hover:bg-surface-hover"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {[...Array(totalPages)].map((_, i) => (
              <Button
                key={i + 1}
                variant={currentPage === i + 1 ? "default" : "outline"}
                size="sm"
                className={cn(
                  "font-mono",
                  currentPage === i + 1
                    ? "bg-primary text-primary-foreground hover:bg-primary-hover border-transparent"
                    : "border-border/80 bg-surface-elevated hover:bg-surface-hover"
                )}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="border-border/80 bg-surface-elevated hover:bg-surface-hover"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
