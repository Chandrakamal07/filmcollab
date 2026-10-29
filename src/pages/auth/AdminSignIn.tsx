import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, ArrowLeft, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FadeInSection } from "@/components/ui/motion-primitives";

const adminSignInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type AdminSignInFormData = z.infer<typeof adminSignInSchema>;

export default function AdminSignIn() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user, userRole, loading: authLoading, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Handle role-based redirect after successful sign in
  useEffect(() => {
    if (user && !authLoading && userRole) {
      console.log("Admin signin - checking role:", userRole);
      if (isAdmin()) {
        console.log("Redirecting to admin dashboard");
        navigate("/admin-dashboard");
      } else {
        console.log("Not admin, redirecting to user dashboard");
        navigate("/dashboard");
      }
    }
  }, [user, authLoading, userRole, navigate, isAdmin]);

  const form = useForm<AdminSignInFormData>({
    resolver: zodResolver(adminSignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: AdminSignInFormData) => {
    setLoading(true);
    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        console.error("Admin sign in error:", error);
      } else {
        console.log("Sign in successful, checking admin role...");
      }
    } catch (error) {
      console.error("Admin sign in error:", error);
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
                <Shield className="h-5 w-5" />
              </div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                Admin Portal
              </h1>
            </div>
            <CardTitle className="text-2xl text-foreground">Administrator Sign In</CardTitle>
            <CardDescription className="text-muted-foreground">
              Access the admin dashboard
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
                      <FormLabel className="text-foreground/90">Admin Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="admin@gmail.com" {...field} />
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
                            placeholder="Enter admin password"
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

                <Button type="submit" className="w-full h-11 font-semibold" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In as Admin"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center space-y-4">
              <div className="text-sm text-muted-foreground">
                Use demo credentials or{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto text-primary hover:text-primary-hover font-medium"
                  onClick={() => navigate("/admin-signup")}
                >
                  create admin account
                </Button>
              </div>

              <div className="text-xs text-muted-foreground bg-surface-elevated p-3 rounded-lg border border-border/80">
                <Shield className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
                Admin accounts must be created with admin role in database
              </div>
            </div>
          </CardContent>
        </Card>
      </FadeInSection>
    </div>
  );
}
