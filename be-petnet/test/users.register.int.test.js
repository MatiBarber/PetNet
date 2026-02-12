const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');

/**
 * Cubre criterios de aceptación de Registro de usuarios
 */
describe('POST /users - Registro de usuarios', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('rechaza cuando faltan campos obligatorios', async () => {
    const res = await request(app)
      .post('/users')
      .send({
        // Falta apellido, telefono, provincia, localidad
        nombre: 'Ana',
        email: 'ana@example.com',
        password: 'Password1'
      });

    expect(res.status).toBe(400);
    expect(Array.isArray(res.body.errores)).toBe(true);
    // Al menos una validación debe fallar
    expect(res.body.errores.length).toBeGreaterThan(0);
  });

  it('valida formato de email y password mínimo 8 con letras y números', async () => {
    const res = await request(app)
      .post('/users')
      .send({
        nombre: 'Ana',
        apellido: 'Gomez',
        email: 'email-invalido',
        password: 'short',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'La Plata'
      });

    expect(res.status).toBe(400);
    expect(res.body.errores).toEqual(expect.any(Array));
  });

  it('registra usuario con datos válidos y devuelve token', async () => {
    const email = `test_${Date.now()}@example.com`;

    const res = await request(app)
      .post('/users')
      .send({
        nombre: 'Ana',
        apellido: 'Gomez',
        email,
        password: 'Password1',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'La Plata'
      });

    expect(res.status).toBe(201);
    expect(res.body.mensaje || res.body.message).toMatch(/registrado correctamente|Usuario creado exitosamente/i);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(10);
  });

  it('rechaza registro si el email ya existe', async () => {
    const email = `dup_${Date.now()}@example.com`;

    // primer registro
    const ok = await request(app)
      .post('/users')
      .send({
        nombre: 'Luis',
        apellido: 'Perez',
        email,
        password: 'Password1',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'Quilmes'
      });
    expect(ok.status).toBe(201);

    // segundo con el mismo email
    const dup = await request(app)
      .post('/users')
      .send({
        nombre: 'Luis',
        apellido: 'Perez',
        email,
        password: 'Password1',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'Quilmes'
      });

    expect([400, 409]).toContain(dup.status);
  });
});
