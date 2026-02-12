import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Heart } from "lucide-react";

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

interface PetCardProps {
  publication: Publication;
}

const PetCard = ({ publication }: PetCardProps) => {
  if (!publication) {
    console.error('PetCard: publication is undefined');
    return null;
  }

  const { id, foto, estado, mascota, publicante } = publication;

  return (
    <Card className="card-pet overflow-hidden hover:shadow-lg transition-shadow">
      {/* Imagen */}
      <div className="aspect-square overflow-hidden bg-muted">
        <Link to={`/post/${id}`}>
          <img
            src={foto || '/placeholder-pet.jpg'}
            alt={mascota.nombre}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/placeholder-pet.jpg';
            }}
          />
        </Link>
      </div>

      <CardContent className="p-4">
        {/* Nombre y Estado */}
        <div className="flex items-start justify-between mb-2">
          <Link to={`/post/${id}`}>
            <h3 className="font-semibold text-lg hover:text-primary transition-colors">
              {mascota.nombre}
            </h3>
          </Link>
          <Badge 
            variant={estado === "disponible" ? "default" : "secondary"}
            className="text-xs"
          >
            {estado === "disponible" ? "Disponible" : "Adoptado"}
          </Badge>
        </div>

        {/* Información básica */}
        <div className="space-y-2 mb-4">
          <p className="text-sm text-muted-foreground">
            {mascota.tipo} • {mascota.sexo} • {mascota.tamaño}
          </p>
          
          {/* Descripción */}
          <p className="text-sm text-muted-foreground line-clamp-2">
            {mascota.descripcion}
          </p>

          {/* Publicante */}
          {publicante && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <Link 
                to={`/user/${publicante.id}`}
                className="hover:text-primary transition-colors hover:underline"
              >
                {publicante.nombre} {publicante.apellido}
              </Link>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button asChild className="flex-1" size="sm">
            <Link to={`/post/${id}`}>
              Ver detalle
            </Link>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="px-3"
            onClick={(e) => {
              e.preventDefault();
              // TODO: Implementar favoritos
              console.log('Add to favorites:', id);
            }}
          >
            <Heart className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PetCard;