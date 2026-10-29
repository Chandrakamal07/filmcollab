import { ReactNode, useState, useEffect } from "react";
import { Sidebar } from "./sidebar";
import { DashboardTopbar } from "./dashboard-topbar";
import { AnimatePresence, motion } from "motion/react";
import { STUDIO_NOIR_EASE } from "@/lib/motion";

interface AppLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export function AppLayout({ children, pageTitle }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("sidebarCollapsed") === "true";
  });

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar - Desktop */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar
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
              <Sidebar className="w-full" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Dashboard Topbar */}
        <DashboardTopbar
          pageTitle={pageTitle}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          isMobileMenuOpen={mobileMenuOpen}
        />

        {/* Content area */}
        <main className="flex-1 overflow-auto px-3 py-4 sm:px-5 md:p-6 bg-background noir-backdrop">
          {children}
        </main>
      </div>
    </div>
  );
}
