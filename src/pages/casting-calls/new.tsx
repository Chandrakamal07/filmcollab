import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CategoryDropdown } from "@/components/ui/category-dropdown";
import { useCastingCalls } from "@/hooks/use-casting-calls";
import { toast } from "sonner";
import { ArrowLeft, Save, Image as ImageIcon, UploadCloud, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function NewCastingCall() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { addCastingCall } = useCastingCalls();
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [scriptFile, setScriptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    projectName: "",
    productionHouse: "",
    castingDirector: "",
    contactPerson: "",
    email: "",
    phone: "",
    category: "",
    roleName: "",
    roleDescription: "",
    gender: "Any",
    ageMin: "18",
    ageMax: "60",
    height: "",
    languages: "",
    experience: "Any",
    compensation: "Paid",
    location: "",
    shootDates: "",
    auditionDates: "",
    auditionVenue: "",
    vacancies: "1",
    lastDateToApply: "",
    projectDescription: "",
    requirements: "",
    whatToBring: "",
    googleMapsLink: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.projectName || !form.roleName || !form.email) {
      toast.error("Please fill in all required fields.");
      return;
    }
    
    setIsUploading(true);
    let posterUrl = "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80"; // fallback
    let scriptUrl = "";

    try {
      if (posterFile) {
        const fileExt = posterFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `posters/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post-media') // Re-using existing bucket
          .upload(filePath, posterFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('post-media')
          .getPublicUrl(filePath);

        posterUrl = data.publicUrl;
      }

      if (scriptFile) {
        const fileExt = scriptFile.name.split('.').pop();
        const fileName = `${Date.now()}-script-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `scripts/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('post-media')
          .upload(filePath, scriptFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from('post-media')
          .getPublicUrl(filePath);

        scriptUrl = data.publicUrl;
      }

      await addCastingCall({
        title: form.title,
        projectName: form.projectName,
        productionHouse: form.productionHouse,
        castingDirector: form.castingDirector,
        contactPerson: form.contactPerson,
        email: form.email,
        phone: form.phone,
        poster: posterUrl,
        category: form.category,
        roleName: form.roleName,
        roleDescription: form.roleDescription,
        gender: form.gender as any,
        ageRange: [parseInt(form.ageMin), parseInt(form.ageMax)],
        height: form.height,
        languages: form.languages ? form.languages.split(',').map(l => l.trim()) : [],
        experience: form.experience as any,
        compensation: form.compensation as any,
        location: form.location,
        shootDates: form.shootDates,
        auditionDates: form.auditionDates,
        auditionVenue: form.auditionVenue,
        vacancies: parseInt(form.vacancies) || 1,
        lastDateToApply: form.lastDateToApply,
        projectDescription: form.projectDescription,
        requirements: form.requirements ? form.requirements.split('\n').filter(Boolean) : [],
        whatToBring: form.whatToBring ? form.whatToBring.split('\n').filter(Boolean) : [],
        status: "Open",
        verified: false,
        attachments: [],
        googleMapsLink: form.googleMapsLink,
        scriptAttachmentUrl: scriptUrl || undefined
      });

      navigate("/casting-calls");
    } catch (error: any) {
      toast.error(error.message || "Failed to post casting call");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AppLayout pageTitle="Post a Casting Call">
      <div className="w-full max-w-4xl mx-auto py-2 md:py-6 px-1 sm:px-4">
        <Link to="/casting-calls" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 font-medium text-sm transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Casting Calls
        </Link>

        <div className="w-full bg-card text-card-foreground rounded-2xl shadow-noir border border-border/80 p-4 sm:p-6 md:p-8 box-border overflow-hidden">
          <div className="mb-8 border-b border-border/80 pb-6">
            <p className="noir-eyebrow mb-1">Production Casting</p>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Post a Casting Call</h1>
            <p className="text-muted-foreground mt-2 text-sm">Create a detailed listing to attract the best talent for your project.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 w-full min-w-0">
            
            {/* Basic Info */}
            <div className="space-y-6 min-w-0">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary border border-primary/30 font-mono text-sm">1</span>
                Project Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
                <div className="space-y-2 md:col-span-2 min-w-0">
                  <Label htmlFor="poster">Casting Call Poster / Cover Image</Label>
                  <div className="border-2 border-dashed border-border/80 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-surface-elevated/40 hover:bg-surface-hover hover:border-primary/40 transition-colors cursor-pointer relative w-full">
                    <input 
                      type="file" 
                      id="poster"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      accept="image/*"
                      onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
                    />
                    {posterFile ? (
                      <div className="flex flex-col items-center gap-2">
                        <ImageIcon className="w-8 h-8 text-primary" />
                        <span className="font-medium text-foreground">{posterFile.name}</span>
                        <span className="text-xs text-muted-foreground">Click or drag to replace</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <UploadCloud className="w-8 h-8 text-muted-foreground" />
                        <span className="font-medium text-foreground">Upload Poster Image</span>
                        <span className="text-xs text-muted-foreground">PNG, JPG or WEBP up to 5MB</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="title">Casting Title *</Label>
                  <Input id="title" placeholder="e.g. Lead Hero Required" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full" />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="category">Category *</Label>
                  <CategoryDropdown
                    value={form.category}
                    onChange={(val) => setForm({...form, category: val || ""})}
                    placeholder="Select Category"
                  />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input id="projectName" placeholder="e.g. The Great Adventure" required value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})} className="w-full" />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="productionHouse">Production House</Label>
                  <Input id="productionHouse" placeholder="e.g. Royal Studios" value={form.productionHouse} onChange={e => setForm({...form, productionHouse: e.target.value})} className="w-full" />
                </div>
                <div className="space-y-2 md:col-span-2 min-w-0">
                  <Label htmlFor="projectDescription">Project Description</Label>
                  <Textarea id="projectDescription" placeholder="Brief synopsis of the project..." className="h-24 w-full" value={form.projectDescription} onChange={e => setForm({...form, projectDescription: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Role Info */}
            <div className="space-y-6 pt-6 border-t min-w-0">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary border border-primary/30 font-mono text-sm">2</span>
                Role Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="roleName">Role Name *</Label>
                  <Input id="roleName" placeholder="e.g. Protagonist / Background Actor" required value={form.roleName} onChange={e => setForm({...form, roleName: e.target.value})} className="w-full" />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="vacancies">Number of Vacancies</Label>
                  <Input id="vacancies" type="number" min="1" value={form.vacancies} onChange={e => setForm({...form, vacancies: e.target.value})} className="w-full" />
                </div>
                  <div className="space-y-2 md:col-span-2 min-w-0">
                    <Label htmlFor="roleDescription">Role Description</Label>
                    <Textarea id="roleDescription" placeholder="Describe the character in detail..." className="h-24 w-full" value={form.roleDescription} onChange={e => setForm({...form, roleDescription: e.target.value})} />
                  </div>
                  
                  {/* Requirements Grid */}
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={form.gender} onValueChange={v => setForm({...form, gender: v})}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Any">Any</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Transgender">Transgender</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Age Range</Label>
                    <div className="flex gap-2 items-center min-w-0">
                      <Input type="number" placeholder="Min" value={form.ageMin} onChange={e => setForm({...form, ageMin: e.target.value})} className="min-w-0 w-full" />
                      <span className="text-sm text-muted-foreground shrink-0">to</span>
                      <Input type="number" placeholder="Max" value={form.ageMax} onChange={e => setForm({...form, ageMax: e.target.value})} className="min-w-0 w-full" />
                    </div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="experience">Experience Required</Label>
                    <Select value={form.experience} onValueChange={v => setForm({...form, experience: v})}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Experience" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any Experience</SelectItem>
                        <SelectItem value="Fresher">Fresher</SelectItem>
                        <SelectItem value="Experienced">Experienced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="languages">Languages (Comma separated)</Label>
                    <Input id="languages" placeholder="e.g. Hindi, English" value={form.languages} onChange={e => setForm({...form, languages: e.target.value})} className="w-full" />
                  </div>
                  <div className="space-y-2 md:col-span-2 min-w-0">
                    <Label htmlFor="requirements">Specific Requirements (One per line)</Label>
                    <Textarea id="requirements" placeholder="- Must know horse riding&#10;- Willing to travel" className="h-24 w-full" value={form.requirements} onChange={e => setForm({...form, requirements: e.target.value})} />
                  </div>
                  <div className="space-y-2 md:col-span-2 mt-4 min-w-0">
                    <Label htmlFor="script">Script Attachment (Optional)</Label>
                    <div className="border-2 border-dashed border-border/80 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-surface-elevated/40 hover:bg-surface-hover hover:border-primary/40 transition-colors cursor-pointer relative h-32 w-full">
                      <input 
                        type="file" 
                        id="script"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={(e) => setScriptFile(e.target.files?.[0] || null)}
                      />
                      {scriptFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="w-6 h-6 text-primary" />
                          <span className="font-medium text-foreground text-sm">{scriptFile.name}</span>
                          <span className="text-xs text-muted-foreground">Click or drag to replace</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <UploadCloud className="w-6 h-6 text-muted-foreground" />
                          <span className="font-medium text-foreground text-sm">Upload Script</span>
                          <span className="text-xs text-muted-foreground">PDF, DOC, DOCX up to 10MB</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logistics */}
              <div className="space-y-6 pt-6 border-t min-w-0">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/15 text-primary border border-primary/30 font-mono text-sm">3</span>
                  Logistics & Contact
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 min-w-0">
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="compensation">Compensation</Label>
                    <Select value={form.compensation} onValueChange={v => setForm({...form, compensation: v})}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select Compensation" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                        <SelectItem value="Revenue Share">Revenue Share</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="location">Primary Shoot Location</Label>
                    <Input id="location" placeholder="e.g. Mumbai, Maharashtra" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="shootDates">Expected Shoot Dates</Label>
                    <Input id="shootDates" placeholder="e.g. Jan 10 - Jan 25, 2027" value={form.shootDates} onChange={e => setForm({...form, shootDates: e.target.value})} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="lastDateToApply">Last Date to Apply</Label>
                    <Input id="lastDateToApply" type="date" value={form.lastDateToApply} onChange={e => setForm({...form, lastDateToApply: e.target.value})} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="castingDirector">Casting Director Name</Label>
                    <Input id="castingDirector" placeholder="John Doe" value={form.castingDirector} onChange={e => setForm({...form, castingDirector: e.target.value})} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="email">Contact Email *</Label>
                    <Input id="email" type="email" placeholder="contact@example.com" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="auditionVenue">Audition Venue</Label>
                    <Input id="auditionVenue" placeholder="Full address or Virtual Link" value={form.auditionVenue} onChange={e => setForm({...form, auditionVenue: e.target.value})} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="googleMapsLink">Google Maps Link</Label>
                    <Input id="googleMapsLink" placeholder="https://maps.google.com/..." value={form.googleMapsLink} onChange={e => setForm({...form, googleMapsLink: e.target.value})} className="w-full" />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-6 sm:pt-8 border-t flex flex-wrap sm:flex-nowrap justify-end items-center gap-3">
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => navigate("/casting-calls")} 
                  disabled={isUploading}
                  className="w-full sm:w-auto border-border/80 bg-surface-elevated/50 hover:border-primary/40 hover:bg-surface-hover hover:text-primary transition-colors"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full sm:w-auto px-6 sm:px-8 font-bold gap-2 bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm" 
                  disabled={isUploading}
                >
                  <Save className="w-4 h-4 shrink-0" /> {isUploading ? 'Publishing...' : 'Publish Casting Call'}
                </Button>
              </div>

            </form>
          </div>
        </div>
    </AppLayout>
  );
}

