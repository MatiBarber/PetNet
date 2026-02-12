const { validationResult } = require('express-validator');
const { updateValidations } = require('../controllers/userController');

async function runValidations(body) {
  const req = { body };
  for (const v of updateValidations) {
    // Cada validador aplica sobre req
    // eslint-disable-next-line no-await-in-loop
    await v.run(req);
  }
  return validationResult(req);
}

describe('Validaciones de actualización de perfil de usuario (unit)', () => {
  test('permite actualización sin enviar ningún campo', async () => {
    // Para actualización de perfil, todos los campos son opcionales
    const result = await runValidations({});
    expect(result.isEmpty()).toBe(true);
  });

  test('rechaza intentos de actualizar email', async () => {
    // Email NO debe ser permitido en actualizaciones
    const result = await runValidations({
      nombre: 'Juan',
      apellido: 'Pérez',
      email: 'juan@example.com', // Este campo debe ser rechazado
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata'
    });
    
    const errors = result.array();
    const emailErr = errors.find(e => (e.path || e.param) === 'email');
    
    // Debe haber error de email porque no se permite actualizarlo
    expect(emailErr).toBeTruthy();
    expect(emailErr.msg).toMatch(/no se permite.*email/i);
  });

  test('rechaza intentos de actualizar contraseña', async () => {
    // Password NO debe ser permitido en actualizaciones
    const result = await runValidations({
      nombre: 'Juan',
      apellido: 'Pérez',
      password: 'Password123', // Este campo debe ser rechazado
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata'
    });
    
    const errors = result.array();
    const passwordErr = errors.find(e => (e.path || e.param) === 'password');
    
    // Debe haber error de password porque no se permite actualizarlo
    expect(passwordErr).toBeTruthy();
    expect(passwordErr.msg).toMatch(/no se permite.*contraseña/i);
  });

  test('rechaza intentos de enviar currentPassword', async () => {
    // currentPassword NO debe ser permitido porque ya no se pueden cambiar contraseñas
    const result = await runValidations({
      nombre: 'Juan',
      apellido: 'Pérez',
      currentPassword: 'OldPassword123', // Este campo debe ser rechazado
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata'
    });
    
    const errors = result.array();
    const currentPasswordErr = errors.find(e => (e.path || e.param) === 'currentPassword');
    
    // Debe haber error de currentPassword porque no se permite
    expect(currentPasswordErr).toBeTruthy();
    expect(currentPasswordErr.msg).toMatch(/no se permite.*contraseña/i);
  });

  test('nombre y apellido con caracteres inválidos son rechazados', async () => {
    const result = await runValidations({
      nombre: 'Juan123',
      apellido: 'Pérez456',
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata'
    });
    
    const errors = result.array();
    const nombreErr = errors.find(e => (e.path || e.param) === 'nombre');
    const apellidoErr = errors.find(e => (e.path || e.param) === 'apellido');

    expect(nombreErr).toBeTruthy();
    expect(nombreErr.msg).toMatch(/nombre válido/i);
    expect(apellidoErr).toBeTruthy();
    expect(apellidoErr.msg).toMatch(/apellido válido/i);
  });

  test('teléfono debe ser numérico y al menos 10 dígitos', async () => {
    // Caso con letras
    let result = await runValidations({
      nombre: 'Juan',
      apellido: 'Pérez',
      telefono: 'abc123def',
      provincia: 'Buenos Aires',
      localidad: 'La Plata'
    });
    
    let errors = result.array();
    let telefonoErr = errors.find(e => (e.path || e.param) === 'telefono');
    expect(telefonoErr).toBeTruthy();
    expect(telefonoErr.msg).toMatch(/teléfono válido/i);

    // Caso muy corto
    result = await runValidations({
      nombre: 'Juan',
      apellido: 'Pérez',
      telefono: '12345',
      provincia: 'Buenos Aires',
      localidad: 'La Plata'
    });
    
    errors = result.array();
    telefonoErr = errors.find(e => (e.path || e.param) === 'telefono');
    expect(telefonoErr).toBeTruthy();
    expect(telefonoErr.msg).toMatch(/teléfono válido/i);
  });

  test('provincia y localidad deben ser strings válidos', async () => {
    const result = await runValidations({
      nombre: 'Juan',
      apellido: 'Pérez',
      telefono: '1234567890',
      provincia: '', // String vacío
      localidad: ''  // String vacío
    });
    
    const errors = result.array();
    const provinciaErr = errors.find(e => (e.path || e.param) === 'provincia');
    const localidadErr = errors.find(e => (e.path || e.param) === 'localidad');

    expect(provinciaErr).toBeTruthy();
    expect(provinciaErr.msg).toMatch(/obligatorio/i); // El mensaje será "Este campo es obligatorio"
    expect(localidadErr).toBeTruthy();
    expect(localidadErr.msg).toMatch(/obligatorio/i); // El mensaje será "Este campo es obligatorio"
  });

  test('campos vacíos son rechazados cuando están presentes', async () => {
    // Como los campos son opcionales, solo se validan si están presentes
    // Campos vacíos (cadenas vacías) deberían ser rechazados
    const result = await runValidations({
      nombre: '',
      apellido: '',
      telefono: '',
      provincia: '',
      localidad: ''
    });
    
    const errors = result.array();
    
    // Verificar que todos los campos presentes pero vacíos tienen error de "campo obligatorio"
    ['nombre', 'apellido', 'telefono', 'provincia', 'localidad'].forEach(field => {
      const fieldErr = errors.find(e => (e.path || e.param) === field);
      expect(fieldErr).toBeTruthy();
      expect(fieldErr.msg).toMatch(/obligatorio/i);
    });
  });

  test('payload válido pasa todas las validaciones', async () => {
    const result = await runValidations({
      nombre: 'Juan Carlos',
      apellido: 'Perez Lopez',
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata'
    });
    
    if (!result.isEmpty()) {
      console.log('Errores encontrados:', result.array());
    }
    
    expect(result.isEmpty()).toBe(true);
  });

  test('nombres y apellidos válidos con espacios y acentos DEBEN ser aceptados', async () => {
    // DEBE aceptar nombres con acentos según requisitos de UX
    const result = await runValidations({
      nombre: 'María José',
      apellido: 'González Pérez',
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata'
    });
    
    // Debug: mostrar errores si los hay
    if (!result.isEmpty()) {
      console.log('Errores encontrados:', result.array());
    }
    
    // Si falla, expone que la regex está mal implementada
    expect(result.isEmpty()).toBe(true);
  });

  test('puede actualizar perfil sin cambiar campos restringidos', async () => {
    // Debe pasar validaciones si no se incluyen campos restringidos (email, password, currentPassword)
    const result = await runValidations({
      nombre: 'Juan Carlos',
      apellido: 'Perez Lopez',
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata'
    });
    
    expect(result.isEmpty()).toBe(true);
  });
});