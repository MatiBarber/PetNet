import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  ChevronLeft, 
  Heart, 
  Share2, 
  Calendar,
  User,
  Mail,
  Edit,
  Loader2,
  MapPin,
  Phone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/context/UserContext";
import { publicationsAPI, requestsAPI } from "@/services/api";

interface Publication {
  id: number;
  foto: string;
  estado: string;
  createdAt?: string;
  mascota: {
    id: number;
    nombre: string;
    tipo: string;
    sexo: string;
    tamaño: string;
    descripcion: string;
  };
  publicante: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    telefono?: string;
    provincia?: string;
    localidad?: string;
  };
}

// Componente de diálogo para solicitud de adopción
const AdoptionRequestDialog = ({ 
  publication, 
  open, 
  onOpenChange 
}: { 
  publication: Publication;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { toast } = useToast();
  const [mensaje, setMensaje] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mensaje.trim()) {
      toast({
        title: "Mensaje requerido",
        description: "Por favor escribe un mensaje explicando por qué quieres adoptar",
        variant: "destructive",
      });
      return;
    }

    if (mensaje.length > 500) {
      toast({
        title: "Mensaje muy largo",
        description: "El mensaje no puede tener más de 500 caracteres",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      console.log('📤 Enviando solicitud de adopción...', {
        publicacionId: publication.id,
        mensaje,
      });

      await requestsAPI.create({
        publicacionId: publication.id,
        mensaje: mensaje.trim(),
      });

      toast({
        title: "¡Solicitud enviada!",
        description: `Tu solicitud para adoptar a ${publication.mascota.nombre} ha sido enviada exitosamente.`,
      });

      // Limpiar y cerrar
      setMensaje("");
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Error al enviar solicitud:', error);
      toast({
        title: "Error al enviar solicitud",
        description: error.message || "No se pudo enviar la solicitud. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Solicitar Adopción de {publication.mascota.nombre}</DialogTitle>
          <DialogDescription>
            Envía un mensaje al publicante explicando por qué te gustaría adoptar esta mascota
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mensaje">Tu mensaje</Label>
            <Textarea
              id="mensaje"
              placeholder="Ejemplo: Hola, me encantaría adoptar a Luna. Tengo experiencia con perros y un jardín grande donde puede jugar..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={5}
              disabled={isLoading}
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground">
              {mensaje.length}/500 caracteres
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !mensaje.trim()}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Solicitud"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useUser();
  
  const [publication, setPublication] = useState<Publication | null>(null);
  const [loading, setLoading] = useState(true);
  const [adoptionDialogOpen, setAdoptionDialogOpen] = useState(false);

  const isAuthenticated = !!user;
  const isOwner = user && publication && publication.publicante.id === user.id;

  // Cargar publicación desde el backend
  useEffect(() => {
    const fetchPublication = async () => {
      if (!id) {
        navigate('/adopta');
        return;
      }

      try {
        setLoading(true);
        console.log('📡 Fetching publication:', id);
        const response = await publicationsAPI.getById(id);
        console.log('✅ Publication received:', response);
        
        if (response.publicacion) {
          setPublication(response.publicacion);
        } else {
          throw new Error('Publicación no encontrada');
        }
      } catch (error: any) {
        console.error('❌ Error loading publication:', error);
        toast({
          title: "Error",
          description: error.message || "No se pudo cargar la publicación",
          variant: "destructive",
        });
        navigate('/adopta');
      } finally {
        setLoading(false);
      }
    };

    fetchPublication();
  }, [id, navigate, toast]);

  const handleEditPost = () => {
    navigate("/dashboard");
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Estado de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando publicación...</p>
        </div>
      </div>
    );
  }

  // Publicación no encontrada
  if (!publication) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Publicación no encontrada</h1>
          <Link to="/adopta">
            <Button variant="outline">Ver otras mascotas</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Back Button */}
        <Link 
          to="/adopta" 
          className="inline-flex items-center text-muted-foreground hover:text-primary mb-8 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Volver a la búsqueda
        </Link>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
              <img
                src={publication.foto || '/placeholder-pet.jpg'}
                alt={publication.mascota.nombre}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/placeholder-pet.jpg';
                }}
              />
            </div>
          </div>

          {/* Pet Information */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">
                    {publication.mascota.nombre}
                  </h1>
                  {publication.publicante.localidad && publication.publicante.provincia && (
                    <div className="flex items-center text-muted-foreground mb-4">
                      <MapPin className="w-4 h-4 mr-2" />
                      <span>{publication.publicante.localidad}, {publication.publicante.provincia}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="icon">
                    <Heart className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Status and Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                <Badge 
                  variant={publication.estado === "disponible" ? "default" : "secondary"}
                  className="text-sm"
                >
                  {publication.estado === "disponible" ? "Disponible" : "Adoptado"}
                </Badge>
                <Badge variant="outline">{publication.mascota.tipo}</Badge>
                <Badge variant="outline">{publication.mascota.sexo}</Badge>
                <Badge variant="outline">{publication.mascota.tamaño}</Badge>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-3">Sobre {publication.mascota.nombre}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {publication.mascota.descripcion}
                </p>
              </CardContent>
            </Card>

            {/* Owner Information */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Información del publicante</h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-3 text-muted-foreground flex-shrink-0" />
                    <Link 
                      to={`/user/${publication.publicante.id}`}
                      className="text-primary hover:text-primary-hover font-medium transition-colors hover:underline"
                    >
                      {publication.publicante.nombre} {publication.publicante.apellido}
                    </Link>
                  </div>
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-3 text-muted-foreground flex-shrink-0" />
                    <a 
                      href={`mailto:${publication.publicante.email}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {publication.publicante.email}
                    </a>
                  </div>
                  {publication.publicante.telefono && (
                    <div className="flex items-center">
                      <Phone className="w-4 h-4 mr-3 text-muted-foreground flex-shrink-0" />
                      <a 
                        href={`tel:${publication.publicante.telefono}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {publication.publicante.telefono}
                      </a>
                    </div>
                  )}
                  {publication.createdAt && (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Publicado el {formatDate(publication.createdAt)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Adoption/Edit Button */}
            {publication.estado === "disponible" && (
              <>
                {isOwner ? (
                  <Card className="gradient-primary border-0">
                    <CardContent className="p-6 text-center">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Esta es tu publicación
                      </h3>
                      <p className="text-white/90 mb-4">
                        Puedes editar o gestionar tu publicación desde el panel
                      </p>
                      <Button 
                        onClick={handleEditPost}
                        size="lg"
                        variant="secondary"
                        className="w-full"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Ir al Panel
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="gradient-primary border-0">
                    <CardContent className="p-6 text-center">
                      <h3 className="text-lg font-semibold text-white mb-2">
                        ¿Te interesa adoptar a {publication.mascota.nombre}?
                      </h3>
                      <p className="text-white/90 mb-4">
                        Envía tu solicitud y el publicante se pondrá en contacto contigo
                      </p>
                      {isAuthenticated ? (
                        <Button 
                          onClick={() => setAdoptionDialogOpen(true)}
                          size="lg"
                          variant="secondary"
                          className="w-full"
                        >
                          Solicitar Adopción
                        </Button>
                      ) : (
                        <Link to="/auth">
                          <Button size="lg" variant="secondary" className="w-full">
                            Iniciar Sesión para Adoptar
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            )}
            
            {publication.estado === "adoptado" && (
              <Card className="border-muted">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">
                    {publication.mascota.nombre} ya fue adoptado
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Esta mascota ya tiene un hogar feliz
                  </p>
                  <Link to="/adopta">
                    <Button variant="outline" className="w-full">
                      Ver otras mascotas disponibles
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Dialog de solicitud de adopción */}
      <AdoptionRequestDialog
        publication={publication}
        open={adoptionDialogOpen}
        onOpenChange={setAdoptionDialogOpen}
      />
    </div>
  );
};

export default PostDetail;