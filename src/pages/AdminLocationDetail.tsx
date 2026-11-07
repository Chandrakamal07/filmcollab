import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, IndianRupee, Image as ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function AdminLocationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [location, setLocation] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLocation = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("shooting_locations")
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setLocation(data);
      } catch (error) {
        console.error("Error fetching location:", error);
        toast({ title: "Failed to fetch location details", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (id) {
      fetchLocation();
    }
  }, [id]);

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Location Details" pageName="Locations">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading location details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!location) {
    return (
      <AdminLayout pageTitle="Location Not Found" pageName="Locations">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-muted-foreground">This location could not be found or has been deleted.</p>
          <Button onClick={() => navigate("/admin-dashboard/locations")} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Locations
          </Button>
        </div>
      </AdminLayout>
    );
  }

  let timingsList = [];
  try {
    if (location.timings) {
      timingsList = JSON.parse(location.timings);
    }
  } catch (e) {
    // legacy string support
    timingsList = location.timings ? [{ from: "N/A", to: "N/A", days: [location.timings] }] : [];
  }

  return (
    <AdminLayout pageTitle="Location Details" pageName="Locations">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin-dashboard/locations")}
            className="border border-border/70 bg-surface-elevated hover:bg-surface-hover"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <span className="noir-eyebrow">Location Dossier</span>
            <h1 className="font-display text-3xl font-bold text-foreground mt-0.5">{location.name}</h1>
            <p className="text-muted-foreground font-mono text-xs mt-1">Listed on {new Date(location.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="font-display text-xl text-foreground">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Description</h4>
                  <p className="mt-1.5 text-sm text-foreground leading-relaxed">{location.description}</p>
                </div>
                <div className="pt-3 border-t border-border/60">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Instructions & Rules</h4>
                  <p className="mt-1.5 text-sm text-foreground whitespace-pre-wrap leading-relaxed">{location.instructions || "No specific instructions provided."}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="font-display text-xl text-foreground">Availability Timings</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {timingsList.length > 0 ? (
                  <div className="space-y-3">
                    {timingsList.map((t: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-3.5 bg-surface-elevated rounded-xl border border-border/70">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium text-foreground">{t.from || "Start"} to {t.to || "End"}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {t.days && t.days.map((day: string) => (
                            <Badge key={day} variant="outline" className="bg-card border-border/70 text-foreground">{day}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No timings provided.</p>
                )}
              </CardContent>
            </Card>

            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="font-display text-xl text-foreground">Media Gallery</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {location.media_urls && location.media_urls.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {location.media_urls.map((url: string, index: number) => (
                      <div key={index} className="relative aspect-video rounded-xl overflow-hidden bg-surface-elevated border border-border/70">
                        <img src={url} alt={`Property Media ${index + 1}`} className="object-cover w-full h-full" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-surface-elevated/60 rounded-xl border border-dashed border-border/80">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">No media uploaded.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="font-display text-xl text-foreground">At a Glance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex justify-between items-center border-b border-border/60 pb-3">
                  <span className="text-sm text-muted-foreground">Type</span>
                  <Badge className="capitalize bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20">{location.type}</Badge>
                </div>
                <div className="flex justify-between items-center border-b border-border/60 pb-3">
                  <span className="text-sm text-muted-foreground">Owner</span>
                  <span className="font-medium text-foreground">{location.owner_name || "Unknown"}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border/60 pb-3">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <span className="font-mono font-semibold text-primary flex items-center">
                    <IndianRupee className="h-3.5 w-3.5 mr-0.5" /> {location.price} / {location.price_type === 'Per Day' ? 'Day' : 'Hour'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="font-display text-xl text-foreground">Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">{location.city}, {location.state}</p>
                    {location.landmark && <p className="text-sm text-muted-foreground mt-0.5">Near {location.landmark}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
