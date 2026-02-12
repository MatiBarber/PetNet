const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Cubre criterios de aceptación de Edición de perfil de usuarios
 */
describe('PUT /users - Edición de perfil de usuarios (con JWT)', () => {
  let testUserId;
  let testUserEmail;
  let userToken;

  beforeAll(async () => {
    // Crear un usuario de prueba para los tests de actualización
    testUserEmail = `test_update_${Date.now()}@example.com`;
    
    const testUser = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Prueba',
        email: testUserEmail,
        password: 'password_hasheada',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'La Plata'
      }
    });
    
    testUserId = testUser.id;
    // Generar token para el usuario de prueba
    userToken = jwt.sign({ userId: testUserId, email: testUserEmail }, JWT_SECRET);
  });

  beforeEach(async () => {
    // No es necesario restablecer la contraseña, ya que no se usa para el login con token
  });

  afterAll(async () => {
    // Limpiar usuarios de prueba
    await prisma.usuario.deleteMany({
      where: {
        email: {
          contains: 'test_update_'
        }
      }
    });
    await prisma.$disconnect();
  });

  describe('Funcionalidad - Validar formulario de edición con datos actuales', () => {
    it('permite actualizar perfil con datos válidos y muestra mensaje de éxito', async () => {
      const updatedData = {
        nombre: 'Usuario Actualizado',
        apellido: 'Prueba Actualizada',
        telefono: '9876543210',
        provincia: 'Córdoba',
        localidad: 'Córdoba Capital'
      };

      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/actualizado.*exitosamente|actualizado correctamente/i);
      expect(res.body.data).toEqual(expect.objectContaining({
        id: testUserId,
        nombre: updatedData.nombre,
        apellido: updatedData.apellido,
        telefono: updatedData.telefono,
        provincia: updatedData.provincia,
        localidad: updatedData.localidad
      }));
      // El email debe mantenerse igual (no se puede cambiar)
      expect(res.body.data.email).toBe(testUserEmail);
      // El password no debe devolverse en la respuesta
      expect(res.body.data.password).toBeUndefined();
    });

    it('preserva campos que no se envían en la actualización', async () => {
      // Solo actualizar algunos campos
      const partialUpdate = {
        nombre: 'Solo Nombre',
        apellido: 'Solo Apellido',
        telefono: '1111111111',
        provincia: 'Santa Fe',
        localidad: 'Rosario'
      };

      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(partialUpdate);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(testUserEmail); // Email se preserva (no se puede cambiar)
    });
  });

  describe('Funcionalidad - Validar que email y contraseña no se pueden cambiar', () => {
    it('rechaza intentos de cambiar email', async () => {
      const newEmail = `rejected_${Date.now()}@example.com`;
      
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          email: newEmail, // Intentar cambiar email (debe ser rechazado)
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual(expect.any(Array));
      const emailError = res.body.errores.find(e => e.path === 'email' || e.param === 'email');
      expect(emailError).toBeTruthy();
      expect(emailError.msg).toMatch(/no se permite.*email/i);
    });

    it('rechaza intentos de cambiar contraseña', async () => {
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          password: 'NewPassword123', // Intentar cambiar password (debe ser rechazado)
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual(expect.any(Array));
      const passwordError = res.body.errores.find(e => e.path === 'password' || e.param === 'password');
      expect(passwordError).toBeTruthy();
      expect(passwordError.msg).toMatch(/no se permite.*contraseña/i);
    });

    it('rechaza intentos de enviar currentPassword', async () => {
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          currentPassword: 'AnyPassword123', // Intentar enviar currentPassword (debe ser rechazado)
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual(expect.any(Array));
      const currentPasswordError = res.body.errores.find(e => e.path === 'currentPassword' || e.param === 'currentPassword');
      expect(currentPasswordError).toBeTruthy();
      expect(currentPasswordError.msg).toMatch(/no se permite.*contraseña/i);
    });
  });

  describe('Funcionalidad - Validar formato de teléfono', () => {
    it('rechaza teléfono con caracteres no permitidos (letras)', async () => {
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          password: 'Password1',
          telefono: 'abc123def',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual(expect.any(Array));
      const phoneError = res.body.errores.find(e => e.path === 'telefono' || e.param === 'telefono');
      expect(phoneError).toBeTruthy();
      expect(phoneError.msg).toMatch(/teléfono válido/i);
    });

    it('acepta teléfono con formato válido (solo números)', async () => {
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.telefono).toBe('1234567890');
    });
  });

  describe('Funcionalidad - Validar campos permitidos', () => {
    it('permite actualización parcial de campos permitidos', async () => {
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          // Solo actualizar nombre - otros campos son opcionales
          nombre: 'Solo Nombre'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nombre).toBe('Solo Nombre');
    });

    it('permite guardar con todos los campos permitidos presentes', async () => {
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Nombre Completo',
          apellido: 'Apellido Completo',
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Seguridad - Validar restricciones de campos', () => {
    it('no permite cambiar email (funcionalidad removida)', async () => {
      // Esta funcionalidad ha sido removida por requisitos de seguridad
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          email: `another_${Date.now()}@example.com`, // Email diferente debe ser rechazado
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual(expect.any(Array));
      const emailError = res.body.errores.find(e => e.path === 'email' || e.param === 'email');
      expect(emailError).toBeTruthy();
      expect(emailError.msg).toMatch(/no se permite.*email/i);
    });

    it('no permite cambiar contraseña (funcionalidad removida)', async () => {
      // Esta funcionalidad ha sido removida por requisitos de seguridad
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          password: 'NewPassword123', // Password debe ser rechazado
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual(expect.any(Array));
      const passwordError = res.body.errores.find(e => e.path === 'password' || e.param === 'password');
      expect(passwordError).toBeTruthy();
      expect(passwordError.msg).toMatch(/no se permite.*contraseña/i);
    });
  });

  describe('Casos de error', () => {
    it('retorna error 401 cuando el token no es provisto', async () => {
      const res = await request(app)
        .put(`/users`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/autorización no provisto/i);
    });

    it('retorna error 404 si el usuario del token no existe', async () => {
      // Token para un usuario que no existe
      const fakeToken = jwt.sign({ userId: 99999, email: 'no@existe.com' }, JWT_SECRET);
      
      const res = await request(app)
        .put('/users')
        .set('Authorization', `Bearer ${fakeToken}`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/no encontrado/i);
    });
  });

  describe('Usabilidad - Mensajes de error claros', () => {
    it('devuelve mensajes de error específicos para cada campo', async () => {
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: '', // Campo vacío
          apellido: 'Apellido123', // Caracteres inválidos
          telefono: 'abc', // No numérico y muy corto
          provincia: '', // Campo vacío
          localidad: '' // Campo vacío
        });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual(expect.any(Array));
      expect(res.body.errores.length).toBeGreaterThan(0);
      
      // Verificar que los mensajes son descriptivos
      res.body.errores.forEach(error => {
        expect(error.msg).toBeTruthy();
        expect(typeof error.msg).toBe('string');
        expect(error.msg.length).toBeGreaterThan(0);
      });
    });

    it('devuelve mensajes claros cuando se intentan cambiar campos restringidos', async () => {
      const res = await request(app)
        .put(`/users`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          nombre: 'Usuario',
          apellido: 'Prueba',
          email: 'test@example.com', // Campo restringido
          password: 'Password123', // Campo restringido
          currentPassword: 'OldPassword123', // Campo restringido
          telefono: '1234567890',
          provincia: 'Buenos Aires',
          localidad: 'La Plata'
        });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual(expect.any(Array));
      
      // Verificar que hay errores específicos para los campos restringidos
      const emailError = res.body.errores.find(e => e.path === 'email' || e.param === 'email');
      const passwordError = res.body.errores.find(e => e.path === 'password' || e.param === 'password');
      const currentPasswordError = res.body.errores.find(e => e.path === 'currentPassword' || e.param === 'currentPassword');
      
      expect(emailError).toBeTruthy();
      expect(emailError.msg).toMatch(/no se permite.*email/i);
      expect(passwordError).toBeTruthy();
      expect(passwordError.msg).toMatch(/no se permite.*contraseña/i);
      expect(currentPasswordError).toBeTruthy();
      expect(currentPasswordError.msg).toMatch(/no se permite.*contraseña/i);
    });
  });
});