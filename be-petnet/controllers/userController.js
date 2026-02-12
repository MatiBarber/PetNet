const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require('../prismaClient');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';


// Simulamos una "base de datos" en memoria para el ejemplo

let users = [
  {
    id: 1,
    name: "Juan Pérez",
    email: "juan@example.com",
    userType: "ADOPTER",
  },
  {
    id: 2,
    name: "Refugio Patitas Felices",
    email: "refugio@patitas.com",
    userType: "SHELTER",
  },
  {
    id: 3,
    name: "María García",
    email: "maria@example.com",
    userType: "INDIVIDUAL",
  },
];

let nextId = 4;

// Obtener todos los usuarios
const getAllUsers = (req, res) => {
  try {
    // Simular filtros opcionales
    const { userType } = req.query;

    let filteredUsers = users;
    if (userType) {
      filteredUsers = users.filter(
        (user) => user.userType === userType.toUpperCase()
      );
    }

    res.json({
      success: true,
      data: filteredUsers,
      count: filteredUsers.length,
      message: "Usuarios obtenidos exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Obtener usuario por ID
const getUserById = (req, res) => {
  try {
    const { id } = req.params;
    const user = users.find((u) => u.id === parseInt(id));

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    res.json({
      success: true,
      data: user,
      message: "Usuario encontrado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

// Eliminar usuario
const deleteUser = (req, res) => {
  try {
    const { id } = req.params;
    const userIndex = users.findIndex((u) => u.id === parseInt(id));

    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
      });
    }

    users.splice(userIndex, 1);

    res.json({
      success: true,
      message: "Usuario eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};

const updateValidations = [
  body("nombre")
    .optional()
    .notEmpty().withMessage("Este campo es obligatorio")
    .matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/).withMessage("Ingrese un nombre válido"),
  body("apellido")
    .optional()
    .notEmpty().withMessage("Este campo es obligatorio")
    .matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/).withMessage("Ingrese un apellido válido"),
  body("telefono")
    .optional()
    .notEmpty().withMessage("Este campo es obligatorio")
    .isLength({ min: 10 }).withMessage("Ingrese un número de teléfono válido")
    .isNumeric().withMessage("Ingrese un número de teléfono válido"),
  body("provincia")
    .optional()
    .notEmpty().withMessage("Este campo es obligatorio")
    .isString().withMessage("Seleccione una provincia"),
  body("localidad")
    .optional()
    .notEmpty().withMessage("Este campo es obligatorio")
    .isString().withMessage("Seleccione una localidad"),
  // Rechazar explícitamente email y password
  body("email")
    .not().exists().withMessage("No se permite modificar el email"),
  body("password")
    .not().exists().withMessage("No se permite modificar la contraseña"),
  body("currentPassword")
    .not().exists().withMessage("No se permite modificar la contraseña"),
];

// Función de actualización
const updateUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }

  // El ID del usuario se obtiene del token JWT, no de los parámetros de la ruta
  const userId = req.user.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: "No autorizado, ID de usuario no encontrado en el token" });
  }

  const { nombre, apellido, telefono, provincia, localidad } = req.body;

  try {
    // Buscar usuario por ID para asegurarse de que existe
    const usuario = await prisma.usuario.findUnique({ where: { id: parseInt(userId, 10) } });
    if (!usuario) {
      return res.status(404).json({ success: false, message: "Usuario no encontrado" });
    }

    // Preparar datos para actualizar (solo campos permitidos)
    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (apellido !== undefined) updateData.apellido = apellido;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (provincia !== undefined) updateData.provincia = provincia;
    if (localidad !== undefined) updateData.localidad = localidad;

    // Actualizar usuario en DB
    const updatedUser = await prisma.usuario.update({
      where: { id: parseInt(userId, 10) },
      data: updateData,
    });

    res.json({
      success: true,
      message: "Usuario actualizado exitosamente",
      data: {
        id: updatedUser.id,
        nombre: updatedUser.nombre,
        apellido: updatedUser.apellido,
        email: updatedUser.email,
        telefono: updatedUser.telefono,
        provincia: updatedUser.provincia,
        localidad: updatedUser.localidad,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error interno del servidor", error: error.message });
  }
};

// Validaciones (array para reutilizar en rutas)
const registerValidations = [
  body("nombre")
    .notEmpty().withMessage("Este campo es obligatorio")
    .matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/).withMessage("Ingrese un nombre válido"),
  body("apellido")
    .notEmpty().withMessage("Este campo es obligatorio")
    .matches(/^[a-zA-ZÀ-ÿ\u00f1\u00d1\s]+$/).withMessage("Ingrese un apellido válido"),
  body("email")
    .notEmpty().withMessage("Este campo es obligatorio")
    .isEmail().withMessage("El correo ingresado no es válido"),
  body("password")
    .notEmpty().withMessage("Este campo es obligatorio")
    .isLength({ min: 8 }).withMessage("La contraseña debe tener mínimo 8 caracteres, con letras y números")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage("La contraseña debe tener mínimo 8 caracteres, con letras y números"),
  body("telefono")
    .notEmpty().withMessage("Este campo es obligatorio")
    .isLength({ min: 10 }).withMessage("Ingrese un número de teléfono válido")
    .isNumeric().withMessage("Ingrese un número de teléfono válido"),
  body("provincia")
    .notEmpty().withMessage("Este campo es obligatorio")
    .isString().withMessage("Seleccione una provincia"),
  body("localidad")
    .notEmpty().withMessage("Este campo es obligatorio")
    .isString().withMessage("Seleccione una localidad"),
];

// Función de registro
const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errores: errors.array() });
  }

  const { nombre, apellido, email, password, telefono, provincia, localidad } = req.body;

  try {
    // Validar si el usuario ya existe en DB
    const userExists = await prisma.usuario.findUnique({ where: { email } });
    if (userExists) {
      return res.status(400).json({ error: "El usuario ya está registrado" });
    }

    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Guardar usuario en DB
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email,
        password: hashedPassword,
        telefono,
        provincia,
        localidad,
      },
    });

    // Generar token JWT
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      mensaje: "Usuario registrado correctamente",
      token,
      usuario: { id: newUser.id, nombre, apellido, email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al registrar el usuario" });
  }
};

const getUserProfile = async (req, res) => {
  const id  = req.params.id;

  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(id, 10) },
      // include: { publicaciones: true }, // 👉 activar cuando definas publicaciones en el schema
    });

    if (!usuario) {
      return res
        .status(404)
        .json({ success: false, message: "Usuario no encontrado" });
    }

    const perfil = {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      telefono: usuario.telefono,
      provincia: usuario.provincia,
      localidad: usuario.localidad,
      fotoPerfil: usuario.fotoPerfil || null,
      // publicaciones:
      //   usuario.publicaciones && usuario.publicaciones.length > 0
      //     ? usuario.publicaciones.map((pub) => ({
      //         id: pub.id,
      //         titulo: pub.titulo,
      //         foto: pub.foto,
      //         detalleUrl: `/publicaciones/${pub.id}`, 
      //       }))
      //     : "Este usuario no tiene publicaciones disponibles",
    };

    res.json(perfil);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error.message,
    });
  }
};



module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  registerUser,
  registerValidations,
  updateValidations,
  getUserProfile,
};
