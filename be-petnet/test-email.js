/**
 * Script de prueba para verificar el envío de emails
 * 
 * INSTRUCCIONES PARA CONFIGURAR GMAIL:
 * 
 * 1. Ve a tu cuenta de Google: https://myaccount.google.com/
 * 2. En el menú izquierdo, selecciona "Seguridad"
 * 3. Habilita la "Verificación en dos pasos" (si no la tienes)
 * 4. Busca "Contraseñas de aplicaciones" (App Passwords)
 * 5. Genera una nueva contraseña para "Correo"
 * 6. Copia la contraseña de 16 caracteres que te dan
 * 7. Actualiza tu archivo .env con:
 *    EMAIL_USER=tu_email@gmail.com
 *    EMAIL_PASS=la_contraseña_de_16_caracteres
 * 
 * ALTERNATIVA RÁPIDA (sin configurar Gmail):
 * Usa Ethereal Email (emails de prueba falsos):
 * - No requiere configuración
 * - Te da un inbox temporal para ver los emails
 * - Perfecto para desarrollo
 */

require('dotenv').config();
const nodemailer = require("nodemailer");

async function testEmailService() {
  console.log('\n🔧 Configuración actual:');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || 'No configurado');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '****' : 'No configurado');
  
  console.log('\n📧 Selecciona el método de prueba:');
  console.log('1. Gmail (requiere contraseña de aplicación)');
  console.log('2. Ethereal Email (servidor de prueba - recomendado)');
  
  // Opción 2: Ethereal Email (recomendado para pruebas)
  console.log('\n✨ Usando Ethereal Email (servidor de prueba)...\n');
  
  try {
    // Crear cuenta de prueba temporal en Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    console.log('📬 Cuenta de prueba creada:');
    console.log('   Email:', testAccount.user);
    console.log('   Password:', testAccount.pass);
    console.log('   Web:', 'https://ethereal.email/messages');
    
    // Crear transporter con Ethereal
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    // Enviar email de prueba
    console.log('\n📤 Enviando email de prueba...');
    
    const info = await transporter.sendMail({
      from: '"PetNet Refugio" <petnet@example.com>',
      to: 'solicitante@example.com',
      subject: '✅ Prueba de notificación - Tu solicitud fue APROBADA',
      text: `Hola María,

Tu solicitud de adopción para Firulais ha sido Aprobada.

¡Felicitaciones! Pronto nos pondremos en contacto contigo para coordinar la adopción.

Gracias por usar nuestra plataforma.

El equipo de PetNet 🐾`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">✅ ¡Buenas noticias!</h2>
          <p>Hola <strong>María</strong>,</p>
          <p>Tu solicitud de adopción para <strong>Firulais</strong> ha sido <span style="color: #4CAF50; font-weight: bold;">APROBADA</span>.</p>
          <p>¡Felicitaciones! Pronto nos pondremos en contacto contigo para coordinar la adopción.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 14px;">Gracias por usar nuestra plataforma.</p>
          <p style="color: #666; font-size: 14px;">El equipo de PetNet 🐾</p>
        </div>
      `
    });

    console.log('\n✅ Email enviado exitosamente!');
    console.log('   Message ID:', info.messageId);
    console.log('\n🔗 Ver el email en:');
    console.log('   ', nodemailer.getTestMessageUrl(info));
    console.log('\n💡 Copia y pega el link de arriba en tu navegador para ver el email\n');

  } catch (error) {
    console.error('\n❌ Error al enviar email:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Solución:');
      console.log('   1. Si usas Gmail, necesitas una "Contraseña de aplicación"');
      console.log('   2. Ve a: https://myaccount.google.com/apppasswords');
      console.log('   3. Genera una contraseña para "Correo"');
      console.log('   4. Actualiza EMAIL_PASS en tu archivo .env');
    }
  }
}

// También probar con Gmail si está configurado
async function testGmail() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n⚠️  Gmail no está configurado en .env');
    console.log('   Agrega EMAIL_USER y EMAIL_PASS con tu contraseña de aplicación\n');
    return;
  }

  console.log('\n📧 Probando Gmail...');
  
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"PetNet" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Enviar a ti mismo
      subject: '✅ Test PetNet - Solicitud Aprobada',
      text: `Hola,

Esta es una prueba del sistema de notificaciones de PetNet.

Tu solicitud de adopción para Firulais ha sido Aprobada.

El equipo de PetNet 🐾`,
    });

    console.log('✅ Email de Gmail enviado exitosamente!');
    console.log('   Message ID:', info.messageId);
    console.log('   Revisa tu bandeja de entrada:', process.env.EMAIL_USER, '\n');

  } catch (error) {
    console.error('\n❌ Error con Gmail:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 SOLUCIÓN - Configurar Gmail:');
      console.log('   1. Ve a: https://myaccount.google.com/security');
      console.log('   2. Habilita "Verificación en dos pasos"');
      console.log('   3. Busca "Contraseñas de aplicaciones"');
      console.log('   4. Genera una para "Correo"');
      console.log('   5. Actualiza .env con la contraseña de 16 caracteres\n');
    }
  }
}

// Ejecutar pruebas
async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 TEST DE SERVICIO DE EMAILS - PETNET');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Primero probar con Ethereal (siempre funciona)
  await testEmailService();
  
  // Luego intentar con Gmail si está configurado
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  await testGmail();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✨ Prueba completada\n');
}

main().catch(console.error);
