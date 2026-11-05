import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Film, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { FadeInSection } from "@/components/ui/motion-primitives";
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    try {
      const { error } = await resetPassword(data.email);
      if (error) {
        toast({
          variant: "destructive",
          title: "Reset Request Failed",
          description: error.message || "Failed to send reset email. Please try again.",
        });
      } else {
        setSubmittedEmail(data.email);
        toast({
          title: "Recovery Link Sent",
          description: "Check your email inbox for password recovery instructions.",
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
            <CardTitle className="text-2xl text-foreground">Forgot Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter your account email to receive a password recovery link
            </CardDescription>
          </CardHeader>

          <CardContent>
            {submittedEmail ? (
              <div className="text-center space-y-4 py-3">
                <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Check your email</p>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    We sent recovery instructions to <span className="text-foreground font-mono">{submittedEmail}</span>.
                  </p>
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="w-full border-border/80 hover:bg-surface-hover"
                    onClick={() => {
                      setSubmittedEmail(null);
                      form.reset();
                    }}
                  >
                    Send another link
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => navigate("/auth/signin")}
                  >
                    Return to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-foreground/90">Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="email"
                              placeholder="name@example.com"
                              className="pl-10"
                              {...field}
                            />
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
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
                    {loading ? "Sending Recovery Link..." : "Send Recovery Link"}
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

