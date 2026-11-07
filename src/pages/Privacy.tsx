import { LandingTopbar } from "@/components/layout/landing-topbar";
import { LandingFooter } from "@/components/layout/landing-footer";
import { FadeInSection } from "@/components/ui/motion-primitives";
import { Lock } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans overflow-x-hidden pt-16">
      <LandingTopbar />

      <section className="relative pt-20 pb-16 overflow-hidden noir-backdrop border-b border-border/70">
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
          <FadeInSection variant="marketing">
            <div className="noir-eyebrow mb-5">
              <Lock className="h-3.5 w-3.5 text-primary" />
              <span>Data Protection</span>
            </div>
            <h1 className="noir-heading-hero mb-4">
              Privacy <span className="italic text-primary">Policy</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Last updated: November 5, 2026
            </p>
          </FadeInSection>
        </div>
      </section>

      <section className="py-16 bg-background flex-grow">
        <div className="container mx-auto px-6 max-w-3xl space-y-8 text-foreground/90 leading-relaxed text-sm">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information necessary to facilitate filmmaking partnerships: your profile details, craft specializations, portfolio media, project collaborations, and communication preferences.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">2. End-to-End Privacy & Messages</h2>
            <p className="text-muted-foreground">
              Direct messages between verified film professionals are secured with client-side end-to-end cryptographic keys (Web Crypto API) where enabled, preventing unauthorized inspection of confidential production communications.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">3. How Information Is Shared</h2>
            <p className="text-muted-foreground">
              Your public profile and portfolio are discoverable by verified producers and colleagues on FilmCollab. We do not sell your personal data or creative portfolios to third-party ad networks.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">4. Security & Storage</h2>
            <p className="text-muted-foreground">
              We implement industry-standard row-level security and access controls to ensure your production documents, budgets, and files remain restricted to authorized team members.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">5. Data Inquiries & Deletion</h2>
            <p className="text-muted-foreground">
              You may request an export or complete deletion of your account and personal records at any time by contacting privacy@filmcollab.com or via <a href="/contact" className="text-primary underline">Support</a>.
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

