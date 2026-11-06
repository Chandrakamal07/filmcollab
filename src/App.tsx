import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Index from "./pages/Index";

const Features = lazy(() => import("./pages/Features"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const SignIn = lazy(() => import("./pages/auth/SignIn"));
const SignUp = lazy(() => import("./pages/auth/SignUp"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const AdminSignIn = lazy(() => import("./pages/auth/AdminSignIn"));
const AdminSignUp = lazy(() => import("./pages/auth/AdminSignUp"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminProfile = lazy(() => import("./pages/AdminProfile"));
const Jobs = lazy(() => import("./pages/Jobs"));
const JobDetails = lazy(() => import("./pages/JobDetails"));
const CastingCalls = lazy(() => import("./pages/casting-calls/page"));
const CastingCallDetails = lazy(() => import("./pages/casting-calls/details"));
const NewCastingCall = lazy(() => import("./pages/casting-calls/new"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const IndustryHub = lazy(() => import("./pages/industry-hub/page"));
const NewIndustryHubPost = lazy(() => import("./pages/industry-hub/new"));
const Projects = lazy(() => import("./pages/projects/page"));
const Posts = lazy(() => import("./pages/posts/page"));
const Directory = lazy(() => import("./pages/directory/page"));
const StudiosDirectory = lazy(() => import("./pages/StudiosDirectory"));
const Community = lazy(() => import("./pages/community/page"));
const Locations = lazy(() => import("./pages/locations/page"));
const NewLocation = lazy(() => import("./pages/locations/new"));
const LocationDetails = lazy(() => import("./pages/locations/details"));
const GroupDetails = lazy(() => import("./pages/community/GroupDetails"));
const JoinedGroupDetails = lazy(() => import("./pages/community/JoinedGroupDetails"));
const Discover = lazy(() => import("./pages/discover/page"));
const Messages = lazy(() => import("./pages/messages/page"));
const Connections = lazy(() => import("./pages/connections/page"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Support = lazy(() => import("./pages/Support"));
const UserTicketDetail = lazy(() => import("./pages/UserTicketDetail"));
const Notifications = lazy(() => import("./pages/Notifications"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminPosts = lazy(() => import("./pages/AdminPosts"));
const AdminProjects = lazy(() => import("./pages/AdminProjects"));
const AdminJobs = lazy(() => import("./pages/AdminJobs"));
const AdminDirectory = lazy(() => import("./pages/AdminDirectory"));
const AdminTeam = lazy(() => import("./pages/AdminTeam"));
const AdminTickets = lazy(() => import("./pages/AdminTickets"));
const AdminTicketDetail = lazy(() => import("./pages/AdminTicketDetail"));
const AdminCommunities = lazy(() => import("./pages/AdminCommunities"));
const AdminNotifications = lazy(() => import("./pages/AdminNotifications"));
const AdminLocations = lazy(() => import("./pages/AdminLocations"));
const AdminLocationDetail = lazy(() => import("./pages/AdminLocationDetail"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const NotFound = lazy(() => import("./pages/NotFound"));

function NoirLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"></div>
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Loading Studio...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground tracking-wide">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth/signin" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}

// Admin Route Component
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground tracking-wide">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/admin-signin" replace />;
  }

  // Check admin status using isAdmin() function
  if (!isAdmin()) {
    return <Navigate to="/admin-signin" replace />;
  }
  
  return <>{children}</>;
}

// Public Route Component (redirect if already authenticated, honoring return location)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground tracking-wide">Loading...</p>
        </div>
      </div>
    );
  }
  
  // If user exists, redirect to requested 'from' destination or default dashboard
  if (user) {
    const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } | string })?.from;
    if (from) {
      const destination =
        typeof from === "string"
          ? from
          : `${from.pathname || ""}${from.search || ""}${from.hash || ""}` || "/dashboard";
      return <Navigate to={destination} replace />;
    }
    if (isAdmin()) {
      return <Navigate to="/admin-dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Seamless alias redirects for /signin and /signup preserving search & state
function RedirectToSignIn() {
  const location = useLocation();
  return <Navigate to={`/auth/signin${location.search}${location.hash}`} state={location.state} replace />;
}

function RedirectToSignUp() {
  const location = useLocation();
  return <Navigate to={`/auth/signup${location.search}${location.hash}`} state={location.state} replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<NoirLoadingFallback />}>
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      {/* Compatibility alias routes */}
      <Route path="/signin" element={<RedirectToSignIn />} />
      <Route path="/login" element={<RedirectToSignIn />} />
      <Route path="/signup" element={<RedirectToSignUp />} />
      <Route
        path="/auth/signin"
        element={
          <PublicRoute>
            <SignIn />
          </PublicRoute>
        }
      />
      <Route
        path="/auth/signup"
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        }
      />
      <Route
        path="/auth/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/auth/reset-password"
        element={<ResetPassword />}
      />

      {/* Admin routes */}
      <Route
        path="/admin-signin"
        element={
          <PublicRoute>
            <AdminSignIn />
          </PublicRoute>
        }
      />
      <Route
        path="/admin-signup"
        element={
          <PublicRoute>
            <AdminSignUp />
          </PublicRoute>
        }
      />

      {/* Protected user routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <Jobs />
          </ProtectedRoute>
        }
      />
      <Route
        path="/casting-calls"
        element={
          <ProtectedRoute>
            <CastingCalls />
          </ProtectedRoute>
        }
      />
      <Route
        path="/casting-calls/new"
        element={
          <ProtectedRoute>
            <NewCastingCall />
          </ProtectedRoute>
        }
      />
      <Route
        path="/casting-calls/:id"
        element={
          <ProtectedRoute>
            <CastingCallDetails />
          </ProtectedRoute>
        }
      />
        <Route
          path="/jobs/:jobId"
          element={
            <ProtectedRoute>
              <JobDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/industry-hub"
          element={
            <ProtectedRoute>
              <IndustryHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/industry-hub/new"
          element={
            <ProtectedRoute>
              <NewIndustryHubPost />
            </ProtectedRoute>
          }
        />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/posts"
        element={
          <ProtectedRoute>
            <Posts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/directory"
        element={
          <ProtectedRoute>
            <Directory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/studios"
        element={
          <ProtectedRoute>
            <StudiosDirectory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations"
        element={
          <ProtectedRoute>
            <Locations />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations/new"
        element={
          <ProtectedRoute>
            <NewLocation />
          </ProtectedRoute>
        }
      />
      <Route
        path="/locations/:id"
        element={
          <ProtectedRoute>
            <LocationDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <Community />
          </ProtectedRoute>
        }
      />
      <Route
        path="/community/group/:groupId"
        element={
          <ProtectedRoute>
            <GroupDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/community/joined-group/:groupId"
        element={
          <ProtectedRoute>
            <JoinedGroupDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/discover"
        element={
          <ProtectedRoute>
            <Discover />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/connections"
        element={
          <ProtectedRoute>
            <Connections />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/:id"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <Billing />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support"
        element={
          <ProtectedRoute>
            <Support />
          </ProtectedRoute>
        }
      />
      <Route
        path="/support/:ticketId"
        element={
          <ProtectedRoute>
            <UserTicketDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />

      {/* Protected admin routes */}
      <Route
        path="/admin-dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/analytics"
        element={
          <AdminRoute>
            <AdminAnalytics />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/users"
        element={
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/posts"
        element={
          <AdminRoute>
            <AdminPosts />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/projects"
        element={
          <AdminRoute>
            <AdminProjects />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/jobs"
        element={
          <AdminRoute>
            <AdminJobs />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/communities"
        element={
          <AdminRoute>
            <AdminCommunities />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/directory"
        element={
          <AdminRoute>
            <AdminDirectory />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/team"
        element={
          <AdminRoute>
            <AdminTeam />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/tickets"
        element={
          <AdminRoute>
            <AdminTickets />
          </AdminRoute>
        }
      />
      <Route
        path="/admin-dashboard/tickets/:ticketId"
        element={
          <AdminRoute>
            <AdminTicketDetail />
          </AdminRoute>
        }
      />
      <Route 
        path="/admin-dashboard/notifications" 
        element={
          <AdminRoute>
            <AdminNotifications />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin-dashboard/locations" 
        element={
          <AdminRoute>
            <AdminLocations />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin-dashboard/locations/:id" 
        element={
          <AdminRoute>
            <AdminLocationDetail />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin-dashboard/settings" 
        element={
          <AdminRoute>
            <AdminSettings />
          </AdminRoute>
        } 
      />
      <Route 
        path="/admin-dashboard/profile" 
        element={
          <AdminRoute>
            <AdminProfile />
          </AdminRoute>
        } 
      />

      {/* Catch all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </MotionConfig>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
