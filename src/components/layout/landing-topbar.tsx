import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Film, Menu, X, Sun, Moon } from "lucide-react";
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
    { name: "Home", href: "/" },
    { name: "Features", href: "/features" },
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
    { name: "Contact Us", href: "/contact" },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75",
        className,
      )}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div
            className="group flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 text-primary shadow-sm transition-all duration-150 ease-noir group-hover:border-primary/60 group-hover:bg-primary group-hover:text-primary-foreground">
              <Film className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl font-semibold tracking-tight text-foreground">
                FilmCollab
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navigationItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 ease-noir",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-surface-hover/70 hover:text-foreground",
                  )}
                >
                  {item.name}
                  {active && (
                    <motion.span
                      layoutId="landing-nav-indicator"
                      transition={{ duration: 0.2, ease: STUDIO_NOIR_EASE }}
                      className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-primary"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Auth & Theme Actions */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle color theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/auth/signin")}
              className="hidden sm:inline-flex h-9 px-4 text-sm border-border/80 bg-surface-base/70 text-foreground hover:border-primary/45 hover:bg-surface-hover"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/auth/signup")}
              className="h-9 px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm"
            >
              Get Started
            </Button>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle navigation menu"
              className="md:hidden h-9 w-9 text-muted-foreground hover:text-foreground"
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
            transition={{ duration: 0.2, ease: STUDIO_NOIR_EASE }}
            className="md:hidden overflow-hidden border-t border-border/70 bg-surface-base/95 backdrop-blur-xl"
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
                        ? "bg-primary/15 text-primary"
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
                  Sign In
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
