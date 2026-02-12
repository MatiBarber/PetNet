const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');

/**
 * Tests de integración para login
 */
describe('POST /auth/login', () => {
  const testUser = {
    email: `test_login_${Date.now()}@example.com`,
    password: 'Password123',
    nombre: 'Usuario',
    apellido: 'Prueba',
    telefono: '1234567890',
    provincia: 'Buenos Aires',
    localidad: 'CABA'
  };

  beforeAll(async () => {
    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await prisma.usuario.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        nombre: testUser.nombre,
        apellido: testUser.apellido,
        telefono: testUser.telefono,
        provincia: testUser.provincia,
        localidad: testUser.localidad
      }
    });
  });

  afterAll(async () => {
    // Limpiar
    await prisma.usuario.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  it('falla cuando faltan campos obligatorios', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Email y contraseña son requeridos");
    });

    it('permite login exitoso con credenciales válidas', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Inicio de sesión exitoso");
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toEqual({
        id: expect.any(Number),
        email: testUser.email
      });
    });

    it('rechaza credenciales incorrectas', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Email o contraseña incorrecto");
      expect(res.body.token).toBeUndefined();
    });

    it('rechaza usuario inexistente', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'noexiste@email.com',
          password: 'Password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Email o contraseña incorrecto");
    });

    it('no expone información sensible', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.telefono).toBeUndefined();
      expect(res.body.user.nombre).toBeUndefined();
  });
});