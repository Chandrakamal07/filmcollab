import * as React from "react";
import { Button } from "@/components/ui/button";
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
  Shield,
  Clapperboard,
  Camera,
  MapPin,
  Layers,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LandingTopbar } from "@/components/layout/landing-topbar";
import { LandingFooter } from "@/components/layout/landing-footer";
import {
  DimensionalCard,
  DimensionalLayer,
  FadeInSection,
  ImageReveal,
  StaggerItem,
} from "@/components/ui/motion-primitives";
import { SoundstageFallback } from "@/components/three/soundstage/SoundstageFallback";

const SoundstageHero = React.lazy(() => import("@/components/three/soundstage/SoundstageHero"));

const craftDisciplines = [
  {
    title: "Actors",
    role: "Lead & Character Talent",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    href: "/discover?craft=Actor",
  },
  {
    title: "Directors",
    role: "Vision & Narrative",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    href: "/discover?craft=Director",
  },
  {
    title: "Screenwriters",
    role: "Original & Adapted Scripts",
    image:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    href: "/discover?craft=Screenwriter",
  },
  {
    title: "Cinematographers",
    role: "Anamorphic & Digital Optics",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80",
    href: "/discover?craft=Cinematographer",
  },
  {
    title: "Editors",
    role: "Assembly, Color & Rhythm",
    image:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&auto=format&fit=crop&q=80",
    href: "/discover?craft=Editor",
  },
  {
    title: "Production Crew",
    role: "Sound, Gaffer & Art Dept",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&auto=format&fit=crop&q=80",
    href: "/discover?craft=Producer",
  },
];

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Search,
      tag: "CASTING & CREW",
      title: "Precision Talent & Showreel Discovery",
      description:
        "Inspect verified showreels, credits, availability windows, and craft specializations in a split-screen studio dossier.",
      image:
        "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&auto=format&fit=crop&q=80",
      span: "lg:col-span-7",
    },
    {
      icon: Clapperboard,
      tag: "PRODUCTION WORKSPACE",
      title: "Widescreen Project Slates & Kanban Boards",
      description:
        "Run pre-production, script locks, call sheets, and real-time crew chat from one unified production room.",
      image:
        "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&auto=format&fit=crop&q=80",
      span: "lg:col-span-5",
    },
    {
      icon: MapPin,
      tag: "SCOUTING & STUDIOS",
      title: "Architectural Locations & Soundstages",
      description:
        "Book verified filming locations, soundstages, and post-production houses with transparent day/hour rates.",
      image:
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80",
      span: "lg:col-span-5",
    },
    {
      icon: Network,
      tag: "GLOBAL GUILDS",
      title: "Direct Studio-to-Creator Collaboration",
      description:
        "Connect across 150+ territories with directors, cinematographers, editors, and producers without agency friction.",
      image:
        "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&auto=format&fit=crop&q=80",
      span: "lg:col-span-7",
    },
  ];

  const testimonials = [
    {
      quote:
        "FilmCollab completely transformed how I package and crew independent features. We locked our DP, editor, and sound designer in 72 hours.",
      author: "Sarah Chen",
      role: "Independent Director • Mumbai & London",
      avatar:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
      rating: 5,
      project: "Director — 'After the Rain'",
    },
    {
      quote:
        "The showreel dossier and availability indicators meant producers could review my anamorphic reel and book me directly for a 6-week shoot.",
      author: "Marcus Rodriguez",
      role: "Director of Photography • Los Angeles",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
      rating: 5,
      project: "Cinematographer — 'Monsoon Letters'",
    },
    {
      quote:
        "Having casting calls, location scouting, task boards, and unit chat in one dark-room workspace keeps our entire production unit aligned.",
      author: "Emma Thompson",
      role: "Executive Producer • Berlin",
      avatar:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80",
      rating: 5,
      project: "Producer — 'The Waiting Room'",
    },
  ];

  const stats = [
    { number: "50K+", label: "Verified Filmmakers", icon: Users },
    { number: "10K+", label: "Productions Wrapped", icon: Film },
    { number: "25K+", label: "Crew Collaborations", icon: Heart },
    { number: "150+", label: "Production Hubs", icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-[#0D0E10] text-foreground relative overflow-x-hidden">
      <LandingTopbar />

      {/* 01 / LANDING — STUDIO NOIR CINEMATIC STAGE + 3D WEBGL FILM SCULPTURE */}
      <section className="relative pt-20 pb-12 px-4 sm:px-8">
        <div className="container mx-auto max-w-[1400px]">
          <div className="relative rounded-2xl border border-white/[0.09] bg-[#121317] shadow-noir-lg overflow-hidden">
            {/* Hero Main Stage */}
            <div className="relative min-h-[560px] lg:min-h-[620px] flex flex-col justify-between overflow-hidden">
              {/* Layer 1: Golden-Hour Production Photography Backdrop with Noir Vignette */}
              <div className="pointer-events-none absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1800&auto=format&fit=crop&q=85"
                  alt="Film production crew on set at golden hour"
                  className="w-full h-full object-cover object-center opacity-45 scale-[1.02]"
                />
                {/* Warm Golden-Hour Sunflare + Deep Left/Bottom Charcoal Vignette */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#0E0F12] via-[#101114]/88 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#121317] via-[#121317]/35 to-[#0D0E10]/60" />
                <div className="absolute top-0 right-[12%] w-[560px] h-[420px] rounded-full bg-[#E9B457]/20 blur-[120px]" />
              </div>

              {/* Upper-Right Editorial Callout */}
              <div className="hidden xl:flex flex-col items-end gap-2 absolute top-8 right-10 z-20 pointer-events-none">
                <p className="font-display italic text-lg text-foreground/80 -rotate-3 pr-2 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
                  “Different Stories,
                  <br />
                  <span className="text-primary font-normal">Brighter People”</span>
                </p>
              </div>

              {/* Layer 2: Left-Aligned Editorial Hero Content (Matches 01 / Landing) */}
              <div className="relative z-20 px-6 sm:px-12 lg:px-14 pt-12 sm:pt-16 pb-4 lg:pb-6 max-w-2xl">
                <FadeInSection variant="marketing">
                  <div className="flex items-center gap-2.5 mb-5">
                    <span className="h-[1px] w-7 bg-primary/80" />
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.26em] text-primary">
                      FOR FILMMAKERS, BY FILMMAKERS
                    </span>
                  </div>

                  <h1 className="font-display text-4xl sm:text-6xl lg:text-[68px] font-normal tracking-tight text-[#F4F0E8] leading-[1.03] mb-6 drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                    Your next
                    <span className="block">film starts here.</span>
                  </h1>

                  <p className="text-base sm:text-lg text-[#C7C5BE] mb-9 max-w-xl leading-relaxed">
                    Find collaborators, join exciting projects and bring your ideas to life
                    with a global community of filmmakers.
                  </p>

                  {/* Primary & Secondary CTAs (Matches 01 / Landing) */}
                  <div className="flex flex-wrap items-center gap-4">
                    <Button
                      size="lg"
                      onClick={() => navigate("/discover")}
                      className="h-12 px-7 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_8px_28px_rgba(233,180,87,0.32)] group"
                    >
                      Find talent
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </Button>

                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => navigate("/jobs")}
                      className="h-12 px-7 rounded-xl text-sm font-medium border-white/20 bg-black/45 backdrop-blur-md text-foreground hover:border-primary/55 hover:bg-white/[0.08]"
                    >
                      Explore opportunities
                    </Button>
                  </div>
                </FadeInSection>
              </div>

              {/* Layer 3: ONE Responsive 3D Infinite Soundstage Hero Instance */}
              <div className="relative lg:absolute lg:top-0 lg:bottom-[210px] lg:right-0 w-full lg:w-[54%] xl:w-[56%] h-[320px] sm:h-[420px] lg:h-auto max-w-[620px] lg:max-w-none mx-auto lg:mx-0 z-20 flex items-center justify-center pointer-events-auto px-4 lg:px-0 my-2 lg:my-0">
                <React.Suspense fallback={<SoundstageFallback />}>
                  <SoundstageHero />
                </React.Suspense>
              </div>

              {/* Bottom of Hero Stage: 6-Column Craft Portrait Strip + Manifesto (Matches 01 / Landing) */}
              <div className="relative z-20 px-6 sm:px-12 lg:px-14 pb-8 pt-4 border-t border-white/[0.07] bg-gradient-to-t from-[#0E0F12] via-[#121317]/95 to-transparent">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-12 gap-4 items-end">
                  <div className="col-span-2 sm:col-span-3 lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5">
                    {craftDisciplines.map((craft, idx) => (
                      <StaggerItem key={craft.title} index={idx}>
                        <DimensionalCard
                          maxTilt={8}
                          onClick={() => navigate(craft.href)}
                          className="cursor-pointer overflow-hidden rounded-xl border-white/[0.1] bg-[#181A1E] group"
                        >
                          <DimensionalLayer depth={14}>
                            <div className="aspect-[4/4.6] w-full overflow-hidden relative">
                              <img
                                src={craft.image}
                                alt={craft.title}
                                className="w-full h-full object-cover object-center transition-transform duration-500 ease-noir group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                              <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <ArrowRight className="h-3 w-3 text-primary" />
                              </div>
                            </div>
                          </DimensionalLayer>
                          <DimensionalLayer depth={24} className="p-2.5 bg-[#16181C] border-t border-white/[0.06]">
                            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {craft.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {craft.role}
                            </p>
                          </DimensionalLayer>
                        </DimensionalCard>
                      </StaggerItem>
                    ))}
                  </div>

                  {/* Right Architectural Tagline from 01 / Landing */}
                  <div className="col-span-2 sm:col-span-3 lg:col-span-3 flex flex-col justify-end lg:pl-4 pb-2">
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground leading-relaxed">
                      A PLATFORM
                      <br />
                      FOR BOLDER
                      <br />
                      <span className="text-foreground font-semibold">COLLABORATION</span>
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="h-[1px] flex-1 bg-primary/50" />
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Studio Telemetry & Scale Strip */}
      <section className="py-10 px-4 sm:px-8">
        <div className="container mx-auto max-w-[1400px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <StaggerItem key={stat.label} index={index}>
                <DimensionalCard maxTilt={5} className="p-5 bg-[#15171B] border-white/[0.08]">
                  <DimensionalLayer depth={16} className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
                        {stat.number}
                      </div>
                      <div className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground mt-1">
                        {stat.label}
                      </div>
                    </div>
                    <div className="h-11 w-11 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center text-primary">
                      <stat.icon className="h-5 w-5" />
                    </div>
                  </DimensionalLayer>
                </DimensionalCard>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* Asymmetric Dimensional Bento Grid — Platform Architecture */}
      <section id="features" className="py-20 px-4 sm:px-8 relative">
        <div className="container mx-auto max-w-[1400px]">
          <FadeInSection variant="marketing" className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="noir-eyebrow mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                <span>STUDIO ARCHITECTURE</span>
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-foreground leading-[1.08]">
                Engineered for Every Stage of{" "}
                <span className="italic text-primary">Cinema Production</span>
              </h2>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md">
              From initial script breakdown and casting calls to location scouting and daily unit task boards.
            </p>
          </FadeInSection>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {features.map((feature, index) => (
              <StaggerItem key={feature.title} index={index} className={feature.span}>
                <DimensionalCard
                  maxTilt={5.5}
                  className="h-full overflow-hidden bg-[#15171B] border-white/[0.08] flex flex-col justify-between group"
                >
                  <DimensionalLayer depth={12} className="relative h-56 sm:h-64 w-full overflow-hidden">
                    <ImageReveal
                      src={feature.image}
                      alt={feature.title}
                      wrapperClassName="w-full h-full"
                      className="transition-transform duration-700 ease-noir group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4 z-10">
                      <Badge className="bg-black/70 backdrop-blur-md text-primary border border-primary/35 font-mono text-[10px] tracking-[0.16em] uppercase">
                        {feature.tag}
                      </Badge>
                    </div>
                  </DimensionalLayer>

                  <DimensionalLayer depth={24} className="p-6 sm:p-7 bg-[#15171B]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-display text-xl sm:text-2xl font-semibold text-foreground group-hover:text-primary transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                      <div className="h-10 w-10 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-center text-primary flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <feature.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </DimensionalLayer>
                </DimensionalCard>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — Voices from the Set */}
      <section id="community" className="py-20 px-4 sm:px-8 bg-[#111215] border-y border-white/[0.07]">
        <div className="container mx-auto max-w-[1400px]">
          <FadeInSection variant="marketing" className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="noir-eyebrow mb-4">
                <Quote className="h-3.5 w-3.5" />
                <span>VOICES FROM THE SET</span>
              </div>
              <h2 className="font-display text-3xl sm:text-5xl font-normal tracking-tight text-foreground">
                Trusted by Directors, DPs &{" "}
                <span className="italic text-primary">Showrunners</span>
              </h2>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/discover")}
              className="border-white/15 bg-surface-elevated hover:border-primary/45"
            >
              Browse Verified Talent
              <ArrowRight className="ml-2 h-4 w-4 text-primary" />
            </Button>
          </FadeInSection>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <StaggerItem key={testimonial.author} index={index}>
                <DimensionalCard
                  maxTilt={6}
                  className="h-full p-6 sm:p-7 bg-[#16181C] border-white/[0.08] flex flex-col justify-between"
                >
                  <DimensionalLayer depth={18}>
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 text-primary fill-primary" />
                        ))}
                      </div>
                      <Quote className="h-5 w-5 text-primary/35" />
                    </div>
                    <blockquote className="text-foreground/90 text-sm sm:text-base leading-relaxed font-normal mb-6">
                      “{testimonial.quote}”
                    </blockquote>
                  </DimensionalLayer>

                  <DimensionalLayer depth={26} className="pt-4 border-t border-white/[0.07] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.author}
                        className="h-10 w-10 rounded-full object-cover border border-primary/40"
                      />
                      <div>
                        <h4 className="text-foreground font-semibold text-sm">
                          {testimonial.author}
                        </h4>
                        <p className="text-muted-foreground text-xs">{testimonial.role}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10 text-[10px] font-mono">
                      {testimonial.project}
                    </Badge>
                  </DimensionalLayer>
                </DimensionalCard>
              </StaggerItem>
            ))}
          </div>
        </div>
      </section>

      {/* Final Screening Room CTA */}
      <section className="py-20 px-4 sm:px-8">
        <div className="container mx-auto max-w-[1400px]">
          <DimensionalCard
            maxTilt={4}
            className="p-8 sm:p-14 bg-gradient-to-br from-[#1A1C21] via-[#14161A] to-[#0F1013] border-primary/30 overflow-hidden relative"
          >
            <div className="pointer-events-none absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary/15 blur-[110px]" />
            <DimensionalLayer depth={22} className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <div className="noir-eyebrow mb-4">
                  <Film className="h-3.5 w-3.5" />
                  <span>READY TO ROLL CAMERA</span>
                </div>
                <h2 className="font-display text-3xl sm:text-5xl text-foreground leading-tight mb-4">
                  Assemble your crew and launch your{" "}
                  <span className="italic text-primary">next production.</span>
                </h2>
                <p className="text-base text-muted-foreground">
                  Join 50,000+ actors, directors, writers, cinematographers, and studios building cinema together.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="h-12 px-7 text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir"
                >
                  Create Studio Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/projects")}
                  className="h-12 px-7 text-sm border-white/15 bg-white/[0.04] hover:border-primary/45"
                >
                  Browse Active Slates
                </Button>
              </div>
            </DimensionalLayer>
          </DimensionalCard>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
};

export default Index;
