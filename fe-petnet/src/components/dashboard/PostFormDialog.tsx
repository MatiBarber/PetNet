import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { validateImageSize, validateImageType } from "@/services/api";
import { compressImage, validateBase64Size } from "@/utils/imageCompression";

// Esquema de validación
const publicationSchema = z.object({
  nombre: z.string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(30, "El nombre no puede exceder 30 caracteres"),
  tamaño: z.enum(["Chico", "Mediano", "Grande"], {
    required_error: "Seleccione un tamaño",
  }),
  sexo: z.enum(["Macho", "Hembra"], {
    required_error: "Seleccione el sexo",
  }),
  tipo: z.enum(["Perro", "Gato", "Pájaro", "Conejo"], {
    required_error: "Seleccione el tipo de animal",
  }),
  descripcion: z.string()
    .min(10, "La descripción debe tener al menos 10 caracteres")
    .max(500, "La descripción no puede exceder 500 caracteres"),
  foto: z.string().min(1, "Debe seleccionar una fotografía"),
  estado: z.enum(["disponible", "adoptado"]).optional(),
});

type PublicationFormData = z.infer<typeof publicationSchema>;

interface Publication {
  id: number;
  foto: string;
  estado: string;
  mascota: {
    nombre: string;
    tipo: string;
    sexo: string;
    tamaño: string;
    descripcion: string;
  };
}

interface PostFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PublicationFormData) => Promise<void>;
  editingPost: Publication | null;
  mode: "create" | "edit";
}

export function PostFormDialog({
  open,
  onOpenChange,
  onSubmit,
  editingPost,
  mode,
}: PostFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<PublicationFormData>({
    resolver: zodResolver(publicationSchema),
    defaultValues: {
      nombre: "",
      tamaño: undefined,
      sexo: undefined,
      tipo: undefined,
      descripcion: "",
      foto: "",
      estado: "disponible",
    },
  });

  // Cargar datos si es modo edición
  useEffect(() => {
    if (editingPost && mode === "edit") {
      form.reset({
        nombre: editingPost.mascota.nombre,
        tamaño: editingPost.mascota.tamaño as "Chico" | "Mediano" | "Grande",
        sexo: editingPost.mascota.sexo as "Macho" | "Hembra",
        tipo: editingPost.mascota.tipo as "Perro" | "Gato" | "Pájaro" | "Conejo",
        descripcion: editingPost.mascota.descripcion,
        foto: editingPost.foto,
        estado: editingPost.estado as "disponible" | "adoptado",
      });
      setImagePreview(editingPost.foto);
    } else {
      form.reset({
        nombre: "",
        tamaño: undefined,
        sexo: undefined,
        tipo: undefined,
        descripcion: "",
        foto: "",
        estado: "disponible",
      });
      setImagePreview("");
      setImageFile(null);
    }
  }, [editingPost, mode, form]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!validateImageType(file)) {
      form.setError("foto", {
        message: "Formato inválido. Use JPG, PNG, GIF o WEBP",
      });
      return;
    }

    // Validar tamaño del archivo original (10MB máximo)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxFileSize) {
      form.setError("foto", {
        message: "La imagen no debe superar 10MB",
      });
      return;
    }

    try {
      // Comprimir imagen (ancho máximo 1200px, calidad 0.8)
      const compressedBase64 = await compressImage(file, 1200, 0.8);
      
      // Validar tamaño de Base64 resultante (5MB máximo)
      if (!validateBase64Size(compressedBase64, 5)) {
        form.setError("foto", {
          message: "La imagen comprimida aún es muy grande. Intente con una imagen más pequeña.",
        });
        return;
      }
      
      setImagePreview(compressedBase64);
      setImageFile(file);
      form.setValue("foto", compressedBase64);
      form.clearErrors("foto");
    } catch (error) {
      console.error("Error compressing image:", error);
      form.setError("foto", {
        message: "Error al procesar la imagen",
      });
    }
  };

  const handleRemoveImage = () => {
    setImagePreview("");
    setImageFile(null);
    form.setValue("foto", "");
  };

  const handleSubmit = async (data: PublicationFormData) => {
    setIsLoading(true);
    try {
      await onSubmit(data);
      form.reset();
      setImagePreview("");
      setImageFile(null);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nueva Publicación" : "Editar Publicación"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Completa el formulario para publicar un animal en adopción"
              : "Modifica los datos de tu publicación"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Firulais" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo, Tamaño, Sexo */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Perro">Perro</SelectItem>
                        <SelectItem value="Gato">Gato</SelectItem>
                        <SelectItem value="Pájaro">Pájaro</SelectItem>
                        <SelectItem value="Conejo">Conejo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tamaño"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tamaño *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Chico">Chico</SelectItem>
                        <SelectItem value="Mediano">Mediano</SelectItem>
                        <SelectItem value="Grande">Grande</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sexo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sexo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Macho">Macho</SelectItem>
                        <SelectItem value="Hembra">Hembra</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Estado (solo en modo edición) */}
            {mode === "edit" && (
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="disponible">Disponible</SelectItem>
                        <SelectItem value="adoptado">Adoptado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Descripción */}
            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe al animal, su personalidad, cuidados especiales, etc."
                      className="resize-none min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fotografía */}
            <FormField
              control={form.control}
              name="foto"
              render={() => (
                <FormItem>
                  <FormLabel>Fotografía *</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {imagePreview ? (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-sm text-muted-foreground mb-4">
                            JPG, PNG, GIF o WEBP (máximo 5MB)
                          </p>
                          <Input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                            onChange={handleImageChange}
                            className="max-w-xs mx-auto"
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className="flex gap-4 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "create" ? "Creando..." : "Guardando..."}
                  </>
                ) : (
                  <>{mode === "create" ? "Crear Publicación" : "Guardar Cambios"}</>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}