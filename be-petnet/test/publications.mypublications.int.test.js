const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Cubre criterios de aceptación de HU PET-90: Ver mis publicaciones
 * 
 * Criterios de aceptación:
 * - El usuario debe estar autenticado para acceder al panel
 * - El panel muestra todas las publicaciones del usuario (nombre del animal y estado)
 * - Mostrar mensaje "No hay publicaciones disponibles" si el usuario no tiene publicaciones
 * - El panel muestra solo las publicaciones del usuario autenticado
 */
describe('GET /publications/me - Ver mis publicaciones', () => {
  let testUserId1;
  let testUserId2;
  let userToken1;
  let userToken2;
  let publicacionId1;
  let publicacionId2;

  beforeAll(async () => {
    // Crear dos usuarios de prueba
    const testUser1 = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Uno',
        email: `test_mypubs_user1_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'La Plata'
      }
    });
    testUserId1 = testUser1.id;
    userToken1 = jwt.sign({ userId: testUserId1, email: testUser1.email }, JWT_SECRET);

    const testUser2 = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Dos',
        email: `test_mypubs_user2_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '0987654321',
        provincia: 'Córdoba',
        localidad: 'Córdoba Capital'
      }
    });
    testUserId2 = testUser2.id;
    userToken2 = jwt.sign({ userId: testUserId2, email: testUser2.email }, JWT_SECRET);

    // Crear publicaciones para el usuario 1
    const pub1 = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/foto1.jpg',
        estado: 'disponible',
        usuarioId: testUserId1
      }
    });
    publicacionId1 = pub1.id;

    await prisma.mascota.create({
      data: {
        nombre: 'Firulais',
        tamaño: 'Mediano',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'Perro muy amigable',
        publicacionId: publicacionId1
      }
    });

    const pub2 = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/foto2.jpg',
        estado: 'no disponible',
        usuarioId: testUserId1
      }
    });
    publicacionId2 = pub2.id;

    await prisma.mascota.create({
      data: {
        nombre: 'Michi',
        tamaño: 'Chico',
        sexo: 'Hembra',
        tipo: 'Gato',
        descripcion: 'Gata muy tranquila',
        publicacionId: publicacionId2
      }
    });

    // Crear una publicación para el usuario 2 (para verificar que no se mezclen)
    const pub3 = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/foto3.jpg',
        estado: 'disponible',
        usuarioId: testUserId2
      }
    });

    await prisma.mascota.create({
      data: {
        nombre: 'Rex',
        tamaño: 'Grande',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'Perro guardián',
        publicacionId: pub3.id
      }
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.mascota.deleteMany({
      where: {
        publicacion: {
          usuarioId: {
            in: [testUserId1, testUserId2]
          }
        }
      }
    });

    await prisma.publicacion.deleteMany({
      where: {
        usuarioId: {
          in: [testUserId1, testUserId2]
        }
      }
    });

    await prisma.usuario.deleteMany({
      where: {
        email: {
          contains: 'test_mypubs_'
        }
      }
    });

    await prisma.$disconnect();
  });

  describe('Seguridad - Autenticación', () => {
    it('rechaza acceso sin token de autenticación', async () => {
      const res = await request(app)
        .get(`/publications/me`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/autorización no provisto|no autorizado/i);
    });

    it('rechaza acceso con token inválido', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', 'Bearer tokeninvalido123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token inválido|token expirado/i);
    });
  });

  describe('Funcionalidad - Mostrar publicaciones del usuario autenticado', () => {
    it('retorna todas las publicaciones del usuario autenticado', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.publicaciones).toEqual(expect.any(Array));
      expect(res.body.publicaciones.length).toBe(2); // Usuario 1 tiene 2 publicaciones
    });

    it('cada publicación muestra el nombre del animal', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      res.body.publicaciones.forEach(pub => {
        expect(pub.mascota).toBeDefined();
        expect(pub.mascota.nombre).toBeDefined();
        expect(typeof pub.mascota.nombre).toBe('string');
      });

      const nombres = res.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombres).toContain('Firulais');
      expect(nombres).toContain('Michi');
    });

    it('cada publicación muestra el estado [disponible/no disponible]', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      res.body.publicaciones.forEach(pub => {
        expect(pub.estado).toBeDefined();
        expect(['disponible', 'no disponible']).toContain(pub.estado);
      });

      const estados = res.body.publicaciones.map(p => p.estado);
      expect(estados).toContain('disponible');
      expect(estados).toContain('no disponible');
    });

    it('cada publicación incluye su ID', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      res.body.publicaciones.forEach(pub => {
        expect(pub.id).toBeDefined();
        expect(typeof pub.id).toBe('number');
      });
    });

    it('solo muestra publicaciones del usuario autenticado (no de otros usuarios)', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.publicaciones.length).toBe(2);

      // Verificar que NO contiene publicaciones del usuario 2
      const nombres = res.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombres).not.toContain('Rex'); // Rex pertenece al usuario 2
    });

    it('el usuario 2 solo ve sus propias publicaciones', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken2}`);

      expect(res.status).toBe(200);
      expect(res.body.publicaciones.length).toBe(1);
      expect(res.body.publicaciones[0].mascota.nombre).toBe('Rex');
      
      // Verificar que NO contiene publicaciones del usuario 1
      const nombres = res.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombres).not.toContain('Firulais');
      expect(nombres).not.toContain('Michi');
    });
  });

  describe('Funcionalidad - Usuario sin publicaciones', () => {
    let usuarioSinPublicaciones;
    let tokenSinPublicaciones;

    beforeAll(async () => {
      // Crear usuario sin publicaciones
      const user = await prisma.usuario.create({
        data: {
          nombre: 'Usuario',
          apellido: 'Sin Publicaciones',
          email: `test_mypubs_empty_${Date.now()}@example.com`,
          password: 'password_hasheada',
          telefono: '1111111111',
          provincia: 'Mendoza',
          localidad: 'Mendoza Capital'
        }
      });
      usuarioSinPublicaciones = user.id;
      tokenSinPublicaciones = jwt.sign({ userId: usuarioSinPublicaciones, email: user.email }, JWT_SECRET);
    });

    afterAll(async () => {
      await prisma.usuario.deleteMany({
        where: {
          id: usuarioSinPublicaciones
        }
      });
    });

    it('retorna array vacío cuando el usuario no tiene publicaciones', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${tokenSinPublicaciones}`);

      expect(res.status).toBe(200);
      expect(res.body.publicaciones).toEqual(expect.any(Array));
      expect(res.body.publicaciones.length).toBe(0);
    });

    it('retorna estructura de respuesta consistente aunque esté vacía', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${tokenSinPublicaciones}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('publicaciones');
      expect(Array.isArray(res.body.publicaciones)).toBe(true);
    });
  });

  describe('Integración - Verificación con base de datos', () => {
    it('los datos devueltos coinciden con los datos en la base de datos', async () => {
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);

      // Consultar directamente la base de datos
      const publicacionesEnBD = await prisma.publicacion.findMany({
        where: { usuarioId: testUserId1 },
        include: { Mascota: true }
      });

      expect(res.body.publicaciones.length).toBe(publicacionesEnBD.length);

      // Verificar que cada publicación de la respuesta existe en la BD
      res.body.publicaciones.forEach(pubRes => {
        const pubBD = publicacionesEnBD.find(p => p.id === pubRes.id);
        expect(pubBD).toBeDefined();
        expect(pubRes.estado).toBe(pubBD.estado);
        expect(pubRes.mascota.nombre).toBe(pubBD.Mascota[0].nombre);
      });
    });

    it('actualiza correctamente cuando se crea una nueva publicación', async () => {
      // Obtener publicaciones actuales
      const resBefore = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      const cantidadAntes = resBefore.body.publicaciones.length;

      // Crear nueva publicación
      const nuevaPub = await prisma.publicacion.create({
        data: {
          foto: 'https://example.com/nueva.jpg',
          estado: 'disponible',
          usuarioId: testUserId1
        }
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Nuevo',
          tamaño: 'Mediano',
          sexo: 'Macho',
          tipo: 'Perro',
          descripcion: 'Perro nuevo',
          publicacionId: nuevaPub.id
        }
      });

      // Obtener publicaciones después
      const resAfter = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(resAfter.body.publicaciones.length).toBe(cantidadAntes + 1);
      
      const nombres = resAfter.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombres).toContain('Nuevo');
    });

    it('refleja correctamente el cambio de estado de una publicación', async () => {
      // Cambiar estado en la base de datos
      await prisma.publicacion.update({
        where: { id: publicacionId1 },
        data: { estado: 'no disponible' }
      });

      // Verificar que se refleja en la respuesta
      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      const pubActualizada = res.body.publicaciones.find(p => p.id === publicacionId1);
      expect(pubActualizada).toBeDefined();
      expect(pubActualizada.estado).toBe('no disponible');

      // Restaurar estado original
      await prisma.publicacion.update({
        where: { id: publicacionId1 },
        data: { estado: 'disponible' }
      });
    });
  });

  describe('Casos de error - Manejo de errores', () => {
    it('maneja correctamente cuando una publicación no tiene mascota asociada', async () => {
      // Crear publicación sin mascota (caso edge)
      const pubSinMascota = await prisma.publicacion.create({
        data: {
          foto: 'https://example.com/sinmascota.jpg',
          estado: 'disponible',
          usuarioId: testUserId1
        }
      });

      const res = await request(app)
        .get(`/publications/me`)
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      const pubEncontrada = res.body.publicaciones.find(p => p.id === pubSinMascota.id);
      expect(pubEncontrada).toBeDefined();
      expect(pubEncontrada.mascota).toBeNull();

      // Limpiar
      await prisma.publicacion.delete({ where: { id: pubSinMascota.id } });
    });
  });
});

