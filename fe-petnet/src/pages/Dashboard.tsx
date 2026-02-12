import { useState, useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Edit, 
  Trash2, 
  Eye, 
  Check, 
  X,
  Plus,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PostFormDialog } from "@/components/dashboard/PostFormDialog";
import { publicationsAPI, requestsAPI } from "@/services/api";

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
/*
interface AdoptionRequest {
  id: string;
  petId: string;
  petName: string;
  requesterId: string;
  requesterName: string;
  requesterEmail: string;
  message: string;
  status: "Pendiente" | "Aceptada" | "Rechazada";
  createdAt: Date;
}
*/
interface AdoptionRequest {
  id: number;
  estado: string;
  mensaje: string;
  solicitante?: {
    id: number;
    nombre: string;
    apellido: string;
  };
  mascota?: string;
  animal?: string; // Para solicitudes enviadas
}
const PROVINCIAS_ARGENTINA = [
  "Buenos Aires",
  "Catamarca", 
  "Chaco",
  "Chubut",
  "Ciudad Autónoma de Buenos Aires",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán"
];

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, updateUser, loading } = useUser();
  
  const [userPublications, setUserPublications] = useState<Publication[]>([]);
  const [loadingPublications, setLoadingPublications] = useState(true);
  
  // Estado para datos de edición
  const [editData, setEditData] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    provincia: "",
    localidad: ""
  });

  // Dialog states
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postDialogMode, setPostDialogMode] = useState<"create" | "edit">("create");
  const [editingPost, setEditingPost] = useState<Publication | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<Publication | null>(null);
  /**
  // Mock adoption requests (estos deberían venir del backend en el futuro)
  const receivedRequests: AdoptionRequest[] = [
    {
      id: "1",
      petId: "1",
      petName: "Luna",
      requesterId: "2",
      requesterName: "María García",
      requesterEmail: "maria.garcia@email.com",
      message: "Hola, me interesa mucho adoptar a Luna. Tengo experiencia con perros y un jardín grande.",
      status: "Pendiente",
      createdAt: new Date("2024-02-25")
    },
  ];

  const sentRequests: AdoptionRequest[] = [
    {
      id: "3",
      petId: "3", 
      petName: "Rocco",
      requesterId: "1",
      requesterName: "Juan Pérez",
      requesterEmail: "juan.perez@email.com",
      message: "Me encantaría adoptar a Rocco. Tengo experiencia con cachorros.",
      status: "Pendiente", 
      createdAt: new Date("2024-02-23")
    }
  ];
  */
  const [receivedRequests, setReceivedRequests] = useState<AdoptionRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<AdoptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  // CARGAR PUBLICACIONES DEL USUARIO
  useEffect(() => {
    const fetchUserPublications = async () => {
      if (!user) return;
      
      try {
        setLoadingPublications(true);
        console.log('📡 Fetching user publications...');
        const response = await publicationsAPI.getMyPublications();
        console.log('✅ Publications received:', response);
        
        if (response.publicaciones) {
          setUserPublications(response.publicaciones);
        }
      } catch (error: any) {
        console.error('❌ Error loading publications:', error);
        toast({
          title: "Error al cargar publicaciones",
          description: error.message || "No se pudieron cargar las publicaciones",
          variant: "destructive",
        });
      } finally {
        setLoadingPublications(false);
      }
    };

    fetchUserPublications();
  }, [user, toast]);
  // CARGAR SOLICITUDES DE ADOPCIÓN
  useEffect(() => {
  const fetchRequests = async () => {
    if (!user) return;
    
    try {
      setLoadingRequests(true);
      
      // Cargar solicitudes recibidas y enviadas en paralelo
      const [receivedRes, sentRes] = await Promise.all([
        requestsAPI.getReceived(),
        requestsAPI.getSent()
      ]);

      console.log('📥 Solicitudes recibidas:', receivedRes);
      console.log('📤 Solicitudes enviadas:', sentRes);

      if (receivedRes.solicitudes) {
        setReceivedRequests(receivedRes.solicitudes);
      }
      
      if (sentRes.solicitudes) {
        setSentRequests(sentRes.solicitudes);
      }
    } catch (error: any) {
      console.error('❌ Error loading requests:', error);
      toast({
        title: "Error al cargar solicitudes",
        description: error.message || "No se pudieron cargar las solicitudes",
        variant: "destructive",
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  fetchRequests();
}, [user, toast]);
  // ACTUALIZAR editData CUANDO USER CAMBIE
  useEffect(() => {
    if (user) {
      setEditData({
        nombre: user.nombre || "",
        apellido: user.apellido || "",
        telefono: user.phone || "",
        provincia: user.provincia || "",
        localidad: user.localidad || ""
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser(editData);
      toast({
        title: "Perfil actualizado",
        description: "Tu información se ha guardado correctamente.",
      });
    } catch (error: any) {
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive",
      });
    }
  };
  /*
  const handleRequestResponse = (requestId: string, status: "Aceptada" | "Rechazada") => {
    toast({
      title: status === "Aceptada" ? "Solicitud aceptada" : "Solicitud rechazada", 
      description: `Has ${status.toLowerCase()} la solicitud de adopción.`,
    });
  };
  */
  const handleRequestResponse = async (requestId: number, nuevoEstado: "Aprobada" | "Rechazada") => {
    try {
      console.log('🔄 Actualizando estado de solicitud:', requestId, nuevoEstado);
      
      await requestsAPI.updateStatus(requestId, nuevoEstado);
      
      // Actualizar localmente
      setReceivedRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, estado: nuevoEstado } : req
        )
      );
      
      toast({
        title: nuevoEstado === "Aprobada" ? "Solicitud aceptada" : "Solicitud rechazada",
        description: `Has ${nuevoEstado.toLowerCase()} la solicitud de adopción. Se ha enviado un email al solicitante.`,
      });
    } catch (error: any) {
      console.error('❌ Error al actualizar solicitud:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la solicitud",
        variant: "destructive",
      });
    }
  };

  // AGREGA esta función para cancelar solicitudes enviadas:
  const handleCancelRequest = async (requestId: number) => {
    try {
      console.log('❌ Cancelando solicitud:', requestId);
      
      await requestsAPI.cancel(requestId);
      
      // Remover localmente
      setSentRequests(prev => prev.filter(req => req.id !== requestId));
      
      toast({
        title: "Solicitud cancelada",
        description: "Tu solicitud de adopción ha sido cancelada.",
      });
    } catch (error: any) {
      console.error('❌ Error al cancelar solicitud:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo cancelar la solicitud",
        variant: "destructive",
      });
    }
  };
  const handleCreatePost = () => {
    setPostDialogMode("create");
    setEditingPost(null);
    setPostDialogOpen(true);
  };

  const handleEditPost = (post: Publication) => {
    setPostDialogMode("edit");
    setEditingPost(post);
    setPostDialogOpen(true);
  };

  const handleDeleteClick = (post: Publication) => {
    if (post.estado === "disponible") {
      toast({
        title: "No se puede eliminar",
        description: "Debes cambiar el estado a 'adoptado' antes de eliminar la publicación.",
        variant: "destructive",
      });
      return;
    }
    setPostToDelete(post);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;

    try {
      console.log('🗑️ Deleting publication:', postToDelete.id);
      await publicationsAPI.delete(postToDelete.id);
      
      setUserPublications(prev => prev.filter(p => p.id !== postToDelete.id));
      
      toast({
        title: "Publicación eliminada",
        description: "La publicación ha sido eliminada permanentemente.",
      });
    } catch (error: any) {
      console.error('❌ Error deleting publication:', error);
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar la publicación",
        variant: "destructive",
      });
    } finally {
      setPostToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handlePostSubmit = async (data: any) => {
    try {
      if (postDialogMode === "create") {
        console.log('📤 Creating publication:', data);
        const response = await publicationsAPI.create(data);
        console.log('✅ Publication created:', response);
        
        // Recargar publicaciones
        const updatedPubs = await publicationsAPI.getMyPublications();
        setUserPublications(updatedPubs.publicaciones);
        
        toast({
          title: "¡Publicación creada!",
          description: "La publicación se creó correctamente.",
        });
      } else if (editingPost) {
        console.log('📝 Updating publication:', editingPost.id, data);
        const response = await publicationsAPI.update(editingPost.id, data);
        console.log('✅ Publication updated:', response);
        
        // Recargar publicaciones
        const updatedPubs = await publicationsAPI.getMyPublications();
        setUserPublications(updatedPubs.publicaciones);
        
        toast({
          title: "Publicación actualizada",
          description: "Los cambios se han guardado correctamente.",
        });
      }
    } catch (error: any) {
      console.error('❌ Error submitting publication:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la publicación, intente nuevamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleViewPost = (postId: number) => {
    navigate(`/post/${postId}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Acceso denegado</h2>
          <p className="text-muted-foreground mb-4">Debes iniciar sesión para acceder al dashboard</p>
          <Button onClick={() => navigate('/auth')}>Iniciar Sesión</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            {loading ? "Cargando..." : `Hola, ${user?.nombre || 'Usuario'}`}
          </h1>
          <p className="text-muted-foreground">
            Gestiona tu perfil, publicaciones y solicitudes de adopción
          </p>
        </div>

        {/* Dashboard Tabs */}
        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Mi Perfil</TabsTrigger>
            <TabsTrigger value="posts">Mis Publicaciones</TabsTrigger>
            <TabsTrigger value="received">Solicitudes Recibidas</TabsTrigger>
            <TabsTrigger value="sent">Solicitudes Enviadas</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>
                  Actualiza tu información de contacto y ubicación
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nombre">Nombre</Label>
                      <Input
                        id="nombre"
                        value={editData.nombre}
                        onChange={(e) => setEditData(prev => ({ ...prev, nombre: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apellido">Apellido</Label>
                      <Input
                        id="apellido"
                        value={editData.apellido}
                        onChange={(e) => setEditData(prev => ({ ...prev, apellido: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefono">Teléfono</Label>
                      <Input
                        id="telefono"
                        type="tel"
                        value={editData.telefono}
                        onChange={(e) => setEditData(prev => ({ ...prev, telefono: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="provincia">Provincia</Label>
                      <select
                        id="provincia"
                        value={editData.provincia}
                        onChange={(e) => setEditData(prev => ({ ...prev, provincia: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="">Seleccionar provincia</option>
                        {PROVINCIAS_ARGENTINA.map((provincia) => (
                          <option key={provincia} value={provincia}>
                            {provincia}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="localidad">Localidad</Label>
                      <Input
                        id="localidad"
                        value={editData.localidad}
                        onChange={(e) => setEditData(prev => ({ ...prev, localidad: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full md:w-auto" disabled={loading}>
                    {loading ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Posts Tab */}
          <TabsContent value="posts">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Mis Publicaciones</h3>
                  <p className="text-muted-foreground">
                    Mascotas que has publicado para adopción
                  </p>
                </div>
                <Button onClick={handleCreatePost}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Publicación
                </Button>
              </div>

              {loadingPublications ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Cargando publicaciones...</p>
                  </CardContent>
                </Card>
              ) : userPublications.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">
                      Aún no tienes publicaciones. ¡Crea tu primera publicación!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {userPublications.map((pub) => (
                    <Card key={pub.id} className={pub.estado !== "disponible" ? "opacity-60" : ""}>
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          <img
                            src={pub.foto || '/placeholder-pet.jpg'}
                            alt={pub.mascota.nombre}
                            className="w-20 h-20 rounded-lg object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-pet.jpg';
                            }}
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold">{pub.mascota.nombre}</h4>
                              <Badge variant={pub.estado === "disponible" ? "default" : "secondary"}>
                                {pub.estado === "disponible" ? "Disponible" : "Adoptado"}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {pub.mascota.tipo} • {pub.mascota.sexo} • {pub.mascota.tamaño}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {pub.mascota.descripcion}
                            </p>
                            <div className="flex gap-2 pt-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleViewPost(pub.id)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditPost(pub)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Editar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteClick(pub)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="received">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Solicitudes Recibidas</h3>
                <p className="text-muted-foreground">
                  Personas interesadas en adoptar tus mascotas
                </p>
              </div>

              {loadingRequests ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Cargando solicitudes...</p>
                  </CardContent>
                </Card>
              ) : receivedRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">
                      Aún no has recibido solicitudes de adopción para tus publicaciones.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {receivedRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            {request.solicitante && (
                              <Link 
                                to={`/user/${request.solicitante.id}`}
                                className="font-semibold hover:text-primary transition-colors underline-offset-4 hover:underline"
                              >
                                {request.solicitante.nombre} {request.solicitante.apellido}
                              </Link>
                            )}
                            <p className="text-sm text-muted-foreground">
                              Interesado en: {request.mascota || "Mascota"}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              request.estado === "Aprobada" ? "default" : 
                              request.estado === "Rechazada" ? "destructive" : "secondary"
                            }
                          >
                            {request.estado}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground mb-4">
                          "{request.mensaje}"
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            ID: {request.id}
                          </div>
                          
                          {request.estado === "Pendiente" && (
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRequestResponse(request.id, "Aprobada")}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Aceptar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleRequestResponse(request.id, "Rechazada")}
                              >
                                <X className="w-4 h-4 mr-1" />
                                Rechazar
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="sent">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Solicitudes Enviadas</h3>
                <p className="text-muted-foreground">
                  Tus solicitudes de adopción a otras mascotas
                </p>
              </div>

              {loadingRequests ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p className="text-muted-foreground">Cargando solicitudes...</p>
                  </CardContent>
                </Card>
              ) : sentRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">
                      Aún no has enviado solicitudes de adopción.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {sentRequests.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold">
                              Solicitud para {request.animal || "Mascota"}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              ID: {request.id}
                            </p>
                          </div>
                          <Badge 
                            variant={
                              request.estado === "Aprobada" ? "default" : 
                              request.estado === "Rechazada" ? "destructive" : "secondary"
                            }
                          >
                            {request.estado}
                          </Badge>
                        </div>

                        <p className="text-muted-foreground mb-4">
                          "{request.mensaje}"
                        </p>

                        {request.estado === "Pendiente" && (
                          <div className="flex justify-end">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleCancelRequest(request.id)}
                            >
                              Cancelar Solicitud
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Post Form Dialog */}
      <PostFormDialog
        open={postDialogOpen}
        onOpenChange={setPostDialogOpen}
        onSubmit={handlePostSubmit}
        editingPost={editingPost}
        mode={postDialogMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La publicación de {postToDelete?.mascota.nombre} será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;