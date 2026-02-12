const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');

describe('GET /users/:id - Ver perfil de Usuario (Sin fotoPerfil)', () => {
  let testUserId;

  beforeAll(async () => {
    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    const testUser = await prisma.usuario.create({
      data: {
        nombre: 'Test',
        apellido: 'User',
        email: 'test_profile_basic@example.com',
        password: hashedPassword,
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'La Plata'
      }
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Limpiar base de datos
    await prisma.usuario.deleteMany({
      where: {
        email: {
          contains: 'test_profile_basic'
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('Funcionalidad básica', () => {
    it('devuelve información básica del usuario correctamente', async () => {
      const res = await request(app)
        .get(`/users/${testUserId}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({
        nombre: 'Test',
        apellido: 'User',
        email: 'test_profile_basic@example.com',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'La Plata'
      }));
    });

    it('no muestra información sensible como contraseña', async () => {
      const res = await request(app)
        .get(`/users/${testUserId}`);

      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('password');
    });

    it('devuelve error 404 para usuario inexistente', async () => {
      const res = await request(app)
        .get('/users/99999');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        message: 'Usuario no encontrado'
      });
    });
  });
});