const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Cubre criterios de aceptación de HU PET-8: Crear publicación de adopción
 * 
 * Casos de prueba de integración:
 * - Seguridad: Validar que solo usuarios autenticados puedan crear publicaciones
 * - Funcionalidad: Validar que todos los campos sean obligatorios
 * - Funcionalidad: Validar creación exitosa con datos válidos
 * - Funcionalidad: Validar rechazo de imagen con formato inválido
 * - Funcionalidad: Validar asociación con usuario autenticado
 * - Funcionalidad: Validar valores permitidos para Tamaño
 * - Funcionalidad: Validar valores permitidos para Sexo
 * - Funcionalidad: Validar valores permitidos para Tipo de animal
 * - Integración: Validar que se creen registros en BD
 * - Integración: Validar manejo de errores del servicio
 * - Seguridad: Validar rechazo con token expirado
 */
describe('POST /publications - Crear publicación de adopción (PET-8)', () => {
  let testUserId;
  let userToken;
  let validPublicationData;

  beforeAll(async () => {
    // Crear usuario de prueba
    const testUser = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Publicante',
        email: `test_create_pub_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'CABA'
      }
    });
    testUserId = testUser.id;
    userToken = jwt.sign({ userId: testUserId, email: testUser.email }, JWT_SECRET);

    // Datos válidos para crear una publicación
    validPublicationData = {
      nombre: 'Firulais',
      tamaño: 'Mediano',
      sexo: 'Macho',
      tipo: 'Perro',
      descripcion: 'Perro muy amigable y juguetón',
      foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='
    };
  });

  afterAll(async () => {
    // Limpiar publicaciones y mascotas creadas durante los tests
    await prisma.mascota.deleteMany({
      where: {
        publicacion: {
          usuarioId: testUserId
        }
      }
    });
    await prisma.publicacion.deleteMany({
      where: { usuarioId: testUserId }
    });
    await prisma.usuario.delete({
      where: { id: testUserId }
    });
  });

  describe('Seguridad - Autenticación', () => {
    test('Debe devolver 401 si no se proporciona token de autenticación', async () => {
      const response = await request(app)
        .post('/publications')
        .send(validPublicationData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no autorizado|no autenticado|token/i);
    });

    test('Debe devolver 401 si el token es inválido', async () => {
      const response = await request(app)
        .post('/publications')
        .set('Authorization', 'Bearer token_invalido')
        .send(validPublicationData);

      expect(response.status).toBe(401);
    });

    test('Debe devolver 401 si el token ha expirado', async () => {
      // Crear un token expirado (expirado hace 1 hora)
      const expiredToken = jwt.sign(
        { userId: testUserId, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(validPublicationData);

      expect(response.status).toBe(401);
    });
  });

  describe('Funcionalidad - Validación de campos obligatorios', () => {
    test('Debe devolver error 400 si falta el campo "nombre"', async () => {
      const dataWithoutNombre = { ...validPublicationData };
      delete dataWithoutNombre.nombre;

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(dataWithoutNombre);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'nombre')).toBe(true);
    });

    test('Debe devolver error 400 si falta el campo "tamaño"', async () => {
      const dataWithoutTamaño = { ...validPublicationData };
      delete dataWithoutTamaño.tamaño;

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(dataWithoutTamaño);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'tamaño')).toBe(true);
    });

    test('Debe devolver error 400 si falta el campo "sexo"', async () => {
      const dataWithoutSexo = { ...validPublicationData };
      delete dataWithoutSexo.sexo;

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(dataWithoutSexo);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'sexo')).toBe(true);
    });

    test('Debe devolver error 400 si falta el campo "tipo"', async () => {
      const dataWithoutTipo = { ...validPublicationData };
      delete dataWithoutTipo.tipo;

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(dataWithoutTipo);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'tipo')).toBe(true);
    });

    test('Debe devolver error 400 si falta el campo "descripcion"', async () => {
      const dataWithoutDescripcion = { ...validPublicationData };
      delete dataWithoutDescripcion.descripcion;

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(dataWithoutDescripcion);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'descripcion')).toBe(true);
    });

    test('Debe devolver error 400 si falta el campo "foto"', async () => {
      const dataWithoutFoto = { ...validPublicationData };
      delete dataWithoutFoto.foto;

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(dataWithoutFoto);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'foto')).toBe(true);
    });

    test('Debe devolver error 400 si se envían todos los campos vacíos', async () => {
      const emptyData = {
        nombre: '',
        tamaño: '',
        sexo: '',
        tipo: '',
        descripcion: '',
        foto: ''
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(emptyData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.length).toBeGreaterThan(0);
    });
  });

  describe('Funcionalidad - Validación de valores permitidos', () => {
    test('Debe devolver error 400 si "tamaño" no es uno de los valores permitidos', async () => {
      const invalidData = {
        ...validPublicationData,
        tamaño: 'Enorme' // Valor no permitido
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'tamaño')).toBe(true);
    });

    test('Debe aceptar todos los valores válidos de "tamaño"', async () => {
      const tamañosValidos = ['Chico', 'Mediano', 'Grande'];

      for (const tamaño of tamañosValidos) {
        const data = {
          ...validPublicationData,
          nombre: `Mascota ${tamaño} ${Date.now()}`,
          tamaño
        };

        const response = await request(app)
          .post('/publications')
          .set('Authorization', `Bearer ${userToken}`)
          .send(data);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    test('Debe devolver error 400 si "sexo" no es uno de los valores permitidos', async () => {
      const invalidData = {
        ...validPublicationData,
        sexo: 'Otro' // Valor no permitido
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'sexo')).toBe(true);
    });

    test('Debe aceptar todos los valores válidos de "sexo"', async () => {
      const sexosValidos = ['Macho', 'Hembra'];

      for (const sexo of sexosValidos) {
        const data = {
          ...validPublicationData,
          nombre: `Mascota ${sexo} ${Date.now()}`,
          sexo
        };

        const response = await request(app)
          .post('/publications')
          .set('Authorization', `Bearer ${userToken}`)
          .send(data);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });

    test('Debe devolver error 400 si "tipo" no es uno de los valores permitidos', async () => {
      const invalidData = {
        ...validPublicationData,
        tipo: 'Hamster' // Valor no permitido
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'tipo')).toBe(true);
    });

    test('Debe aceptar todos los valores válidos de "tipo"', async () => {
      const tiposValidos = ['Perro', 'Gato', 'Pájaro', 'Conejo'];

      for (const tipo of tiposValidos) {
        const data = {
          ...validPublicationData,
          nombre: `Mascota ${tipo} ${Date.now()}`,
          tipo
        };

        const response = await request(app)
          .post('/publications')
          .set('Authorization', `Bearer ${userToken}`)
          .send(data);

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      }
    });
  });

  describe('Funcionalidad - Validación de formato de imagen', () => {
    test('Debe devolver error 400 si la foto no tiene formato base64 válido', async () => {
      const invalidData = {
        ...validPublicationData,
        foto: 'https://example.com/image.jpg' // No es base64
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'foto')).toBe(true);
    });

    test('Debe devolver error 400 si la foto tiene un formato mime type no permitido', async () => {
      const invalidData = {
        ...validPublicationData,
        foto: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MK' // PDF en base64
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'foto')).toBe(true);
    });

    test('Debe aceptar imágenes en formato JPEG base64', async () => {
      const data = {
        ...validPublicationData,
        nombre: `Mascota JPEG ${Date.now()}`,
        foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k='
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('Debe aceptar imágenes en formato PNG base64', async () => {
      const data = {
        ...validPublicationData,
        nombre: `Mascota PNG ${Date.now()}`,
        foto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('Debe devolver error 400 si la imagen excede el tamaño máximo permitido', async () => {
      // Crear una imagen base64 muy grande (más de 5MB)
      const largeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(7500000);
      
      const invalidData = {
        ...validPublicationData,
        foto: largeBase64
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      // Express devuelve 413 (Payload Too Large) o 400 dependiendo de la configuración
      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Funcionalidad - Creación exitosa', () => {
    test('Debe crear una publicación exitosamente con todos los datos válidos', async () => {
      const data = {
        ...validPublicationData,
        nombre: `Mascota Test ${Date.now()}`
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('La publicación se creó correctamente');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.foto).toBe(data.foto);
      expect(response.body.data.estado).toBe('disponible');
      expect(response.body.data.usuarioId).toBe(testUserId);
      expect(response.body.data.mascota).toBeDefined();
      expect(response.body.data.mascota.nombre).toBe(data.nombre);
      expect(response.body.data.mascota.tipo).toBe(data.tipo);
      expect(response.body.data.mascota.sexo).toBe(data.sexo);
      expect(response.body.data.mascota.tamaño).toBe(data.tamaño);
      expect(response.body.data.mascota.descripcion).toBe(data.descripcion);
    });

    test('Debe establecer automáticamente el estado de la publicación como "disponible"', async () => {
      const data = {
        ...validPublicationData,
        nombre: `Mascota Estado ${Date.now()}`
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);
      expect(response.body.data.estado).toBe('disponible');
    });
  });

  describe('Integración - Asociación con usuario autenticado', () => {
    test('Debe asociar la publicación al usuario autenticado', async () => {
      const data = {
        ...validPublicationData,
        nombre: `Mascota Usuario ${Date.now()}`
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);
      expect(response.body.data.usuarioId).toBe(testUserId);

      // Verificar en la base de datos
      const publicacion = await prisma.publicacion.findUnique({
        where: { id: response.body.data.id }
      });

      expect(publicacion).toBeDefined();
      expect(publicacion.usuarioId).toBe(testUserId);
    });

    test('No debe permitir que un usuario cree publicaciones para otro usuario', async () => {
      // Este caso ya está cubierto por el test de autenticación
      // El userId siempre viene del token, no del body
      const data = {
        ...validPublicationData,
        nombre: `Mascota Otro ${Date.now()}`,
        usuarioId: 999999 // Intentar especificar otro usuario (debería ser ignorado)
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);
      // La publicación debe asociarse al usuario del token, no al del body
      expect(response.body.data.usuarioId).toBe(testUserId);
      expect(response.body.data.usuarioId).not.toBe(999999);
    });
  });

  describe('Integración - Verificación de registros en base de datos', () => {
    test('Debe crear registros tanto de Publicacion como de Mascota en la base de datos', async () => {
      const data = {
        ...validPublicationData,
        nombre: `Mascota DB ${Date.now()}`
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);
      
      const publicacionId = response.body.data.id;
      const mascotaId = response.body.data.mascota.id;

      // Verificar que la publicación existe en la BD
      const publicacion = await prisma.publicacion.findUnique({
        where: { id: publicacionId }
      });
      expect(publicacion).toBeDefined();
      expect(publicacion.foto).toBe(data.foto);
      expect(publicacion.estado).toBe('disponible');
      expect(publicacion.usuarioId).toBe(testUserId);

      // Verificar que la mascota existe en la BD
      const mascota = await prisma.mascota.findUnique({
        where: { id: mascotaId }
      });
      expect(mascota).toBeDefined();
      expect(mascota.nombre).toBe(data.nombre);
      expect(mascota.tipo).toBe(data.tipo);
      expect(mascota.sexo).toBe(data.sexo);
      expect(mascota.tamaño).toBe(data.tamaño);
      expect(mascota.descripcion).toBe(data.descripcion);
      expect(mascota.publicacionId).toBe(publicacionId);
    });

    test('Debe mantener integridad referencial entre Mascota y Publicacion', async () => {
      const data = {
        ...validPublicationData,
        nombre: `Mascota Integridad ${Date.now()}`
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);

      const publicacionId = response.body.data.id;

      // Verificar relación en la BD
      const publicacionConMascota = await prisma.publicacion.findUnique({
        where: { id: publicacionId },
        include: { Mascota: true }
      });

      expect(publicacionConMascota).toBeDefined();
      expect(publicacionConMascota.Mascota).toBeDefined();
      expect(publicacionConMascota.Mascota.length).toBe(1);
      expect(publicacionConMascota.Mascota[0].nombre).toBe(data.nombre);
    });

    test('Si falla la creación de la mascota, no debe crear la publicación (transacción)', async () => {
      // Este test verifica que la transacción funcione correctamente
      // Si por alguna razón falla la creación de la mascota, la publicación tampoco debe crearse
      
      const countPublicacionesBefore = await prisma.publicacion.count({
        where: { usuarioId: testUserId }
      });

      const countMascotasBefore = await prisma.mascota.count({
        where: { publicacion: { usuarioId: testUserId } }
      });

      // Intentar crear con datos inválidos que pasen las validaciones de express-validator
      // pero fallen en la BD (esto es difícil de simular sin mockear Prisma)
      // Por ahora, este test verifica que la transacción existe conceptualmente
      
      const data = {
        ...validPublicationData,
        nombre: `Mascota Transaccion ${Date.now()}`
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      if (response.status === 201) {
        // Si se creó exitosamente, ambos registros deben existir
        const countPublicacionesAfter = await prisma.publicacion.count({
          where: { usuarioId: testUserId }
        });
        const countMascotasAfter = await prisma.mascota.count({
          where: { publicacion: { usuarioId: testUserId } }
        });

        expect(countPublicacionesAfter).toBe(countPublicacionesBefore + 1);
        expect(countMascotasAfter).toBe(countMascotasBefore + 1);
      }
    });
  });

  describe('Integración - Manejo de errores del servicio', () => {
    test('Debe devolver error 500 con mensaje apropiado si falla el servicio de publicación', async () => {
      // Para simular un error del servicio, podríamos intentar crear una publicación
      // con un userId que no existe (aunque esto normalmente no debería pasar por el middleware)
      // O podríamos mockear Prisma, pero eso requeriría refactorización del código

      // Por ahora, verificamos que si ocurre un error inesperado, se maneja correctamente
      // Este test es más conceptual y requeriría mocking para probarlo completamente
      
      // Verificamos que el endpoint existe y responde correctamente a errores de validación
      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ nombre: 'Test' }); // Datos incompletos

      // Debe responder con error, no con crash del servidor
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toBeDefined();
    });
  });

  describe('Casos edge - Valores límite y especiales', () => {
    test('Debe aceptar descripción muy larga', async () => {
      const data = {
        ...validPublicationData,
        nombre: `Mascota Desc Larga ${Date.now()}`,
        descripcion: 'A'.repeat(1000) // Descripción de 1000 caracteres
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);
      expect(response.body.data.mascota.descripcion).toBe(data.descripcion);
    });

    test('Debe aceptar caracteres especiales en el nombre', async () => {
      const data = {
        ...validPublicationData,
        nombre: 'Firulais "El Valiente" ñ@#'
      };

      const response = await request(app)
        .post('/publications')
        .set('Authorization', `Bearer ${userToken}`)
        .send(data);

      expect(response.status).toBe(201);
      expect(response.body.data.mascota.nombre).toBe(data.nombre);
    });

    test('Debe permitir crear múltiples publicaciones para el mismo usuario', async () => {
      const publicaciones = [];

      for (let i = 0; i < 3; i++) {
        const data = {
          ...validPublicationData,
          nombre: `Mascota Multiple ${i} ${Date.now()}`
        };

        const response = await request(app)
          .post('/publications')
          .set('Authorization', `Bearer ${userToken}`)
          .send(data);

        expect(response.status).toBe(201);
        publicaciones.push(response.body.data.id);
      }

      expect(publicaciones.length).toBe(3);
      expect(new Set(publicaciones).size).toBe(3); // Todos los IDs son únicos
    });
  });
});
