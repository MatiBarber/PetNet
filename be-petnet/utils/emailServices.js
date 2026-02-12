const nodemailer = require("nodemailer");


// ⚠️ En producción, guardá estas credenciales en variables de entorno (.env)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "petnet.refugio@gmail.com",
    pass: process.env.EMAIL_PASS || "PetNet1234",
  },
});

/**
 * Envía un correo electrónico al usuario solicitante
 * @param {string} to - Email del destinatario
 * @param {string} nombreSolicitante
 * @param {string} nombreAnimal
 * @param {string} nuevoEstado
 */
async function enviarNotificacionCambioEstado(to, nombreSolicitante, nombreAnimal, nuevoEstado) {
  const mailOptions = {
    from: `"PetNet" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Actualización de tu solicitud de adopción",
    text: `Hola ${nombreSolicitante},

    Tu solicitud de adopción para ${nombreAnimal} ha sido ${nuevoEstado}.

    Gracias por usar nuestra plataforma.

    El equipo de PetNet 🐾`,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * NUEVO: Notifica al DUEÑO de la publicación cuando entra una solicitud
 * @param {string} toOwner - Email del dueño
 * @param {string} nombreOwner - Nombre del dueño
 * @param {string} nombreAnimal - Nombre de la mascota
 * @param {string} nombreSolicitante - Nombre del solicitante
 * @param {string} mensaje - Mensaje que escribió el solicitante
 * @param {string} linkPanel - URL al panel del dueño para gestionar la solicitud
 */
async function enviarNotificacionNuevaSolicitud(toOwner, nombreOwner, nombreAnimal, nombreSolicitante, mensaje, linkPanel) {
  const mailOptions = {
    from: `"PetNet" <${process.env.EMAIL_USER}>`,
    to: toOwner,
    subject: "Nueva solicitud de adopción recibida",
    text: `Hola ${nombreOwner},

Recibiste una nueva solicitud de adopción para ${nombreAnimal}.

Solicitante: ${nombreSolicitante}
Mensaje: ${mensaje || "(sin mensaje)"}

Para gestionarla, ingresa a tu panel:
${linkPanel || "#"}

El equipo de PetNet 🐾`,
  };

  await transporter.sendMail(mailOptions);
}


module.exports = { 
  enviarNotificacionCambioEstado,
  enviarNotificacionNuevaSolicitud, // 👈 export nuevo
};