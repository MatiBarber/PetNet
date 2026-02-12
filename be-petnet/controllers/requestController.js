const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { enviarNotificacionCambioEstado } = require('../utils/emailServices');

// Crear solicitud de adopción
const createRequest = async (req, res) => {
  try {
    console.log('📥 Received request body:', req.body);
    console.log('👤 User from token:', req.user);

    // 1. Obtener userId del middleware de autenticación
    const userId = req.user.userId;

    // 2. Extraer { publicacionId, mensaje } del body
    const { publicacionId, mensaje } = req.body;

    console.log('🔍 Processing:', { userId, publicacionId, mensaje });

    // 3. Validar que publicacionId y mensaje estén presentes
    const pubId = parseInt(publicacionId);
    if (!publicacionId || Number.isNaN(pubId) || !mensaje) {
      console.log('❌ Validation failed: missing data');
      return res.status(400).json({ 
        success: false, 
        message: 'Faltan datos obligatorios (publicacionId y mensaje son requeridos)' 
      });
    }

    // 4. Buscar la publicación
    console.log('🔍 Looking for publication:', pubId);
    const publicacion = await prisma.publicacion.findUnique({
      where: { id: pubId },
    });

    // 5. Si no existe
    if (!publicacion) {
      console.log('❌ Publication not found');
      return res.status(404).json({ 
        success: false, 
        message: 'Publicación no encontrada' 
      });
    }

    console.log('✅ Publication found:', publicacion);

    // 6. Validar estado disponible
    if (publicacion.estado !== 'disponible') {
      console.log('❌ Publication not available:', publicacion.estado);
      return res.status(400).json({ 
        success: false, 
        message: 'Esta publicación no está disponible para adopción' 
      });
    }

    // 7. Evitar solicitar la propia publicación
    if (publicacion.usuarioId === userId) {
      console.log('❌ User trying to request own publication');
      return res.status(400).json({ 
        success: false, 
        message: 'No puedes solicitar adopción de tu propia publicación' 
      });
    }

    // 8. Verificar existencia previa de solicitud
    const solicitudExistente = await prisma.solicitud.findUnique({
      where: {
        usuarioId_publicacionId: {
          usuarioId: userId,
          publicacionId: pubId,
        },
      },
    });

    // 9. Si ya existe
    if (solicitudExistente) {
      console.log('❌ Request already exists');
      return res.status(400).json({ 
        success: false, 
        message: 'Ya enviaste una solicitud para esta publicación' 
      });
    }

    // 10. Crear solicitud con estado "Pendiente"
    console.log('📝 Creating new request...');
    const nuevaSolicitud = await prisma.solicitud.create({
      data: {
        usuarioId: userId,
        publicacionId: pubId,
        mensaje,
        estado: 'Pendiente',
      },
    });

    console.log('✅ Request created successfully:', nuevaSolicitud);

    // 11. Responder 201
    return res.status(201).json({
      success: true,
      message: 'Solicitud enviada correctamente',
      data: nuevaSolicitud,
    });
  } catch (error) {
    console.error('❌ Error en createRequest:', error);
    console.error('Stack trace:', error.stack);
    // 12. En catch: responder 500
    return res.status(500).json({ 
      success: false, 
      message: 'No se pudo enviar la solicitud, intente nuevamente',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar (cancelar) solicitud de adopción
const deleteRequest = async (req, res) => {
  try {
    // 1. Extraer el id de req.params y convertirlo a número
    const { id } = req.params;
    const solicitudId = parseInt(id);

    // 2. Validar que sea un número válido
    if (Number.isNaN(solicitudId)) {
      return res.status(400).json({ success: false, message: 'ID de solicitud inválido' });
    }

    // 3. Obtener req.user.userId del middleware de autenticación
    const userId = req.user.userId;

    // 4. Buscar la solicitud por id
    const solicitud = await prisma.solicitud.findUnique({ where: { id: solicitudId } });

    // 5. Si no existe
    if (!solicitud) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    // 6. Validar que pertenezca al usuario
    if (solicitud.usuarioId !== userId) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para cancelar esta solicitud' });
    }

    // 7. Validar estado pendiente
    if (solicitud.estado !== 'Pendiente') {
      return res.status(400).json({ success: false, message: 'Solo se pueden cancelar solicitudes pendientes' });
    }

    // 8. Eliminar la solicitud
    await prisma.solicitud.delete({ where: { id: solicitudId } });

    // 9. Responder 200
    return res.status(200).json({ success: true, message: 'Solicitud cancelada correctamente' });
  } catch (error) {
    console.error('Error en deleteRequest:', error);
    // 10. En catch
    return res.status(500).json({ success: false, message: 'No se pudo cancelar la solicitud, intente nuevamente' });
  }
};

// GET: solicitudes recibidas por el usuario autenticado
const getSolicitudesRecibidas = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Buscar todas las solicitudes de publicaciones que pertenecen al usuario autenticado
    const solicitudes = await prisma.solicitud.findMany({
      where: {
        publicacion: {
          usuarioId: userId, // El usuario es dueño de la publicación
        },
      },
      include: {
        usuario: true, // El solicitante
        publicacion: {
          include: {
            Mascota: true, // Para obtener el nombre del animal
          },
        },
      },
    });

    if (!solicitudes || solicitudes.length === 0) {
      return res.json({
        mensaje: "No hay solicitudes para tus publicaciones.",
        solicitudes: [],
      });
    }

    // Estructurar la respuesta
    const resultado = solicitudes.map((sol) => ({
      id: sol.id,
      solicitante: {
        id: sol.usuario.id,
        nombre: sol.usuario.nombre, 
        apellido: sol.usuario.apellido,
      },
      mascota: sol.publicacion.Mascota.length > 0
        ? sol.publicacion.Mascota[0].nombre
        : "Sin nombre",
      estado: sol.estado,
      mensaje: sol.mensaje,
    }));

    res.json({ solicitudes: resultado });
  } catch (error) {
    console.error("Error al obtener solicitudes recibidas:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const getSolicitudesEnviadas = async (req, res) => {
  try {
    const userId = req.user.userId;

    const solicitudes = await prisma.solicitud.findMany({
      where: {
        usuarioId: userId, // El usuario es quien envió la solicitud
      },
      include: {
        publicacion: {
          include: {
            Mascota: true, // Para obtener nombre del animal
          },
        },
      },
    });

    if (!solicitudes || solicitudes.length === 0) {
      return res.json({
        mensaje: "No has enviado solicitudes de adopción.",
        solicitudes: [],
      });
    }

    // Estructurar la respuesta
    const resultado = solicitudes.map((sol) => ({
      id: sol.id,
      animal: sol.publicacion.Mascota.length > 0
        ? sol.publicacion.Mascota[0].nombre
        : "Sin nombre",
      estado: sol.estado,
      mensaje: sol.mensaje,
      acciones: {
        cancelar: sol.estado === "Pendiente" 
          ? `/api/solicitudes/${sol.id}/cancelar`
          : null, // solo se puede cancelar si está pendiente
        verDetalle: `/api/publicaciones/${sol.publicacionId}`,
      },
    }));

    res.json({ solicitudes: resultado });
  } catch (error) {
    console.error("Error al obtener solicitudes enviadas:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const actualizarEstadoSolicitud = async (req, res) => {
  try {
    const { id } = req.params;
    const { nuevoEstado } = req.body; // "Aprobada", "Rechazada", o "Pendiente"
    const userId = req.user.userId;

    // Validar que el ID sea un número válido
    const solicitudId = parseInt(id);
    if (isNaN(solicitudId)) {
      return res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        error: "ID de solicitud inválido",
      });
    }

    // Validar el estado permitido
    const estadosPermitidos = ["Aprobada", "Rechazada", "Pendiente"];
    if (!estadosPermitidos.includes(nuevoEstado)) {
      return res.status(400).json({ success: false, message: "Estado no válido" });
    }

    // Buscar la solicitud con la info del solicitante y mascota
    const solicitud = await prisma.solicitud.findUnique({
      where: { id: solicitudId },
      include: {
        usuario: true, // solicitante
        publicacion: {
          include: { Mascota: true },
        },
      },
    });

    if (!solicitud) {
      return res.status(404).json({ success: false, message: "Solicitud no encontrada" });
    }

    // Validar que el usuario autenticado sea el dueño de la publicación
    if (solicitud.publicacion.usuarioId !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: "No autorizado para modificar esta solicitud" 
      });
    }

    // Validar que no se pueda modificar una solicitud ya aprobada
    if (solicitud.estado === "Aprobada") {
      return res.status(400).json({ 
        success: false, 
        message: "No se puede modificar una solicitud aprobada" 
      });
    }

    // Si el estado no cambia, no se envía correo
    if (solicitud.estado === nuevoEstado) {
      return res.json({
        success: true,
        message: "El estado ya estaba actualizado. No se envió correo.",
        solicitud: solicitud,
      });
    }

    // Si se aprueba una solicitud:
    // 1. Actualizar el estado de la solicitud
    // 2. Cambiar la publicación a "no disponible"
    // 3. Rechazar automáticamente otras solicitudes pendientes de la misma publicación
    if (nuevoEstado === "Aprobada") {
      // Actualizar la solicitud a Aprobada
      const solicitudActualizada = await prisma.solicitud.update({
        where: { id: solicitud.id },
        data: { estado: nuevoEstado },
      });

      // Cambiar la publicación a no disponible
      await prisma.publicacion.update({
        where: { id: solicitud.publicacionId },
        data: { estado: "no disponible" },
      });

      // Rechazar automáticamente otras solicitudes pendientes de la misma publicación
      await prisma.solicitud.updateMany({
        where: {
          publicacionId: solicitud.publicacionId,
          id: { not: solicitud.id },
          estado: "Pendiente",
        },
        data: { estado: "Rechazada" },
      });

      // Enviar email al solicitante aprobado
      const nombreAnimal = solicitud.publicacion.Mascota[0]?.nombre || "la mascota";
      const nombreSolicitante = solicitud.usuario.nombre;

      await enviarNotificacionCambioEstado(
        solicitud.usuario.email,
        nombreSolicitante,
        nombreAnimal,
        nuevoEstado
      );

      return res.json({
        success: true,
        message: `Solicitud actualizada a ${nuevoEstado} y correo enviado al solicitante.`,
        solicitud: solicitudActualizada,
      });
    }

    // Para otros estados (Rechazada, Pendiente)
    const solicitudActualizada = await prisma.solicitud.update({
      where: { id: solicitud.id },
      data: { estado: nuevoEstado },
    });

    // Enviar email al solicitante
    const nombreAnimal = solicitud.publicacion.Mascota[0]?.nombre || "la mascota";
    const nombreSolicitante = solicitud.usuario.nombre;

    await enviarNotificacionCambioEstado(
      solicitud.usuario.email,
      nombreSolicitante,
      nombreAnimal,
      nuevoEstado
    );

    res.json({
      success: true,
      message: `Solicitud actualizada a ${nuevoEstado} y correo enviado al solicitante.`,
      solicitud: solicitudActualizada,
    });
  } catch (error) {
    console.error("Error al actualizar estado de solicitud:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

module.exports = { 
    createRequest,
    deleteRequest,
    getSolicitudesRecibidas,
    getSolicitudesEnviadas,
    actualizarEstadoSolicitud
};