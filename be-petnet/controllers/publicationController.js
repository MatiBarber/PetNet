const { body, validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Validaciones para crear publicación
const createPublicationValidations = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('tamaño').isIn(['Chico', 'Mediano', 'Grande']).withMessage('El tamaño debe ser: Chico, Mediano o Grande'),
  body('sexo').isIn(['Macho', 'Hembra']).withMessage('El sexo debe ser: Macho o Hembra'),
  body('tipo').isIn(['Perro', 'Gato', 'Pájaro', 'Conejo']).withMessage('El tipo debe ser: Perro, Gato, Pájaro o Conejo'),
  body('descripcion').notEmpty().withMessage('La descripción es obligatoria'),
  body('foto')
    .notEmpty().withMessage('La foto es obligatoria')
    .custom((value) => {
      const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
      if (!base64Regex.test(value)) {
        throw new Error('La foto debe ser una imagen en formato base64 válido (data:image/jpeg;base64,...)');
      }
      return true;
    })
    .custom((value) => {
      const maxSize = 7000000; // Aproximadamente 5MB de imagen
      if (value.length > maxSize) {
        throw new Error('La imagen es demasiado grande (máximo 5MB)');
      }
      return true;
    }),
];

// Crea una publicación con su mascota asociada en una transacción
const createPublication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    // 1. Extraer campos del body
    const { nombre, tamaño, sexo, tipo, descripcion, foto } = req.body;

    // 2. Obtener userId del middleware de autenticación
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "No autorizado" });
    }

    // 3. Transacción Prisma: crear Publicacion y Mascota asociada
    // https://www.prisma.io/docs/orm/prisma-client/queries/transactions (Enlace para ver transacciones, se usa para que ambas operaciones se realicen juntas o ninguna)
    const result = await prisma.$transaction(async (tx) => {
      const nuevaPublicacion = await tx.publicacion.create({
        data: {
          foto,
          estado: "disponible",
          usuarioId: userId,
        },
      });

      const nuevaMascota = await tx.mascota.create({
        data: {
          nombre,
          tamaño,
          sexo,
          tipo,
          descripcion,
          publicacionId: nuevaPublicacion.id,
        },
      });

      return { publicacion: nuevaPublicacion, mascota: nuevaMascota };
    });

    // 4. Respuesta de éxito
    return res.status(201).json({
      success: true,
      message: "La publicación se creó correctamente",
      data: {
        id: result.publicacion.id,
        foto: result.publicacion.foto,
        estado: result.publicacion.estado,
        usuarioId: result.publicacion.usuarioId,
        mascota: {
          id: result.mascota.id,
          nombre: result.mascota.nombre,
          tipo: result.mascota.tipo,
          sexo: result.mascota.sexo,
          tamaño: result.mascota.tamaño,
          descripcion: result.mascota.descripcion,
        },
      },
    });
  } catch (error) {
    console.error("Error en createPublication:", error);
    return res.status(500).json({
      success: false,
      message: "No se pudo crear la publicación, intente nuevamente",
    });
  }
};

// Validaciones para actualizar publicación (foto opcional)
const updatePublicationValidations = [
  body('nombre').notEmpty().withMessage('El nombre es obligatorio'),
  body('tamaño').isIn(['Chico', 'Mediano', 'Grande']).withMessage('El tamaño debe ser: Chico, Mediano o Grande'),
  body('sexo').isIn(['Macho', 'Hembra']).withMessage('El sexo debe ser: Macho o Hembra'),
  body('tipo').isIn(['Perro', 'Gato', 'Pájaro', 'Conejo']).withMessage('El tipo debe ser: Perro, Gato, Pájaro o Conejo'),
  body('descripcion').notEmpty().withMessage('La descripción es obligatoria'),
  body('estado')  // ✅ AGREGAR VALIDACIÓN DE ESTADO
    .optional()
    .isIn(['disponible', 'adoptado'])
    .withMessage('El estado debe ser: disponible o adoptado'),
  body('foto')
    .optional()
    .custom((value) => {
      const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
      if (!base64Regex.test(value)) {
        throw new Error('La foto debe ser una imagen en formato base64 válido (data:image/jpeg;base64,...)');
      }
      return true;
    })
    .custom((value) => {
      const maxSize = 7000000; // Aproximadamente 5MB de imagen
      if (value.length > maxSize) {
        throw new Error('La imagen es demasiado grande (máximo 5MB)');
      }
      return true;
    }),
];

// Actualiza una publicación y su mascota asociada en una transacción
// En publicationController.js - REEMPLAZAR la función updatePublication

// Actualizar validaciones para incluir estado

// Actualiza una publicación y su mascota asociada en una transacción
const updatePublication = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    
    const { id } = req.params;
    const pubId = parseInt(id);
    if (Number.isNaN(pubId)) {
      return res.status(400).json({ success: false, message: "ID de publicación inválido" });
    }

    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "No autorizado" });
    }

    // ✅ EXTRAER ESTADO DEL BODY
    const { nombre, tamaño, sexo, tipo, descripcion, foto, estado } = req.body;

    const publicacion = await prisma.publicacion.findUnique({
      where: { id: pubId },
      include: { Mascota: true },
    });

    if (!publicacion) {
      return res.status(404).json({ success: false, message: "Publicación no encontrada" });
    }

    if (publicacion.usuarioId !== userId) {
      return res.status(403).json({ success: false, message: "No tienes permiso para editar esta publicación" });
    }

    const mascotaExistente = publicacion.Mascota[0];

    const result = await prisma.$transaction(async (tx) => {
      // ✅ ACTUALIZAR PUBLICACIÓN CON FOTO Y/O ESTADO
      const updateData = {};
      if (foto) updateData.foto = foto;
      if (estado) updateData.estado = estado; // ✅ AGREGAR ESTADO
      
      let updatedPublicacion = publicacion;
      if (Object.keys(updateData).length > 0) {
        updatedPublicacion = await tx.publicacion.update({
          where: { id: pubId },
          data: updateData,
        });
      }

      // Actualizar mascota
      let updatedMascota;
      if (mascotaExistente) {
        updatedMascota = await tx.mascota.update({
          where: { id: mascotaExistente.id },
          data: { nombre, tamaño, sexo, tipo, descripcion },
        });
      } else {
        updatedMascota = await tx.mascota.create({
          data: { nombre, tamaño, sexo, tipo, descripcion, publicacionId: pubId },
        });
      }

      return { publicacion: updatedPublicacion, mascota: updatedMascota };
    });

    return res.status(200).json({
      success: true,
      message: "La publicación se editó correctamente",
      data: {
        id: result.publicacion.id,
        foto: result.publicacion.foto,
        estado: result.publicacion.estado,
        usuarioId: result.publicacion.usuarioId,
        mascota: {
          id: result.mascota.id,
          nombre: result.mascota.nombre,
          tipo: result.mascota.tipo,
          sexo: result.mascota.sexo,
          tamaño: result.mascota.tamaño,
          descripcion: result.mascota.descripcion,
        },
      },
    });
  } catch (error) {
    console.error("Error en updatePublication:", error);
    return res.status(500).json({ success: false, message: "No se pudo editar la publicación, intente nuevamente" });
  }
};



const getMisPublicaciones = async (req, res) => {
  try {
    const userId = req.user.userId;

    const publicaciones = await prisma.publicacion.findMany({
      where: { usuarioId: userId },
      include: {
        Mascota: true,
      },
    });

    if (!publicaciones || publicaciones.length === 0) {
      return res.json({
        publicaciones: [],
      });
    }

    const resultado = publicaciones.map((pub) => ({
      id: pub.id,
      foto: pub.foto, // ✅ AGREGAR FOTO
      estado: pub.estado,
      mascota:
        pub.Mascota.length > 0
          ? {
              id: pub.Mascota[0].id,
              nombre: pub.Mascota[0].nombre,
              tipo: pub.Mascota[0].tipo,
              sexo: pub.Mascota[0].sexo,
              tamaño: pub.Mascota[0].tamaño,
              descripcion: pub.Mascota[0].descripcion,
            }
          : null,
    }));

    res.json({ publicaciones: resultado });
  } catch (error) {
    console.error("Error en getMisPublicaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};


const getDetallePublicacion = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un número válido
    const publicacionId = parseInt(id);
    if (isNaN(publicacionId)) {
      return res.status(404).json({
        success: false,
      });
    }

    const publicacion = await prisma.publicacion.findUnique({
      where: { id: publicacionId },
      include: {
        Mascota: true,
        usuario: {    
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
            telefono: true,
            provincia: true,
            localidad: true,
          },
        },
      },
    });

    if (!publicacion) {
      return res.status(404).json({
        success: false,
      });
    }

    const mascota = publicacion.Mascota[0]; 
    
    const detalle = {
      id: publicacion.id,
      foto: publicacion.foto,
      estado: publicacion.estado,
      mascota: mascota
        ? {
            nombre: mascota.nombre,
            tipo: mascota.tipo,
            sexo: mascota.sexo,
            tamaño: mascota.tamaño,
            descripcion: mascota.descripcion,
          }
        : null,
      publicante: {
        id: publicacion.usuario.id,
        nombre: publicacion.usuario.nombre,
        apellido: publicacion.usuario.apellido,
        email: publicacion.usuario.email,
        telefono: publicacion.usuario.telefono,
        provincia: publicacion.usuario.provincia,
        localidad: publicacion.usuario.localidad,
      },
    };

    res.json({ publicacion: detalle });
  } catch (error) {
    console.error("Error al obtener detalle de publicación:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};


// Obtiene todas las publicaciones disponibles para adopción (PET-111)
const getPublicacionesDisponibles = async (req, res) => {
  try {
    const { tipo } = req.query;
    const filtros = { estado: 'disponible' };

    if (tipo) {
      filtros.Mascota = {
        some: { tipo: tipo },
      };
    }

    const publicaciones = await prisma.publicacion.findMany({
      where: filtros,
      include: {
        Mascota: true,
      },
    });

    if (!publicaciones || publicaciones.length === 0) {
      return res.json({
        publicaciones: [],
        message: "No hay animales disponibles para adopción en este momento"
      });
    }

    const resultado = publicaciones.map((pub) => ({
      id: pub.id,
      estado: pub.estado,
      foto: pub.foto,
      mascota:
        pub.Mascota.length > 0
          ? {
              nombre: pub.Mascota[0].nombre,
              tipo: pub.Mascota[0].tipo,
            }
          : null,
    }));

    res.json({ publicaciones: resultado });
  } catch (error) {
    console.error("Error en getPublicacionesDisponibles:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Elimina una publicación por ID (con validaciones y autorización)
const deletePublication = async (req, res) => {
  try {
    // 1. Extraer id de req.params y convertir a número
    const { id } = req.params;
    const pubId = parseInt(id);
    
    // 2. Validar número
    if (Number.isNaN(pubId)) {
      return res.status(400).json({ success: false, message: "ID de publicación inválido" });
    }
    
    // 3. Obtener userId del middleware de autenticación
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "No autorizado" });
    }
    
    // 4. Buscar publicación por id
    const publicacion = await prisma.publicacion.findUnique({ where: { id: pubId } });
    
    // 5. Si no existe
    if (!publicacion) {
      return res.status(404).json({ success: false, message: "Publicación no encontrada" });
    }
    
    // 6. Validar propiedad
    if (publicacion.usuarioId !== userId) {
      return res.status(403).json({ success: false, message: "No tienes permiso para eliminar esta publicación" });
    }
    
    // 7. Eliminar publicación (las mascotas se eliminarán por cascada si está configurado)
    await prisma.publicacion.delete({ where: { id: pubId } });
    
    // 8. Éxito
    return res.status(200).json({ success: true, message: "La publicación se eliminó correctamente" });
  } catch (error) {
    console.error("Error en deletePublication:", error);
    // 9. Error
    return res.status(500).json({ success: false, message: "Hubo un problema al eliminar la publicación, intenta nuevamente" });
  }
};

module.exports = {
  createPublicationValidations,
  createPublication,
  updatePublicationValidations,
  updatePublication,
  getMisPublicaciones,
  getDetallePublicacion,
  getPublicacionesDisponibles,
  deletePublication,
};
