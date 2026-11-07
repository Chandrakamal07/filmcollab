import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Film, Menu, X, Sun, Moon, Search } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { STUDIO_NOIR_EASE } from "@/lib/motion";

interface LandingTopbarProps {
  className?: string;
}

export function LandingTopbar({ className }: LandingTopbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: "Projects", href: "/projects" },
    { name: "Talent", href: "/discover" },
    { name: "Opportunities", href: "/jobs" },
    { name: "Resources", href: "/industry-hub" },
    { name: "Features", href: "/features" },
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b border-white/[0.08] bg-[#0D0E10]/90 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#0D0E10]/80",
        className,
      )}
    >
      <div className="container mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Left: Studio Wordmark + Navigation */}
          <div className="flex items-center gap-8">
            <div
              className="group flex items-center gap-2.5 cursor-pointer"
              onClick={() => navigate("/")}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/40 bg-primary/15 text-primary shadow-sm transition-all duration-150 ease-noir group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                <Film className="h-4 w-4" />
              </div>
              <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
                FilmCollab
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navigationItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "relative rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ease-noir",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="landing-nav-indicator"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute inset-0 rounded-lg bg-white/[0.06] border border-primary/35 -z-10"
                      />
                    )}
                    {item.name}
                    {active && (
                      <motion.span
                        layoutId="landing-nav-underline"
                        transition={{ duration: 0.22, ease: STUDIO_NOIR_EASE }}
                        className="absolute inset-x-3 -bottom-[13px] h-[2px] rounded-full bg-primary"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Search, Theme, Log in, Sign up */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search talent and projects"
              onClick={() => navigate("/discover")}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            >
              <Search className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle color theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <Button
              variant="ghost"
              onClick={() => navigate("/auth/signin")}
              className="hidden sm:inline-flex h-9 px-4 text-sm font-medium text-foreground/90 hover:text-foreground hover:bg-white/[0.06]"
            >
              Log in
            </Button>
            <Button
              onClick={() => navigate("/auth/signup")}
              className="h-9 px-4 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_20px_rgba(233,180,87,0.28)]"
            >
              Sign up
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle navigation menu"
              className="lg:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: STUDIO_NOIR_EASE }}
            className="lg:hidden overflow-hidden border-t border-border/70 bg-surface-base/95 backdrop-blur-xl"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-1.5">
              {navigationItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/15 text-primary border border-primary/30"
                        : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                    )}
                  >
                    {item.name}
                  </Link>
                );
              })}
              <div className="pt-2 mt-1 border-t border-border/60 flex sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/auth/signin");
                  }}
                  className="w-full justify-center"
                >
                  Log in
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
