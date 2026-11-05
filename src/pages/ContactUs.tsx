import React, { useState, useEffect } from "react";
import { LandingTopbar } from "@/components/layout/landing-topbar";
import { LandingFooter } from "@/components/layout/landing-footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FadeInSection } from "@/components/ui/motion-primitives";

export default function ContactUs() {
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      if (data) setSettings(data);
    } catch (error) {
      console.error("Error fetching site settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast({
        variant: "destructive",
        title: "Required fields missing",
        description: "Please fill in your name, email, subject, and message.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("contact_submissions").insert({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      if (error) throw error;

      setFormData({ name: "", email: "", subject: "", message: "" });
      toast({
        title: "Message Sent!",
        description: "We've received your message and our studio concierge will get back to you shortly.",
      });
    } catch (error: any) {
      console.error("Error submitting contact inquiry:", error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error?.message || "Could not deliver your message. Your draft has been preserved—please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans overflow-x-hidden pt-16">
      <LandingTopbar />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 overflow-hidden noir-backdrop border-b border-border/70">
        <div className="container mx-auto px-6 relative z-10 text-center max-w-3xl">
          <FadeInSection variant="marketing">
            <div className="noir-eyebrow mb-5">
              <Mail className="h-3.5 w-3.5" />
              <span>Studio Concierge</span>
            </div>
            <h1 className="noir-heading-hero mb-4">
              Get in <span className="italic text-primary">Touch</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions about FilmCollab? We're here to help you navigate your filmmaking
              journey.
            </p>
          </FadeInSection>
        </div>
      </section>

      <section className="py-20 bg-background flex-grow">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
            {/* Contact Information */}
            <FadeInSection>
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-8">
                Contact Information
              </h2>

              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="space-y-7">
                  {settings?.contact_email && (
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl border border-primary/30 bg-primary/12 flex items-center justify-center flex-shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base mb-1">Email Us</h3>
                        <a
                          href={`mailto:${settings.contact_email}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {settings.contact_email}
                        </a>
                      </div>
                    </div>
                  )}

                  {settings?.contact_phone && (
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl border border-primary/30 bg-primary/12 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base mb-1">Call Us</h3>
                        <a
                          href={`tel:${settings.contact_phone}`}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors"
                        >
                          {settings.contact_phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {settings?.contact_address && (
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-xl border border-primary/30 bg-primary/12 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base mb-1">Location</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                          {settings.contact_address}
                        </p>
                        {settings?.contact_map_link && (
                          <a
                            href={settings.contact_map_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-medium text-xs mt-2 inline-block"
                          >
                            View on Map →
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t border-border/70">
                    <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider mb-4">
                      Follow Us
                    </h3>
                    <div className="flex gap-3">
                      {settings?.social_facebook && (
                        <a
                          href={settings.social_facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-surface-elevated border border-border/80 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {settings?.social_twitter && (
                        <a
                          href={settings.social_twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-surface-elevated border border-border/80 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Twitter className="w-4 h-4" />
                        </a>
                      )}
                      {settings?.social_instagram && (
                        <a
                          href={settings.social_instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-surface-elevated border border-border/80 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {settings?.social_linkedin && (
                        <a
                          href={settings.social_linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-surface-elevated border border-border/80 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Linkedin className="w-4 h-4" />
                        </a>
                      )}
                      {settings?.social_youtube && (
                        <a
                          href={settings.social_youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 bg-surface-elevated border border-border/80 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Youtube className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </FadeInSection>

            {/* Contact Form */}
            <FadeInSection delay={0.08}>
              <div className="bg-card p-8 rounded-2xl shadow-noir border border-border/80">
                <h2 className="text-2xl font-semibold text-foreground mb-6">Send us a message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                      Your Name
                    </label>
                    <Input
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                      Subject
                    </label>
                    <Input
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleChange}
                      placeholder="How can we help you?"
                      className="h-11"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                      Message
                    </label>
                    <Textarea
                      name="message"
                      required
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Write your message here..."
                      className="min-h-[150px] resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 text-sm font-semibold mt-4"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                        Sending...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Send Message
                      </div>
                    )}
                  </Button>
                </form>
              </div>
            </FadeInSection>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
