var express = require("express");
var router = express.Router();
const requestController = require("../controllers/requestController");
const authMiddleware = require("../middleware/auth");

/**
 * @swagger
 * tags:
 *   name: Solicitudes
 *   description: Operaciones de solicitudes de adopción
 */

/**
 * @swagger
 * /requests:
 *   post:
 *     summary: Enviar solicitud de adopción
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - publicacionId
 *               - mensaje
 *             properties:
 *               publicacionId:
 *                 type: integer
 *               mensaje:
 *                 type: string
 *           example:
 *             publicacionId: 123
 *             mensaje: "Me gustaría adoptar a esta mascota"
 *     responses:
 *       201:
 *         description: Solicitud enviada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Solicitud enviada correctamente"
 *                 data:
 *                   type: object
 *       400:
 *         description: Validaciones fallidas (campos faltantes, ya enviaste solicitud, publicación no disponible, es tu propia publicación)
 *       401:
 *         description: No autenticado
 *       404:
 *         description: Publicación no encontrada
 *       500:
 *         description: No se pudo enviar la solicitud, intente nuevamente
 */
router.post("/", authMiddleware, requestController.createRequest);

/**
 * @swagger
 * /requests/{id}:
 *   delete:
 *     summary: Cancelar solicitud de adopción pendiente
 *     tags: [Solicitudes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID de la solicitud a cancelar
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Operación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Solicitud cancelada correctamente"
 *       400:
 *         description: ID inválido o Solo se pueden cancelar solicitudes pendientes
 *       401:
 *         description: No autenticado
 *       403:
 *         description: No tienes permiso para cancelar esta solicitud
 *       404:
 *         description: Solicitud no encontrada
 *       500:
 *         description: No se pudo cancelar la solicitud, intente nuevamente
 */
router.delete("/:id", authMiddleware, requestController.deleteRequest);

router.get("/recibidas", authMiddleware, requestController.getSolicitudesRecibidas);

router.get("/enviadas", authMiddleware, requestController.getSolicitudesEnviadas);

router.patch("/:id/estado", authMiddleware, requestController.actualizarEstadoSolicitud);


module.exports = router;
