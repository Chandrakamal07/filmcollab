import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './use-auth';
import { CastingCall, Applicant } from '../pages/casting-calls/data';
import { useToast } from './use-toast';

export function useCastingCalls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [castingCalls, setCastingCalls] = useState<CastingCall[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to transform DB row to UI model
  const mapCastingCall = (row: any, savedByList: string[] = []): CastingCall => ({
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    projectName: row.project_name,
    productionHouse: row.production_house,
    castingDirector: row.casting_director,
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone,
    poster: row.poster,
    category: row.category,
    roleName: row.role_name,
    roleDescription: row.role_description,
    gender: row.gender,
    ageRange: [row.age_min, row.age_max],
    height: row.height,
    languages: row.languages || [],
    experience: row.experience,
    compensation: row.compensation,
    location: row.location,
    shootDates: row.shoot_dates,
    auditionDates: row.audition_dates,
    auditionVenue: row.audition_venue,
    vacancies: row.vacancies,
    maxApplications: row.max_applications,
    datePosted: row.date_posted,
    lastDateToApply: row.last_date_to_apply,
    projectDescription: row.project_description,
    requirements: row.requirements || [],
    whatToBring: row.what_to_bring || [],
    notes: row.notes,
    attachments: row.attachments || [],
    status: row.status,
    verified: row.verified,
    savedBy: savedByList,
    googleMapsLink: row.google_maps_link,
    scriptAttachmentUrl: row.script_attachment_url
  });

  const mapApplicant = (row: any): Applicant => ({
    id: row.id,
    castingCallId: row.casting_call_id,
    userId: row.user_id,
    name: row.name,
    profilePhoto: row.profile_photo,
    profession: row.profession,
    experience: row.experience,
    location: row.location,
    languages: row.languages || [],
    skills: row.skills || [],
    portfolioUrl: row.portfolio_url,
    appliedDate: row.applied_date,
    status: row.status,
    matchScore: row.match_score
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Casting Calls
      const { data: callsData, error: callsError } = await supabase
        .from('casting_calls')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (callsError) throw callsError;

      // Fetch Saves (to build savedBy arrays)
      const { data: savesData, error: savesError } = await supabase
        .from('casting_call_saves')
        .select('casting_call_id, user_id');
        
      if (savesError) {
        console.warn('Could not fetch casting call saves:', savesError.message);
      }

      const savesMap: Record<string, string[]> = {};
      savesData?.forEach(save => {
        if (!savesMap[save.casting_call_id]) savesMap[save.casting_call_id] = [];
        savesMap[save.casting_call_id].push(save.user_id);
      });

      const mappedCalls = callsData?.map(row => mapCastingCall(row, savesMap[row.id] || [])) || [];
      setCastingCalls(mappedCalls);

      // Fetch Applicants if user is logged in
      if (user) {
        const { data: appsData, error: appsError } = await supabase
          .from('casting_applicants')
          .select('*');
          
        if (appsError) {
          console.warn('Could not fetch casting applicants:', appsError.message);
        } else {
          setApplicants(appsData?.map(mapApplicant) || []);
        }
      }
    } catch (error: any) {
      console.error('Error fetching casting calls:', error);
      // Silent fallback, could toast here
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const markInterested = async (castingCallId: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication required", description: "Please log in to apply." });
      return;
    }
    
    try {
      const newApp = {
        casting_call_id: castingCallId,
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email || 'Applicant',
        profile_photo: user.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&q=80',
        profession: 'Actor', // default
        experience: 'Fresher',
        location: 'Hyderabad',
        languages: ['English'],
        skills: ['Acting'],
        status: 'Interested',
        match_score: Math.floor(Math.random() * (100 - 60 + 1) + 60)
      };

      const { data, error } = await supabase
        .from('casting_applicants')
        .insert(newApp as any)
        .select()
        .single();

      if (error) throw error;
      setApplicants([...applicants, mapApplicant(data)]);
      toast({ title: "Success", description: "You have successfully applied!" });
    } catch (error: any) {
      console.error('Error applying:', error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to apply." });
    }
  };

  const withdrawInterest = async (castingCallId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('casting_applicants')
        .delete()
        .eq('casting_call_id', castingCallId)
        .eq('user_id', user.id);

      if (error) throw error;
      setApplicants(applicants.filter(a => !(a.castingCallId === castingCallId && a.userId === user.id)));
      toast({ title: "Withdrawn", description: "Your application has been withdrawn." });
    } catch (error: any) {
      console.error('Error withdrawing:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to withdraw application." });
    }
  };

  const changeApplicantStatus = async (applicantId: string, newStatus: "Interested" | "Confirmed" | "Rejected") => {
    try {
      const { error } = await supabase
        .from('casting_applicants')
        .update({ status: newStatus })
        .eq('id', applicantId);

      if (error) throw error;
      setApplicants(applicants.map(a => a.id === applicantId ? { ...a, status: newStatus } : a));
    } catch (error: any) {
      console.error('Error changing status:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update status." });
    }
  };

  const addCastingCall = async (newCall: Omit<CastingCall, "id" | "datePosted" | "savedBy">) => {
    if (!user) return;
    
    try {
      const dbRow = {
        creator_id: user.id,
        title: newCall.title,
        project_name: newCall.projectName,
        production_house: newCall.productionHouse,
        casting_director: newCall.castingDirector,
        contact_person: newCall.contactPerson,
        email: newCall.email,
        phone: newCall.phone,
        poster: newCall.poster,
        category: newCall.category,
        role_name: newCall.roleName,
        role_description: newCall.roleDescription,
        gender: newCall.gender,
        age_min: newCall.ageRange[0],
        age_max: newCall.ageRange[1],
        height: newCall.height,
        languages: newCall.languages,
        experience: newCall.experience,
        compensation: newCall.compensation,
        location: newCall.location,
        shoot_dates: newCall.shootDates,
        audition_dates: newCall.auditionDates,
        audition_venue: newCall.auditionVenue,
        vacancies: newCall.vacancies || 1,
        max_applications: newCall.maxApplications || null,
        date_posted: new Date().toISOString(),
        last_date_to_apply: newCall.lastDateToApply ? new Date(newCall.lastDateToApply).toISOString() : null,
        project_description: newCall.projectDescription || "",
        requirements: newCall.requirements || [],
        what_to_bring: newCall.whatToBring || [],
        notes: newCall.notes || "",
        attachments: newCall.attachments || [],
        status: newCall.status || "Open",
        verified: false,
        google_maps_link: newCall.googleMapsLink || null,
        script_attachment_url: newCall.scriptAttachmentUrl || null
      };

      const { data, error } = await supabase
        .from('casting_calls')
        .insert(dbRow as any)
        .select()
        .single();

      if (error) throw error;
      
      const addedCall = mapCastingCall(data, []);
      setCastingCalls([addedCall, ...castingCalls]);
      toast({ title: "Success", description: "Casting call posted successfully!" });
    } catch (error: any) {
      console.error('Error adding casting call:', error);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to post casting call." });
      throw error; // Let caller handle if needed
    }
  };

  const toggleSave = async (castingCallId: string) => {
    if (!user) {
      toast({ variant: "destructive", title: "Authentication required", description: "Please log in to save calls." });
      return;
    }
    
    const isSaved = castingCalls.find(c => c.id === castingCallId)?.savedBy.includes(user.id);
    
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('casting_call_saves')
          .delete()
          .eq('casting_call_id', castingCallId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('casting_call_saves')
          .insert({ casting_call_id: castingCallId, user_id: user.id });
        if (error) throw error;
      }

      // Optimistic update
      setCastingCalls(castingCalls.map(c => {
        if (c.id === castingCallId) {
          const newSavedBy = isSaved 
            ? c.savedBy.filter(id => id !== user.id)
            : [...c.savedBy, user.id];
          return { ...c, savedBy: newSavedBy };
        }
        return c;
      }));
      
    } catch (error: any) {
      console.error('Error toggling save:', error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save/unsave." });
    }
  };

  const getUserApplicationStatus = (castingCallId: string) => {
    if (!user) return null;
    const app = applicants.find(a => a.castingCallId === castingCallId && a.userId === user.id);
    return app ? app.status : null;
  };

  const getCastingCallApplicants = (castingCallId: string) => {
    return applicants.filter(a => a.castingCallId === castingCallId);
  };

  return {
    castingCalls,
    applicants,
    loading,
    markInterested,
    withdrawInterest,
    changeApplicantStatus,
    addCastingCall,
    toggleSave,
    getUserApplicationStatus,
    getCastingCallApplicants,
    refreshData: fetchData
  };
}
