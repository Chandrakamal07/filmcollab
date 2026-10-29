import React, { useState, useEffect } from "react";
import { LandingTopbar } from "@/components/layout/landing-topbar";
import { LandingFooter } from "@/components/layout/landing-footer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { FadeInSection, StaggerItem } from "@/components/ui/motion-primitives";

export default function Pricing() {
  const navigate = useNavigate();
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("monthly_price");
      if (error && error.code !== "42P01") throw error;
      if (data) setAvailablePlans(data);
    } catch (error) {
      console.error("Error fetching plans:", error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans overflow-x-hidden pt-16">
      <LandingTopbar />

      <main className="flex-grow py-20 noir-backdrop">
        <div className="container mx-auto px-6 max-w-7xl">
          <FadeInSection variant="marketing" className="text-center max-w-3xl mx-auto mb-16">
            <div className="noir-eyebrow mb-5">
              <Crown className="h-3.5 w-3.5" />
              <span>Membership Plans</span>
            </div>
            <h1 className="noir-heading-hero mb-4">
              Simple, transparent <span className="italic text-primary">pricing</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Choose the perfect plan for your filmmaking needs.
            </p>

            <div className="inline-flex items-center p-1 bg-surface-elevated border border-border/80 rounded-xl">
              <Button
                variant={billingPeriod === "monthly" ? "default" : "ghost"}
                className={
                  billingPeriod === "monthly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }
                onClick={() => setBillingPeriod("monthly")}
              >
                Monthly
              </Button>
              <Button
                variant={billingPeriod === "yearly" ? "default" : "ghost"}
                className={
                  billingPeriod === "yearly"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }
                onClick={() => setBillingPeriod("yearly")}
              >
                Yearly (Save 20%)
              </Button>
            </div>
          </FadeInSection>

          <div className="flex flex-row overflow-x-auto gap-8 pb-8 lg:grid lg:grid-cols-3 lg:overflow-visible snap-x">
            {isLoadingPlans ? (
              <div className="col-span-3 text-center py-20">
                <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground">Loading plans...</p>
              </div>
            ) : (
              availablePlans.map((plan, idx) => {
                const IconComponent = plan.is_custom_price
                  ? Zap
                  : plan.popular
                    ? Crown
                    : Star;
                const price =
                  billingPeriod === "monthly"
                    ? plan.final_monthly_price || plan.monthly_price
                    : plan.final_yearly_price || plan.yearly_price;

                const originalPrice =
                  billingPeriod === "monthly" ? plan.monthly_price : plan.yearly_price;
                const hasDiscount = originalPrice && price && originalPrice > price;

                return (
                  <StaggerItem
                    key={plan.id}
                    index={idx}
                    liftOnHover
                    className="min-w-[300px] lg:min-w-0 flex-shrink-0 snap-center"
                  >
                    <Card
                      className={`relative h-full flex flex-col justify-between ${
                        plan.popular
                          ? "border-primary/60 bg-surface-elevated shadow-elegant z-10"
                          : "border-border/80 bg-card"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3.5 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-primary text-primary-foreground px-4 py-1 text-xs font-semibold shadow-sm">
                            Most Popular
                          </Badge>
                        </div>
                      )}
                      <CardHeader className="text-center pb-6 pt-8">
                        <div className="flex justify-center mb-4">
                          <div className="w-13 h-13 rounded-2xl border border-primary/30 bg-primary/12 flex items-center justify-center p-3.5">
                            <IconComponent className="w-6 h-6 text-primary" />
                          </div>
                        </div>
                        <CardTitle className="text-2xl mb-2 text-foreground">
                          {plan.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground">
                          {plan.description}
                        </CardDescription>
                        <div className="mt-6">
                          <div className="flex flex-col items-center justify-center gap-1">
                            {plan.is_custom_price ? (
                              <span className="font-display text-4xl font-semibold text-foreground">
                                Custom
                              </span>
                            ) : (
                              <>
                                {hasDiscount && (
                                  <span className="text-base text-muted-foreground line-through">
                                    ₹{originalPrice}
                                  </span>
                                )}
                                <div className="flex items-baseline gap-1">
                                  <span className="font-display text-4xl font-semibold text-foreground">
                                    ₹{price}
                                  </span>
                                  <span className="text-muted-foreground text-sm">
                                    /{billingPeriod === "monthly" ? "mo" : "yr"}
                                  </span>
                                </div>
                              </>
                            )}
                            {!plan.is_custom_price && (
                              <span className="text-xs text-muted-foreground">
                                Billed {billingPeriod}
                              </span>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between">
                        <ul className="space-y-3.5 mb-8">
                          {plan.features?.map((feature: string, index: number) => (
                            <li key={index} className="flex items-start gap-3">
                              <Check className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                              <span className="text-sm text-foreground/90">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant={plan.popular ? "default" : "outline"}
                          className="w-full h-11 text-sm font-semibold"
                          onClick={() => navigate("/auth/signup")}
                        >
                          {plan.is_custom_price
                            ? "Contact Sales"
                            : `Get Started with ${plan.name}`}
                        </Button>
                      </CardContent>
                    </Card>
                  </StaggerItem>
                );
              })
            )}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
