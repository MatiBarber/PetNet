const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Cubre criterios de aceptación de HU PET-111: Ver publicaciones disponibles para adopción
 * 
 * Criterios de aceptación:
 * - El usuario debe estar autenticado para acceder a la lista de publicaciones disponibles
 * - Se muestran todas las publicaciones con estado "Disponible" (foto, nombre, tipo)
 * - Si no hay publicaciones disponibles, mostrar mensaje específico
 * - La lista se actualiza automáticamente si se agregan nuevas publicaciones o cambian de estado
 */
describe('GET /publications/available - Ver publicaciones disponibles para adopción', () => {
  let testUserId1;
  let testUserId2;
  let userToken1;
  let userToken2;
  let publicacionDisponible1;
  let publicacionDisponible2;
  let publicacionNoDisponible;

  beforeAll(async () => {
    // Crear usuarios de prueba
    const testUser1 = await prisma.usuario.create({
      data: {
        nombre: 'Usuario',
        apellido: 'Adoptante1',
        email: `test_available_user1_${Date.now()}@example.com`,
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
        apellido: 'Adoptante2',
        email: `test_available_user2_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '0987654321',
        provincia: 'Córdoba',
        localidad: 'Córdoba Capital'
      }
    });
    testUserId2 = testUser2.id;
    userToken2 = jwt.sign({ userId: testUserId2, email: testUser2.email }, JWT_SECRET);

    // Crear publicaciones disponibles de diferentes usuarios
    const pub1 = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/perro-disponible.jpg',
        estado: 'disponible',
        usuarioId: testUserId1
      }
    });
    publicacionDisponible1 = pub1.id;

    await prisma.mascota.create({
      data: {
        nombre: 'Max',
        tamaño: 'Grande',
        sexo: 'Macho',
        tipo: 'Perro',
        descripcion: 'Perro muy amigable',
        publicacionId: publicacionDisponible1
      }
    });

    const pub2 = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/gato-disponible.jpg',
        estado: 'disponible',
        usuarioId: testUserId2
      }
    });
    publicacionDisponible2 = pub2.id;

    await prisma.mascota.create({
      data: {
        nombre: 'Luna',
        tamaño: 'Chico',
        sexo: 'Hembra',
        tipo: 'Gato',
        descripcion: 'Gata muy tranquila',
        publicacionId: publicacionDisponible2
      }
    });

    // Crear una publicación NO disponible (no debe aparecer en los resultados)
    const pub3 = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/conejo-no-disponible.jpg',
        estado: 'no disponible',
        usuarioId: testUserId1
      }
    });
    publicacionNoDisponible = pub3.id;

    await prisma.mascota.create({
      data: {
        nombre: 'Tambor',
        tamaño: 'Chico',
        sexo: 'Macho',
        tipo: 'Conejo',
        descripcion: 'Conejo ya adoptado',
        publicacionId: publicacionNoDisponible
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
          contains: 'test_available_'
        }
      }
    });

    await prisma.$disconnect();
  });

  describe('Seguridad - Autenticación', () => {
    it('rechaza acceso sin token de autenticación', async () => {
      const res = await request(app)
        .get('/publications/available');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/autorización no provisto|no autorizado/i);
    });

    it('rechaza acceso con token inválido', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', 'Bearer tokeninvalido123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token inválido|token expirado/i);
    });

    it('permite acceso con token válido', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('publicaciones');
    });
  });

  describe('Funcionalidad - Mostrar solo publicaciones disponibles', () => {
    it('retorna únicamente publicaciones con estado "disponible"', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.publicaciones).toEqual(expect.any(Array));
      expect(res.body.publicaciones.length).toBeGreaterThanOrEqual(2);

      // Verificar que todas las publicaciones tienen estado "disponible"
      res.body.publicaciones.forEach(pub => {
        expect(pub.estado).toBe('disponible');
      });
    });

    it('no incluye publicaciones con estado "no disponible"', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);

      // Verificar que no contiene la publicación "no disponible"
      const nombresAnimales = res.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombresAnimales).not.toContain('Tambor'); // Tambor es "no disponible"
    });

    it('incluye publicaciones de todos los usuarios, no solo del autenticado', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.publicaciones.length).toBeGreaterThanOrEqual(2);

      const nombresAnimales = res.body.publicaciones.map(p => p.mascota.nombre);
      // Debe contener animales de ambos usuarios
      expect(nombresAnimales).toContain('Max');   // Del usuario 1
      expect(nombresAnimales).toContain('Luna');  // Del usuario 2
    });
  });

  describe('Funcionalidad - Datos requeridos en cada publicación', () => {
    it('cada publicación incluye foto del animal', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      res.body.publicaciones.forEach(pub => {
        expect(pub.foto).toBeDefined();
        expect(typeof pub.foto).toBe('string');
        expect(pub.foto).toMatch(/^https?:\/\//); // Debe ser una URL
      });
    });

    it('cada publicación incluye nombre del animal', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      res.body.publicaciones.forEach(pub => {
        expect(pub.mascota).toBeDefined();
        expect(pub.mascota.nombre).toBeDefined();
        expect(typeof pub.mascota.nombre).toBe('string');
        expect(pub.mascota.nombre.length).toBeGreaterThan(0);
      });
    });

    it('cada publicación incluye tipo de animal', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      res.body.publicaciones.forEach(pub => {
        expect(pub.mascota.tipo).toBeDefined();
        expect(['Perro', 'Gato', 'Pájaro', 'Conejo']).toContain(pub.mascota.tipo);
      });
    });

    it('cada publicación incluye su ID único', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      const ids = res.body.publicaciones.map(p => p.id);
      const idsUnicos = [...new Set(ids)];
      expect(idsUnicos.length).toBe(ids.length); // No debe haber IDs duplicados

      res.body.publicaciones.forEach(pub => {
        expect(pub.id).toBeDefined();
        expect(typeof pub.id).toBe('number');
      });
    });

    it('estructura de respuesta es consistente', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('publicaciones');
      expect(Array.isArray(res.body.publicaciones)).toBe(true);

      if (res.body.publicaciones.length > 0) {
        const pub = res.body.publicaciones[0];
        expect(pub).toHaveProperty('id');
        expect(pub).toHaveProperty('estado');
        expect(pub).toHaveProperty('foto');
        expect(pub).toHaveProperty('mascota');
        expect(pub.mascota).toHaveProperty('nombre');
        expect(pub.mascota).toHaveProperty('tipo');
      }
    });
  });

  describe('Funcionalidad - Filtrado por tipo de animal', () => {
    it('filtra correctamente por tipo "Perro"', async () => {
      const res = await request(app)
        .get('/publications/available?tipo=Perro')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      res.body.publicaciones.forEach(pub => {
        expect(pub.mascota.tipo).toBe('Perro');
      });

      const nombres = res.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombres).toContain('Max');
      expect(nombres).not.toContain('Luna'); // Luna es gato
    });

    it('filtra correctamente por tipo "Gato"', async () => {
      const res = await request(app)
        .get('/publications/available?tipo=Gato')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      res.body.publicaciones.forEach(pub => {
        expect(pub.mascota.tipo).toBe('Gato');
      });

      const nombres = res.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombres).toContain('Luna');
      expect(nombres).not.toContain('Max'); // Max es perro
    });

    it('retorna array vacío para tipo que no existe en publicaciones disponibles', async () => {
      const res = await request(app)
        .get('/publications/available?tipo=Pájaro')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      expect(res.body.publicaciones).toEqual([]);
      expect(res.body.message).toMatch(/no hay animales disponibles/i);
    });
  });

  describe('Funcionalidad - Sin publicaciones disponibles', () => {
    let usuarioSinPublicaciones;
    let tokenSinPublicaciones;

    beforeAll(async () => {
      // Cambiar todas las publicaciones a "no disponible" temporalmente
      await prisma.publicacion.updateMany({
        where: { estado: 'disponible' },
        data: { estado: 'no disponible' }
      });

      // Crear usuario para el test
      const user = await prisma.usuario.create({
        data: {
          nombre: 'Usuario',
          apellido: 'Test Vacío',
          email: `test_available_empty_${Date.now()}@example.com`,
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
      // Restaurar publicaciones a "disponible"
      await prisma.publicacion.updateMany({
        where: { 
          id: {
            in: [publicacionDisponible1, publicacionDisponible2]
          }
        },
        data: { estado: 'disponible' }
      });

      await prisma.usuario.deleteMany({
        where: { id: usuarioSinPublicaciones }
      });
    });

    it('muestra mensaje específico cuando no hay publicaciones disponibles', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${tokenSinPublicaciones}`);

      expect(res.status).toBe(200);
      expect(res.body.publicaciones).toEqual([]);
      expect(res.body.message).toBe("No hay animales disponibles para adopción en este momento");
    });

    it('retorna estructura consistente aunque esté vacía', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${tokenSinPublicaciones}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('publicaciones');
      expect(res.body).toHaveProperty('message');
      expect(Array.isArray(res.body.publicaciones)).toBe(true);
    });
  });

  describe('Integración - Verificación con base de datos', () => {
    it('los datos devueltos coinciden con los datos en la base de datos', async () => {
      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);

      // Consultar directamente la base de datos
      const publicacionesEnBD = await prisma.publicacion.findMany({
        where: { estado: 'disponible' },
        include: { Mascota: true }
      });

      expect(res.body.publicaciones.length).toBe(publicacionesEnBD.length);

      // Verificar que cada publicación de la respuesta existe en la BD
      res.body.publicaciones.forEach(pubRes => {
        const pubBD = publicacionesEnBD.find(p => p.id === pubRes.id);
        expect(pubBD).toBeDefined();
        expect(pubRes.estado).toBe(pubBD.estado);
        expect(pubRes.foto).toBe(pubBD.foto);
        expect(pubRes.mascota.nombre).toBe(pubBD.Mascota[0].nombre);
        expect(pubRes.mascota.tipo).toBe(pubBD.Mascota[0].tipo);
      });
    });

    it('se actualiza correctamente cuando se crea una nueva publicación disponible', async () => {
      // Obtener publicaciones actuales
      const resBefore = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      const cantidadAntes = resBefore.body.publicaciones.length;

      // Crear nueva publicación disponible
      const nuevaPub = await prisma.publicacion.create({
        data: {
          foto: 'https://example.com/nuevo-disponible.jpg',
          estado: 'disponible',
          usuarioId: testUserId1
        }
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Nuevo',
          tamaño: 'Mediano',
          sexo: 'Macho',
          tipo: 'Pájaro',
          descripcion: 'Pájaro nuevo disponible',
          publicacionId: nuevaPub.id
        }
      });

      // Obtener publicaciones después
      const resAfter = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(resAfter.body.publicaciones.length).toBe(cantidadAntes + 1);
      
      const nombres = resAfter.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombres).toContain('Nuevo');
    });

    it('se actualiza correctamente cuando una publicación cambia de estado', async () => {
      // Cambiar una publicación disponible a "no disponible"
      await prisma.publicacion.update({
        where: { id: publicacionDisponible1 },
        data: { estado: 'no disponible' }
      });

      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      // Verificar que ya no aparece en los resultados
      const nombres = res.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombres).not.toContain('Max'); // Max ya no está disponible

      // Restaurar estado para otros tests
      await prisma.publicacion.update({
        where: { id: publicacionDisponible1 },
        data: { estado: 'disponible' }
      });
    });

    it('incluye publicaciones que cambian de "no disponible" a "disponible"', async () => {
      // Cambiar la publicación "no disponible" a "disponible"
      await prisma.publicacion.update({
        where: { id: publicacionNoDisponible },
        data: { estado: 'disponible' }
      });

      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      // Verificar que ahora aparece en los resultados
      const nombres = res.body.publicaciones.map(p => p.mascota.nombre);
      expect(nombres).toContain('Tambor');

      // Restaurar estado original
      await prisma.publicacion.update({
        where: { id: publicacionNoDisponible },
        data: { estado: 'no disponible' }
      });
    });
  });

  describe('Casos de error - Manejo de errores', () => {
    it('maneja correctamente publicaciones con mascota faltante', async () => {
      // Crear publicación sin mascota (caso edge)
      const pubSinMascota = await prisma.publicacion.create({
        data: {
          foto: 'https://example.com/sin-mascota.jpg',
          estado: 'disponible',
          usuarioId: testUserId1
        }
      });

      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(200);
      
      // Debe incluir la publicación pero con mascota null
      const pubEncontrada = res.body.publicaciones.find(p => p.id === pubSinMascota.id);
      expect(pubEncontrada).toBeDefined();
      expect(pubEncontrada.mascota).toBeNull();

      // Limpiar
      await prisma.publicacion.delete({ where: { id: pubSinMascota.id } });
    });

    it('retorna error 500 en caso de fallo de base de datos', async () => {
      // Simular error cerrando la conexión temporalmente
      await prisma.$disconnect();

      const res = await request(app)
        .get('/publications/available')
        .set('Authorization', `Bearer ${userToken1}`);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/error interno del servidor/i);
    });
  });
});