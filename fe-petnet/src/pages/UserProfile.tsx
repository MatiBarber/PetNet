import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Heart, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { usersAPI, publicationsAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  provincia: string;
  localidad: string;
  createdAt?: string;
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

const UserProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<UserData | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPublications, setLoadingPublications] = useState(true);

  // Cargar datos del usuario
  useEffect(() => {
  // En UserProfile.tsx - REEMPLAZAR la función fetchUserData:
  const fetchUserData = async () => {
    if (!id) {
      toast({
        title: "Error",
        description: "ID de usuario no proporcionado",
        variant: "destructive",
      });
      navigate('/adopta');
      return;
    }

    try {
      setLoading(true);
      console.log('📡 Fetching user profile for ID:', id);
      
      // VERIFICAR cómo está estructurada la respuesta real
      const response = await usersAPI.getById(id);
      console.log('✅ User data received:', response);
      
      // La estructura puede variar - verificar qué devuelve realmente
      if (response.success && response.data) {
        setUser(response.data);
      } else if (response.usuario) {
        // Si la respuesta viene directamente en response.usuario
        setUser(response.usuario);
      } else if (response.nombre) {
        // Si la respuesta es el usuario directamente
        setUser(response);
      } else {
        throw new Error('Estructura de usuario no reconocida');
      }
    } catch (error: any) {
      console.error('❌ Error loading user:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cargar el perfil del usuario",
        variant: "destructive",
      });
      navigate('/adopta');
    } finally {
      setLoading(false);
    }
  };

    fetchUserData();
  }, [id, navigate, toast]);

  // Cargar publicaciones del usuario
  useEffect(() => {
    const fetchUserPublications = async () => {
      if (!id) return;

    try {
      setLoadingPublications(true);
      console.log('📡 Fetching publications for user:', id);

      // Opción A (recomendada): pedirlo filtrado al backend
      // const resp = await publicationsAPI.getByUser(id, { estado: 'disponible' });

      // Opción B (rápida): traer todo y filtrar acá
      const resp = await publicationsAPI.getAll();

      const pubs = resp?.publicaciones ?? resp?.data?.publicaciones ?? [];
      const uid = Number(id);

      // Detectar el dueño en múltiples formas (usuarioId | usuario.id | publicante.id)
      const userPubs = pubs.filter((p) => {
        const ownerId = p?.usuarioId ?? p?.usuario?.id ?? p?.publicante?.id;
        const estado  = (p?.estado ?? '').toLowerCase();
        return ownerId === uid && estado === 'disponible';
      });

      setPublications(userPubs);
      console.log('📊 Filtered publications:', userPubs);
    } catch (error) {
      console.error('❌ Error loading publications:', error);
      setPublications([]);
    } finally {
      setLoadingPublications(false);
    }
  };

  fetchUserPublications();
}, [id]);

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
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Usuario no encontrado
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Usuario no encontrado</h2>
          <Button onClick={() => navigate('/adopta')} variant="outline">
            Volver a la búsqueda
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Botón de volver */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>

        {/* Encabezado del perfil */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src="" alt={`${user.nombre} ${user.apellido}`} />
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {user.nombre.charAt(0)}{user.apellido.charAt(0)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <CardTitle className="text-2xl mb-4">
                  {user.nombre} {user.apellido}
                </CardTitle>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{user.localidad}, {user.provincia}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="break-all">{user.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{user.telefono || 'No disponible'}</span>
                  </div>
                  
                  {user.createdAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>Miembro desde {formatDate(user.createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Sección de publicaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Publicaciones de {user.nombre}
              {!loadingPublications && (
                <Badge variant="secondary" className="ml-2">
                  {publications.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {loadingPublications ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Cargando publicaciones...</p>
              </div>
            ) : publications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publications.map((pub) => (
                  <Card key={pub.id} className="card-pet overflow-hidden">
                    <div className="aspect-square overflow-hidden bg-muted">
                      <img
                        src={pub.foto || '/placeholder-pet.jpg'}
                        alt={pub.mascota.nombre}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-pet.jpg';
                        }}
                      />
                    </div>
                    
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{pub.mascota.nombre}</h3>
                        <Badge 
                          variant={pub.estado === "disponible" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {pub.estado === "disponible" ? "Disponible" : "Adoptado"}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-2">
                        {pub.mascota.tipo} • {pub.mascota.sexo} • {pub.mascota.tamaño}
                      </p>
                      
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {pub.mascota.descripcion}
                      </p>
                      
                      <Button asChild className="w-full" size="sm">
                        <Link to={`/post/${pub.id}`}>
                          Ver detalle
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg font-medium mb-2">
                  Este usuario no tiene publicaciones disponibles
                </p>
                <p className="text-sm text-muted-foreground">
                  Cuando {user.nombre} publique mascotas para adopción, aparecerán aquí.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserProfile;