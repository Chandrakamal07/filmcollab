import { LandingTopbar } from "@/components/layout/landing-topbar";
import { LandingFooter } from "@/components/layout/landing-footer";
import { Film, Users, Globe, Target } from "lucide-react";
import { FadeInSection, StaggerItem } from "@/components/ui/motion-primitives";

export default function About() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans overflow-x-hidden pt-16">
      <LandingTopbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 overflow-hidden noir-backdrop border-b border-border/70">
        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <FadeInSection variant="marketing">
            <div className="noir-eyebrow mb-5">
              <Film className="h-3.5 w-3.5" />
              <span>Our Mission</span>
            </div>
            <h1 className="noir-heading-hero mb-6">
              About <span className="italic text-primary">FilmCollab</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              We're on a mission to democratize filmmaking by connecting passionate creators
              across the globe.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24 bg-background relative">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
            <FadeInSection variant="marketing">
              <h2 className="noir-heading-section mb-6">Our Story</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed text-base md:text-lg">
                Founded by filmmakers for filmmakers, FilmCollab was born out of the frustration
                of scattered networks and fragmented production tools. We realized that the
                hardest part of making a film shouldn't be finding the right people to make it
                with.
              </p>
              <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                Today, we provide a unified platform where talent meets opportunity, where
                projects are managed seamlessly, and where the next generation of cinema comes to
                life.
              </p>
            </FadeInSection>
            <FadeInSection variant="marketing" delay={0.1}>
              <div className="rounded-2xl p-10 relative overflow-hidden h-[380px] flex items-center justify-center border border-border/80 bg-surface-elevated shadow-noir">
                <Film className="w-40 h-40 text-primary/10 absolute" />
                <div className="relative z-10 text-center max-w-md">
                  <p className="font-display text-2xl md:text-3xl text-foreground italic leading-snug">
                    "Empowering creators to tell stories that matter."
                  </p>
                </div>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-surface-base border-t border-border/70">
        <div className="container mx-auto px-6 max-w-7xl">
          <FadeInSection variant="marketing">
            <h2 className="noir-heading-section text-center mb-16">Our Core Values</h2>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-8">
            <StaggerItem index={0} className="text-center p-8 rounded-xl border border-border/70 bg-card">
              <div className="w-16 h-16 mx-auto border border-primary/30 bg-primary/12 text-primary rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Community First</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We believe in the power of collaboration. Every feature we build is designed to
                strengthen connections between creators.
              </p>
            </StaggerItem>

            <StaggerItem index={1} className="text-center p-8 rounded-xl border border-border/70 bg-card">
              <div className="w-16 h-16 mx-auto border border-primary/30 bg-primary/12 text-primary rounded-2xl flex items-center justify-center mb-6">
                <Globe className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Global Reach</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Talent knows no borders. We provide a platform that breaks down geographical
                barriers in the film industry.
              </p>
            </StaggerItem>

            <StaggerItem index={2} className="text-center p-8 rounded-xl border border-border/70 bg-card">
              <div className="w-16 h-16 mx-auto border border-primary/30 bg-primary/12 text-primary rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Innovation</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We continuously evolve our tools to meet the modern demands of production,
                casting, and project management.
              </p>
            </StaggerItem>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
