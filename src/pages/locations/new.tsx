import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, CheckCircle, ChevronRight, ChevronLeft, Plus, Trash2, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useEffect, useMemo } from "react";
import { State, City } from "@/lib/india-locations";
import { cleanupUploadedStorageObjects } from "@/lib/directory-storage";


export default function NewLocation() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCustomState, setIsCustomState] = useState(false);
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  const [timingList, setTimingList] = useState<{from: string, to: string, days: string[]}[]>([
    { from: "", to: "", days: [] }
  ]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<string[]>([]);
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const toggleDay = (index: number, day: string) => {
    setTimingList(prev => prev.map((t, i) => {
      if (i !== index) return t;
      if (day === "All Days") {
        if (t.days.length === 7) return { ...t, days: [] };
        return { ...t, days: [...daysOfWeek] };
      }
      const hasDay = t.days.includes(day);
      const newDays = hasDay ? t.days.filter(d => d !== day) : [...t.days, day];
      return { ...t, days: newDays };
    }));
  };

  const addTiming = () => {
    if (timingList.length < 3) {
      setTimingList(prev => [...prev, { from: "", to: "", days: [] }]);
    }
  };

  const removeTiming = (index: number) => {
    setTimingList(prev => prev.filter((_, i) => i !== index));
  };

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    description: "",
    country: "India",
    state: "",
    city: "",
    landmark: "",
    address: "",
    mapUrl: "",
    priceHour: "",
    priceDay: "",
    timings: "",
    instructions: "",
    contactName: "",
    phone: "",
    email: "",
    securityDeposit: ""
  });

  useEffect(() => {
    const fetchPropertyTypes = async () => {
      try {
        const { data, error } = await supabase.from('property_types').select('name').order('name');
        if (!error && data) {
          setPropertyTypes(data.map(d => d.name));
        }
      } catch (err) {
        console.error("Error fetching property types", err);
      }
    };
    fetchPropertyTypes();

    const fetchLocationData = async () => {
      if (!editId) return;
      try {
        const { data, error } = await supabase.from('shooting_locations').select('*').eq('id', editId).single();
        if (error) throw error;
        if (data) {
          const loc = data as any;
          setIsEditing(true);
          setFormData({
            name: loc.name || "",
            type: loc.type || loc.property_type || "",
            description: loc.description || "",
            country: loc.country || "India",
            state: loc.state || "",
            city: loc.city || "",
            landmark: loc.landmark || "",
            address: loc.address || "",
            mapUrl: loc.map_url || "",
            priceHour: loc.price_hour?.toString() || loc.hourly_rate?.toString() || "",
            priceDay: loc.price?.toString() || loc.daily_rate?.toString() || "", 
            timings: "", 
            instructions: loc.instructions || "",
            contactName: loc.owner_name || "",
            phone: loc.phone || loc.owner_phone || "",
            email: loc.email || loc.owner_email || "",
            securityDeposit: loc.security_deposit?.toString() || ""
          });

          // Parse timings JSON
          if (loc.media_urls && loc.media_urls.length > 0) {
            setExistingMedia(loc.media_urls);
          } else if (loc.image_url) {
            setExistingMedia([loc.image_url]);
          }
          if (loc.timings) {
            try {
              const parsedTimings = typeof loc.timings === 'string' ? JSON.parse(loc.timings) : loc.timings;
              if (Array.isArray(parsedTimings) && parsedTimings.length > 0) {
                setTimingList(parsedTimings);
              }
            } catch(e) {
              console.error('Failed to parse timings', e);
            }
          }

          // Check if state/city is custom
          const stateObj = State.getStatesOfCountry('IN').find(s => s.name === data.state);
          if (data.state && !stateObj) setIsCustomState(true);
          if (data.city && stateObj) {
            const cityObj = City.getCitiesOfState('IN', stateObj.isoCode).find(c => c.name === data.city);
            if (!cityObj) setIsCustomCity(true);
          } else if (data.city && !stateObj) {
            setIsCustomCity(true);
          }
        }
      } catch (err) {
        console.error("Error fetching location to edit", err);
      }
    };
    fetchLocationData();
  }, [editId]);

  const indianStates = useMemo(() => State.getStatesOfCountry('IN'), []);
  const availableCities = useMemo(() => {
    if (isCustomState) return [];
    const stateObj = indianStates.find(s => s.name === formData.state);
    return stateObj ? City.getCitiesOfState('IN', stateObj.isoCode) : [];
  }, [formData.state, isCustomState, indianStates]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

    
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be logged in to list a property.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    const newlyUploadedPaths: string[] = [];
    
    try {
      const uploadedUrls: string[] = [];
      if (mediaFiles.length > 0) {
        for (const file of mediaFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;
          const { error: uploadError } = await supabase.storage
            .from('location_media')
            .upload(filePath, file);
          if (uploadError) throw uploadError;
          newlyUploadedPaths.push(filePath);

          const { data: { publicUrl } } = supabase.storage
            .from('location_media')
            .getPublicUrl(filePath);
          uploadedUrls.push(publicUrl);
        }
      }

      const finalMediaUrls = [...existingMedia, ...uploadedUrls];
      
      const locationData = {
          name: formData.name,
          type: formData.type,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          landmark: formData.landmark,
          address: formData.address,
          map_url: formData.mapUrl,
          price: Number(formData.priceDay) || 0,
          price_hour: Number(formData.priceHour) || null,
          security_deposit: Number(formData.securityDeposit) || null,
          price_type: 'Per Day', 
          description: formData.description,
          instructions: formData.instructions,
          timings: JSON.stringify(timingList),
          image_url: finalMediaUrls.length > 0 ? finalMediaUrls[0] : (isEditing ? null : 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=800'), 
          media_urls: finalMediaUrls.length > 0 ? finalMediaUrls : null,
          owner_name: formData.contactName || user.email?.split('@')[0] || 'Unknown Owner',
          phone: formData.phone,
          email: formData.email,
          created_by: user.id
        };
        
              
      let error;
      console.log("PAYLOAD TO SUPABASE:", locationData);
      if (isEditing && editId) {
        // Update existing
        const { error: updateError } = await supabase
          .from('shooting_locations')
          .update(locationData as any)
          .eq('id', editId);
        error = updateError;
      } else {
        // Insert new
        const { error: insertError } = await supabase
          .from('shooting_locations')
          .insert(locationData as any);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: isEditing ? "Listing Updated!" : "Listing Created!",
        description: isEditing ? "Your property has been successfully updated." : "Your property has been successfully listed.",
      });
      navigate("/locations");
    } catch (error: any) {
      if (newlyUploadedPaths.length > 0) {
        await cleanupUploadedStorageObjects(newlyUploadedPaths, "location_media");
      }
      console.error("Error creating listing:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create listing.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      {/* Reduced padding wrapper: max-w-3xl, py-8, minimal side padding on mobile */}
      <div className="flex-1 max-w-3xl mx-auto w-full space-y-6 px-2 sm:px-4 py-8">
        
        <div className="flex items-center gap-4 border-b border-border/60 pb-4">
          <Button variant="ghost" size="icon" className="hover:bg-surface-elevated" onClick={() => navigate("/locations")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="noir-eyebrow text-primary">Location Registry</p>
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground">List Your Property</h1>
            {isEditing ? (
              <p className="text-muted-foreground text-sm md:text-base">Update your property details below.</p>
            ) : (
              <p className="text-muted-foreground text-sm md:text-base">Fill in the details below to list your property.</p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          
          {/* STEP 1: Basic Information */}
          <Card className="bg-card border-border/80 shadow-noir rounded-xl">
            <CardHeader>
              <CardTitle className="font-display text-xl text-foreground">Basic Information</CardTitle>
              <CardDescription>Give your listing a catchy name and describe its vibe.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="propertyName">Property Name <span className="text-destructive">*</span></Label>
                <Input id="name" value={formData.name} onChange={handleInputChange} placeholder="e.g. Vintage Heritage Villa" className="bg-surface-elevated border-border/80" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="propertyType">Property Type <span className="text-destructive">*</span></Label>
                <Select value={formData.type} onValueChange={(val) => setFormData(prev => ({...prev, type: val}))} required>
                  <SelectTrigger id="propertyType" className="bg-surface-elevated border-border/80">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                    {propertyTypes.length > 0 ? (
                      propertyTypes.map(type => (
                        <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="house">House / Villa</SelectItem>
                        <SelectItem value="apartment">Apartment</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="commercial">Commercial Building</SelectItem>
                        <SelectItem value="cafe">Cafe / Restaurant</SelectItem>
                        <SelectItem value="outdoor">Outdoor / Open Land</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                <Textarea 
                  id="description" 
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe the unique features, architecture, and lighting..." 
                  className="min-h-[120px] bg-surface-elevated border-border/80" 
                  required 
                />
              </div>
            </CardContent>
          </Card>

          {/* STEP 2: Location Details */}
          <Card className="bg-card border-border/80 shadow-noir rounded-xl">
            <CardHeader>
              <CardTitle className="font-display text-xl text-foreground">Location Details</CardTitle>
              <CardDescription>Where is your property located?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                  <Select value="India" disabled>
                    <SelectTrigger className="bg-surface-elevated border-border/80"><SelectValue placeholder="India" /></SelectTrigger>
                    <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80"><SelectItem value="India">India</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="state">State <span className="text-destructive">*</span></Label>
                  <Select 
                    value={isCustomState ? 'other' : (formData.state || '')} 
                    onValueChange={(val) => {
                      if (val === 'other') {
                        setIsCustomState(true);
                        setFormData(prev => ({ ...prev, state: '', city: '' }));
                      } else {
                        setIsCustomState(false);
                        setFormData(prev => ({ ...prev, state: val, city: '' }));
                      }
                    }}
                  >
                    <SelectTrigger className="bg-surface-elevated border-border/80">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                      {indianStates.map(s => (
                        <SelectItem key={s.isoCode} value={s.name}>{s.name}</SelectItem>
                      ))}
                      <SelectItem value="other">Other (Enter manually)</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustomState && (
                    <Input 
                      placeholder="Enter state manually" 
                      value={formData.state}
                      onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="mt-2 bg-surface-elevated border-border/80"
                      required
                    />
                  )}
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="city">City <span className="text-destructive">*</span></Label>
                  <Select 
                    value={isCustomCity ? 'other' : (formData.city || '')} 
                    onValueChange={(val) => {
                      if (val === 'other') {
                        setIsCustomCity(true);
                        setFormData(prev => ({ ...prev, city: '' }));
                      } else {
                        setIsCustomCity(false);
                        setFormData(prev => ({ ...prev, city: val }));
                      }
                    }}
                    disabled={!formData.state && !isCustomState}
                  >
                    <SelectTrigger className="bg-surface-elevated border-border/80">
                      <SelectValue placeholder="Select City" />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                      {availableCities.map(c => (
                        <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                      ))}
                      <SelectItem value="other">Other (Enter manually)</SelectItem>
                    </SelectContent>
                  </Select>
                  {isCustomCity && (
                    <Input 
                      placeholder="Enter city manually" 
                      value={formData.city}
                      onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="mt-2 bg-surface-elevated border-border/80"
                      required
                    />
                  )}
                </div>
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="landmark">Landmark <span className="text-destructive">*</span></Label>
                  <Input id="landmark" name="landmark" value={formData.landmark} onChange={handleInputChange} placeholder="Nearest landmark" className="bg-surface-elevated border-border/80" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Full Address <span className="text-destructive">*</span></Label>
                <Textarea id="address" value={formData.address} onChange={handleInputChange} placeholder="Complete street address" className="bg-surface-elevated border-border/80" required />
              </div>
              <div className="space-y-2 mt-4">
                <Label htmlFor="mapUrl">Google Maps Link</Label>
                <Input id="mapUrl" value={formData.mapUrl} onChange={handleInputChange} placeholder="https://maps.google.com/..." className="bg-surface-elevated border-border/80" />
                <p className="text-xs text-muted-foreground">Paste the URL from Google Maps so crews can easily find your location.</p>
              </div>
            </CardContent>
          </Card>

          {/* STEP 3: Pricing */}
          <Card className="bg-card border-border/80 shadow-noir rounded-xl">
            <CardHeader>
              <CardTitle className="font-display text-xl text-foreground">Pricing</CardTitle>
              <CardDescription>Set your rates for renting out the property.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="priceHour">Price Per Hour (₹) <span className="text-destructive">*</span></Label>
                  <Input id="priceHour" value={formData.priceHour} onChange={handleInputChange} type="number" placeholder="0" className="bg-surface-elevated border-border/80 font-mono" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priceDay">Price Per Day (₹) <span className="text-destructive">*</span></Label>
                  <Input id="priceDay" value={formData.priceDay} onChange={handleInputChange} type="number" placeholder="0" className="bg-surface-elevated border-border/80 font-mono" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="securityDeposit">Security Deposit (₹)</Label>
                  <Input id="securityDeposit" value={formData.securityDeposit} onChange={handleInputChange} type="number" placeholder="0" className="bg-surface-elevated border-border/80 font-mono" />
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox id="negotiable" />
                <Label htmlFor="negotiable" className="font-normal cursor-pointer">Prices are negotiable based on production scale.</Label>
              </div>
            </CardContent>
          </Card>

          {/* STEP 4: Timings & Instructions */}
          <Card className="bg-card border-border/80 shadow-noir rounded-xl">
            <CardHeader>
              <CardTitle className="font-display text-xl text-foreground">Timings & Instructions</CardTitle>
              <CardDescription>When is your property available and what are the rules?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>Availability Timings <span className="text-destructive">*</span></Label>
                {timingList.map((timing, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-3 p-3.5 border border-border/80 rounded-xl bg-surface-elevated">
                    
                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <Select value={timing.from} onValueChange={(val) => {
                        const newTimings = [...timingList];
                        newTimings[index].from = val;
                        setTimingList(newTimings);
                      }}>
                        <SelectTrigger className="h-9 bg-card border-border/80"><SelectValue placeholder="Start Time" /></SelectTrigger>
                        <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                          {Array.from({length: 24}).map((_, i) => {
                            const hour = i % 12 || 12;
                            const ampm = i < 12 ? 'AM' : 'PM';
                            const timeStr = `${hour.toString().padStart(2, '0')}:00 ${ampm}`;
                            return <SelectItem key={timeStr} value={timeStr}>{timeStr}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-[120px]">
                      <Label className="text-xs text-muted-foreground">To</Label>
                      <Select value={timing.to} onValueChange={(val) => {
                        const newTimings = [...timingList];
                        newTimings[index].to = val;
                        setTimingList(newTimings);
                      }}>
                        <SelectTrigger className="h-9 bg-card border-border/80"><SelectValue placeholder="End Time" /></SelectTrigger>
                        <SelectContent position="popper" side="bottom" avoidCollisions={false} className="bg-card border-border/80">
                          {Array.from({length: 24}).map((_, i) => {
                            const hour = i % 12 || 12;
                            const ampm = i < 12 ? 'AM' : 'PM';
                            const timeStr = `${hour.toString().padStart(2, '0')}:00 ${ampm}`;
                            return <SelectItem key={timeStr} value={timeStr}>{timeStr}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-[180px]">
                      <Label className="text-xs text-muted-foreground">Days</Label>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between h-9 text-left font-normal bg-card border-border/80">
                            {timing.days.length === 0 ? <span className="text-muted-foreground">Select days...</span> : (timing.days.length === 7 ? "All Days" : `${timing.days.length} selected`)}
                            <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 bg-card border-border/80">
                          <DropdownMenuCheckboxItem 
                            checked={timing.days.length === 7} 
                            onCheckedChange={() => toggleDay(index, "All Days")}
                            onSelect={(e) => e.preventDefault()}
                          >
                            All Days
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          {daysOfWeek.map(day => (
                            <DropdownMenuCheckboxItem 
                              key={day} 
                              checked={timing.days.includes(day)} 
                              onCheckedChange={() => toggleDay(index, day)}
                              onSelect={(e) => e.preventDefault()}
                            >
                              {day}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 h-9">
                      {timingList.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTiming(index)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      {index === timingList.length - 1 && timingList.length < 3 && (
                        <Button type="button" variant="outline" size="icon" className="border-border/80 bg-card hover:bg-surface-hover" onClick={addTiming}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Property Instructions & Rules</Label>
                <Textarea 
                  id="instructions" 
                  value={formData.instructions} 
                  onChange={handleInputChange}
                  placeholder="e.g., No smoking indoors, Do not move furniture without permission, Maintain silence after 10PM..." 
                  className="min-h-[120px] bg-surface-elevated border-border/80" 
                />
              </div>
            </CardContent>
          </Card>

          {/* STEP 5: Media Upload */}
          <Card className="bg-card border-border/80 shadow-noir rounded-xl">
            <CardHeader>
              <CardTitle className="font-display text-xl text-foreground">Media Upload</CardTitle>
              <CardDescription>Upload high-quality images and videos of your property.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border/80 rounded-xl p-12 text-center bg-surface-elevated/50 hover:bg-surface-elevated hover:border-primary/40 transition-colors relative">
                <input type="file" multiple accept="image/*,video/mp4" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => {
                  if (e.target.files) {
                    const filesArray = Array.from(e.target.files);
                    setMediaFiles(prev => [...prev, ...filesArray].slice(0, 5));
                  }
                }} />
                <div className="mx-auto w-16 h-16 bg-primary/15 text-primary border border-primary/30 rounded-full flex items-center justify-center mb-4 pointer-events-none">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1 pointer-events-none">Click to upload or drag and drop</h3>
                <p className="text-muted-foreground text-sm pointer-events-none">JPG, PNG, MP4 up to 50MB (Max 5 files)</p>
              </div>
              {existingMedia.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Existing Media:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingMedia.map((url, i) => (
                      <div key={i} className="relative w-24 h-24 border border-border/80 rounded-lg overflow-hidden group">
                        <img src={url} alt="Media" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Button type="button" variant="destructive" size="icon" className="h-8 w-8 rounded-full" onClick={() => setExistingMedia(prev => prev.filter((_, idx) => idx !== i))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {mediaFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">New Files to Upload:</p>
                  {mediaFiles.map((f, i) => (
                    <div key={i} className="flex justify-between items-center text-sm p-2.5 bg-surface-elevated rounded-lg border border-border/80">
                      <span className="truncate text-foreground">{f.name}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => setMediaFiles(prev => prev.filter((_, idx) => idx !== i))} className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* STEP 6: Contact Information (Optional) */}
          <Card className="bg-card border-border/80 shadow-noir rounded-xl">
            <CardHeader>
              <CardTitle className="font-display text-xl text-foreground">Contact Information (Optional)</CardTitle>
              <CardDescription>How can interested producers reach out? Leave blank to use your profile details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input id="contactName" value={formData.contactName} onChange={handleInputChange} placeholder="John Doe" className="bg-surface-elevated border-border/80" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Mobile Number</Label>
                  <Input id="phone" value={formData.phone} onChange={handleInputChange} type="tel" placeholder="+91 9876543210" className="bg-surface-elevated border-border/80 font-mono" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={formData.email} onChange={handleInputChange} type="email" placeholder="contact@example.com" className="bg-surface-elevated border-border/80" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-end border-t border-border/80 pt-6">
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary-hover w-full sm:w-auto shadow-noir font-medium px-8" disabled={isSubmitting}>
              {isEditing ? "Save Changes" : "Submit Listing"}
            </Button>
          </div>
          
        </form>
      </div>
    </AppLayout>
  );
}
