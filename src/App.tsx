import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { MotionConfig } from "motion/react";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import Index from "./pages/Index";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import ContactUs from "./pages/ContactUs";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import AdminSignIn from "./pages/auth/AdminSignIn";
import AdminSignUp from "./pages/auth/AdminSignUp";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Jobs from "./pages/Jobs";
import JobDetails from "./pages/JobDetails";
import CastingCalls from "./pages/casting-calls/page";
import CastingCallDetails from "./pages/casting-calls/details";
import NewCastingCall from "./pages/casting-calls/new";
import ProjectDetails from "./pages/ProjectDetails";
import IndustryHub from "./pages/industry-hub/page";
import NewIndustryHubPost from "./pages/industry-hub/new";
import Projects from "./pages/projects/page";
import Posts from "./pages/posts/page";
import Directory from "./pages/directory/page";
import StudiosDirectory from "./pages/StudiosDirectory";
import Community from "./pages/community/page";
import Locations from "./pages/locations/page";
import NewLocation from "./pages/locations/new";
import LocationDetails from "./pages/locations/details";
import GroupDetails from "./pages/community/GroupDetails";
import JoinedGroupDetails from "./pages/community/JoinedGroupDetails";
import Discover from "./pages/discover/page";
import Messages from "./pages/messages/page";
import Connections from "./pages/connections/page";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Support from "./pages/Support";
import UserTicketDetail from "./pages/UserTicketDetail";
import Notifications from "./pages/Notifications";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminUsers from "./pages/AdminUsers";
import AdminPosts from "./pages/AdminPosts";
import AdminProjects from "./pages/AdminProjects";
import AdminJobs from "./pages/AdminJobs";
import AdminDirectory from "./pages/AdminDirectory";
import AdminTeam from "./pages/AdminTeam";
import AdminTickets from "./pages/AdminTickets";
import AdminTicketDetail from "./pages/AdminTicketDetail";
import AdminCommunities from "./pages/AdminCommunities";
import AdminNotifications from "./pages/AdminNotifications";
import AdminLocations from "./pages/AdminLocations";
import AdminLocationDetail from "./pages/AdminLocationDetail";
import AdminSettings from "./pages/AdminSettings";
import NotFound from "./pages/NotFound";

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

// Public Route Component (redirect if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
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
  
  // If user exists, redirect based on role
  if (user) {
    if (isAdmin()) {
      return <Navigate to="/admin-dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Index />} />
      <Route path="/features" element={<Features />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<ContactUs />} />
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
          path="/jobs/:id"
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

      {/* Catch all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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
