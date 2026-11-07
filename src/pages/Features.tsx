import { LandingTopbar } from "@/components/layout/landing-topbar";
import { LandingFooter } from "@/components/layout/landing-footer";
import {
  Search,
  Network,
  TrendingUp,
  Globe,
  Trophy,
  Zap,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FadeInSection, StaggerItem } from "@/components/ui/motion-primitives";

export default function Features() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Search,
      title: "Discover Opportunities",
      description:
        "Find casting calls, crew positions, and collaboration opportunities worldwide. Our advanced search helps you match with the perfect projects.",
    },
    {
      icon: Network,
      title: "Professional Network",
      description:
        "Connect with directors, producers, actors, and industry professionals. Build meaningful relationships that advance your career.",
    },
    {
      icon: TrendingUp,
      title: "Career Growth",
      description:
        "Build your portfolio, gain exposure, and advance your film career with our industry-leading tools and resources.",
    },
    {
      icon: Globe,
      title: "Global Community",
      description:
        "Access international projects and collaborate across borders. The film industry is global, and now your network is too.",
    },
    {
      icon: Trophy,
      title: "Project Management",
      description:
        "Organize shoots, manage timelines, and track project progress from pre-production to post-production all in one place.",
    },
    {
      icon: Zap,
      title: "Real-time Collaboration",
      description:
        "Chat, share files, and coordinate with your team instantly. Never miss a beat when working on fast-paced productions.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans overflow-x-hidden pt-16">
      <LandingTopbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden noir-backdrop border-b border-border/70">
        <div className="container mx-auto px-6 relative z-10 text-center max-w-4xl">
          <FadeInSection variant="marketing">
            <div className="noir-eyebrow mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Platform Capabilities</span>
            </div>
            <h1 className="noir-heading-hero mb-6">
              Powerful Features for{" "}
              <span className="block italic text-primary">Film Professionals</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to connect, collaborate, and create extraordinary cinema, all in
              one platform.
            </p>
          </FadeInSection>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-background relative flex-grow">
        <div className="container mx-auto px-6 max-w-7xl relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <StaggerItem key={index} index={index} liftOnHover>
                <Card className="h-full border-border/80 bg-card hover:border-primary/40 hover:shadow-noir group p-2">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-xl border border-primary/30 bg-primary/12 flex items-center justify-center mb-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground leading-relaxed text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-surface-elevated border-t border-border/80 text-center relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[260px] bg-primary/10 rounded-full blur-[100px]" />
        </div>

        <FadeInSection variant="marketing" className="container mx-auto px-6 relative z-10 max-w-3xl">
          <h2 className="noir-heading-section mb-5">Ready to Transform Your Workflow?</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Join thousands of film professionals who are already using FilmCollab to bring their
            stories to life.
          </p>
          <Button
            size="lg"
            className="h-12 px-8 text-base font-semibold shadow-elegant group"
            onClick={() => navigate("/auth/signup")}
          >
            Get Started for Free
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </FadeInSection>
      </section>

      <LandingFooter />
    </div>
  );
}
