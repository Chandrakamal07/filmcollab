import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Robust helper to wrap slow/hanging database queries with a fast timeout fallback
const withTimeout = <T,>(promise: Promise<T>, timeoutMs = 2500, fallbackValue: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => {
      console.warn(`Promise timed out after ${timeoutMs}ms, returning fallback.`);
      resolve(fallbackValue);
    }, timeoutMs))
  ]);
};

interface Profile {
  id: string;
  user_id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  bio?: string | null;
  industry?: string | null;
  experience_level?: string | null;
  skills?: string[] | null;
  role?: string | null;
  category?: string | null;
  location?: string | null;
  website?: string | null;
  portfolio_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  is_verified?: boolean | null;
  followers_count?: number | null;
  projects_count?: number | null;
  posts_count?: number | null;
  likes_count?: number | null;
  avatar_url?: string | null;
  cover_image_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'user' | 'admin';
  created_at: string;
}

export interface AdminPermissions {
  id: string;
  role: string;
  status: string;
  permissions: Record<string, any>;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, role?: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  linkProfile: (userId: string) => Promise<void>;
  isAdmin: () => boolean;
  adminPermissions: AdminPermissions | null;
  hasPermission: (page: string, action?: string) => boolean;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  signInAsGuest: (isAdminRole?: boolean) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [adminPermissions, setAdminPermissions] = useState<AdminPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const profileRef = useRef<Profile | null>(null);
  const userRoleRef = useRef<UserRole | null>(null);
  const fetchingUserIdRef = useRef<string | null>(null);

  // Keep refs in sync with state for background fetching safety
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    userRoleRef.current = userRole;
  }, [userRole]);

  const fetchProfile = useCallback(async (userId: string, passedUser?: User | null) => {
    if (fetchingUserIdRef.current === userId) {
      console.log('fetchProfile already in progress for user:', userId);
      return;
    }
    fetchingUserIdRef.current = userId;

    // Only set loading to true if we do not have a profile or role loaded yet (initial load)
    if (!profileRef.current || !userRoleRef.current) {
      setLoading(true);
    }

    try {
      console.log('Fetching profile for user:', userId);
      
      // Query profiles and user_roles in parallel with a tight timeout to guarantee fast responsiveness
      const [profileResult, roleResult] = await Promise.all([
        withTimeout(
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle() as unknown as Promise<{ data: Profile | null; error: null | { message: string } }>,
          10000,
          { data: null, error: null }
        ),
        withTimeout(
          supabase
            .from('user_roles')
            .select('*')
            .eq('user_id', userId) as unknown as Promise<{ data: UserRole[]; error: null | { message: string } }>,
          10000,
          { data: [], error: null }
        )
      ]);

      const { data: profileData, error: profileError } = profileResult;
      const { data: roleData, error: roleError } = roleResult;

      let finalProfileData = profileData;

      if (finalProfileData) {
        // Fix for signup profession
        const pendingProfession = localStorage.getItem('pending_profession');
        if (pendingProfession && (finalProfileData.role === 'USER' || finalProfileData.role === 'user' || !finalProfileData.role)) {
           console.log("Updating profile with pending profession:", pendingProfession);
           const { error: updateErr } = await supabase.from('profiles').update({ role: pendingProfession }).eq('user_id', userId);
           if (!updateErr) {
             finalProfileData = { ...finalProfileData, role: pendingProfession };
           }
           localStorage.removeItem('pending_profession');
        }
      }

      // Fetch admin permissions if applicable
      let adminPermsData = null;
      if (finalProfileData && (finalProfileData.role === 'admin' || (roleData && roleData.some(r => r.role === 'admin')))) {
        const permsResult = await withTimeout(
          supabase
            .from('admin_team_members')
            .select('*')
            .eq('profile_id', profileData.id)
            .maybeSingle(),
          10000,
          { data: null, error: null }
        );
        adminPermsData = permsResult.data;
        setAdminPermissions(adminPermsData as AdminPermissions);
      } else {
        setAdminPermissions(null);
      }

      if (profileError) {
        console.warn('Profile fetch warning or timeout:', profileError);
      }
      if (roleError) {
        console.warn('Role fetch warning or timeout:', roleError);
      }

      let activeProfile = finalProfileData;

      if (!activeProfile) {
        console.log('No profile found for user in DB. Creating a profile on the fly...');
        
        let currentUser = passedUser;
        if (!currentUser) {
          const userResult = await withTimeout(
            supabase.auth.getUser() as unknown as Promise<{ data: { user: User | null }; error: null }>,
            1500,
            { data: { user: null }, error: null }
          );
          currentUser = userResult?.data?.user;
        }
        
        const email = currentUser?.email || '';
        const metadata = currentUser?.user_metadata || {};
        const fullName = metadata.full_name || email.split('@')[0] || 'User';
        const firstName = metadata.first_name || '';
        const lastName = metadata.last_name || '';
        const role = metadata.role || (email.toLowerCase().includes('admin') ? 'admin' : 'user');

        const newProfile = {
          user_id: userId,
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          email: email,
          role: role,
          username: email.split('@')[0] || `user_${userId.slice(0, 5)}`,
          follower_count: 0,
          project_count: 0,
        };

        const { data: insertedProfile, error: insertError } = await withTimeout(
          supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .maybeSingle() as unknown as Promise<{ data: Profile | null; error: null | { message: string } }>,
          1500,
          { data: null, error: null }
        );

        if (insertError) {
          console.error('Failed to auto-create profile:', insertError);
          // Set basic in-memory fallback
          activeProfile = {
            id: userId,
            user_id: userId,
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            email: email,
            role: role,
            username: email.split('@')[0] || `user_${userId.slice(0, 5)}`,
            follower_count: 0,
            project_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as unknown as Profile;
        } else {
          console.log('Auto-created profile:', insertedProfile);
          activeProfile = insertedProfile;
        }
      }

      if (activeProfile) {
        if (activeProfile.role === 'blocked') {
          console.warn('Blocked user login attempt:', userId);
          await withTimeout(
            supabase.auth.signOut() as unknown as Promise<{ error: null }>,
            1500,
            { error: null }
          );
          toast({
            title: "Account Blocked",
            description: "Your account has been blocked by an administrator.",
            variant: "destructive"
          });
          setProfile(null);
          setUser(null);
          setUserRole(null);
          setAdminPermissions(null);
          setLoading(false);
          return;
        }
        setProfile(activeProfile);
      }

      let currentUser = passedUser;
      if (!currentUser) {
        const userResult = await withTimeout(
          supabase.auth.getUser() as unknown as Promise<{ data: { user: User | null }; error: null }>,
          1500,
          { data: { user: null }, error: null }
        );
        currentUser = userResult?.data?.user;
      }
      
      const isUserAdmin = currentUser?.user_metadata?.role === 'admin' || 
                          currentUser?.email?.toLowerCase().includes('admin') ||
                          localStorage.getItem("registering_admin") === "true";
      const roleToAssign = isUserAdmin ? 'admin' : 'user';

      if (roleData && roleData.length > 0) {
        console.log('User roles fetched:', roleData);
        const activeRole = roleData.find(r => r.role === 'admin') || roleData[0];
        
        // If the database says user, but they should be admin, update it in the database!
        if (activeRole.role !== roleToAssign && roleToAssign === 'admin') {
          console.log('Updating user role to admin in DB');
          const { error: updateError } = await withTimeout(
            supabase
              .from('user_roles')
              .update({ role: 'admin' })
              .eq('id', activeRole.id) as unknown as Promise<{ error: null | { message: string } }>,
            1500,
            { error: null }
          );
          if (!updateError) {
            activeRole.role = 'admin';
          }
        }
        
        setUserRole(activeRole as UserRole);
      } else {
        // No role found — auto insert or set a default in-memory role
        const defaultRole: UserRole = {
          id: '',
          user_id: userId,
          role: roleToAssign as 'user' | 'admin',
          created_at: new Date().toISOString()
        };
        setUserRole(defaultRole);
        // Try inserting default role to DB (silent catch on error)
        try {
          await withTimeout(
            supabase.from('user_roles').insert({ user_id: userId, role: roleToAssign }) as unknown as Promise<unknown>,
            1500,
            {}
          );
        } catch (e) {
          console.warn('Failed to insert default user role to DB:', e);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      if (fetchingUserIdRef.current === userId) {
        fetchingUserIdRef.current = null;
      }
      setLoading(false);
    }
  }, [toast]);

  const linkProfile = async (userId: string) => {
    await fetchProfile(userId);
  };

  const isAdmin = () => {
    return userRole?.role === 'admin' || profile?.role === 'admin';
  };

  const hasPermission = (page: string, action?: string) => {
    if (!isAdmin()) return false;
    
    // Superadmin has full access across all admin areas
    if (userRole?.role === 'admin' || profile?.role === 'admin') {
      // If scoped team permissions exist, enforce them
      if (adminPermissions) {
        if (adminPermissions.status !== 'Active') return false;
        if (adminPermissions.role === 'Admin') return true;
        const pagePerms = adminPermissions.permissions?.[page];
        if (!pagePerms) return false;
        if (action) return !!pagePerms[action];
        return !!pagePerms.view;
      }
      return true;
    }
    
    // Scoped team members require active permission records
    if (!adminPermissions || adminPermissions.status !== 'Active') return false;
    if (adminPermissions.role === 'Admin') return true;

    const pagePerms = adminPermissions.permissions?.[page];
    if (!pagePerms) return false;
    
    if (action) {
      return !!pagePerms[action];
    }
    
    return !!pagePerms.view;
  };

  useEffect(() => {
    console.log('useAuth useEffect running');

    // First check if there is a saved guest session
    const guestSessionSaved = localStorage.getItem("guest_session");
    if (guestSessionSaved) {
      try {
        const { guestUser, guestProfile, guestRole } = JSON.parse(guestSessionSaved);
        setUser(guestUser);
        setProfile(guestProfile);
        setUserRole(guestRole);
        setLoading(false);
        return;
      } catch (e) {
        console.error("Failed to parse guest session:", e);
      }
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        // Critical Guard: If an in-memory guest session is currently active, ignore Supabase background events
        if (localStorage.getItem("guest_session")) {
          console.log('Ignoring onAuthStateChange because active guest session is present.');
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id, session.user);
        } else {
          setProfile(null);
          setUserRole(null);
          setLoading(false);
        }

        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setUserRole(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      // Critical Guard: If an in-memory guest session is currently active, ignore Supabase background events
      if (localStorage.getItem("guest_session")) {
        console.log('Ignoring getSession because active guest session is present.');
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id, session.user);
      } else {
        setLoading(false);
      }
    });

    // Fallback timeout to guarantee loading is cleared
    const timeoutId = setTimeout(() => {
      console.log('Fallback timeout - setting loading to false');
      setLoading(false);
    }, 15000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [fetchProfile]);

  const signInAsLocalMock = (email: string, isAdminRole = false) => {
    const cleanEmail = email || (isAdminRole ? "admin@example.com" : "guest@example.com");
    const namePrefix = cleanEmail.split('@')[0];
    const capitalizedPrefix = namePrefix.charAt(0).toUpperCase() + namePrefix.slice(1);
    
    const guestUser = {
      id: isAdminRole ? "admin-local-mock-id" : "user-local-mock-id",
      email: cleanEmail,
      user_metadata: {
        full_name: isAdminRole ? `${capitalizedPrefix} Admin` : `${capitalizedPrefix} User`,
        first_name: capitalizedPrefix,
        last_name: isAdminRole ? "Admin" : "User",
        role: isAdminRole ? "admin" : "user"
      }
    } as unknown as User;

    const guestProfile = {
      id: isAdminRole ? "admin-local-mock-profile" : "user-local-mock-profile",
      user_id: guestUser.id,
      full_name: isAdminRole ? `${capitalizedPrefix} Admin` : `${capitalizedPrefix} User`,
      first_name: capitalizedPrefix,
      last_name: isAdminRole ? "Admin" : "User",
      bio: isAdminRole ? "System Administrator." : "Creative professional.",
      industry: "Film & Entertainment",
      experience_level: "Expert",
      skills: isAdminRole ? ["Administration", "Moderation"] : ["Directing"],
      role: isAdminRole ? "admin" : "user",
      category: isAdminRole ? "Admin" : "Director",
      location: "Los Angeles, CA",
      is_verified: true,
      followers_count: 0,
      projects_count: 0,
      posts_count: 0,
      likes_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Profile;

    const guestRole = {
      id: isAdminRole ? "admin-local-mock-role" : "user-local-mock-role",
      user_id: guestUser.id,
      role: isAdminRole ? "admin" : "user",
      created_at: new Date().toISOString()
    } as UserRole;

    localStorage.setItem("guest_session", JSON.stringify({ guestUser, guestProfile, guestRole }));
    setUser(guestUser);
    setProfile(guestProfile);
    setUserRole(guestRole);
    setLoading(false);

    toast({
      title: "Signed in successfully",
      description: `Welcome back!`,
    });
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.warn("Supabase auth sign in failed:", error.message);
        toast({
          title: "Sign in failed",
          description: "Invalid email or password.",
          variant: "destructive"
        });
        return { error };
      } else {
        toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
      }

      return { error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, role?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const fullName = firstName && lastName ? `${firstName} ${lastName}` : (firstName || '');

      if (role === 'admin') {
        localStorage.setItem("registering_admin", "true");
      } else {
        localStorage.removeItem("registering_admin");
      }

      // To prevent Postgres ENUM cast errors in handle_new_user_role trigger when role is a profession like "Director"
      const authRole = role === 'admin' ? 'admin' : undefined;
      
      if (role && role !== 'admin') {
        localStorage.setItem('pending_profession', role);
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            first_name: firstName || '',
            last_name: lastName || '',
            role: authRole,
          }
        }
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account created!",
          description: "Welcome to FilmCollab. Please check your email to verify your account.",
        });
      }

      return { error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: error as AuthError };
    }
  };

  const signOutAndClear = async () => {
    try {
      localStorage.removeItem("guest_session");
      // Clear all state first
      setUser(null);
      setSession(null);
      setProfile(null);
      setUserRole(null);
      setAdminPermissions(null);
      setLoading(false);
      
      // Sign out from Supabase and await it to ensure localStorage is cleared
      await supabase.auth.signOut().catch(e => console.warn("Signout error:", e));
      
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
      
      // Redirect to landing page after successful signout
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Check your email",
          description: "We've sent you a password reset link.",
        });
      }

      return { error };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error: error as AuthError };
    }
  };

  const signInAsGuest = (isAdminRole = false) => {
    const guestUser = {
      id: isAdminRole ? "admin-guest-id" : "guest-user-id",
      email: isAdminRole ? "admin@example.com" : "guest@example.com",
      user_metadata: {
        full_name: isAdminRole ? "Guest Admin" : "Guest Professional",
        first_name: "Guest",
        last_name: isAdminRole ? "Admin" : "Professional",
        role: isAdminRole ? "Admin" : "Director"
      }
    } as unknown as User;

    const guestProfile = {
      id: isAdminRole ? "admin-guest-profile" : "guest-profile-id",
      user_id: guestUser.id,
      full_name: isAdminRole ? "Guest Admin" : "Guest Professional",
      first_name: "Guest",
      last_name: isAdminRole ? "Admin" : "Professional",
      bio: isAdminRole ? "System Administrator for FilmCollab." : "Indie filmmaker & director looking to collaborate.",
      industry: "Film & Entertainment",
      experience_level: "Expert",
      skills: isAdminRole ? ["Administration", "Moderation"] : ["Directing", "Screenwriting", "Editing"],
      role: isAdminRole ? "admin" : "user",
      category: isAdminRole ? "Admin" : "Director",
      location: "Los Angeles, CA",
      is_verified: true,
      followers_count: isAdminRole ? 0 : 124,
      projects_count: isAdminRole ? 0 : 5,
      posts_count: isAdminRole ? 0 : 8,
      likes_count: isAdminRole ? 0 : 42,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Profile;

    const guestRole = {
      id: isAdminRole ? "admin-role-id" : "guest-role-id",
      user_id: guestUser.id,
      role: isAdminRole ? "admin" : "user",
      created_at: new Date().toISOString()
    } as UserRole;

    localStorage.setItem("guest_session", JSON.stringify({ guestUser, guestProfile, guestRole }));
    setUser(guestUser);
    setProfile(guestProfile);
    setUserRole(guestRole);
    setLoading(false);

    toast({
      title: "Signed in as Guest",
      description: `Welcome to the ${isAdminRole ? "Admin " : ""}Demo Sandbox!`,
    });
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id, user);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      userRole, 
      loading, 
      signIn, 
      signUp, 
      signOut: signOutAndClear, 
      linkProfile,
      isAdmin,
      adminPermissions,
      hasPermission,
      resetPassword,
      signInAsGuest,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
