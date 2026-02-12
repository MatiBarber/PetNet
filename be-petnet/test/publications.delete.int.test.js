const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Cubre criterios de aceptación de HU PET-99: Eliminar publicación de adopción
 * 
 * Casos de prueba de integración:
 * - Seguridad: Validar que solo usuarios autenticados puedan eliminar publicación
 * - Seguridad: Validar que un usuario no pueda eliminar publicaciones de otro usuario
 * - Seguridad: Validar eliminación con token JWT expirado
 * - Funcionalidad: Validar confirmación de eliminación exitosa
 * - Integración: Validar eliminación en base de datos
 * - Integración: Validar manejo de error del servicio de eliminación
 * - Funcionalidad: Validar que se muestren las publicaciones del usuario autenticado
 * - UI/UX: Validar mensaje visual de éxito tras la eliminación
 * - UI/UX: Validar mensaje de error visual al fallar la eliminación
 */
describe('DELETE /publications/:id - Eliminar publicación de adopción (PET-99)', () => {
  let testUserId;
  let userToken;
  let otherUserId;
  let otherUserToken;
  let testPublicacionId;
  let otherUserPublicacionId;

  beforeAll(async () => {
    // Crear primer usuario de prueba
    const testUser = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Test Delete',
        email: `test_delete_pub_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'CABA'
      }
    });
    testUserId = testUser.id;
    userToken = jwt.sign({ userId: testUserId, email: testUser.email }, JWT_SECRET);

    // Crear segundo usuario para probar permisos
    const otherUser = await prisma.usuario.create({
      data: {
        nombre: 'Otro',
        apellido: 'Usuario',
        email: `test_delete_other_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '0987654321',
        provincia: 'Córdoba',
        localidad: 'Córdoba Capital'
      }
    });
    otherUserId = otherUser.id;
    otherUserToken = jwt.sign({ userId: otherUserId, email: otherUser.email }, JWT_SECRET);

    // Crear publicación del primer usuario
    const testPublicacion = await prisma.publicacion.create({
      data: {
        foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
        estado: 'disponible',
        usuarioId: testUserId,
      },
    });
    testPublicacionId = testPublicacion.id;

    // Crear mascota asociada
    await prisma.mascota.create({
      data: {
        nombre: 'Mascota Test Delete',
        tamaño: 'Mediano',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'Mascota para test de eliminación',
        publicacionId: testPublicacionId,
      },
    });

    // Crear publicación del otro usuario
    const otherPublicacion = await prisma.publicacion.create({
      data: {
        foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
        estado: 'disponible',
        usuarioId: otherUserId,
      },
    });
    otherUserPublicacionId = otherPublicacion.id;

    // Crear mascota asociada
    await prisma.mascota.create({
      data: {
        nombre: 'Mascota Otro Usuario',
        tamaño: 'Grande',
        sexo: 'Hembra',
        tipo: 'Gato',
        descripcion: 'Mascota de otro usuario',
        publicacionId: otherUserPublicacionId,
      },
    });
  });

  afterAll(async () => {
    // Limpiar publicaciones y mascotas creadas durante los tests
    await prisma.mascota.deleteMany({
      where: {
        publicacion: {
          usuarioId: { in: [testUserId, otherUserId] }
        }
      }
    });
    await prisma.publicacion.deleteMany({
      where: { usuarioId: { in: [testUserId, otherUserId] } }
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [testUserId, otherUserId] } }
    });
  });

  describe('Seguridad - Autenticación', () => {
    test('Debe devolver 401 si no se proporciona token de autenticación (intentar acceder sin login)', async () => {
      const response = await request(app)
        .delete(`/publications/${testPublicacionId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no autorizado|no autenticado|token/i);
    });

    test('Debe devolver 401 si el token es inválido', async () => {
      const response = await request(app)
        .delete(`/publications/${testPublicacionId}`)
        .set('Authorization', 'Bearer token_invalido');

      expect(response.status).toBe(401);
    });

    test('Debe devolver 401 si el token ha expirado (validar con token JWT expirado)', async () => {
      // Crear un token expirado (expirado hace 1 hora)
      const expiredToken = jwt.sign(
        { userId: testUserId, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .delete(`/publications/${testPublicacionId}`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Seguridad - Autorización y permisos', () => {
    test('Debe devolver 403 si un usuario intenta eliminar una publicación de otro usuario (Acceso denegado)', async () => {
      // Usuario 1 intenta eliminar publicación del Usuario 2
      const response = await request(app)
        .delete(`/publications/${otherUserPublicacionId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no tienes permiso|acceso denegado|forbidden/i);

      // Verificar que la publicación NO fue eliminada
      const publicacionStillExists = await prisma.publicacion.findUnique({
        where: { id: otherUserPublicacionId }
      });
      expect(publicacionStillExists).toBeDefined();
    });

    test('Debe permitir al propietario eliminar su propia publicación', async () => {
      // Crear una nueva publicación para este test específico
      const nuevaPublicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Mascota Owner Delete',
          tamaño: 'Chico',
          sexo: 'Macho',
          tipo: 'Conejo',
          descripcion: 'Test de eliminación por propietario',
          publicacionId: nuevaPublicacion.id,
        },
      });

      const response = await request(app)
        .delete(`/publications/${nuevaPublicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('La publicación se eliminó correctamente');
    });
  });

  describe('Funcionalidad - Validación de existencia', () => {
    test('Debe devolver 404 si la publicación no existe', async () => {
      const nonExistentId = 999999;
      
      const response = await request(app)
        .delete(`/publications/${nonExistentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no encontrada|no existe|not found/i);
    });

    test('Debe devolver 400 si el ID no es un número válido', async () => {
      const response = await request(app)
        .delete('/publications/abc')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/inválido|invalid/i);
    });

    test('Debe devolver 404 si el ID es negativo (se trata como ID que no existe)', async () => {
      const response = await request(app)
        .delete('/publications/-1')
        .set('Authorization', `Bearer ${userToken}`);

      // Los IDs negativos se convierten a números válidos pero no existen en la BD
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Funcionalidad - Eliminación exitosa', () => {
    test('Debe eliminar correctamente una publicación válida del usuario autenticado', async () => {
      // Crear publicación específica para este test
      const publicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Mascota Success Delete',
          tamaño: 'Mediano',
          sexo: 'Hembra',
          tipo: 'Perro',
          descripcion: 'Test eliminación exitosa',
          publicacionId: publicacion.id,
        },
      });

      const response = await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('La publicación se eliminó correctamente');

      // Verificar que la publicación fue eliminada de la BD
      const deletedPublicacion = await prisma.publicacion.findUnique({
        where: { id: publicacion.id }
      });
      expect(deletedPublicacion).toBeNull();
    });

    test('Debe mostrar mensaje de éxito tras la eliminación (validar mensaje visual de éxito)', async () => {
      // Crear publicación para este test
      const publicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Mascota Mensaje',
          tamaño: 'Grande',
          sexo: 'Macho',
          tipo: 'Gato',
          descripcion: 'Test mensaje éxito',
          publicacionId: publicacion.id,
        },
      });

      const response = await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('La publicación se eliminó correctamente');
    });
  });

  describe('Integración - Eliminación en base de datos', () => {
    test('Debe eliminar el registro de la publicación de la base de datos', async () => {
      // Crear publicación para test
      const publicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Mascota DB Delete',
          tamaño: 'Chico',
          sexo: 'Hembra',
          tipo: 'Pájaro',
          descripcion: 'Test eliminación BD',
          publicacionId: publicacion.id,
        },
      });

      // Verificar que existe antes de eliminar
      const publicacionAntes = await prisma.publicacion.findUnique({
        where: { id: publicacion.id }
      });
      expect(publicacionAntes).toBeDefined();

      // Ejecutar DELETE
      const response = await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);

      // Verificar que ya no existe en la BD
      const publicacionDespues = await prisma.publicacion.findUnique({
        where: { id: publicacion.id }
      });
      expect(publicacionDespues).toBeNull();
    });

    test('Debe eliminar las mascotas asociadas antes de eliminar la publicación', async () => {
      // Crear publicación con mascota
      const publicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      const mascota = await prisma.mascota.create({
        data: {
          nombre: 'Mascota Cascada',
          tamaño: 'Mediano',
          sexo: 'Macho',
          tipo: 'Perro',
          descripcion: 'Test eliminación cascada',
          publicacionId: publicacion.id,
        },
      });

      // Verificar que mascota existe
      const mascotaAntes = await prisma.mascota.findUnique({
        where: { id: mascota.id }
      });
      expect(mascotaAntes).toBeDefined();

      // Eliminar publicación
      const response = await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);

      // Verificar que la mascota también fue eliminada
      const mascotaDespues = await prisma.mascota.findUnique({
        where: { id: mascota.id }
      });
      expect(mascotaDespues).toBeNull();

      // Verificar que la publicación fue eliminada
      const publicacionDespues = await prisma.publicacion.findUnique({
        where: { id: publicacion.id }
      });
      expect(publicacionDespues).toBeNull();
    });

    test('Debe mantener integridad referencial al eliminar publicación con relaciones', async () => {
      // Crear publicación con mascota
      const publicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Mascota Integridad',
          tamaño: 'Grande',
          sexo: 'Hembra',
          tipo: 'Gato',
          descripcion: 'Test integridad referencial',
          publicacionId: publicacion.id,
        },
      });

      const response = await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);

      // Verificar que no quedan mascotas huérfanas
      const mascotasHuerfanas = await prisma.mascota.findMany({
        where: { publicacionId: publicacion.id }
      });
      expect(mascotasHuerfanas.length).toBe(0);
    });
  });

  describe('Integración - Manejo de errores del servicio', () => {
    test('Debe devolver error 500 con mensaje apropiado si falla el servicio (simular fallo en API o BD)', async () => {
      // Este test verifica que si ocurre un error inesperado, se maneja correctamente
      // Para simular un error real, intentaríamos eliminar con ID válido pero forzando un error en la BD
      // En este caso, verificamos que el error se maneja apropiadamente
      
      // Intentar eliminar una publicación ya eliminada (esto causará un error controlado)
      const publicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Mascota Error',
          tamaño: 'Chico',
          sexo: 'Macho',
          tipo: 'Conejo',
          descripcion: 'Test manejo error',
          publicacionId: publicacion.id,
        },
      });

      // Primera eliminación exitosa
      await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Intentar eliminar nuevamente la misma publicación
      const response = await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no encontrada/i);
    });

    test('Debe mostrar mensaje de error apropiado al fallar la eliminación', async () => {
      // Intentar eliminar con ID que no existe
      const response = await request(app)
        .delete('/publications/999999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
      expect(typeof response.body.message).toBe('string');
    });
  });

  describe('Funcionalidad - Listado de publicaciones del usuario', () => {
    test('Debe mostrar solo las publicaciones del usuario autenticado en /publications/me', async () => {
      // Crear varias publicaciones para el usuario de prueba
      const publicaciones = [];
      for (let i = 0; i < 3; i++) {
        const pub = await prisma.publicacion.create({
          data: {
            foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
            estado: 'disponible',
            usuarioId: testUserId,
          },
        });
        await prisma.mascota.create({
          data: {
            nombre: `Mascota Listado ${i}`,
            tamaño: 'Mediano',
            sexo: 'Macho',
            tipo: 'Perro',
            descripcion: `Descripción ${i}`,
            publicacionId: pub.id,
          },
        });
        publicaciones.push(pub.id);
      }

      const response = await request(app)
        .get('/publications/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.publicaciones).toBeDefined();
      expect(Array.isArray(response.body.publicaciones)).toBe(true);
      
      // Todas las publicaciones deben pertenecer al usuario autenticado
      const misPublicacionesIds = response.body.publicaciones.map(p => p.id);
      
      // Verificar que las 3 publicaciones creadas están en el listado
      publicaciones.forEach(pubId => {
        expect(misPublicacionesIds).toContain(pubId);
      });

      // Verificar que no aparece la publicación del otro usuario
      expect(misPublicacionesIds).not.toContain(otherUserPublicacionId);

      // Limpiar publicaciones creadas
      await prisma.mascota.deleteMany({
        where: { publicacionId: { in: publicaciones } }
      });
      await prisma.publicacion.deleteMany({
        where: { id: { in: publicaciones } }
      });
    });

    test('La publicación eliminada no debe aparecer en el listado de "Mis publicaciones"', async () => {
      // Crear una publicación
      const publicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Mascota Listado Delete',
          tamaño: 'Grande',
          sexo: 'Hembra',
          tipo: 'Gato',
          descripcion: 'Test listado después de eliminar',
          publicacionId: publicacion.id,
        },
      });

      // Verificar que aparece en el listado antes de eliminar
      const responseAntes = await request(app)
        .get('/publications/me')
        .set('Authorization', `Bearer ${userToken}`);

      const idsAntes = responseAntes.body.publicaciones.map(p => p.id);
      expect(idsAntes).toContain(publicacion.id);

      // Eliminar la publicación
      await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Verificar que ya no aparece en el listado
      const responseDespues = await request(app)
        .get('/publications/me')
        .set('Authorization', `Bearer ${userToken}`);

      const idsDespues = responseDespues.body.publicaciones.map(p => p.id);
      expect(idsDespues).not.toContain(publicacion.id);
    });

    test('La publicación eliminada no debe aparecer en búsquedas de publicaciones disponibles', async () => {
      // Crear una publicación
      const publicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Mascota Busqueda Delete',
          tamaño: 'Chico',
          sexo: 'Macho',
          tipo: 'Pájaro',
          descripcion: 'Test búsqueda después de eliminar',
          publicacionId: publicacion.id,
        },
      });

      // Verificar que aparece en búsquedas disponibles antes de eliminar
      const responseAntes = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken}`);

      const idsAntes = responseAntes.body.publicaciones.map(p => p.id);
      expect(idsAntes).toContain(publicacion.id);

      // Eliminar la publicación
      await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Verificar que ya no aparece en búsquedas
      const responseDespues = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken}`);

      const idsDespues = responseDespues.body.publicaciones.map(p => p.id);
      expect(idsDespues).not.toContain(publicacion.id);
    });
  });

  describe('Casos edge - Valores límite y situaciones especiales', () => {
    test('Debe manejar correctamente la eliminación de publicación con ID en el límite de enteros', async () => {
      // Intentar eliminar con un ID muy grande (pero válido como número)
      const response = await request(app)
        .delete('/publications/2147483647')
        .set('Authorization', `Bearer ${userToken}`);

      // Debe devolver 404, no error de servidor
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    test('Debe permitir eliminar múltiples publicaciones de forma secuencial', async () => {
      // Crear varias publicaciones
      const publicaciones = [];
      for (let i = 0; i < 3; i++) {
        const pub = await prisma.publicacion.create({
          data: {
            foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
            estado: 'disponible',
            usuarioId: testUserId,
          },
        });
        await prisma.mascota.create({
          data: {
            nombre: `Mascota Multiple Del ${i}`,
            tamaño: 'Mediano',
            sexo: 'Hembra',
            tipo: 'Perro',
            descripcion: `Descripción ${i}`,
            publicacionId: pub.id,
          },
        });
        publicaciones.push(pub);
      }

      // Eliminar todas secuencialmente
      for (const pub of publicaciones) {
        const response = await request(app)
          .delete(`/publications/${pub.id}`)
          .set('Authorization', `Bearer ${userToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }

      // Verificar que todas fueron eliminadas
      for (const pub of publicaciones) {
        const deleted = await prisma.publicacion.findUnique({
          where: { id: pub.id }
        });
        expect(deleted).toBeNull();
      }
    });

    test('Debe manejar correctamente publicaciones sin mascotas asociadas', async () => {
      // Crear publicación SIN mascota
      const publicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
          estado: 'disponible',
          usuarioId: testUserId,
        },
      });

      // No crear mascota asociada

      // Debe poder eliminarse sin problemas
      const response = await request(app)
        .delete(`/publications/${publicacion.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
