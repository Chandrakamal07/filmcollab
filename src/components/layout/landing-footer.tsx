import { Film } from "lucide-react";
import { Link } from "react-router-dom";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/80 bg-surface-base py-16 px-6 text-foreground">
      <div className="container mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/35 bg-primary/15 text-primary">
                <Film className="h-5 w-5" />
              </div>
              <span className="font-display text-2xl font-semibold tracking-tight text-foreground">
                FilmCollab
              </span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground max-w-xs">
              Connecting the global film community to create extraordinary stories together.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Platform
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link to="/features" className="transition-colors hover:text-primary">
                  Features
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="transition-colors hover:text-primary">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/#community" className="transition-colors hover:text-primary">
                  Community
                </Link>
              </li>
              <li>
                <Link to="/about" className="transition-colors hover:text-primary">
                  About
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Support
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link to="/contact" className="transition-colors hover:text-primary">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="#" className="transition-colors hover:text-primary">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="#" className="transition-colors hover:text-primary">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="#" className="transition-colors hover:text-primary">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
              Connect
            </h4>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Twitter
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  Instagram
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  LinkedIn
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-primary">
                  YouTube
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-border/70 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <p className="text-xs text-muted-foreground">
            © 2026 FilmCollab. All rights reserved. Made for creators, by creators.
          </p>
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
            Studio Noir Edition
          </span>
        </div>
      </div>
    </footer>
  );
}
