import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { useAuth } from "@/hooks/use-auth";
import { useCastingCalls } from "@/hooks/use-casting-calls";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, Briefcase, IndianRupee, Users, Mail, Phone, FileText, CheckCircle2, ExternalLink } from "lucide-react";
import { ApplicantManager } from "./components/ApplicantManager";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function CastingCallDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { castingCalls, markInterested, withdrawInterest, getUserApplicationStatus } = useCastingCalls();
  
  const call = castingCalls.find(c => c.id === id);
  const appStatus = getUserApplicationStatus(id || "");
  const isOwner = user && call?.creatorId === user.id;

  if (!call) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="text-2xl font-bold mb-2">Casting Call Not Found</h2>
        <p className="text-muted-foreground mb-6">The casting call you're looking for doesn't exist or has been removed.</p>
        <Button onClick={() => navigate("/casting-calls")}>Back to Casting Calls</Button>
      </div>
    );
  }

  const handleInterested = () => {
    if (!user) {
      toast.error("Please sign in to apply for casting calls.");
      navigate("/auth/signin");
      return;
    }
    markInterested(call.id);
    toast.success("You have successfully expressed your interest.");
  };

  const handleWithdraw = () => {
    withdrawInterest(call.id);
    toast.info("You have withdrawn your interest.");
  };

  const renderActionSection = () => {
    if (isOwner) {
      return (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between mt-4">
          <div>
            <h3 className="font-bold text-primary">You are the creator</h3>
            <p className="text-xs text-muted-foreground">Manage your applicants below.</p>
          </div>
          <Button variant="outline" size="sm">Edit Call</Button>
        </div>
      );
    }

    if (appStatus === "Interested") {
      return (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-bold text-foreground text-sm">Interest Submitted</h3>
              <p className="text-xs text-muted-foreground">Under review.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={handleWithdraw}>
            Withdraw
          </Button>
        </div>
      );
    }

    if (appStatus === "Confirmed") {
      return (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3 mt-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="font-bold text-emerald-400 text-sm">Application Confirmed!</h3>
            <p className="text-xs text-muted-foreground">You have been selected.</p>
          </div>
        </div>
      );
    }

    if (appStatus === "Rejected") {
      return (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mt-4">
          <h3 className="font-bold text-destructive text-sm">Not Selected</h3>
          <p className="text-xs text-muted-foreground">Your profile wasn't a match this time.</p>
        </div>
      );
    }

    if (call.status === "Closed" || call.status === "Applications Full") {
      return (
        <div className="bg-surface-elevated border border-border/80 rounded-xl p-4 mt-4">
          <h3 className="font-bold text-foreground text-sm">Applications Closed</h3>
          <p className="text-xs text-muted-foreground">Not accepting new applicants.</p>
        </div>
      );
    }

    return (
      <div className="mt-6 border-t border-border/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">Ensure your profile is up to date before expressing interest.</p>
        <Button size="lg" className="w-full sm:w-auto text-base font-bold px-8 h-12 ml-auto bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm" onClick={handleInterested}>
          I'm Interested
        </Button>
      </div>
    );
  };

  return (
    <AppLayout pageTitle={call.title}>
      <div className="bg-background">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 pb-20">
          <Link to="/casting-calls" className="inline-flex items-center text-muted-foreground hover:text-primary mb-6 font-medium text-sm transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Casting Calls
          </Link>

          {/* Top Section (Basic Info & Image) */}
          <div className="bg-card text-card-foreground rounded-xl shadow-noir border border-border/80 p-6 md:p-8 flex flex-col md:flex-row gap-8 mb-8">
            {/* Left Column (Poster) */}
            <div className="w-full md:w-1/3 xl:w-1/4 shrink-0">
              <Dialog>
                <DialogTrigger asChild>
                  <div className="aspect-[4/5] rounded-xl overflow-hidden bg-surface-elevated border border-border/80 shadow-md cursor-zoom-in hover:opacity-90 transition-opacity">
                    <img src={call.poster} alt={call.title} className="w-full h-full object-cover" />
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none">
                  <img src={call.poster} alt={call.title} className="w-full h-auto max-h-[85vh] object-contain rounded-md" />
                </DialogContent>
              </Dialog>
            </div>

            {/* Right Column (Basic Details) */}
            <div className="w-full md:w-2/3 xl:w-3/4 flex flex-col">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/25">{call.category}</Badge>
                {call.status !== "Open" && <Badge variant="outline">{call.status}</Badge>}
              </div>
              
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight leading-tight mb-2">
                {call.title}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground font-medium mb-1">
                {call.projectName} <span className="mx-2 text-muted-foreground/60">•</span> {call.productionHouse}
              </p>
              <p className="text-sm text-muted-foreground mb-8">
                Posted by <span className="font-medium text-muted-foreground">{call.contactPerson || call.castingDirector}</span>
              </p>

              {/* Quick Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-4 rounded-xl bg-surface-elevated/60 border border-border/80 mb-2">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Role</p>
                  <p className="font-bold text-foreground">{call.roleName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Location</p>
                  <p className="font-bold text-foreground">{call.location}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Compensation</p>
                  <p className="font-bold text-foreground">{call.compensation}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Vacancies</p>
                  <p className="font-bold text-foreground">{call.vacancies}</p>
                </div>
              </div>

              {/* Action Buttons / Status */}
              <div className="mt-auto">
                {renderActionSection()}
              </div>
            </div>
          </div>

          {/* Bottom Section (Main Content) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-card text-card-foreground rounded-xl shadow-noir border border-border/80 p-6 md:p-8">
                {/* About & Requirements */}
                <div className="space-y-8">
                  <section>
                    <h2 className="text-xl font-bold text-foreground mb-3">About the Project</h2>
                    <p className="text-muted-foreground leading-relaxed">{call.projectDescription}</p>
                  </section>
                  
                  <section>
                    <h2 className="text-xl font-bold text-foreground mb-3">Role Description</h2>
                    <p className="text-muted-foreground leading-relaxed">{call.roleDescription}</p>
                  </section>

                  <section>
                    <h2 className="text-xl font-bold text-foreground mb-3">Requirements</h2>
                    <ul className="space-y-2">
                      {call.requirements.map((req, i) => (
                        <li key={i} className="flex gap-3 text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span className="leading-relaxed">{req}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  {call.whatToBring && call.whatToBring.length > 0 && (
                    <section>
                      <h2 className="text-xl font-bold text-foreground mb-3">What to Bring</h2>
                      <ul className="space-y-2">
                        {call.whatToBring.map((item, i) => (
                          <li key={i} className="flex gap-3 text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            <span className="leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>

                {/* Specs & Info */}
                <div className="space-y-8">
                  <section className="bg-surface-elevated/60 rounded-xl p-6 border border-border/80">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5 text-muted-foreground" /> Casting Profile
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between pb-2 border-b border-border">
                        <span className="text-muted-foreground">Gender</span>
                        <span className="font-medium text-foreground">{call.gender}</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-border">
                        <span className="text-muted-foreground">Age Range</span>
                        <span className="font-medium text-foreground">{call.ageRange[0]} - {call.ageRange[1]} years</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-border">
                        <span className="text-muted-foreground">Experience</span>
                        <span className="font-medium text-foreground">{call.experience}</span>
                      </div>
                      <div className="flex justify-between pb-2 border-b border-border">
                        <span className="text-muted-foreground">Languages</span>
                        <span className="font-medium text-foreground text-right">{call.languages.join(", ")}</span>
                      </div>
                      {call.height && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Height</span>
                          <span className="font-medium text-foreground">{call.height}</span>
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="bg-surface-elevated/60 rounded-xl p-6 border border-border/80">
                    <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-muted-foreground" /> Schedule
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Audition Dates</p>
                        <p className="font-medium text-foreground">{call.auditionDates}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Shoot Dates</p>
                        <p className="font-medium text-foreground">{call.shootDates}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Audition Venue</p>
                        <p className="font-medium text-foreground">{call.auditionVenue}</p>
                        {call.googleMapsLink && (
                          <a href={call.googleMapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1">
                            <MapPin className="w-3 h-3" /> View on Maps <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="bg-surface-elevated/60 rounded-xl p-6 border border-border/80">
                    <h3 className="font-bold text-foreground mb-4">Contact Info</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/25">
                          <Users className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Casting Director</p>
                          <p className="font-medium">{call.castingDirector}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/25">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="font-medium">{call.email}</p>
                        </div>
                      </div>
                      {call.phone && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/25">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <p className="font-medium">{call.phone}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {call.attachments && call.attachments.length > 0 && (
                    <section>
                      <h3 className="font-bold text-foreground mb-3">Attachments</h3>
                      <div className="space-y-2">
                        {call.attachments.map((file, idx) => (
                          <a key={idx} href={file.url} className="flex items-center justify-between p-3 border border-border/80 bg-surface-elevated/50 rounded-xl hover:border-primary/40 hover:bg-surface-hover transition-colors">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">{file.name}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{file.size}</span>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>

          {/* Applicant Manager Data */}
          {isOwner && (
            <div className="mt-8">
              <ApplicantManager castingCallId={call.id} />
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
