const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

// Clave secreta para JWT - En producción, usar variables de entorno
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validar campos requeridos
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: "Email y contraseña son requeridos" 
            });
        }

        // Buscar usuario por email
        const user = await prisma.usuario.findUnique({
            where: { email }
        });

        // Verificar si el usuario existe
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: "Email o contraseña incorrecto" 
            });
        }

        // Verificar contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false,
                message: "Email o contraseña incorrecto" 
            });
        }

        // Generar token JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Respuesta exitosa con token
        res.status(200).json({ 
            success: true,
            message: "Inicio de sesión exitoso",
            token: token,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ 
            success: false,
            message: "Error en el servidor",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { login };