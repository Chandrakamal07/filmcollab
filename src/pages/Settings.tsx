/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Eye,
  Palette,
  Key,
  Trash2,
  Download,
  Upload,
  Globe,
  Lock,
  EyeOff,
  Check,
  X,
  Camera,
  Save,
  AlertTriangle,
  Info,
  RefreshCw
} from 'lucide-react';

const Settings = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('privacy');
  const [isLoading, setIsLoading] = useState(false);

  // Change Password Modal State
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // RapidAPI Credentials & Testing State
  const [rapidApiKey, setRapidApiKey] = useState(() => localStorage.getItem("X_RAPIDAPI_KEY") || "");
  const [rapidApiProvider, setRapidApiProvider] = useState(() => localStorage.getItem("X_RAPIDAPI_PROVIDER") || "instagram-bulk-scraper-latest");
  const [showRapidApiKey, setShowRapidApiKey] = useState(false);
  const [testUsername, setTestUsername] = useState("");
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);

  const handleSaveRapidApiSettings = () => {
    localStorage.setItem("X_RAPIDAPI_KEY", rapidApiKey.trim());
    localStorage.setItem("X_RAPIDAPI_PROVIDER", rapidApiProvider);
    toast({
      title: "API Settings Saved",
      description: "Your third-party API configurations have been stored securely in your browser storage.",
    });
  };

  const handleClearRapidApiSettings = () => {
    setRapidApiKey("");
    setRapidApiProvider("instagram-bulk-scraper-latest");
    setTestResult(null);
    setTestUsername("");
    localStorage.removeItem("X_RAPIDAPI_KEY");
    localStorage.removeItem("X_RAPIDAPI_PROVIDER");
    toast({
      title: "API Settings Reset",
      description: "Your custom third-party API configurations have been cleared.",
    });
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
    return num.toString();
  };

  const handleTestRapidApi = async () => {
    if (!testUsername.trim()) {
      toast({
        title: "Username required",
        description: "Please enter an Instagram username to test.",
        variant: "destructive"
      });
      return;
    }
    if (!rapidApiKey.trim()) {
      toast({
        title: "API Key required",
        description: "Please enter a RapidAPI Key to test.",
        variant: "destructive"
      });
      return;
    }

    setIsTestingApi(true);
    setTestResult(null);

    const username = testUsername.trim().replace(/^@/, "");

    try {
      let url = "";
      let host = "";
      let method = "GET";
      let body: any = null;

      if (rapidApiProvider === "instagram-bulk-scraper-latest") {
        url = `https://instagram-bulk-scraper-latest.p.rapidapi.com/web_profile_info/${encodeURIComponent(username)}`;
        host = "instagram-bulk-scraper-latest.p.rapidapi.com";
      } else if (rapidApiProvider === "instagram-scraper-api2") {
        url = `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${encodeURIComponent(username)}`;
        host = "instagram-scraper-api2.p.rapidapi.com";
      } else if (rapidApiProvider === "rocketapi-instagram") {
        url = `https://rocketapi-instagram.p.rapidapi.com/instagram/user/get_info`;
        host = "rocketapi-instagram.p.rapidapi.com";
        method = "POST";
        body = JSON.stringify({ username: username });
      }

      const headers: Record<string, string> = {
        "x-rapidapi-key": rapidApiKey.trim(),
        "x-rapidapi-host": host,
      };
      if (method === "POST") {
        headers["content-type"] = "application/json";
      }

      const res = await fetch(url, {
        method,
        headers,
        body
      });

      if (res.ok) {
        const json = await res.json();
        let followersCount: number | null = null;

        if (rapidApiProvider === "instagram-bulk-scraper-latest") {
          followersCount = json?.data?.user?.edge_followed_by?.count;
        } else if (rapidApiProvider === "instagram-scraper-api2") {
          followersCount = json?.data?.follower_count || json?.data?.user?.follower_count;
        } else if (rapidApiProvider === "rocketapi-instagram") {
          followersCount = json?.response?.body?.user?.follower_count;
        }

        if (followersCount !== null && typeof followersCount === "number") {
          setTestResult({
            success: true,
            message: `Success! Successfully retrieved followers count.`,
            data: {
              username: username,
              followers: followersCount,
              formatted: formatNumber(followersCount)
            }
          });
          toast({
            title: "API Connection Successful!",
            description: `@${username} has ${formatNumber(followersCount)} followers.`,
          });
        } else {
          setTestResult({
            success: false,
            message: `Key is valid, but couldn't parse follower count from response payload. Please verify you are using the correct API Provider.`,
            data: json
          });
        }
      } else {
        const errText = await res.text();
        setTestResult({
          success: false,
          message: `API returned error status ${res.status}: ${errText || res.statusText || "Unauthorized / Forbidden"}`
        });
        toast({
          title: "Connection Failed",
          description: `API returned status ${res.status}`,
          variant: "destructive"
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Network error or invalid request: ${err.message || err}`
      });
      toast({
        title: "Test Failed",
        description: err.message || "An unexpected error occurred during testing",
        variant: "destructive"
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Account Settings State
  const [accountData, setAccountData] = useState({
    firstName: 'Sarah',
    lastName: 'Johnson',
    username: 'sarahj_filmmaker',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 123-4567',
    bio: 'Independent filmmaker and producer passionate about storytelling through visual media. Always looking for creative collaborations.',
    location: 'Los Angeles, CA',
    website: 'https://sarahjohnsonfilms.com',
    birthday: '1990-05-15',
    gender: 'female',
    profession: 'Independent Filmmaker & Producer',
    company: 'SJ Productions',
    experience: '8+ years'
  });

  // Privacy Settings State
  const [visibleToCategories, setVisibleToCategories] = useState<string[]>(['all']);
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    showLocation: true,
    showBirthday: false,
    allowMessages: 'everyone',
    allowConnectionRequests: 'everyone',
    allowProfileViews: true,
    allowSearchEngines: false
  });

  const [availableCategories, setAvailableCategories] = useState<{name: string, department: string}[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      // Fetch categories
      const { data: catData } = await supabase.from('categories').select('name, department');
      if (catData) {
        setAvailableCategories((catData as any[]).sort((a, b) => (a.department || '').localeCompare(b.department || '') || (a.name || '').localeCompare(b.name || '')));
      }

      if (profile?.id) {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('profile_id', profile.id)
          .maybeSingle();
          
        if (data) {
          const s = data as any;
          if (s.privacy_settings) setPrivacySettings(prev => ({ ...prev, ...s.privacy_settings }));
          if (s.visible_to_categories) setVisibleToCategories(s.visible_to_categories);
          if (s.notification_settings) setNotificationSettings(prev => ({ ...prev, ...s.notification_settings }));
          if (s.appearance_settings) setAppearanceSettings(prev => ({ ...prev, ...s.appearance_settings }));
          if (s.security_settings) setSecuritySettings(prev => ({ ...prev, ...s.security_settings }));
        }
      }
    };
    fetchSettings();
  }, [user]);

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    newMessages: true,
    connectionRequests: true,
    projectInvites: true,
    jobAlerts: true,
    industryNews: false,
    marketingEmails: false,
    weeklyDigest: true,
    eventReminders: true,
    deadlineAlerts: true
  });

  // Appearance Settings State
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light',
    language: 'en',
    timezone: 'America/Los_Angeles',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    fontSize: 'medium',
    compactMode: false,
    showAvatars: true,
    showTimestamps: true,
    showReadReceipts: true
  });

  // Security Settings State
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    loginAlerts: true,
    sessionTimeout: '30',
    passwordLastChanged: '2024-01-15',
    activeSessions: 2,
    trustedDevices: 3
  });

  const handleSave = async (section: string) => {
    setIsLoading(true);
    try {
      if (profile?.id) {
        const updateData: any = {};
        if (section === 'Privacy') {
          updateData.privacy_settings = privacySettings;
          updateData.visible_to_categories = visibleToCategories;
        }
        if (section === 'Notifications') updateData.notification_settings = notificationSettings;
        if (section === 'Appearance') updateData.appearance_settings = appearanceSettings;
        if (section === 'Security') updateData.security_settings = securitySettings;

        // Upsert settings (requires profile_id as primary/unique key depending on table structure)
        const { data: existing } = await supabase.from('settings').select('id').eq('profile_id', profile.id).maybeSingle();
        
        let error;
        if (existing) {
          const res = await supabase.from('settings').update(updateData as any).eq('profile_id', profile.id);
          error = res.error;
        } else {
          const res = await supabase.from('settings').insert({ profile_id: profile.id, ...updateData } as any);
          error = res.error;
        }
        
        if (error) throw error;
      }
      
      toast({
        title: "Settings saved",
        description: `${section} settings have been updated successfully.`,
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountChange = (field: string, value: string) => {
    setAccountData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrivacyChange = (field: string, value: boolean | string) => {
    setPrivacySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAppearanceChange = (field: string, value: string | boolean) => {
    setAppearanceSettings(prev => ({ ...prev, [field]: value }));
    if (field === 'theme' && typeof value === 'string') {
      setTheme(value);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Weak password",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords mismatch",
        description: "New password and confirmation password do not match.",
      });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSecuritySettings(prev => ({ ...prev, passwordLastChanged: new Date().toISOString() }));
      toast({
        title: "Password updated",
        description: "Your account password has been changed successfully.",
      });
      setNewPassword("");
      setConfirmPassword("");
      setIsPasswordDialogOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Password update failed",
        description: err?.message || "Could not update password.",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleSecurityChange = (field: string, value: boolean | string) => {
    setSecuritySettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <p className="noir-eyebrow mb-1">Account Control</p>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your account settings and preferences</p>
          </div>
          <Badge variant="outline" className="w-fit text-xs border-primary/30 bg-primary/10 text-primary px-3 py-1 font-mono">
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Account Secure
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="md:hidden w-full mb-4 mt-2 flex-shrink-0">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-10 bg-card border border-border/80 font-medium text-foreground shadow-sm">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom" align="start">
                <SelectItem value="privacy">Privacy</SelectItem>
                <SelectItem value="notifications">Notifications</SelectItem>
                <SelectItem value="appearance">Appearance</SelectItem>
                <SelectItem value="security">Security</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TabsList className="hidden md:grid w-full overflow-x-auto bg-surface-elevated border border-border/80 p-1 rounded-xl justify-start grid-cols-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <TabsTrigger 
              value="privacy" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Eye className="w-4 h-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger 
              value="appearance" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="flex items-center gap-2 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Key className="w-4 h-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Privacy Settings */}
          <TabsContent value="privacy" className="space-y-6">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2 font-display text-xl">
                  <Eye className="w-5 h-5 text-primary" />
                  Privacy & Visibility
                </CardTitle>
                <CardDescription>
                  Control who can see your information and how you appear to others
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Profile Visibility</Label>
                      <p className="text-sm text-muted-foreground">Who can view your profile</p>
                    </div>
                    <Select 
                      value={privacySettings.profileVisibility} 
                      onValueChange={(value) => handlePrivacyChange('profileVisibility', value)}
                    >
                      <SelectTrigger className="w-40 bg-surface-elevated border-border/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {privacySettings.profileVisibility === 'public' && (
                    <div className="flex items-center justify-between border-t border-border/60 pt-4 mt-4">
                      <div className="space-y-1">
                        <Label>Who can view my profile</Label>
                        <p className="text-sm text-muted-foreground">Restrict visibility to specific user categories</p>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-[250px] justify-between h-auto min-h-10 text-left font-normal py-2 flex-wrap gap-1 bg-surface-elevated border-border/80">
                            {visibleToCategories?.includes('all') || !visibleToCategories?.length ? (
                              <span>All (Everyone)</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {visibleToCategories.slice(0, 2).map(cat => (
                                  <Badge key={cat} variant="secondary" className="text-xs truncate max-w-[80px]">{cat}</Badge>
                                ))}
                                {visibleToCategories.length > 2 && (
                                  <Badge variant="secondary" className="text-xs">+{visibleToCategories.length - 2}</Badge>
                                )}
                              </div>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0 bg-card border-border/80" align="end">
                          <div className="p-3 border-b border-border/60 text-sm font-semibold text-foreground">Select Categories</div>
                          <ScrollArea className="h-64">
                            <div className="p-2 space-y-1">
                              <label className="flex items-center gap-2 rounded hover:bg-surface-hover p-2 cursor-pointer text-sm text-foreground">
                                <Checkbox 
                                  checked={visibleToCategories?.includes('all') || !visibleToCategories?.length}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setVisibleToCategories(['all']);
                                    }
                                  }}
                                />
                                <span>All (Everyone)</span>
                              </label>
                                {Object.entries(availableCategories.reduce((acc, cat) => {
                                  if (!acc[cat.department]) acc[cat.department] = [];
                                  acc[cat.department].push(cat.name);
                                  return acc;
                                }, {} as Record<string, string[]>)).map(([dept, cats]) => (
                                  <div key={dept} className="mb-2">
                                    <div className="px-2 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">{dept}</div>
                                    {cats.map(cat => (
                                      <label key={cat} className="flex items-center gap-2 rounded hover:bg-surface-hover p-2 cursor-pointer text-sm ml-2 text-foreground">
                                        <Checkbox 
                                          checked={!visibleToCategories?.includes('all') && visibleToCategories?.includes(cat)}
                                          onCheckedChange={(checked) => {
                                            let current = visibleToCategories || [];
                                            if (current.includes('all')) current = [];
                                            
                                            if (checked) {
                                              setVisibleToCategories([...current, cat]);
                                            } else {
                                              const next = current.filter(c => c !== cat);
                                              setVisibleToCategories(next.length ? next : ['all']);
                                            }
                                          }}
                                        />
                                        <span>{cat}</span>
                                      </label>
                                    ))}
                                  </div>
                                ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <Separator className="bg-border/60" />

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Contact Information</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Show Email Address</Label>
                          <p className="text-sm text-muted-foreground">Display email on your profile</p>
                        </div>
                        <Switch
                          checked={privacySettings.showEmail}
                          onCheckedChange={(checked) => handlePrivacyChange('showEmail', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Show Phone Number</Label>
                          <p className="text-sm text-muted-foreground">Display phone on your profile</p>
                        </div>
                        <Switch
                          checked={privacySettings.showPhone}
                          onCheckedChange={(checked) => handlePrivacyChange('showPhone', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Show Location</Label>
                          <p className="text-sm text-muted-foreground">Display location on your profile</p>
                        </div>
                        <Switch
                          checked={privacySettings.showLocation}
                          onCheckedChange={(checked) => handlePrivacyChange('showLocation', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Show Birthday</Label>
                          <p className="text-sm text-muted-foreground">Display birthday on your profile</p>
                        </div>
                        <Switch
                          checked={privacySettings.showBirthday}
                          onCheckedChange={(checked) => handlePrivacyChange('showBirthday', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/60" />

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Communication</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Allow Messages From</Label>
                          <p className="text-sm text-muted-foreground">Who can send you messages</p>
                        </div>
                        <Select 
                          value={privacySettings.allowMessages} 
                          onValueChange={(value) => handlePrivacyChange('allowMessages', value)}
                        >
                          <SelectTrigger className="w-40 bg-surface-elevated border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="everyone">Everyone</SelectItem>
                            <SelectItem value="connections">Connections Only</SelectItem>
                            <SelectItem value="none">No One</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Allow Connection Requests</Label>
                          <p className="text-sm text-muted-foreground">Who can send connection requests</p>
                        </div>
                        <Select 
                          value={privacySettings.allowConnectionRequests} 
                          onValueChange={(value) => handlePrivacyChange('allowConnectionRequests', value)}
                        >
                          <SelectTrigger className="w-40 bg-surface-elevated border-border/80">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="everyone">Everyone</SelectItem>
                            <SelectItem value="connections">Connections Only</SelectItem>
                            <SelectItem value="none">No One</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/60" />

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Activity & Status</h4>
                    <div className="space-y-3">

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Allow Profile Views</Label>
                          <p className="text-sm text-muted-foreground">Let me know when someone opens my profile</p>
                        </div>
                        <Switch
                          checked={privacySettings.allowProfileViews}
                          onCheckedChange={(checked) => handlePrivacyChange('allowProfileViews', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSave('Privacy')} 
                  disabled={isLoading}
                  className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Privacy Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2 font-display text-xl">
                  <Bell className="w-5 h-5 text-primary" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose how and when you want to be notified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Notification Channels</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <Switch
                          checked={notificationSettings.emailNotifications}
                          onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Push Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                        </div>
                        <Switch
                          checked={notificationSettings.pushNotifications}
                          onCheckedChange={(checked) => handleNotificationChange('pushNotifications', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>SMS Notifications</Label>
                          <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                        </div>
                        <Switch
                          checked={notificationSettings.smsNotifications}
                          onCheckedChange={(checked) => handleNotificationChange('smsNotifications', checked)}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/60" />

                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">Activity Notifications</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>New Messages</Label>
                          <p className="text-sm text-muted-foreground">Get notified about new messages</p>
                        </div>
                        <Switch
                          checked={notificationSettings.newMessages}
                          onCheckedChange={(checked) => handleNotificationChange('newMessages', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Connection Requests</Label>
                          <p className="text-sm text-muted-foreground">Get notified about connection requests</p>
                        </div>
                        <Switch
                          checked={notificationSettings.connectionRequests}
                          onCheckedChange={(checked) => handleNotificationChange('connectionRequests', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Project Invites</Label>
                          <p className="text-sm text-muted-foreground">Get notified about project invitations</p>
                        </div>
                        <Switch
                          checked={notificationSettings.projectInvites}
                          onCheckedChange={(checked) => handleNotificationChange('projectInvites', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label>Job Alerts</Label>
                          <p className="text-sm text-muted-foreground">Get notified about relevant job opportunities</p>
                        </div>
                        <Switch
                          checked={notificationSettings.jobAlerts}
                          onCheckedChange={(checked) => handleNotificationChange('jobAlerts', checked)}
                        />
                      </div>
                    </div>
                  </div>

                </div>

                <Button 
                  onClick={() => handleSave('Notifications')} 
                  disabled={isLoading}
                  className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Notification Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2 font-display text-xl">
                  <Palette className="w-5 h-5 text-primary" />
                  Theme Settings
                </CardTitle>
                <CardDescription>
                  Choose your preferred theme
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Theme</Label>
                    <Select 
                      value={appearanceSettings.theme} 
                      onValueChange={(value) => handleAppearanceChange('theme', value)}
                    >
                      <SelectTrigger className="bg-surface-elevated border-border/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSave('Appearance')} 
                  disabled={isLoading}
                  className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Theme Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card className="noir-card border-border/80 bg-card">
              <CardHeader className="border-b border-border/60">
                <CardTitle className="flex items-center gap-2 font-display text-xl">
                  <Key className="w-5 h-5 text-primary" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-6">
                  {/* Password Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">Change Password</h4>
                        <p className="text-sm text-muted-foreground font-mono">
                          Last changed: {new Date(securitySettings.passwordLastChanged).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsPasswordDialogOpen(true)}
                        className="border-primary/30 hover:border-primary hover:bg-primary/10 text-foreground"
                      >
                        Change Password
                      </Button>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => handleSave('Security')} 
                  disabled={isLoading}
                  className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Security Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent className="sm:max-w-[425px] bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-foreground">Change Password</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Enter your new account password below. You will use this to sign in across FilmCollab.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-surface-elevated border-border/80"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-surface-elevated border-border/80"
                  required
                />
              </div>
              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                  className="border-border/80 text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingPassword}
                  className="bg-primary text-primary-foreground hover:bg-primary-hover"
                >
                  {isUpdatingPassword ? "Updating..." : "Update Password"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Settings;
