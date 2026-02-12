var express = require("express");
var router = express.Router();
const publicacionController = require("../controllers/publicationController");
const authMiddleware = require("../middleware/auth");

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     PublicacionCreate:
 *       type: object
 *       required:
 *         - nombre
 *         - tamaño
 *         - sexo
 *         - tipo
 *         - descripcion
 *         - foto
 *       properties:
 *         nombre:
 *           type: string
 *         tamaño:
 *           type: string
 *           enum: [Chico, Mediano, Grande]
 *         sexo:
 *           type: string
 *           enum: [Macho, Hembra]
 *         tipo:
 *           type: string
 *           enum: [Perro, Gato, Pájaro, Conejo]
 *         descripcion:
 *           type: string
 *         foto:
 *           type: string
 *           format: byte
 *           description: Imagen en formato base64 (data:image/jpeg;base64,...). Máximo 5MB
 *           example: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
 *     PublicacionResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             foto:
 *               type: string
 *             estado:
 *               type: string
 *             usuarioId:
 *               type: integer
 *             mascota:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 nombre:
 *                   type: string
 *                 tipo:
 *                   type: string
 *                 sexo:
 *                   type: string
 *                 tamaño:
 *                   type: string
 *                 descripcion:
 *                   type: string
 */

/**
 * @swagger
 * tags:
 *   name: Publications
 *   description: Operaciones de publicaciones de animales
 */

/**
 * @swagger
 * /publications:
 *   post:
 *     summary: Crear publicación de animal en adopción
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       description: La foto es opcional. Si se envía, debe ser una imagen en Base64 (data:image/jpeg;base64,...) de hasta 5MB.
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PublicacionCreate'
 *           example:
 *             nombre: "Firulais"
 *             tamaño: "Mediano"
 *             sexo: "Macho"
 *             tipo: "Perro"
 *             descripcion: "Muy cariñoso y juguetón"
 *             foto: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
 *     responses:
 *       201:
 *         description: Publicación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicacionResponse'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *             example:
 *               errores:
 *                 - msg: "El nombre es obligatorio"
 *                   param: "nombre"
 *       401:
 *         description: No autenticado
 *       500:
 *         description: No se pudo crear la publicación, intente nuevamente
 */
// Ruta para crear una publicación
router.post("/", authMiddleware, publicacionController.createPublicationValidations, publicacionController.createPublication);

/**
 * @swagger
 * /publications/{id}:
 *   put:
 *     summary: Editar publicación de animal en adopción
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la publicación a editar
 *     requestBody:
 *       description: La foto y el estado son opcionales. Si se envía foto, debe ser una imagen en Base64 (data:image/jpeg;base64,...) de hasta 5MB. El estado puede ser "disponible" o "adoptado".
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PublicacionCreate'
 *           example:
 *             nombre: "Firulais"
 *             tamaño: "Mediano"
 *             sexo: "Macho"
 *             tipo: "Perro"
 *             descripcion: "Muy cariñoso y juguetón"
 *             foto: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD..."
 *             estado: "disponible"
 *     responses:
 *       200:
 *         description: La publicación se editó correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicacionResponse'
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 errores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *             example:
 *               errores:
 *                 - msg: "El tamaño debe ser: Chico, Mediano o Grande"
 *                   param: "tamaño"
 *       401:
 *         description: No autenticado (sin token)
 *       403:
 *         description: No tienes permiso para editar esta publicación
 *       404:
 *         description: Publicación no encontrada
 *       500:
 *         description: No se pudo editar la publicación, intente nuevamente
 */
// Ruta para editar una publicación
router.put("/:id", authMiddleware, publicacionController.updatePublicationValidations, publicacionController.updatePublication);

/**
 * @swagger
 * /publications/available:
 *   get:
 *     summary: Obtener todas las publicaciones disponibles para adopción
 *     description: Retorna todas las publicaciones con estado "disponible". Opcionalmente se puede filtrar por tipo de animal.
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [Perro, Gato, Pájaro, Conejo]
 *         required: false
 *         description: Tipo de animal para filtrar las publicaciones
 *     responses:
 *       200:
 *         description: Lista de publicaciones disponibles obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publicaciones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       estado:
 *                         type: string
 *                       foto:
 *                         type: string
 *                       mascota:
 *                         type: object
 *                         properties:
 *                           nombre:
 *                             type: string
 *                           tipo:
 *                             type: string
 *                 message:
 *                   type: string
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/available", authMiddleware, publicacionController.getPublicacionesDisponibles);

/**
 * @swagger
 * /publications/me:
 *   get:
 *     summary: Obtener las publicaciones del usuario autenticado
 *     description: Retorna todas las publicaciones creadas por el usuario autenticado
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de publicaciones del usuario obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publicaciones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       estado:
 *                         type: string
 *                       mascota:
 *                         type: object
 *                         properties:
 *                           nombre:
 *                             type: string
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/me", authMiddleware, publicacionController.getMisPublicaciones);

/**
 * @swagger
 * /publications/{id}:
 *   get:
 *     summary: Obtener el detalle completo de una publicación
 *     description: Retorna toda la información de una publicación específica, incluyendo datos de la mascota y del publicante
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la publicación
 *     responses:
 *       200:
 *         description: Detalle de la publicación obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publicacion:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     foto:
 *                       type: string
 *                     estado:
 *                       type: string
 *                     mascota:
 *                       type: object
 *                       properties:
 *                         nombre:
 *                           type: string
 *                         tipo:
 *                           type: string
 *                         sexo:
 *                           type: string
 *                         tamaño:
 *                           type: string
 *                         descripcion:
 *                           type: string
 *                     publicante:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         nombre:
 *                           type: string
 *                         apellido:
 *                           type: string
 *                         email:
 *                           type: string
 *                         telefono:
 *                           type: string
 *                         provincia:
 *                           type: string
 *                         localidad:
 *                           type: string
 *       404:
 *         description: Publicación no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:id", authMiddleware, publicacionController.getDetallePublicacion);

/**
 * @swagger
 * /publications/{id}:
 *   delete:
 *     summary: Eliminar publicación de adopción
 *     tags: [Publications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la publicación a eliminar
 *     responses:
 *       200:
 *         description: La publicación se eliminó correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *             example:
 *               success: true
 *               message: "La publicación se eliminó correctamente"
 *       400:
 *         description: ID de publicación inválido
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permiso para eliminar esta publicación
 *       404:
 *         description: Publicación no encontrada
 *       500:
 *         description: Hubo un problema al eliminar la publicación, intenta nuevamente
 */
router.delete("/:id", authMiddleware, publicacionController.deletePublication);

module.exports = router;