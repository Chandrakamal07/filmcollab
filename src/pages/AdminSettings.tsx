import { AdminLayout } from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Upload, Settings, Globe, Phone, Image as ImageIcon, AtSign, MapPin, Share2, CreditCard, Plus, Trash2, Edit2, AlertCircle, Settings2, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function AdminSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Subscriptions State
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>({
    id: "",
    name: "",
    monthly_price: "",
    yearly_price: "",
    final_monthly_price: "",
    final_yearly_price: "",
    description: "",
    features: [],
    popular: false,
    is_custom_price: false,
    restrictions: {}
  });
  const [newFeature, setNewFeature] = useState("");

  // Global Tags State
  const [globalTags, setGlobalTags] = useState<any[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // Property Types states
  const [existingPropertyTypes, setExistingPropertyTypes] = useState<any[]>([]);
  const [newPropertyType, setNewPropertyType] = useState("");
  const [editingPropertyTypeId, setEditingPropertyTypeId] = useState<string | null>(null);
  const [editingPropertyTypeName, setEditingPropertyTypeName] = useState("");

  // Directory Categories State
  const [directoryCategories, setDirectoryCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("image");
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Form States
  const [settings, setSettings] = useState({
    id: "",
    site_title: "",
    site_description: "",
    logo_url: "",
    favicon_url: "",
    contact_email: "",
    contact_phone: "",
    contact_address: "",
    contact_map_link: "",
    social_facebook: "",
    social_twitter: "",
    social_instagram: "",
    social_linkedin: "",
    social_youtube: ""
  });

  useEffect(() => {
    fetchSettings();
    fetchPlans();
    fetchGlobalTags();
    fetchPropertyTypes();
    fetchDirectoryCategories();
  }, []);

  const fetchDirectoryCategories = async () => {
    setIsLoadingCategories(true);
    try {
      const { data, error } = await supabase.from("directory_categories").select("*").order("file_type").order("name");
      if (error && error.code !== '42P01') throw error;
      if (data) setDirectoryCategories(data);
    } catch (error: any) {
      console.error("Error fetching directory categories:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const { error } = await supabase.from("directory_categories").insert({
        name: newCategoryName.trim(),
        file_type: newCategoryType
      });
      if (error) throw error;
      setNewCategoryName("");
      fetchDirectoryCategories();
      toast({ title: "Success", description: "Category added successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const { error } = await supabase.from("directory_categories").delete().eq("id", id);
      if (error) throw error;
      fetchDirectoryCategories();
      toast({ title: "Success", description: "Category deleted successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const fetchPropertyTypes = async () => {
    try {
      const { data, error } = await supabase.from("property_types").select("*").order("name");
      if (!error && data) {
        setExistingPropertyTypes(data);
      }
    } catch (error) {
      console.error("Error fetching property types", error);
    }
  };

  const fetchGlobalTags = async () => {
    setIsLoadingTags(true);
    try {
      const { data, error } = await supabase.from("global_tags").select("*").order("name");
      if (error && error.code !== '42P01') throw error;
      if (data) setGlobalTags(data);
    } catch (error: any) {
      console.error("Error fetching tags:", error);
    } finally {
      setIsLoadingTags(false);
    }
  };

  const fetchPlans = async () => {
    setIsLoadingPlans(true);
    try {
      const { data, error } = await supabase.from("subscription_plans").select("*").order("monthly_price");
      if (error && error.code !== '42P01') throw error;
      if (data) setPlans(data);
    } catch (error: any) {
      console.error("Error fetching plans:", error);
      toast({ title: "Failed to fetch plans", description: error?.message || "Unknown error", variant: "destructive" });
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error; // Ignore not found error as we might be setting up for the first time
      }
      
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching site settings:", error);
      toast({ title: "Failed to load settings. Table might be missing.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPropertyType = async () => {
    if (!newPropertyType.trim()) return;
    try {
      const { error } = await supabase.from("property_types").insert({ name: newPropertyType.trim() });
      if (error) throw error;
      toast({ title: "Property type added successfully!" });
      setNewPropertyType("");
      fetchPropertyTypes();
    } catch (error) {
      toast({ title: "Failed to add property type", variant: "destructive" });
    }
  };

  const handleUpdatePropertyType = async () => {
    if (!editingPropertyTypeId || !editingPropertyTypeName.trim()) return;
    try {
      const { error } = await supabase.from("property_types").update({ name: editingPropertyTypeName.trim() }).eq("id", editingPropertyTypeId);
      if (error) throw error;
      toast({ title: "Property type updated successfully!" });
      setEditingPropertyTypeId(null);
      setEditingPropertyTypeName("");
      fetchPropertyTypes();
    } catch (error) {
      toast({ title: "Failed to update property type", variant: "destructive" });
    }
  };

  const handleDeletePropertyType = async (id: string) => {
    try {
      const { error } = await supabase.from("property_types").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Property type deleted successfully!" });
      fetchPropertyTypes();
    } catch (error) {
      toast({ title: "Failed to delete property type", variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsData = { ...settings };
      delete (settingsData as any).id;
      
      let error;

      if (settings.id) {
        // Update existing
        const res = await supabase.from("site_settings").update(settingsData as any).eq("id", settings.id);
        error = res.error;
      } else {
        // Insert new
        const res = await supabase.from("site_settings").insert([settingsData as any]);
        error = res.error;
      }

      if (error) throw error;
      toast({ title: "Settings saved successfully!" });
      fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({ title: "Failed to save settings.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: 'logo_url' | 'favicon_url') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsSaving(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${fieldName}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('site_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('site_assets')
        .getPublicUrl(filePath);

      setSettings(prev => ({ ...prev, [fieldName]: data.publicUrl }));
      toast({ title: "Image uploaded successfully! Remember to save changes." });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ title: "Upload failed. Does site_assets bucket exist?", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Subscription Handlers
  const handleSavePlan = async () => {
    try {
      const planData = {
        name: editingPlan.name,
        monthly_price: editingPlan.is_custom_price || editingPlan.monthly_price === '' ? null : Number(editingPlan.monthly_price),
        yearly_price: editingPlan.is_custom_price || editingPlan.yearly_price === '' ? null : Number(editingPlan.yearly_price),
        final_monthly_price: editingPlan.is_custom_price || editingPlan.final_monthly_price === '' ? null : Number(editingPlan.final_monthly_price),
        final_yearly_price: editingPlan.is_custom_price || editingPlan.final_yearly_price === '' ? null : Number(editingPlan.final_yearly_price),
        description: editingPlan.description,
        features: editingPlan.features,
        popular: editingPlan.popular,
        is_custom_price: editingPlan.is_custom_price,
        restrictions: editingPlan.restrictions
      };

      let saveError;
      if (editingPlan.id) {
        const { error } = await supabase.from("subscription_plans").update(planData as any).eq("id", editingPlan.id);
        saveError = error;
      } else {
        const { error } = await supabase.from("subscription_plans").insert([planData as any]);
        saveError = error;
      }
      
      if (saveError) {
        throw saveError;
      }

      toast({ title: "Plan saved!" });
      setIsPlanDialogOpen(false);
      fetchPlans();
    } catch (error: any) {
      console.error("Error saving plan", error);
      toast({ title: "Failed to save plan", description: error?.message || "Check if you ran the SQL setup.", variant: "destructive" });
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    try {
      await supabase.from("subscription_plans").delete().eq("id", id);
      toast({ title: "Plan deleted!" });
      fetchPlans();
    } catch (error) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const openNewPlan = () => {
    setEditingPlan({ 
      id: "", 
      name: "", 
      monthly_price: "", 
      yearly_price: "", 
      final_monthly_price: "", 
      final_yearly_price: "", 
      description: "", 
      features: [], 
      popular: false,
      is_custom_price: false,
      restrictions: {}
    });
    setNewFeature("");
    setIsPlanDialogOpen(true);
  };

  const openEditPlan = (plan: any) => {
    setEditingPlan({
      ...plan,
      monthly_price: plan.monthly_price?.toString() || "",
      yearly_price: plan.yearly_price?.toString() || "",
      final_monthly_price: plan.final_monthly_price?.toString() || "",
      final_yearly_price: plan.final_yearly_price?.toString() || "",
      features: Array.isArray(plan.features) ? plan.features : [],
      restrictions: plan.restrictions && typeof plan.restrictions === 'object' ? plan.restrictions : {}
    });
    setNewFeature("");
    setIsPlanDialogOpen(true);
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setEditingPlan((prev: any) => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
      setNewFeature("");
    }
  };

  const removeFeature = (index: number) => {
    setEditingPlan((prev: any) => {
      const updated = [...prev.features];
      updated.splice(index, 1);
      return { ...prev, features: updated };
    });
  };

  const handleFeatureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addFeature();
    }
  };

  const handleAddGlobalTag = async () => {
    if (!newTagName.trim()) return;
    try {
      const { error } = await supabase.from("global_tags").insert([{ name: newTagName.trim() }]);
      if (error) throw error;
      toast({ title: "Tag added successfully!" });
      setNewTagName("");
      fetchGlobalTags();
    } catch (error: any) {
      console.error("Error adding tag:", error);
      toast({ title: "Failed to add tag", description: error?.message, variant: "destructive" });
    }
  };

  const handleDeleteGlobalTag = async (tagId: string) => {
    try {
      const { error } = await supabase.from("global_tags").delete().eq("id", tagId);
      if (error) throw error;
      toast({ title: "Tag deleted successfully!" });
      fetchGlobalTags();
    } catch (error: any) {
      console.error("Error deleting tag:", error);
      toast({ title: "Failed to delete tag", description: error?.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout pageTitle="Site Settings" pageName="Settings">
        <div className="flex justify-center items-center h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Site Settings" pageName="Settings" contentClassName="py-6 px-[20px]">
      <div className="space-y-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <span className="noir-eyebrow">Platform Administration</span>
            <h1 className="font-display text-3xl font-bold text-foreground mt-0.5">Global Settings</h1>
            <p className="text-muted-foreground mt-1">Configure your site's identity, contact information, and social links.</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save All Changes
          </Button>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-6 bg-surface-elevated border border-border/80 rounded-xl p-1 mb-6 h-auto">
            <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg py-2 flex items-center gap-2">
              <Settings className="h-4 w-4" /> <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg py-2 flex items-center gap-2">
              <ImageIcon className="h-4 w-4" /> <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="contact" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg py-2 flex items-center gap-2">
              <Phone className="h-4 w-4" /> <span className="hidden sm:inline">Contact</span>
            </TabsTrigger>
            <TabsTrigger value="social" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg py-2 flex items-center gap-2">
              <Share2 className="h-4 w-4" /> <span className="hidden sm:inline">Social Media</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg py-2 flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> <span className="hidden sm:inline">Subscriptions</span>
            </TabsTrigger>
            <TabsTrigger value="configure" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg py-2 flex items-center gap-2">
              <Settings2 className="h-4 w-4" /> <span className="hidden sm:inline">Configure</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="font-display text-xl text-foreground">General Information</CardTitle>
                <CardDescription>Basic information about your platform used for SEO and metadata.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Site Title</label>
                  <Input 
                    name="site_title" 
                    value={settings.site_title || ""} 
                    onChange={handleChange} 
                    placeholder="e.g. FilmCollab" 
                    className="bg-surface-elevated border-border/80 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Site Description</label>
                  <textarea 
                    name="site_description" 
                    value={settings.site_description || ""} 
                    onChange={handleChange} 
                    placeholder="Describe your platform..." 
                    className="flex min-h-[100px] w-full rounded-md border border-border/80 bg-surface-elevated px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="branding" className="space-y-4">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="font-display text-xl text-foreground">Branding Assets</CardTitle>
                <CardDescription>Configure the visual assets of your site.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Site Logo</label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'logo_url')} 
                      className="bg-surface-elevated border-border/80 focus-visible:ring-primary flex-1 max-w-sm"
                    />
                    {settings.logo_url && (
                      <div className="p-2 bg-surface-elevated border border-border/80 rounded-md">
                        <img src={settings.logo_url} alt="Logo preview" className="h-10 object-contain" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Upload a PNG or SVG logo.</p>
                </div>
                
                <div className="space-y-2 pt-4 border-t border-border/60">
                  <label className="text-sm font-semibold text-foreground">Favicon</label>
                  <div className="flex items-center gap-4">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'favicon_url')} 
                      className="bg-surface-elevated border-border/80 focus-visible:ring-primary flex-1 max-w-sm"
                    />
                    {settings.favicon_url && (
                      <div className="p-2 bg-surface-elevated border border-border/80 rounded-md">
                        <img src={settings.favicon_url} alt="Favicon preview" className="h-6 w-6 object-contain" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Upload an icon file (e.g., .ico, .png 32x32px).</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="space-y-4">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="font-display text-xl text-foreground">Contact Information</CardTitle>
                <CardDescription>How users can reach you. Displayed in footers and contact pages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2"><AtSign className="h-4 w-4 text-primary" /> Support Email</label>
                    <Input 
                      name="contact_email" 
                      value={settings.contact_email || ""} 
                      onChange={handleChange} 
                      placeholder="support@filmcollab.com" 
                      className="bg-surface-elevated border-border/80 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Support Phone</label>
                    <Input 
                      name="contact_phone" 
                      value={settings.contact_phone || ""} 
                      onChange={handleChange} 
                      placeholder="+91 9876543210" 
                      className="bg-surface-elevated border-border/80 focus-visible:ring-primary"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Office Address</label>
                  <textarea 
                    name="contact_address" 
                    value={settings.contact_address || ""} 
                    onChange={handleChange} 
                    placeholder="123 Creative Street, Film City..." 
                    className="flex min-h-[80px] w-full rounded-md border border-border/80 bg-surface-elevated px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /> Google Maps Embed Link</label>
                  <Input 
                    name="contact_map_link" 
                    value={settings.contact_map_link || ""} 
                    onChange={handleChange} 
                    placeholder="https://www.google.com/maps/embed?pb=..." 
                    className="bg-surface-elevated border-border/80 focus-visible:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground">Paste the src URL from a Google Maps embed iframe to display a map on your contact page.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social" className="space-y-4">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="font-display text-xl text-foreground">Social Media Profiles</CardTitle>
                <CardDescription>Links to your official social media pages.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Instagram URL</label>
                    <Input 
                      name="social_instagram" 
                      value={settings.social_instagram || ""} 
                      onChange={handleChange} 
                      placeholder="https://instagram.com/..." 
                      className="bg-surface-elevated border-border/80 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">YouTube URL</label>
                    <Input 
                      name="social_youtube" 
                      value={settings.social_youtube || ""} 
                      onChange={handleChange} 
                      placeholder="https://youtube.com/..." 
                      className="bg-surface-elevated border-border/80 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">LinkedIn URL</label>
                    <Input 
                      name="social_linkedin" 
                      value={settings.social_linkedin || ""} 
                      onChange={handleChange} 
                      placeholder="https://linkedin.com/..." 
                      className="bg-surface-elevated border-border/80 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Twitter / X URL</label>
                    <Input 
                      name="social_twitter" 
                      value={settings.social_twitter || ""} 
                      onChange={handleChange} 
                      placeholder="https://twitter.com/..." 
                      className="bg-surface-elevated border-border/80 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Facebook URL</label>
                    <Input 
                      name="social_facebook" 
                      value={settings.social_facebook || ""} 
                      onChange={handleChange} 
                      placeholder="https://facebook.com/..." 
                      className="bg-surface-elevated border-border/80 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border/60">
                <div>
                  <CardTitle className="font-display text-xl text-foreground">Subscription Plans</CardTitle>
                  <CardDescription>Manage the pricing plans available to your users.</CardDescription>
                </div>
                <Button onClick={openNewPlan} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                  <Plus className="h-4 w-4" /> Add Plan
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="border border-border/70 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-surface-elevated/60">
                      <TableRow className="border-border/70 hover:bg-transparent">
                        <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Plan Name</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">M / Y Base Price</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">M / Y Final Price</TableHead>
                        <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                        <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.length === 0 && !isLoadingPlans && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            No plans configured. Create your first subscription plan.
                          </TableCell>
                        </TableRow>
                      )}
                      {plans.map((plan) => (
                        <TableRow key={plan.id} className="border-border/60 hover:bg-surface-hover/50">
                          <TableCell className="font-medium text-foreground">{plan.name}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{plan.is_custom_price ? "Custom" : `₹${plan.monthly_price || '-'} / ₹${plan.yearly_price || '-'}`}</TableCell>
                          <TableCell className="font-mono text-sm text-primary font-medium">{plan.is_custom_price ? "Custom" : `₹${plan.final_monthly_price || '-'} / ₹${plan.final_yearly_price || '-'}`}</TableCell>
                          <TableCell>
                            {plan.popular ? (
                              <Badge className="bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20">Most Popular</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Standard</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button variant="ghost" size="icon" className="hover:bg-surface-hover" onClick={() => openEditPlan(plan)}>
                              <Edit2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="hover:bg-destructive/15" onClick={() => handleDeletePlan(plan.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configure" className="space-y-4">
            <Accordion type="single" collapsible defaultValue="global-tags" className="w-full space-y-4">
              <AccordionItem value="global-tags" className="noir-card border border-border/80 bg-card rounded-xl overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex flex-col items-start text-left">
                    <span className="font-display font-semibold text-lg text-foreground">Global Tags Configuration</span>
                    <span className="text-sm text-muted-foreground font-normal">Manage the tags that are available to be assigned to users, projects, jobs, and locations.</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="space-y-6">
                    <div className="flex gap-4 items-end">
                      <div className="space-y-2 flex-1 max-w-sm">
                        <label className="text-sm font-semibold text-foreground">New Tag Name</label>
                        <Input 
                          value={newTagName} 
                          onChange={(e) => setNewTagName(e.target.value)} 
                          placeholder="e.g. Featured, Portfolio, Urgent"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddGlobalTag()}
                          className="bg-surface-elevated border-border/80"
                        />
                      </div>
                      <Button onClick={handleAddGlobalTag} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Tags className="h-4 w-4 mr-2" /> Add Tag
                      </Button>
                    </div>

                    <div className="border border-border/70 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-surface-elevated/60">
                          <TableRow className="border-border/70 hover:bg-transparent">
                            <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Tag Name</TableHead>
                            <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingTags ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                              </TableCell>
                            </TableRow>
                          ) : globalTags.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                No tags configured. Create your first tag.
                              </TableCell>
                            </TableRow>
                          ) : (
                            globalTags.map((tag) => (
                              <TableRow key={tag.id} className="border-border/60 hover:bg-surface-hover/50">
                                <TableCell className="font-medium">
                                  <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
                                    {tag.name}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  <Button variant="ghost" size="icon" className="hover:bg-destructive/15" onClick={() => handleDeleteGlobalTag(tag.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="property-types" className="noir-card border border-border/80 bg-card rounded-xl overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex flex-col items-start text-left">
                    <span className="font-display font-semibold text-lg text-foreground">Property Types Configuration</span>
                    <span className="text-sm text-muted-foreground font-normal">Manage the list of property types for shooting locations.</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="space-y-6">
                    <div className="flex gap-4 items-end">
                      <div className="space-y-2 flex-1 max-w-sm">
                        <label className="text-sm font-semibold text-foreground">New Property Type</label>
                        <Input 
                          placeholder="e.g. Castle, Mansion, Forest" 
                          value={newPropertyType}
                          onChange={(e) => setNewPropertyType(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddPropertyType()}
                          className="bg-surface-elevated border-border/80"
                        />
                      </div>
                      <Button onClick={handleAddPropertyType} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="h-4 w-4 mr-2" /> Add Type
                      </Button>
                    </div>

                    <div className="border border-border/70 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-surface-elevated/60">
                          <TableRow className="border-border/70 hover:bg-transparent">
                            <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Property Type</TableHead>
                            <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {existingPropertyTypes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                No property types configured.
                              </TableCell>
                            </TableRow>
                          ) : (
                            existingPropertyTypes.map((pt) => (
                              <TableRow key={pt.id} className="border-border/60 hover:bg-surface-hover/50">
                                <TableCell className="font-medium text-foreground">
                                  {editingPropertyTypeId === pt.id ? (
                                    <Input 
                                      value={editingPropertyTypeName}
                                      onChange={(e) => setEditingPropertyTypeName(e.target.value)}
                                      className="h-8 max-w-[200px] bg-surface-elevated border-border/80"
                                      autoFocus
                                    />
                                  ) : (
                                    <span>{pt.name}</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right space-x-2">
                                  {editingPropertyTypeId === pt.id ? (
                                    <>
                                      <Button size="sm" variant="outline" className="border-border/70 bg-surface-elevated" onClick={() => setEditingPropertyTypeId(null)}>Cancel</Button>
                                      <Button size="sm" onClick={handleUpdatePropertyType} className="bg-emerald-600 hover:bg-emerald-700 text-white">Save</Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="icon" className="hover:bg-surface-hover" onClick={() => { setEditingPropertyTypeId(pt.id); setEditingPropertyTypeName(pt.name); }}>
                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="hover:bg-destructive/15" onClick={() => handleDeletePropertyType(pt.id)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="directory-categories" className="noir-card border border-border/80 rounded-xl bg-card mb-4 overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <div className="flex flex-col items-start text-left">
                    <span className="font-display font-semibold text-lg text-foreground">Directory Categories</span>
                    <span className="text-sm text-muted-foreground font-normal">Manage file categories available for each file type.</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 pt-2">
                  <div className="space-y-6">
                    <div className="flex gap-4 items-end flex-wrap">
                      <div className="space-y-2 w-48">
                        <label className="text-sm font-semibold text-foreground">File Type</label>
                        <select
                          value={newCategoryType}
                          onChange={(e) => setNewCategoryType(e.target.value)}
                          className="flex h-10 w-full rounded-md border border-border/80 bg-surface-elevated px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          <option value="image">Photo</option>
                          <option value="video">Video</option>
                          <option value="document">Document</option>
                          <option value="audio">Audio</option>
                        </select>
                      </div>
                      <div className="space-y-2 flex-1 max-w-sm">
                        <label className="text-sm font-semibold text-foreground">New Category</label>
                        <Input 
                          placeholder="e.g. Cinematic, Portrait, Script" 
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                          className="bg-surface-elevated border-border/80"
                        />
                      </div>
                      <Button onClick={handleAddCategory} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                        <Plus className="h-4 w-4 mr-2" /> Add Category
                      </Button>
                    </div>

                    <div className="border border-border/70 rounded-xl overflow-hidden">
                      <Table>
                        <TableHeader className="bg-surface-elevated/60">
                          <TableRow className="border-border/70 hover:bg-transparent">
                            <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">File Type</TableHead>
                            <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Category Name</TableHead>
                            <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {directoryCategories.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                No categories configured.
                              </TableCell>
                            </TableRow>
                          ) : (
                            directoryCategories.map((cat) => (
                              <TableRow key={cat.id} className="border-border/60 hover:bg-surface-hover/50">
                                <TableCell className="font-medium capitalize text-foreground">{cat.file_type === 'image' ? 'photo' : cat.file_type}</TableCell>
                                <TableCell className="text-foreground">{cat.name}</TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="icon" className="hover:bg-destructive/15" onClick={() => handleDeleteCategory(cat.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border/80">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">{editingPlan.id ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
            <DialogDescription>Configure the details and features for this subscription plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="is_custom" 
                checked={editingPlan.is_custom_price} 
                onCheckedChange={(checked) => setEditingPlan({...editingPlan, is_custom_price: !!checked})} 
              />
              <label htmlFor="is_custom" className="text-sm font-medium text-foreground">
                Custom Pricing (e.g. Enterprise)
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Plan Name</label>
              <Input 
                value={editingPlan.name} 
                onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})} 
                placeholder="e.g. Pro, Studio, Enterprise"
                className="bg-surface-elevated border-border/80"
              />
            </div>

            {!editingPlan.is_custom_price && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Base Monthly Price (₹)</label>
                    <Input 
                      type="number"
                      value={editingPlan.monthly_price} 
                      onChange={(e) => setEditingPlan({...editingPlan, monthly_price: e.target.value})} 
                      placeholder="e.g. 19"
                      className="bg-surface-elevated border-border/80 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Final Monthly Price (₹)</label>
                    <Input 
                      type="number"
                      value={editingPlan.final_monthly_price} 
                      onChange={(e) => setEditingPlan({...editingPlan, final_monthly_price: e.target.value})} 
                      placeholder="e.g. 15 (Discounted)"
                      className="bg-surface-elevated border-border/80 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Base Yearly Price (₹)</label>
                    <Input 
                      type="number"
                      value={editingPlan.yearly_price} 
                      onChange={(e) => setEditingPlan({...editingPlan, yearly_price: e.target.value})} 
                      placeholder="e.g. 200"
                      className="bg-surface-elevated border-border/80 font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-foreground">Final Yearly Price (₹)</label>
                    <Input 
                      type="number"
                      value={editingPlan.final_yearly_price} 
                      onChange={(e) => setEditingPlan({...editingPlan, final_yearly_price: e.target.value})} 
                      placeholder="e.g. 150 (Discounted)"
                      className="bg-surface-elevated border-border/80 font-mono"
                    />
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Short Description</label>
              <Input 
                value={editingPlan.description} 
                onChange={(e) => setEditingPlan({...editingPlan, description: e.target.value})} 
                placeholder="e.g. Perfect for independent filmmakers"
                className="bg-surface-elevated border-border/80"
              />
            </div>

            <Accordion type="single" collapsible className="w-full border border-border/70 rounded-lg overflow-hidden mt-4">
              <AccordionItem value="restrictions" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 hover:bg-surface-elevated/60 hover:no-underline">
                  <div className="flex flex-col items-start text-left">
                    <span className="font-semibold text-sm text-foreground">Plan Restrictions (Monthly Limits)</span>
                    <span className="text-xs text-muted-foreground font-normal">Leave empty or 0 for unlimited/no access depending on your business logic.</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2 border-t border-border/60 bg-surface-elevated/40">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'jobs_post', label: 'Jobs Post' },
                      { key: 'news_insights', label: 'News & Insights' },
                      { key: 'events', label: 'Events' },
                      { key: 'courses', label: 'Courses' },
                      { key: 'projects', label: 'Projects' },
                      { key: 'view_profile', label: 'View Profile' },
                      { key: 'messages', label: 'Messages' },
                      { key: 'register_business', label: 'Register Business' },
                      { key: 'shooting_locations', label: 'Shooting Locations' },
                      { key: 'connections', label: 'Connections' }
                    ].map((restriction) => (
                      <div className="space-y-1.5" key={restriction.key}>
                        <label className="text-xs font-semibold text-muted-foreground">{restriction.label}</label>
                        <Input
                          type="number"
                          min="0"
                          value={editingPlan.restrictions?.[restriction.key] || ''}
                          onChange={(e) => setEditingPlan({
                            ...editingPlan,
                            restrictions: {
                              ...(editingPlan.restrictions || {}),
                              [restriction.key]: e.target.value ? parseInt(e.target.value) : 0
                            }
                          })}
                          placeholder="0"
                          className="h-8 text-sm bg-card border-border/80 font-mono"
                        />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="space-y-2 mt-4">
              <label className="text-sm font-semibold text-foreground">Features</label>
              <div className="flex gap-2">
                <Input 
                  value={newFeature} 
                  onChange={(e) => setNewFeature(e.target.value)} 
                  onKeyDown={handleFeatureKeyDown}
                  placeholder="Type a feature and press Enter"
                  className="bg-surface-elevated border-border/80"
                />
                <Button type="button" onClick={addFeature} variant="secondary" className="bg-surface-elevated border border-border/80">Add</Button>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                {editingPlan.features.map((feature: string, index: number) => (
                  <div key={index} className="flex items-center justify-between bg-surface-elevated border border-border/70 p-2 rounded-md">
                    <span className="text-sm text-foreground">{feature}</span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/15" onClick={() => removeFeature(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox 
                id="popular" 
                checked={editingPlan.popular} 
                onCheckedChange={(checked) => setEditingPlan({...editingPlan, popular: !!checked})} 
              />
              <label htmlFor="popular" className="text-sm font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Mark as "Most Popular"
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-border/70 bg-surface-elevated" onClick={() => setIsPlanDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePlan} className="bg-primary hover:bg-primary/90 text-primary-foreground">Save Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
