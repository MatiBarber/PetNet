import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <Heart className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
        <p className="text-xl text-muted-foreground mb-6">
          ¡Oops! Esta página no existe
        </p>
        <p className="text-muted-foreground mb-8">
          Parece que te has perdido. No te preocupes, te ayudamos a volver al camino.
        </p>
        <a href="/">
          <Button size="lg">
            Volver al Inicio
          </Button>
        </a>
      </div>
    </div>
  );
};

export default NotFound;
