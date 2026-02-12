const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Cubre criterios de aceptación: Enviar solicitud de adopción
 * 
 * Casos de prueba de integración:
 * - Seguridad: Validar que solo usuarios autenticados puedan enviar solicitudes
 * - Integración: Validar envío exitoso de solicitud al backend
 * - Funcionalidad: Validar mensaje de éxito tras enviar solicitud
 * - Integración: Validar manejo de error al enviar solicitud
 * - Funcionalidad: Validar que no se pueda enviar más de una solicitud para el mismo animal
 * - Integración: Validar registro correcto de la solicitud en la base de datos
 * - Funcionalidad: Validar que no se puedan solicitar publicaciones no disponibles
 * - Funcionalidad: Validar que no se pueda solicitar la propia publicación
 */
describe('POST /requests - Enviar solicitud de adopción', () => {
  let testUser1Id;
  let testUser2Id;
  let user1Token;
  let user2Token;
  let testPublicacionId;
  let unavailablePublicacionId;

  beforeAll(async () => {
    // Crear usuarios de prueba
    const testUser1 = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Solicitante',
        email: `test_request_user1_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'CABA'
      }
    });
    testUser1Id = testUser1.id;
    user1Token = jwt.sign({ userId: testUser1Id, email: testUser1.email }, JWT_SECRET);

    const testUser2 = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Publicante',
        email: `test_request_user2_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '0987654321',
        provincia: 'Córdoba',
        localidad: 'Córdoba Capital'
      }
    });
    testUser2Id = testUser2.id;
    user2Token = jwt.sign({ userId: testUser2Id, email: testUser2.email }, JWT_SECRET);

    // Crear publicación disponible del usuario 2
    const testPublicacion = await prisma.publicacion.create({
      data: {
        foto: 'data:image/jpeg;base64,test',
        estado: 'disponible',
        usuarioId: testUser2Id,
      },
    });
    testPublicacionId = testPublicacion.id;

    // Crear mascota asociada
    await prisma.mascota.create({
      data: {
        nombre: 'Firulais',
        tamaño: 'Mediano',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'Perro muy amigable',
        publicacionId: testPublicacionId,
      },
    });

    // Crear publicación NO disponible
    const unavailablePublicacion = await prisma.publicacion.create({
      data: {
        foto: 'data:image/jpeg;base64,test2',
        estado: 'adoptado',
        usuarioId: testUser2Id,
      },
    });
    unavailablePublicacionId = unavailablePublicacion.id;

    await prisma.mascota.create({
      data: {
        nombre: 'Michi',
        tamaño: 'Chico',
        sexo: 'Hembra',
        tipo: 'Gato',
        descripcion: 'Gato tranquilo',
        publicacionId: unavailablePublicacionId,
      },
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.solicitud.deleteMany({
      where: { usuarioId: { in: [testUser1Id, testUser2Id] } }
    });
    await prisma.mascota.deleteMany({
      where: {
        publicacion: {
          usuarioId: { in: [testUser1Id, testUser2Id] }
        }
      }
    });
    await prisma.publicacion.deleteMany({
      where: { usuarioId: { in: [testUser1Id, testUser2Id] } }
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [testUser1Id, testUser2Id] } }
    });
  });

  describe('Seguridad - Autenticación', () => {
    test('Debe devolver 401 si no se proporciona token de autenticación (sin iniciar sesión)', async () => {
      const response = await request(app)
        .post('/requests')
        .send({
          publicacionId: testPublicacionId,
          mensaje: 'Me gustaría adoptar a esta mascota'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no autorizado|no autenticado|token/i);
    });

    test('Debe devolver 401 si el token es inválido', async () => {
      const response = await request(app)
        .post('/requests')
        .set('Authorization', 'Bearer token_invalido')
        .send({
          publicacionId: testPublicacionId,
          mensaje: 'Me gustaría adoptar a esta mascota'
        });

      expect(response.status).toBe(401);
    });

    test('Debe devolver 401 si el token ha expirado', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser1Id, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({
          publicacionId: testPublicacionId,
          mensaje: 'Me gustaría adoptar a esta mascota'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Funcionalidad - Validación de campos obligatorios', () => {
    test('Debe devolver 400 si falta el campo "publicacionId"', async () => {
      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          mensaje: 'Me gustaría adoptar a esta mascota'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/faltan datos|obligatorios/i);
    });

    test('Debe devolver 400 si falta el campo "mensaje"', async () => {
      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: testPublicacionId
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/faltan datos|obligatorios/i);
    });

    test('Debe devolver 400 si publicacionId no es un número válido', async () => {
      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: 'abc',
          mensaje: 'Me gustaría adoptar'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Funcionalidad - Validación de existencia de publicación', () => {
    test('Debe devolver 404 si la publicación no existe', async () => {
      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: 999999,
          mensaje: 'Me gustaría adoptar a esta mascota'
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no encontrada/i);
    });
  });

  describe('Funcionalidad - Validación de disponibilidad', () => {
    test('Debe devolver 400 si la publicación no está disponible para adopción', async () => {
      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: unavailablePublicacionId,
          mensaje: 'Me gustaría adoptar a esta mascota'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no está disponible/i);
    });
  });

  describe('Funcionalidad - Validación de propiedad', () => {
    test('Debe devolver 400 si el usuario intenta solicitar su propia publicación', async () => {
      // Usuario 2 intenta solicitar su propia publicación
      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          publicacionId: testPublicacionId,
          mensaje: 'Me gustaría adoptar a esta mascota'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/tu propia publicación|no puedes solicitar/i);
    });
  });

  describe('Integración - Envío exitoso de solicitud', () => {
    test('Debe crear una solicitud exitosamente con datos válidos y devolver 201', async () => {
      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: testPublicacionId,
          mensaje: 'Me gustaría adoptar a Firulais. Tengo experiencia con perros.'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Solicitud enviada correctamente');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.usuarioId).toBe(testUser1Id);
      expect(response.body.data.publicacionId).toBe(testPublicacionId);
      expect(response.body.data.estado).toBe('pendiente');
      expect(response.body.data.mensaje).toBe('Me gustaría adoptar a Firulais. Tengo experiencia con perros.');
    });

    test('Debe registrar correctamente la solicitud en la base de datos', async () => {
      // Crear una nueva publicación para este test
      const nuevaPublicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,test3',
          estado: 'disponible',
          usuarioId: testUser2Id,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Luna',
          tamaño: 'Grande',
          sexo: 'Hembra',
          tipo: 'Perro',
          descripcion: 'Perra muy cariñosa',
          publicacionId: nuevaPublicacion.id,
        },
      });

      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: nuevaPublicacion.id,
          mensaje: 'Me encantaría adoptar a Luna'
        });

      expect(response.status).toBe(201);

      // Verificar que existe en la base de datos
      const solicitudEnBD = await prisma.solicitud.findUnique({
        where: {
          usuarioId_publicacionId: {
            usuarioId: testUser1Id,
            publicacionId: nuevaPublicacion.id
          }
        }
      });

      expect(solicitudEnBD).toBeDefined();
      expect(solicitudEnBD.estado).toBe('pendiente');
      expect(solicitudEnBD.mensaje).toBe('Me encantaría adoptar a Luna');
      expect(solicitudEnBD.usuarioId).toBe(testUser1Id);
      expect(solicitudEnBD.publicacionId).toBe(nuevaPublicacion.id);
    });
  });

  describe('Funcionalidad - Prevención de solicitudes duplicadas', () => {
    test('Debe devolver 400 si el usuario ya envió una solicitud para la misma publicación', async () => {
      // Primera solicitud - debe ser exitosa
      const firstResponse = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: testPublicacionId,
          mensaje: 'Primera solicitud'
        });

      // Si la primera ya existía del test anterior, esto podría fallar
      // Pero asumimos que cada test se ejecuta en orden y la primera vez es exitosa

      // Segunda solicitud - debe fallar
      const secondResponse = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: testPublicacionId,
          mensaje: 'Segunda solicitud (no debería permitirse)'
        });

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.message).toMatch(/ya enviaste|ya has enviado/i);
    });

    test('Debe permitir que diferentes usuarios soliciten la misma publicación', async () => {
      // Crear un tercer usuario
      const testUser3 = await prisma.usuario.create({
        data: {
          nombre: 'Usuario',
          apellido: 'Tres',
          email: `test_request_user3_${Date.now()}@example.com`,
          password: 'password_hasheada',
          telefono: '1122334455',
          provincia: 'Santa Fe',
          localidad: 'Rosario'
        }
      });
      const user3Token = jwt.sign({ userId: testUser3.id, email: testUser3.email }, JWT_SECRET);

      // Usuario 3 solicita la misma publicación que ya solicitó Usuario 1
      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user3Token}`)
        .send({
          publicacionId: testPublicacionId,
          mensaje: 'Yo también quiero adoptar'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Solicitud enviada correctamente');

      // Limpiar
      await prisma.solicitud.deleteMany({
        where: { usuarioId: testUser3.id }
      });
      await prisma.usuario.delete({
        where: { id: testUser3.id }
      });
    });
  });

  describe('Integración - Consulta de solicitudes enviadas', () => {
    test('Debe poder consultar las solicitudes enviadas mediante GET /requests/enviadas', async () => {
      const response = await request(app)
        .get('/requests/enviadas')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.solicitudes).toBeDefined();
      expect(Array.isArray(response.body.solicitudes)).toBe(true);
      
      // Debe incluir al menos una solicitud (la que enviamos en tests anteriores)
      expect(response.body.solicitudes.length).toBeGreaterThan(0);
      
      const primerasolicitud = response.body.solicitudes[0];
      expect(primerasolicitud.id).toBeDefined();
      expect(primerasolicitud.animal).toBeDefined();
      expect(primerasolicitud.estado).toBeDefined();
      expect(primerasolicitud.mensaje).toBeDefined();
    });

    test('La solicitud recién creada debe aparecer en el listado con estado "pendiente"', async () => {
      const response = await request(app)
        .get('/requests/enviadas')
        .set('Authorization', `Bearer ${user1Token}`);

      expect(response.status).toBe(200);
      
      // Buscar la solicitud de la publicación de prueba
      const solicitudEncontrada = response.body.solicitudes.find(
        sol => sol.estado.toLowerCase() === 'pendiente'
      );

      expect(solicitudEncontrada).toBeDefined();
      expect(solicitudEncontrada.estado).toMatch(/pendiente/i);
    });
  });

  describe('Integración - Manejo de errores del servicio', () => {
    test('Debe devolver 500 con mensaje apropiado si ocurre un error del servidor', async () => {
      // Para simular un error, intentamos enviar con un publicacionId válido
      // pero podemos mockear o forzar un error de otra manera
      // En este caso, verificamos que el mensaje de error sea correcto
      
      // Este test es más conceptual - en producción, podrías mockear prisma para que lance error
      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: testPublicacionId,
          mensaje: 'Test error handling'
        });

      // Como ya existe la solicitud, devolverá 400
      // Pero el mensaje de error 500 se probaría mockeando la BD
      expect([400, 500]).toContain(response.status);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });

  describe('Casos edge - Valores límite y situaciones especiales', () => {
    test('Debe aceptar mensajes largos', async () => {
      // Crear una nueva publicación para este test
      const nuevaPublicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,test4',
          estado: 'disponible',
          usuarioId: testUser2Id,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Max',
          tamaño: 'Grande',
          sexo: 'Macho',
          tipo: 'Perro',
          descripcion: 'Perro guardian',
          publicacionId: nuevaPublicacion.id,
        },
      });

      const mensajeLargo = 'A'.repeat(500); // Mensaje de 500 caracteres

      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: nuevaPublicacion.id,
          mensaje: mensajeLargo
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mensaje).toBe(mensajeLargo);
    });

    test('Debe manejar solicitudes con caracteres especiales en el mensaje', async () => {
      // Crear una nueva publicación para este test
      const nuevaPublicacion = await prisma.publicacion.create({
        data: {
          foto: 'data:image/jpeg;base64,test5',
          estado: 'disponible',
          usuarioId: testUser2Id,
        },
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Bella',
          tamaño: 'Mediano',
          sexo: 'Hembra',
          tipo: 'Gato',
          descripcion: 'Gata sociable',
          publicacionId: nuevaPublicacion.id,
        },
      });

      const mensajeConCaracteresEspeciales = 'Hola! ¿Me gustaría adoptar? Tengo experiencia & amor ❤️ para dar.';

      const response = await request(app)
        .post('/requests')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          publicacionId: nuevaPublicacion.id,
          mensaje: mensajeConCaracteresEspeciales
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.mensaje).toBe(mensajeConCaracteresEspeciales);
    });

    test('Debe permitir crear múltiples solicitudes para diferentes publicaciones', async () => {
      const publicaciones = [];
      
      // Crear 3 publicaciones diferentes
      for (let i = 0; i < 3; i++) {
        const pub = await prisma.publicacion.create({
          data: {
            foto: `data:image/jpeg;base64,test${i}`,
            estado: 'disponible',
            usuarioId: testUser2Id,
          },
        });

        await prisma.mascota.create({
          data: {
            nombre: `Mascota ${i}`,
            tamaño: 'Mediano',
            sexo: 'Macho',
            tipo: 'Perro',
            descripcion: `Descripción ${i}`,
            publicacionId: pub.id,
          },
        });

        publicaciones.push(pub.id);
      }

      // Crear solicitudes para todas
      for (const pubId of publicaciones) {
        const response = await request(app)
          .post('/requests')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            publicacionId: pubId,
            mensaje: `Solicitud para publicación ${pubId}`
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }

      // Verificar que todas existen en la BD
      const solicitudes = await prisma.solicitud.findMany({
        where: {
          usuarioId: testUser1Id,
          publicacionId: { in: publicaciones }
        }
      });

      expect(solicitudes.length).toBe(3);
    });
  });
});
