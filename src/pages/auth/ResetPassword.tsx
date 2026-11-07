import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Film, Eye, EyeOff, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FadeInSection } from "@/components/ui/motion-primitives";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has an active session from recovery link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasValidSession(true);
      } else {
        // Also listen for auth state change event PASSWORD_RECOVERY
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "PASSWORD_RECOVERY" || session) {
            setHasValidSession(true);
          }
        });
        // Check hash fragments in case access_token is in URL
        const hash = window.location.hash;
        if (hash.includes("type=recovery") || hash.includes("access_token")) {
          setHasValidSession(true);
        } else {
          // Give 1 second for auth exchange
          setTimeout(async () => {
            const { data: { session: s } } = await supabase.auth.getSession();
            setHasValidSession(!!s);
          }, 1000);
        }
        return () => subscription.unsubscribe();
      }
    };
    checkSession();
  }, []);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Password Update Failed",
          description: error.message || "Failed to update password. Link may have expired.",
        });
      } else {
        setIsSuccess(true);
        toast({
          title: "Password Updated",
          description: "Your password has been changed successfully. You can now sign in.",
        });
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err?.message || "An unexpected error occurred.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground noir-backdrop film-grain flex items-center justify-center p-6 relative">
      <FadeInSection className="w-full max-w-md relative z-10">
        <Button
          variant="ghost"
          className="mb-4 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/auth/signin")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Sign In
        </Button>

        <Card className="shadow-noir-lg border-border/80 bg-card/95 backdrop-blur-md">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center gap-2.5 mb-4">
              <div className="h-10 w-10 rounded-xl border border-primary/40 bg-primary/15 text-primary flex items-center justify-center">
                <Film className="h-5 w-5" />
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                FilmCollab
              </h1>
            </div>
            <CardTitle className="text-2xl text-foreground">Set New Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Choose a strong, secure password for your account
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSuccess ? (
              <div className="text-center space-y-4 py-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Password Changed</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    Your password has been updated. You can now access your studio dashboard.
                  </p>
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir mt-2"
                  onClick={() => navigate("/auth/signin")}
                >
                  Sign In to Continue
                </Button>
              </div>
            ) : hasValidSession === false ? (
              <div className="text-center space-y-4 py-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Invalid or Expired Link</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    This password reset link is invalid or has expired. Please request a new recovery link.
                  </p>
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir mt-2"
                  onClick={() => navigate("/auth/forgot-password")}
                >
                  Request New Reset Link
                </Button>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/90">New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Minimum 6 characters"
                              className="pr-10"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/90">Confirm New Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showConfirm ? "text" : "password"}
                              placeholder="Re-enter your new password"
                              className="pr-10"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                              onClick={() => setShowConfirm(!showConfirm)}
                            >
                              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary-hover shadow-noir transition-all"
                    disabled={loading}
                  >
                    {loading ? "Updating Password..." : "Update Password"}
                  </Button>

                  <div className="text-center pt-2">
                    <span className="text-xs text-muted-foreground">
                      Remember your password?{" "}
                      <Link to="/auth/signin" className="text-primary hover:underline font-medium">
                        Sign in
                      </Link>
                    </span>
                  </div>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </FadeInSection>
    </div>
  );
}

