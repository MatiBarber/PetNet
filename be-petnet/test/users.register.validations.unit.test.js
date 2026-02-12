const { validationResult } = require('express-validator');
const { registerValidations } = require('../controllers/userController');

async function runValidations(body) {
  const req = { body };
  for (const v of registerValidations) {
    // Cada validador aplica sobre req
    // eslint-disable-next-line no-await-in-loop
    await v.run(req);
  }
  return validationResult(req);
}

describe('Validaciones de registro de usuario (unit)', () => {
  test('falla cuando faltan todos los campos obligatorios', async () => {
    const result = await runValidations({});
    expect(result.isEmpty()).toBe(false);

    const fields = result.array().map(e => e.path || e.param);
    ['nombre','apellido','email','password','telefono','provincia','localidad']
      .forEach(f => expect(fields).toContain(f));
  });

  test('email inválido y contraseña corta sin números', async () => {
    const result = await runValidations({
      nombre: 'Ana',
      apellido: 'Gomez',
      email: 'email-invalido',
      password: 'short',
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata',
    });
    const errors = result.array();
    const emailErr = errors.find(e => (e.path||e.param) === 'email');
    const passErr = errors.find(e => (e.path||e.param) === 'password');

    expect(emailErr).toBeTruthy();
    expect(emailErr.msg).toMatch(/no es válido|válido/i);
    expect(passErr).toBeTruthy();
    expect(passErr.msg).toMatch(/mínimo 8 caracteres/i);
  });

  test('nombre y apellido con caracteres inválidos', async () => {
    const result = await runValidations({
      nombre: 'Ana1',
      apellido: 'Gom3z',
      email: 'ana@example.com',
      password: 'Password1',
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata',
    });
    const errors = result.array();
    const nErr = errors.find(e => (e.path||e.param) === 'nombre');
    const aErr = errors.find(e => (e.path||e.param) === 'apellido');

    expect(nErr).toBeTruthy();
    expect(nErr.msg).toMatch(/nombre válido/i);
    expect(aErr).toBeTruthy();
    expect(aErr.msg).toMatch(/apellido válido/i);
  });

  test('teléfono debe ser numérico y al menos 10 dígitos', async () => {
    // Caso no numérico
    let result = await runValidations({
      nombre: 'Ana', apellido: 'Gomez', email: 'ana@example.com',
      password: 'Password1', telefono: 'abcdef', provincia: 'BA', localidad: 'LP'
    });
    let errors = result.array();
    let tErr = errors.find(e => (e.path||e.param) === 'telefono');
    expect(tErr).toBeTruthy();
    expect(tErr.msg).toMatch(/teléfono válido/i);

    // Caso corto
    result = await runValidations({
      nombre: 'Ana', apellido: 'Gomez', email: 'ana@example.com',
      password: 'Password1', telefono: '12345', provincia: 'BA', localidad: 'LP'
    });
    errors = result.array();
    tErr = errors.find(e => (e.path||e.param) === 'telefono');
    expect(tErr).toBeTruthy();
    expect(tErr.msg).toMatch(/teléfono válido/i);
  });

  test('provincia y localidad deben ser string y no vacíos', async () => {
    const result = await runValidations({
      nombre: 'Ana', apellido: 'Gomez', email: 'ana@example.com',
      password: 'Password1', telefono: '1234567890', provincia: 123, localidad: {}
    });
    const errors = result.array();
    const pErr = errors.find(e => (e.path||e.param) === 'provincia');
    const lErr = errors.find(e => (e.path||e.param) === 'localidad');

    expect(pErr).toBeTruthy();
    expect(pErr.msg).toMatch(/Seleccione una provincia/i);
    expect(lErr).toBeTruthy();
    expect(lErr.msg).toMatch(/Seleccione una localidad/i);
  });

  test('payload válido pasa sin errores', async () => {
    const result = await runValidations({
      nombre: 'Ana',
      apellido: 'Gomez',
      email: `ana_${Date.now()}@example.com`,
      password: 'Password1',
      telefono: '1234567890',
      provincia: 'Buenos Aires',
      localidad: 'La Plata',
    });
    expect(result.isEmpty()).toBe(true);
  });
});
