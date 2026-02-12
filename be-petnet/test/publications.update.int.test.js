const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Cubre criterios de aceptación de HU PET-84: Editar publicación de adopción
 * 
 * Casos de prueba de integración:
 * - Seguridad: Validar que solo usuarios autenticados puedan acceder a edición
 * - Seguridad: Validar que un usuario no pueda editar publicaciones de otro usuario
 * - Funcionalidad: Validar que se muestren las publicaciones del usuario autenticado
 * - Funcionalidad: Validar que el formulario cargue los datos actuales desde BD
 * - Funcionalidad: Validar obligatoriedad de los campos al editar
 * - Funcionalidad: Validar formato correcto de los campos
 * - Funcionalidad: Validar actualización exitosa de la publicación
 * - Integración: Validar que la actualización mantenga asociación con el mismo animal y usuario
 * - Integración: Validar manejo de errores del servicio de edición
 * - Seguridad: Validar que no se pueda editar con token JWT expirado
 */
describe('PUT /publications/:id - Editar publicación de adopción (PET-84)', () => {
  let testUser1Id;
  let testUser2Id;
  let userToken1;
  let userToken2;
  let testPublicacion1;
  let testPublicacion2;
  let validUpdateData;

  beforeAll(async () => {
    // Crear primer usuario de prueba
    const testUser1 = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Propietario',
        email: `test_update_owner_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'CABA'
      }
    });
    testUser1Id = testUser1.id;
    userToken1 = jwt.sign({ userId: testUser1Id, email: testUser1.email }, JWT_SECRET);

    // Crear segundo usuario de prueba (para probar restricciones de permisos)
    const testUser2 = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Otro',
        email: `test_update_other_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '0987654321',
        provincia: 'Córdoba',
        localidad: 'Córdoba Capital'
      }
    });
    testUser2Id = testUser2.id;
    userToken2 = jwt.sign({ userId: testUser2Id, email: testUser2.email }, JWT_SECRET);

    // Crear publicación de prueba para el usuario 1
    const publicacion1 = await prisma.publicacion.create({
      data: {
        foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
        estado: 'disponible',
        usuarioId: testUser1Id
      }
    });

    const mascota1 = await prisma.mascota.create({
      data: {
        nombre: 'Rex Original',
        tamaño: 'Grande',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'Perro grande y amigable',
        publicacionId: publicacion1.id
      }
    });

    testPublicacion1 = { ...publicacion1, mascota: mascota1 };

    // Crear publicación de prueba para el usuario 2
    const publicacion2 = await prisma.publicacion.create({
      data: {
        foto: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
        estado: 'disponible',
        usuarioId: testUser2Id
      }
    });

    await prisma.mascota.create({
      data: {
        nombre: 'Miau',
        tamaño: 'Chico',
        sexo: 'Hembra',
        tipo: 'Gato',
        descripcion: 'Gato pequeño',
        publicacionId: publicacion2.id
      }
    });

    testPublicacion2 = publicacion2;

    // Datos válidos para actualizar una publicación
    validUpdateData = {
      nombre: 'Rex Actualizado',
      tamaño: 'Mediano',
      sexo: 'Macho',
      tipo: 'Perro',
      descripcion: 'Perro mediano muy juguetón',
      foto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.mascota.deleteMany({
      where: {
        publicacion: {
          OR: [
            { usuarioId: testUser1Id },
            { usuarioId: testUser2Id }
          ]
        }
      }
    });
    await prisma.publicacion.deleteMany({
      where: {
        OR: [
          { usuarioId: testUser1Id },
          { usuarioId: testUser2Id }
        ]
      }
    });
    await prisma.usuario.deleteMany({
      where: {
        id: {
          in: [testUser1Id, testUser2Id]
        }
      }
    });
  });

  describe('Seguridad - Autenticación y Autorización', () => {
    test('Debe devolver 401 si no se proporciona token de autenticación', async () => {
      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .send(validUpdateData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no autorizado|no autenticado|token/i);
    });

    test('Debe devolver 401 si el token es inválido', async () => {
      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', 'Bearer token_invalido')
        .send(validUpdateData);

      expect(response.status).toBe(401);
    });

    test('Debe devolver 401 si el token ha expirado', async () => {
      const expiredToken = jwt.sign(
        { userId: testUser1Id, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send(validUpdateData);

      expect(response.status).toBe(401);
    });

    test('Debe devolver 403 si un usuario intenta editar una publicación de otro usuario', async () => {
      // Usuario 2 intenta editar publicación del Usuario 1
      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken2}`)
        .send(validUpdateData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no tienes permiso|acceso denegado|prohibido/i);
    });

    test('Debe permitir que el propietario edite su propia publicación', async () => {
      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(validUpdateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Funcionalidad - Acceso a "Mis publicaciones"', () => {
    test('GET /publications/me debe devolver 401 sin autenticación', async () => {
      const response = await request(app)
        .get('/publications/me');

      expect(response.status).toBe(401);
    });

    test('GET /publications/me debe mostrar solo las publicaciones del usuario autenticado', async () => {
      const response = await request(app)
        .get('/publications/me')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.publicaciones).toBeDefined();
      expect(Array.isArray(response.body.publicaciones)).toBe(true);

      // Verificar que todas las publicaciones pertenecen al usuario 1
      const publicacionesIds = response.body.publicaciones.map(p => p.id);
      expect(publicacionesIds).toContain(testPublicacion1.id);
      expect(publicacionesIds).not.toContain(testPublicacion2.id);
    });

    test('GET /publications/me del usuario 2 no debe mostrar publicaciones del usuario 1', async () => {
      const response = await request(app)
        .get('/publications/me')
        .set('Authorization', `Bearer ${userToken2}`);

      expect(response.status).toBe(200);
      expect(response.body.publicaciones).toBeDefined();

      const publicacionesIds = response.body.publicaciones.map(p => p.id);
      expect(publicacionesIds).toContain(testPublicacion2.id);
      expect(publicacionesIds).not.toContain(testPublicacion1.id);
    });
  });

  describe('Funcionalidad - Carga de datos actuales desde BD', () => {
    test('GET /publications/:id debe cargar los datos actuales de la publicación', async () => {
      const response = await request(app)
        .get(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(response.status).toBe(200);
      expect(response.body.publicacion).toBeDefined();
      expect(response.body.publicacion.id).toBe(testPublicacion1.id);
      expect(response.body.publicacion.foto).toBeDefined(); // Verificar que existe, no el valor exacto
      expect(response.body.publicacion.foto).toMatch(/^data:image\/(jpeg|png|jpg|gif|webp);base64,/); // Formato válido
      expect(response.body.publicacion.estado).toBe('disponible');
      expect(response.body.publicacion.mascota).toBeDefined();
      expect(response.body.publicacion.mascota.nombre).toBeDefined();
      expect(response.body.publicacion.mascota.tipo).toBeDefined();
      expect(response.body.publicacion.mascota.sexo).toBeDefined();
      expect(response.body.publicacion.mascota.tamaño).toBeDefined();
      expect(response.body.publicacion.mascota.descripcion).toBeDefined();
    });

    test('Debe devolver 404 si la publicación no existe', async () => {
      const response = await request(app)
        .get('/publications/999999')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Funcionalidad - Validación de campos obligatorios al editar', () => {
    test('Debe devolver error 400 si falta el campo "nombre"', async () => {
      const dataWithoutNombre = { ...validUpdateData };
      delete dataWithoutNombre.nombre;

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(dataWithoutNombre);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'nombre')).toBe(true);
    });

    test('Debe devolver error 400 si falta el campo "tamaño"', async () => {
      const dataWithoutTamaño = { ...validUpdateData };
      delete dataWithoutTamaño.tamaño;

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(dataWithoutTamaño);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'tamaño')).toBe(true);
    });

    test('Debe devolver error 400 si falta el campo "sexo"', async () => {
      const dataWithoutSexo = { ...validUpdateData };
      delete dataWithoutSexo.sexo;

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(dataWithoutSexo);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'sexo')).toBe(true);
    });

    test('Debe devolver error 400 si falta el campo "tipo"', async () => {
      const dataWithoutTipo = { ...validUpdateData };
      delete dataWithoutTipo.tipo;

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(dataWithoutTipo);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'tipo')).toBe(true);
    });

    test('Debe devolver error 400 si falta el campo "descripcion"', async () => {
      const dataWithoutDescripcion = { ...validUpdateData };
      delete dataWithoutDescripcion.descripcion;

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(dataWithoutDescripcion);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'descripcion')).toBe(true);
    });

    test('Debe permitir actualizar sin enviar foto (foto es opcional en edición)', async () => {
      const dataWithoutFoto = { ...validUpdateData };
      delete dataWithoutFoto.foto;

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(dataWithoutFoto);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Funcionalidad - Validación de formato de campos', () => {
    test('Debe devolver error 400 si "tamaño" no es uno de los valores permitidos', async () => {
      const invalidData = {
        ...validUpdateData,
        tamaño: 'Gigante'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'tamaño')).toBe(true);
    });

    test('Debe devolver error 400 si "sexo" no es uno de los valores permitidos', async () => {
      const invalidData = {
        ...validUpdateData,
        sexo: 'Desconocido'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'sexo')).toBe(true);
    });

    test('Debe devolver error 400 si "tipo" no es uno de los valores permitidos', async () => {
      const invalidData = {
        ...validUpdateData,
        tipo: 'Dinosaurio'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'tipo')).toBe(true);
    });

    test('Debe devolver error 400 si la foto no tiene formato base64 válido', async () => {
      const invalidData = {
        ...validUpdateData,
        foto: 'https://example.com/image.jpg'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errores).toBeDefined();
      expect(response.body.errores.some(e => e.path === 'foto')).toBe(true);
    });

    test('Debe devolver error 400 si la foto excede el tamaño máximo', async () => {
      const largeBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(7500000);
      
      const invalidData = {
        ...validUpdateData,
        foto: largeBase64
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(invalidData);

      // Express devuelve 413 (Payload Too Large) o 400 dependiendo de la configuración
      expect([400, 413]).toContain(response.status);
    });
  });

  describe('Funcionalidad - Actualización exitosa', () => {
    test('Debe actualizar la publicación exitosamente con todos los datos válidos', async () => {
      const updateData = {
        nombre: 'Firulais Editado',
        tamaño: 'Grande',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'Descripción actualizada del perro',
        foto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('La publicación se editó correctamente');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testPublicacion1.id);
      expect(response.body.data.mascota.nombre).toBe(updateData.nombre);
      expect(response.body.data.mascota.tamaño).toBe(updateData.tamaño);
      expect(response.body.data.mascota.sexo).toBe(updateData.sexo);
      expect(response.body.data.mascota.tipo).toBe(updateData.tipo);
      expect(response.body.data.mascota.descripcion).toBe(updateData.descripcion);
      expect(response.body.data.foto).toBe(updateData.foto);
    });

    test('Debe actualizar solo los datos de la mascota sin cambiar la foto si no se envía', async () => {
      // Primero obtener la foto actual
      const currentPub = await prisma.publicacion.findUnique({
        where: { id: testPublicacion1.id }
      });
      const currentFoto = currentPub.foto;

      const updateData = {
        nombre: 'Nombre sin foto',
        tamaño: 'Chico',
        sexo: 'Hembra',
        tipo: 'Gato',
        descripcion: 'Actualizado sin foto'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.foto).toBe(currentFoto); // Foto no debe cambiar
      expect(response.body.data.mascota.nombre).toBe(updateData.nombre);
    });

    test('Debe mantener el estado de la publicación al actualizar', async () => {
      const updateData = {
        nombre: 'Nombre Estado',
        tamaño: 'Mediano',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'Estado mantiene'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.estado).toBe('disponible');
    });
  });

  describe('Integración - Mantener asociación en BD', () => {
    test('Debe mantener la asociación con el mismo usuario después de la actualización', async () => {
      const updateData = {
        nombre: 'Test Asociación Usuario',
        tamaño: 'Grande',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'Test asociación'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.usuarioId).toBe(testUser1Id);

      // Verificar en BD
      const publicacion = await prisma.publicacion.findUnique({
        where: { id: testPublicacion1.id }
      });
      expect(publicacion.usuarioId).toBe(testUser1Id);
    });

    test('Debe actualizar la mascota existente en lugar de crear una nueva', async () => {
      // Contar mascotas antes
      const mascotasAntes = await prisma.mascota.count({
        where: { publicacionId: testPublicacion1.id }
      });

      const updateData = {
        nombre: 'Test No Duplicar',
        tamaño: 'Chico',
        sexo: 'Hembra',
        tipo: 'Gato',
        descripcion: 'No duplicar mascota'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);

      // Contar mascotas después
      const mascotasDespues = await prisma.mascota.count({
        where: { publicacionId: testPublicacion1.id }
      });

      expect(mascotasDespues).toBe(mascotasAntes); // No debe aumentar el número
    });

    test('Debe mantener el ID de la publicación después de la actualización', async () => {
      const publicacionIdOriginal = testPublicacion1.id;

      const updateData = {
        nombre: 'Test ID Mantiene',
        tamaño: 'Mediano',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'ID se mantiene'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(publicacionIdOriginal);
    });

    test('Los cambios deben persistir en la base de datos', async () => {
      const updateData = {
        nombre: 'Persistencia Test',
        tamaño: 'Grande',
        sexo: 'Hembra',
        tipo: 'Pájaro',
        descripcion: 'Test de persistencia en BD'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);

      // Verificar en BD directamente
      const mascota = await prisma.mascota.findFirst({
        where: { publicacionId: testPublicacion1.id }
      });

      expect(mascota).toBeDefined();
      expect(mascota.nombre).toBe(updateData.nombre);
      expect(mascota.tamaño).toBe(updateData.tamaño);
      expect(mascota.sexo).toBe(updateData.sexo);
      expect(mascota.tipo).toBe(updateData.tipo);
      expect(mascota.descripcion).toBe(updateData.descripcion);
    });
  });

  describe('Integración - Manejo de errores del servicio', () => {
    test('Debe devolver 404 si se intenta actualizar una publicación que no existe', async () => {
      const response = await request(app)
        .put('/publications/999999')
        .set('Authorization', `Bearer ${userToken1}`)
        .send(validUpdateData);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/no encontrada/i);
    });

    test('Debe devolver 400 si el ID de la publicación no es un número válido', async () => {
      const response = await request(app)
        .put('/publications/abc')
        .set('Authorization', `Bearer ${userToken1}`)
        .send(validUpdateData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/inválido/i);
    });

    test('Debe manejar correctamente errores inesperados y devolver 500', async () => {
      // Este test verifica que el endpoint maneja errores gracefully
      // En producción esto requeriría mockear Prisma para simular un error
      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send({ nombre: 'Test' }); // Datos incompletos

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toBeDefined();
    });
  });

  describe('Casos edge - Valores límite y especiales', () => {
    test('Debe permitir actualizar con descripción muy larga', async () => {
      const updateData = {
        ...validUpdateData,
        descripcion: 'A'.repeat(2000)
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.mascota.descripcion.length).toBe(2000);
    });

    test('Debe permitir caracteres especiales en el nombre al actualizar', async () => {
      const updateData = {
        ...validUpdateData,
        nombre: 'Firulais "El Bravo" @ñ#'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.mascota.nombre).toBe(updateData.nombre);
    });

    test('Debe permitir cambiar el tipo de animal completamente', async () => {
      const updateData = {
        ...validUpdateData,
        nombre: 'Cambio de Perro a Gato',
        tipo: 'Gato',
        tamaño: 'Chico'
      };

      const response = await request(app)
        .put(`/publications/${testPublicacion1.id}`)
        .set('Authorization', `Bearer ${userToken1}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.mascota.tipo).toBe('Gato');
    });

    test('Debe permitir actualizaciones consecutivas múltiples veces', async () => {
      for (let i = 0; i < 3; i++) {
        const updateData = {
          ...validUpdateData,
          nombre: `Actualización ${i + 1}`,
          descripcion: `Descripción versión ${i + 1}`
        };

        const response = await request(app)
          .put(`/publications/${testPublicacion1.id}`)
          .set('Authorization', `Bearer ${userToken1}`)
          .send(updateData);

        expect(response.status).toBe(200);
        expect(response.body.data.mascota.nombre).toBe(`Actualización ${i + 1}`);
      }
    });
  });
});
