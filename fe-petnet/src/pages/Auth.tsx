import { useEffect, useState } from "react";
import { useUser } from "@/context/UserContext";
import { mockUsers } from "@/data/users";
import md5 from "md5";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Heart, Mail, Lock, User, MapPin, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Provincias de Argentina
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

// Esquemas de validación
const loginSchema = z.object({
  email: z.string().email("Ingrese un email válido").min(1, "El email es requerido"),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/^(?=.*[A-Z])(?=.*\d)/, "Debe contener al menos una mayúscula y un número")
});

const registerSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(30, "El nombre no puede exceder 30 caracteres"),
  apellido: z.string().min(2, "El apellido debe tener al menos 2 caracteres").max(30, "El apellido no puede exceder 30 caracteres"),
  email: z.string().email("Ingrese un email válido").min(1, "El email es requerido"),
  phone: z.string().regex(/^\d+$/, "El teléfono debe contener solo números").min(8, "El teléfono debe tener al menos 8 dígitos"),
  provincia: z.string().min(1, "Seleccione una provincia"),
  localidad: z.string().min(2, "La localidad debe tener al menos 2 caracteres"),
  password: z.string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "La contraseña debe contener al menos una mayúscula, una minúscula y un número"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"]
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { user, login, register } = useUser();
  
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: "",
      apellido: "",
      email: "",
      phone: "",
      provincia: "",
      localidad: "",
      password: "",
      confirmPassword: ""
    }
  });
    useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);
/*
  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    const userFound = mockUsers.find(
      (u) => u.email === data.email
    );
    const passwordHash = md5(data.password);
    setTimeout(() => {
      setIsLoading(false);
      if (!userFound) {
        toast({
          title: "Usuario no encontrado",
          description: "El correo ingresado no está registrado.",
          variant: "destructive",
        });
      } else if (userFound.password !== passwordHash) {
        toast({
          title: "Contraseña incorrecta",
          description: "La contraseña ingresada es incorrecta.",
          variant: "destructive",
        });
      } else {
        login(userFound);
        toast({
          title: "¡Bienvenido de vuelta!",
          description: "Has iniciado sesión correctamente.",
        });
        navigate("/dashboard");
      }
    }, 1000);
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    // Guardar usuario con contraseña hasheada (mock)
    const newUser = {
      id: String(mockUsers.length + 1),
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      password: md5(data.password),
      phone: data.phone,
      provincia: data.provincia,
      localidad: data.localidad,
      createdAt: new Date(),
      avatar: ""
    };
    mockUsers.push(newUser);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "¡Cuenta creada exitosamente!",
        description: "Bienvenido a la comunidad PetNet.",
      });
      navigate("/dashboard");
    }, 1000);
  };
*/
  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password); // ← Usar el contexto actualizado
      toast({
        title: "¡Bienvenido de vuelta!",
        description: "Has iniciado sesión correctamente.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error al iniciar sesión",
        description: error.message || "Credenciales incorrectas",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      console.log('📝 Form data received:', data);
      // Transformar datos al formato que espera el backend
      const userData = {
        nombre: data.nombre,        // ← Enviar nombre separado
        apellido: data.apellido,
        email: data.email,
        password: data.password,
        // Agregar otros campos según lo que espere tu backend
        telefono: data.phone,
        provincia: data.provincia,
        localidad: data.localidad,
      };
      console.log('📝 Sending registration data:', userData);
      await register(userData); // ← Usar el contexto actualizado
      toast({
        title: "¡Cuenta creada exitosamente!",
        description: "Bienvenido a la comunidad PetNet.",
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error al crear cuenta",
        description: error.message || "Error al registrar usuario",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (user) {

    
    // Mientras redirige, mostrar loading
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-hero">
        <div className="w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Redirigiendo al dashboard...</h2>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  // Renderizar formulario de login/registro si no hay usuario logueado
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-gradient-hero">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-primary-foreground" fill="currentColor" />
          </div>
          <h1 className="text-3xl font-bold gradient-primary bg-clip-text text-transparent">
            PetNet
          </h1>
          <p className="text-muted-foreground mt-2">
            Únete a nuestra comunidad de amantes de las mascotas
          </p>
        </div>

        {/* Auth Tabs */}
        <Tabs defaultValue="login" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
            <TabsTrigger value="register">Crear Cuenta</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Iniciar Sesión</CardTitle>
                <CardDescription>
                  Ingresa tus credenciales para acceder a tu cuenta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="tu@email.com"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Crear Cuenta</CardTitle>
                <CardDescription>
                  Únete a nuestra comunidad y encuentra a tu compañero perfecto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="nombre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Tu nombre"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="apellido"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Apellido</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Tu apellido"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="tu@email.com"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="tel"
                                placeholder="1123456789"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="provincia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Provincia</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar provincia" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {PROVINCIAS_ARGENTINA.map((provincia) => (
                                  <SelectItem key={provincia} value={provincia}>
                                    {provincia}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={registerForm.control}
                        name="localidad"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Localidad</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="Tu localidad"
                                  className="pl-10"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar contraseña</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;