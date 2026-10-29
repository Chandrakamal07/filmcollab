import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Film,
  Users,
  Search,
  Network,
  TrendingUp,
  Star,
  ArrowRight,
  Play,
  Quote,
  CheckCircle,
  Sparkles,
  Globe,
  Trophy,
  Zap,
  Heart,
  Award,
  Target,
  Shield,
  Rocket,
  Crown,
  Diamond,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LandingTopbar } from "@/components/layout/landing-topbar";
import { LandingFooter } from "@/components/layout/landing-footer";
import { FadeInSection, StaggerItem } from "@/components/ui/motion-primitives";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Search,
      title: "Discover Opportunities",
      description: "Find casting calls, crew positions, and collaboration opportunities worldwide",
    },
    {
      icon: Network,
      title: "Professional Network",
      description: "Connect with directors, producers, actors, and industry professionals",
    },
    {
      icon: TrendingUp,
      title: "Career Growth",
      description: "Build your portfolio, gain exposure, and advance your film career",
    },
    {
      icon: Globe,
      title: "Global Community",
      description: "Access international projects and collaborate across borders",
    },
    {
      icon: Trophy,
      title: "Project Management",
      description: "Organize shoots, manage timelines, and track project progress",
    },
    {
      icon: Zap,
      title: "Real-time Collaboration",
      description: "Chat, share files, and coordinate with your team instantly",
    },
  ];

  const testimonials = [
    {
      quote:
        "FilmCollab completely transformed how I find and manage film projects. I've connected with amazing talent and my career has skyrocketed!",
      author: "Sarah Chen",
      role: "Independent Director",
      avatar: "SC",
      rating: 5,
      project: "Award-winning Short Film 'Moments'",
    },
    {
      quote:
        "The platform's networking features helped me land my biggest role yet. The industry connections I've made here are invaluable.",
      author: "Marcus Rodriguez",
      role: "Professional Actor",
      avatar: "MR",
      rating: 5,
      project: "Lead in 'City Lights' Feature Film",
    },
    {
      quote:
        "As a screenwriter, FilmCollab gave my scripts the exposure they needed. Three of my projects are now in production!",
      author: "Emma Thompson",
      role: "Screenwriter",
      avatar: "ET",
      rating: 5,
      project: "Netflix Original Series Writer",
    },
  ];

  const stats = [
    { number: "50K+", label: "Active Creators", icon: Users },
    { number: "10K+", label: "Projects Completed", icon: Film },
    { number: "25K+", label: "Connections Made", icon: Heart },
    { number: "150+", label: "Countries Reached", icon: Globe },
  ];

  const benefits = [
    {
      icon: Crown,
      title: "Premium Access",
      description: "Get priority access to exclusive projects and casting calls",
    },
    {
      icon: Shield,
      title: "Secure Platform",
      description: "Your work and personal information are protected with enterprise-grade security",
    },
    {
      icon: Rocket,
      title: "Fast Growth",
      description: "Accelerate your career with our AI-powered matching system",
    },
    {
      icon: Diamond,
      title: "Quality Assurance",
      description: "Verified professionals and curated opportunities only",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
      <LandingTopbar />

      {/* Hero Section - Studio Noir Editorial */}
      <section className="relative min-h-[92vh] pt-28 pb-20 flex items-center justify-center overflow-hidden noir-backdrop film-grain">
        {/* Ambient Studio Spotlights */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[780px] h-[420px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute bottom-0 left-1/4 w-[420px] h-[280px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <FadeInSection variant="marketing" className="text-center max-w-5xl mx-auto">
            {/* Eyebrow & Brand */}
            <div className="inline-flex items-center gap-2.5 rounded-full border border-primary/30 bg-surface-elevated/80 px-4 py-1.5 mb-8 shadow-soft">
              <Film className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                FilmCollab Studio Network
              </span>
            </div>

            {/* Main Headlines */}
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[80px] font-normal tracking-tight text-foreground mb-6 leading-[1.05]">
              Where Stories{" "}
              <span className="block italic text-primary">Come to Life</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed">
              The premier platform connecting film industry professionals worldwide.
              Collaborate, create, and showcase your talent in cinema's next chapter.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
              <Button
                size="lg"
                className="min-w-[230px] h-13 text-base font-semibold shadow-elegant group"
                onClick={() => navigate("/auth/signup")}
              >
                Start Your Journey
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="min-w-[230px] h-13 text-base border-border bg-surface-base/80 hover:border-primary/50 hover:bg-surface-hover group"
                onClick={() => navigate("/auth/signin")}
              >
                <Play className="mr-2 h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm text-muted-foreground pt-4 border-t border-border/60 max-w-2xl mx-auto">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>Trusted by 50K+ creators</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-primary fill-primary" />
                <span>4.9/5 rating</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <span>150+ countries</span>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-surface-base border-y border-border/80">
        <div className="container mx-auto px-6 max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {stats.map((stat, index) => (
              <StaggerItem
                key={index}
                index={index}
                className="text-center p-6 rounded-xl border border-border/60 bg-surface-elevated/50 hover:border-primary/35 transition-colors"
              >
                <div className="h-12 w-12 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="font-display text-3xl md:text-4xl font-semibold text-foreground mb-1">
                  {stat.number}
                </div>
                <div className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {stat.label}
                </div>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 px-6 relative bg-background">
        <div className="container mx-auto max-w-7xl">
          <FadeInSection variant="marketing" className="text-center mb-16">
            <div className="noir-eyebrow mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Why FilmCollab</span>
            </div>
            <h2 className="noir-heading-section mb-4">
              Everything You Need to{" "}
              <span className="block italic text-primary">Create Amazing Films</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful tools and global network to bring your creative vision to life
            </p>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <StaggerItem key={index} index={index} liftOnHover>
                <Card className="h-full border-border/80 bg-card hover:border-primary/40 hover:shadow-noir group">
                  <CardHeader>
                    <div className="h-11 w-11 rounded-lg border border-primary/30 bg-primary/12 flex items-center justify-center mb-4 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg text-foreground group-hover:text-primary transition-colors">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 md:py-32 px-6 bg-surface-base border-y border-border/70">
        <div className="container mx-auto max-w-7xl">
          <FadeInSection variant="marketing" className="text-center mb-16">
            <div className="noir-eyebrow mb-5">
              <Target className="h-3.5 w-3.5" />
              <span>Premium Benefits</span>
            </div>
            <h2 className="noir-heading-section mb-4">
              Why Choose{" "}
              <span className="block italic text-primary">FilmCollab Pro</span>
            </h2>
          </FadeInSection>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <StaggerItem key={index} index={index} liftOnHover>
                <Card className="h-full border-border/80 bg-surface-elevated/60 hover:border-primary/40 text-center group">
                  <CardHeader>
                    <div className="h-14 w-14 rounded-2xl border border-primary/30 bg-primary/12 flex items-center justify-center mx-auto mb-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                      <benefit.icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg text-foreground">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-muted-foreground">
                      {benefit.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="community" className="py-24 md:py-32 px-6 bg-background">
        <div className="container mx-auto max-w-7xl">
          <FadeInSection variant="marketing" className="text-center mb-16">
            <div className="noir-eyebrow mb-5">
              <Quote className="h-3.5 w-3.5" />
              <span>Success Stories</span>
            </div>
            <h2 className="noir-heading-section mb-4">
              What Creators Are{" "}
              <span className="block italic text-primary">Saying About Us</span>
            </h2>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <StaggerItem key={index} index={index} liftOnHover>
                <Card className="h-full flex flex-col justify-between border-border/80 bg-card hover:border-primary/40">
                  <CardHeader>
                    <div className="flex items-center gap-3.5 mb-3">
                      <div className="h-11 w-11 rounded-full border border-primary/35 bg-primary/15 flex items-center justify-center text-primary font-semibold text-sm">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <h4 className="text-foreground font-semibold text-base">
                          {testimonial.author}
                        </h4>
                        <p className="text-muted-foreground text-xs">{testimonial.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 text-primary fill-primary" />
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <blockquote className="text-foreground/90 text-sm leading-relaxed italic">
                      "{testimonial.quote}"
                    </blockquote>
                    <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5">
                      <Award className="h-3 w-3 mr-1.5" />
                      {testimonial.project}
                    </Badge>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-28 px-6 relative overflow-hidden border-t border-border/80 bg-surface-elevated">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[320px] rounded-full bg-primary/12 blur-[110px]" />
        </div>
        <FadeInSection variant="marketing" className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="noir-heading-section mb-6">
            Ready to Create{" "}
            <span className="block italic text-primary">Your Masterpiece?</span>
          </h2>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join thousands of filmmakers, actors, and creatives who are already building the
            future of cinema.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button
              size="lg"
              className="min-w-[260px] h-13 text-base font-semibold shadow-elegant group"
              onClick={() => navigate("/auth/signup")}
            >
              Join FilmCollab Now
              <Sparkles className="ml-2 h-4 w-4 group-hover:rotate-12 transition-transform" />
            </Button>

            <div className="text-center sm:text-left">
              <p className="text-muted-foreground text-xs">
                Free to join • No credit card required
              </p>
              <p className="text-foreground text-sm font-medium">
                Start collaborating in under 2 minutes
              </p>
            </div>
          </div>
        </FadeInSection>
      </section>

      <LandingFooter />
    </div>
  );
};

export default Index;
