const jwt = require('jsonwebtoken');

// Usar la misma clave secreta que en authController
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware de Express para verificar un JWT desde el encabezado de autorización (Bearer token).
 * Si tiene éxito, adjunta { userId, email } a req.user.
 */
module.exports = function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Token de autorización no provisto o con formato incorrecto' });
    }

    const token = authHeader.substring(7); // Quita "Bearer "
    
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      // El payload esperado es: { userId, email, iat, exp }
      req.user = { userId: payload.userId, email: payload.email };
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al procesar la autenticación' });
  }
};
