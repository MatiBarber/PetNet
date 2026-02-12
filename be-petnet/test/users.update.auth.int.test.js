const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('PUT /users - Actualización de perfil con autenticación JWT', () => {
  let testUser;
  let userToken;

  beforeAll(async () => {
    // 1. Crear un usuario de prueba
    testUser = await prisma.usuario.create({
      data: {
        nombre: 'Auth',
        apellido: 'User',
        email: `auth.update.${Date.now()}@example.com`,
        password: 'hashedpassword', // No se usa para login, solo para que exista
        telefono: '1122334455',
        provincia: 'Test Provincia',
        localidad: 'Test Localidad',
      },
    });

    // 2. Generar un token JWT para este usuario
    userToken = jwt.sign({ userId: testUser.id, email: testUser.email }, JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Limpiar el usuario de prueba
    if (testUser) {
      await prisma.usuario.delete({ where: { id: testUser.id } });
    }
    await prisma.$disconnect();
  });

  it('debería actualizar el perfil del usuario con un token válido', async () => {
    const updateData = {
      nombre: 'Nombre Actualizado',
      apellido: 'Apellido Actualizado',
      telefono: '0000000000',
    };

    const res = await request(app)
      .put('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send(updateData);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nombre).toBe(updateData.nombre);
    expect(res.body.data.apellido).toBe(updateData.apellido);
    expect(res.body.data.telefono).toBe(updateData.telefono);
    expect(res.body.data.email).toBe(testUser.email); // El email no debe cambiar
  });

  it('debería rechazar la actualización si no se provee un token', async () => {
    const res = await request(app)
      .put('/users')
      .send({ nombre: 'Intento Fallido' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Token de autorización no provisto');
  });

  it('debería rechazar la actualización con un token inválido o malformado', async () => {
    const res = await request(app)
      .put('/users')
      .set('Authorization', 'Bearer tokeninvalido123')
      .send({ nombre: 'Otro Intento Fallido' });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Token inválido o expirado');
  });

  it('debería rechazar la actualización si se intenta modificar el email', async () => {
    const res = await request(app)
      .put('/users')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ email: 'nuevo@email.com' });

    expect(res.statusCode).toBe(400);
    expect(res.body.errores).toBeInstanceOf(Array);
    const emailError = res.body.errores.find(e => e.path === 'email');
    expect(emailError).toBeDefined();
    expect(emailError.msg).toContain('No se permite modificar el email');
  });

  it('debería devolver 404 si el usuario del token no existe en la BD', async () => {
    // Crear un token para un ID de usuario que no existe
    const nonExistentUserId = 999999;
    const fakeToken = jwt.sign({ userId: nonExistentUserId, email: 'fake@user.com' }, JWT_SECRET);

    const res = await request(app)
      .put('/users')
      .set('Authorization', `Bearer ${fakeToken}`)
      .send({ nombre: 'Fantasma' });

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Usuario no encontrado');
  });
});
