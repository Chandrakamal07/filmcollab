import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Film, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeInSection } from "@/components/ui/motion-primitives";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground noir-backdrop film-grain p-6">
      <FadeInSection className="text-center max-w-md rounded-2xl border border-border/80 bg-card p-10 shadow-noir-lg">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/35 bg-primary/12 text-primary">
          <Film className="h-7 w-7" />
        </div>
        <h1 className="mb-2 font-display text-6xl font-semibold text-primary">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">Oops! Page not found</p>
        <Button asChild className="h-10 px-6">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Home
          </Link>
        </Button>
      </FadeInSection>
    </div>
  );
};

export default NotFound;
