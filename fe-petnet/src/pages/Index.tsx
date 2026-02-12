// En Index.tsx - REEMPLAZAR todo el contenido
import { useState, useEffect } from "react";
import HeroCarousel from "@/components/home/HeroCarousel";
import PetFilters from "@/components/pets/PetFilters";
import PetCard from "@/components/pets/PetCard";
import { Button } from "@/components/ui/button";
import { Heart, Users, Home, Loader2 } from "lucide-react";
import { publicationsAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface FilterState {
  types: string[];
  ages: string[];
  location: string;
}

interface Publication {
  id: number;
  foto: string;
  estado: string;
  mascota: {
    id: number;
    nombre: string;
    tipo: string;
    sexo: string;
    tamaño: string;
    descripcion: string;
  };
  publicante?: {
    id: number;
    nombre: string;
    apellido: string;
  };
}

const Index = () => {
  const { toast } = useToast();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    ages: [],
    location: ""
  });

  // Cargar publicaciones desde el backend
  useEffect(() => {
    const fetchPublications = async () => {
      try {
        setLoading(true);
        console.log('📡 Fetching available publications for homepage...');
        
        const response = await publicationsAPI.getAvailable();
        console.log('✅ Homepage publications received:', response);
        
        if (response.publicaciones) {
          // Tomar solo las primeras 6 publicaciones disponibles para la homepage
          const availablePubs = response.publicaciones
            .filter((pub: Publication) => pub.estado === "disponible")
            .slice(0, 6);
          setPublications(availablePubs);
        }
      } catch (error: any) {
        console.error('❌ Error loading homepage publications:', error);
        toast({
          title: "Error al cargar mascotas",
          description: "No se pudieron cargar las mascotas destacadas",
          variant: "destructive",
        });
        setPublications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPublications();
  }, [toast]);

  // Filtrar publicaciones localmente
  const filteredPublications = publications.filter(pub => {
    if (filters.types.length > 0 && !filters.types.includes(pub.mascota.tipo)) {
      return false;
    }
    
    if (filters.ages.length > 0 && !filters.ages.includes(pub.mascota.tamaño)) {
      return false;
    }
    
    if (filters.location) {
      const searchTerm = filters.location.toLowerCase();
      const publicanteName = pub.publicante 
        ? `${pub.publicante.nombre} ${pub.publicante.apellido}`.toLowerCase()
        : '';
      
      if (!pub.mascota.nombre.toLowerCase().includes(searchTerm) &&
          !pub.mascota.descripcion.toLowerCase().includes(searchTerm) &&
          !publicanteName.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div className="min-h-screen">
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Welcome Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Encuentra tu mejor amigo
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            En PetNet conectamos corazones. Cada mascota tiene una historia única y busca 
            una familia que le brinde amor incondicional. ¿Estás listo para cambiar una vida?
          </p>
          
          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-primary-foreground" fill="currentColor" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">1,500+</h3>
              <p className="text-muted-foreground">Mascotas adoptadas</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-secondary-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">800+</h3>
              <p className="text-muted-foreground">Familias felices</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                <Home className="w-8 h-8 text-accent-foreground" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">200+</h3>
              <p className="text-muted-foreground">Refugios asociados</p>
            </div>
          </div>
        </div>
      </section>

      {/* Adoption Section */}
      <section className="py-20" id="adopcion">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
              Mascotas Destacadas
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Conoce a algunos de nuestros compañeros que buscan un hogar
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Filters Sidebar */}
            <div className="lg:col-span-1">
              <PetFilters onFiltersChange={setFilters} />
            </div>

            {/* Pets Grid */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Cargando mascotas...</p>
                </div>
              ) : filteredPublications.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-muted-foreground">
                      {filteredPublications.length} mascota{filteredPublications.length !== 1 ? 's' : ''} disponible{filteredPublications.length !== 1 ? 's' : ''}
                    </p>
                    <Button asChild variant="outline">
                      <a href="/adopta">Ver todas las mascotas</a>
                    </Button>
                  </div>
                  
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredPublications.map((publication) => (
                      <PetCard 
                        key={publication.id} 
                        publication={publication}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <Heart className="w-12 h-12 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No se encontraron mascotas</h3>
                  <p className="text-muted-foreground mb-6">
                    {publications.length === 0 
                      ? "No hay mascotas disponibles en este momento"
                      : "Intenta ajustar tus filtros para ver más resultados"
                    }
                  </p>
                  <div className="flex gap-4 justify-center">
                    {publications.length > 0 && (
                      <Button
                        onClick={() => setFilters({ types: [], ages: [], location: "" })}
                        variant="outline"
                      >
                        Limpiar filtros
                      </Button>
                    )}
                    <Button asChild>
                      <a href="/adopta">Ver todas las mascotas</a>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;