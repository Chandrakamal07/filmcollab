import { LandingTopbar } from "@/components/layout/landing-topbar";
import { LandingFooter } from "@/components/layout/landing-footer";
import { FadeInSection } from "@/components/ui/motion-primitives";
import { Shield } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans overflow-x-hidden pt-16">
      <LandingTopbar />

      <section className="relative pt-20 pb-16 overflow-hidden noir-backdrop border-b border-border/70">
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
          <FadeInSection variant="marketing">
            <div className="noir-eyebrow mb-5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Legal & Compliance</span>
            </div>
            <h1 className="noir-heading-hero mb-4">
              Terms of <span className="italic text-primary">Service</span>
            </h1>
            <p className="text-sm text-muted-foreground font-mono">
              Last revised: November 5, 2026
            </p>
          </FadeInSection>
        </div>
      </section>

      <section className="py-16 bg-background flex-grow">
        <div className="container mx-auto px-6 max-w-3xl space-y-8 text-foreground/90 leading-relaxed text-sm">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">1. Agreement to Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using the FilmCollab platform, services, and creative workspaces, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not access or use our platform.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">2. User Accounts and Verification</h2>
            <p className="text-muted-foreground">
              To participate in project collaborations, post crew listings, or register production entities, you must create a verified account. You are responsible for safeguarding your credentials and for all activities that occur under your authentication identity.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">3. Creative Rights & Intellectual Property</h2>
            <p className="text-muted-foreground">
              Filmmakers, writers, and crew retain full ownership of their submitted scripts, media assets, treatments, and proprietary work. FilmCollab does not claim intellectual property rights over creative projects authored by users.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">4. Community Integrity & Moderation</h2>
            <p className="text-muted-foreground">
              FilmCollab strictly prohibits fraudulent job listings, deceptive talent solicitations, unauthorized copyright infringement, and harassment. Administrative moderators reserve the right to review and suspend accounts violating community standards.
            </p>
          </div>

          <div>
            <h2 className="font-display text-xl font-semibold text-foreground mb-3">5. Contact</h2>
            <p className="text-muted-foreground">
              For legal inquiries regarding our terms, contact legal@filmcollab.com or via our <a href="/contact" className="text-primary underline">contact form</a>.
            </p>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

