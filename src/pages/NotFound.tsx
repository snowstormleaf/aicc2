import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4">
      <div className="section-frame w-full max-w-xl text-center">
        <p className="type-caption">404</p>
        <h1 className="type-headline mt-2">Page not found</h1>
        <p className="type-deck mx-auto mt-3 content-measure">
          The route <span className="type-mono">{location.pathname}</span> does not exist in this workspace.
        </p>
        <div className="mt-6">
          <Button asChild>
            <Link to="/">Return to Analysis Workflow</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
