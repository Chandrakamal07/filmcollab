import { ReactNode, useState } from "react";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";
import { useAuth } from "@/hooks/use-auth";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { STUDIO_NOIR_EASE } from "@/lib/motion";

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  pageName?: string; // Should match the name in adminNavigationItems (e.g. "Users", "Jobs")
  contentClassName?: string;
}

export function AdminLayout({ children, pageTitle, pageName, contentClassName }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  const isAuthorized = !pageName || hasPermission(pageName);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <AdminSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Sidebar - Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: STUDIO_NOIR_EASE }}
              className="absolute inset-0 bg-black/75 backdrop-blur-[2px]"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: STUDIO_NOIR_EASE }}
              className="relative h-full w-64 max-w-[82vw] shadow-noir-lg"
            >
              <AdminSidebar className="w-full" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Admin Topbar */}
        <AdminTopbar
          pageTitle={pageTitle}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          isMobileMenuOpen={mobileMenuOpen}
        />

        {/* Content area */}
        <main
          className={`flex-1 overflow-auto bg-background noir-backdrop ${
            contentClassName !== undefined ? contentClassName : "p-4 md:p-6"
          }`}
        >
          {!isAuthorized ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive mb-2">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Access Denied</h2>
              <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
                You do not have permission to view the {pageName} page. If you believe this is a
                mistake, please contact a super administrator.
              </p>
              <Button onClick={() => navigate("/admin-dashboard")} className="mt-4">
                Return to Dashboard
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
