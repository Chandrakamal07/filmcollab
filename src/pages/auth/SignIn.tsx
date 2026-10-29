import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Film, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FadeInSection } from "@/components/ui/motion-primitives";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignInFormData = z.infer<typeof signInSchema>;

export default function SignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { isAdmin } = useAuth();

  // Handle navigation based on role
  useEffect(() => {
    console.log("SignIn component - auth state changed:", { user: user?.id, authLoading });

    // If user is authenticated and not loading, navigate based on role
    if (user && !authLoading) {
      const from = location.state?.from?.pathname;
      console.log("SignIn component - user authenticated, checking admin status");
      if (isAdmin()) {
        console.log("User is admin, navigating to admin dashboard");
        navigate(from || "/admin-dashboard");
      } else {
        console.log("User is regular user, navigating to dashboard");
        navigate(from || "/dashboard");
      }
    }
  }, [user, authLoading, navigate, isAdmin, location.state?.from?.pathname]);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    setLoading(true);
    try {
      console.log("SignIn form submission for:", data.email);
      const { error } = await signIn(data.email, data.password);
      console.log("SignIn form result:", { error });

      if (!error) {
        console.log("SignIn successful, waiting for auth state change...");
      } else {
        console.error("SignIn failed:", error);
      }
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground noir-backdrop film-grain flex items-center justify-center p-6 relative">
      <FadeInSection className="w-full max-w-md relative z-10">
        {/* Back button */}
        <Button
          variant="ghost"
          className="mb-4 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
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
            <CardTitle className="text-2xl text-foreground">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground/90">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center space-y-4">
              <Button
                variant="link"
                className="text-sm text-muted-foreground hover:text-primary"
                onClick={() => navigate("/auth/forgot-password")}
              >
                Forgot your password?
              </Button>

              <div className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-primary hover:text-primary-hover font-medium"
                  onClick={() => navigate("/auth/signup")}
                >
                  Sign up
                </Button>
              </div>

              <div className="pt-3 border-t border-border/70">
                <Button
                  variant="link"
                  className="text-xs text-muted-foreground hover:text-primary"
                  onClick={() => navigate("/admin-signin")}
                >
                  Admin Sign In
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeInSection>
    </div>
  );
}
