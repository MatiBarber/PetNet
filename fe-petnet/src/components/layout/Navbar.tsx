import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Menu, User, X } from "lucide-react";
import { useUser } from "@/context/UserContext";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useUser();
  const isAuthenticated = !!user;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-card/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-xl font-bold gradient-primary bg-clip-text text-transparent">
              PetNet
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`font-medium transition-colors ${
                isActive("/") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Inicio
            </Link>
            <Link 
              to="/adopta" 
              className={`font-medium transition-colors ${
                isActive("/adopta") ? "text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              Adoptar
            </Link>
            {isAuthenticated ? (
              <Link 
                to="/dashboard" 
                className={`font-medium transition-colors ${
                  isActive("/dashboard") ? "text-primary" : "text-muted-foreground hover:text-primary"
                }`}
              >
                Mi Panel
              </Link>
            ) : null}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="avatar" className="w-6 h-6 rounded-full" />
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    {user?.nombre}
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout}>
                  Cerrar sesión
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm">
                  Iniciar Sesión
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-border py-4">
            <div className="flex flex-col space-y-4">
              <Link 
                to="/" 
                className={`font-medium transition-colors ${
                  isActive("/") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                Inicio
              </Link>
              <Link 
                to="/adopta" 
                className={`font-medium transition-colors ${
                  isActive("/adopta") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setIsOpen(false)}
              >
                Adoptar
              </Link>
              {isAuthenticated ? (
                <Link 
                  to="/dashboard" 
                  className={`font-medium transition-colors ${
                    isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  Mi Panel
                </Link>
              ) : null}
              <div className="pt-4 border-t border-border">
                {isAuthenticated ? (
                  <Button variant="outline" size="sm" className="w-full">
                    <User className="w-4 h-4 mr-2" />
                    Mi Perfil
                  </Button>
                ) : (
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="default" size="sm" className="w-full">
                      Iniciar Sesión
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;