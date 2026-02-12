import { useState, useEffect } from "react";
import PetFilters from "@/components/pets/PetFilters";
import PetCard from "@/components/pets/PetCard";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { publicationsAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface FilterState {
  types: string[];
  ages: string[];
  location: string;
}
type EstadoFiltro = "todos" | "disponible" | "adoptado";
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

const Adopta = () => {
  const { toast } = useToast();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    ages: [],
    location: ""
  });
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("disponible"); // NEW
  // Cargar publicaciones desde el backend
  useEffect(() => {
    const fetchPublications = async () => {
      try {
        setLoading(true);
        console.log('📡 Fetching available publications...');
        
        const response = await publicationsAPI.getAvailable();
        console.log('✅ Publications received:', response);
        
        if (response.publicaciones) {
          // Filtrar solo las disponibles
          const availablePubs = response.publicaciones.filter(
            (pub: Publication) => pub.estado === "disponible"
          );
          setPublications(availablePubs);
        }
      } catch (error: any) {
        console.error('❌ Error loading publications:', error);
        toast({
          title: "Error al cargar publicaciones",
          description: error.message || "No se pudieron cargar las mascotas disponibles",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPublications();
  }, [toast]);

  // Filtrar publicaciones localmente
  const filteredPublications = publications.filter(pub => {
    // Filtro por tipo de animal
    if (filters.types.length > 0 && !filters.types.includes(pub.mascota.tipo)) {
      return false;
    }
    
    // Filtro por tamaño (edad en el componente original, pero usaremos tamaño)
    if (filters.ages.length > 0 && !filters.ages.includes(pub.mascota.tamaño)) {
      return false;
    }
    
    // Filtro por ubicación (buscar en nombre del publicante si está disponible)
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
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Mascotas en Adopción
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Descubre a tu nuevo compañero entre cientos de mascotas que esperan un hogar lleno de amor
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
                </div>
                
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredPublications.map((pub) => (
                    <PetCard 
                      key={pub.id} 
                      publication={pub}
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
                    ? "No hay publicaciones disponibles en este momento"
                    : "Intenta ajustar tus filtros para ver más resultados"
                  }
                </p>
                {publications.length > 0 && (
                  <Button
                    onClick={() => setFilters({ types: [], ages: [], location: "" })}
                    variant="outline"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Adopta;