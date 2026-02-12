const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('GET /publications/:id - Ver detalle de publicación (PET-115)', () => {
  let testUser1, testUser2;
  let token1, token2;
  let publicacion1, publicacion2;

  beforeAll(async () => {
    // Crear usuarios de prueba
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    
    testUser1 = await prisma.usuario.create({
      data: {
        nombre: 'Juan',
        apellido: 'Pérez',
        email: `juan.perez.detail.${Date.now()}@example.com`,
        password: hashedPassword,
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'La Plata'
      }
    });

    testUser2 = await prisma.usuario.create({
      data: {
        nombre: 'María',
        apellido: 'González',
        email: `maria.gonzalez.detail.${Date.now()}@example.com`,
        password: hashedPassword,
        telefono: '0987654321',
        provincia: 'Córdoba',
        localidad: 'Córdoba Capital'
      }
    });

    // Generar tokens JWT
    token1 = jwt.sign(
      { userId: testUser1.id, email: testUser1.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    token2 = jwt.sign(
      { userId: testUser2.id, email: testUser2.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Crear publicaciones de prueba con sus mascotas
    publicacion1 = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/foto-firulais.jpg',
        estado: 'disponible',
        usuarioId: testUser1.id,
        Mascota: {
          create: {
            nombre: 'Firulais',
            tipo: 'Perro',
            sexo: 'Macho',
            tamaño: 'Grande',
            descripcion: 'Perro golden retriever de 3 años, muy cariñoso y juguetón. Está vacunado y castrado.'
          }
        }
      }
    });

    publicacion2 = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/foto-michi.jpg',
        estado: 'adoptado',
        usuarioId: testUser2.id,
        Mascota: {
          create: {
            nombre: 'Michi',
            tipo: 'Gato',
            sexo: 'Hembra',
            tamaño: 'Mediano',
            descripcion: 'Gata siamesa de 2 años, tranquila y cariñosa.'
          }
        }
      }
    });
  });

  afterAll(async () => {
    // Limpiar base de datos en orden correcto
    await prisma.mascota.deleteMany({
      where: {
        publicacionId: {
          in: [publicacion1.id, publicacion2.id]
        }
      }
    });

    await prisma.publicacion.deleteMany({
      where: {
        id: {
          in: [publicacion1.id, publicacion2.id]
        }
      }
    });

    await prisma.usuario.deleteMany({
      where: {
        id: {
          in: [testUser1.id, testUser2.id]
        }
      }
    });

    await prisma.$disconnect();
  });

  describe('Seguridad - Autenticación', () => {
    it('devuelve error 401 cuando no se proporciona token de autenticación', async () => {
      const res = await request(app)
        .get(`/publications/${publicacion1.id}`);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        message: 'Token de autorización no provisto o con formato incorrecto'
      });
    });

    it('devuelve error 401 cuando se proporciona un token inválido', async () => {
      const res = await request(app)
        .get(`/publications/${publicacion1.id}`)
        .set('Authorization', 'Bearer token_invalido_123');

      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        message: 'Token inválido o expirado'
      });
    });
  });

  describe('Funcionalidad - Visualización de información completa', () => {
    it('devuelve toda la información del animal y publicante cuando el usuario está autenticado', async () => {
      const res = await request(app)
        .get(`/publications/${publicacion1.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('publicacion');
      
      const { publicacion } = res.body;

      // Verificar información de la publicación
      expect(publicacion).toHaveProperty('id', publicacion1.id);
      expect(publicacion).toHaveProperty('foto', 'https://example.com/foto-firulais.jpg');
      expect(publicacion).toHaveProperty('estado', 'disponible');

      // Verificar información completa de la mascota
      expect(publicacion).toHaveProperty('mascota');
      expect(publicacion.mascota).toEqual({
        nombre: 'Firulais',
        tipo: 'Perro',
        sexo: 'Macho',
        tamaño: 'Grande',
        descripcion: 'Perro golden retriever de 3 años, muy cariñoso y juguetón. Está vacunado y castrado.'
      });

      // Verificar información del publicante
      expect(publicacion).toHaveProperty('publicante');
      expect(publicacion.publicante).toEqual({
        id: testUser1.id,
        nombre: 'Juan',
        apellido: 'Pérez',
        email: testUser1.email,
        telefono: '1234567890',
        provincia: 'Buenos Aires',
        localidad: 'La Plata'
      });
    });

    it('permite que cualquier usuario autenticado vea el detalle de una publicación de otro usuario', async () => {
      const res = await request(app)
        .get(`/publications/${publicacion1.id}`)
        .set('Authorization', `Bearer ${token2}`); // Usuario 2 consultando publicación de usuario 1

      expect(res.status).toBe(200);
      expect(res.body.publicacion).toHaveProperty('id', publicacion1.id);
      expect(res.body.publicacion.publicante).toHaveProperty('nombre', 'Juan');
    });

    it('muestra correctamente el detalle de una publicación con estado "adoptado"', async () => {
      const res = await request(app)
        .get(`/publications/${publicacion2.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.publicacion).toHaveProperty('estado', 'adoptado');
      expect(res.body.publicacion.mascota).toHaveProperty('nombre', 'Michi');
    });
  });

  describe('Funcionalidad - Manejo de errores', () => {
    it('devuelve error 404 cuando la publicación no existe', async () => {
      const res = await request(app)
        .get('/publications/999999')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false
      });
    });

    it('devuelve error 404 cuando se proporciona un ID inválido', async () => {
      const res = await request(app)
        .get('/publications/abc')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false
      });
    });
  });

  describe('Integración - Consumo correcto del endpoint', () => {
    it('devuelve status 200 y estructura de datos correcta con ID válido', async () => {
      const res = await request(app)
        .get(`/publications/${publicacion1.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('publicacion');
      expect(res.body.publicacion).toHaveProperty('id');
      expect(res.body.publicacion).toHaveProperty('foto');
      expect(res.body.publicacion).toHaveProperty('estado');
      expect(res.body.publicacion).toHaveProperty('mascota');
      expect(res.body.publicacion).toHaveProperty('publicante');
      
      // Verificar estructura de mascota
      expect(res.body.publicacion.mascota).toHaveProperty('nombre');
      expect(res.body.publicacion.mascota).toHaveProperty('tipo');
      expect(res.body.publicacion.mascota).toHaveProperty('sexo');
      expect(res.body.publicacion.mascota).toHaveProperty('tamaño');
      expect(res.body.publicacion.mascota).toHaveProperty('descripcion');
      
      // Verificar estructura de publicante
      expect(res.body.publicacion.publicante).toHaveProperty('id');
      expect(res.body.publicacion.publicante).toHaveProperty('nombre');
      expect(res.body.publicacion.publicante).toHaveProperty('apellido');
      expect(res.body.publicacion.publicante).toHaveProperty('email');
      expect(res.body.publicacion.publicante).toHaveProperty('telefono');
      expect(res.body.publicacion.publicante).toHaveProperty('provincia');
      expect(res.body.publicacion.publicante).toHaveProperty('localidad');
    });

    it('no expone información sensible como contraseña del publicante', async () => {
      const res = await request(app)
        .get(`/publications/${publicacion1.id}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.publicacion.publicante).not.toHaveProperty('password');
    });
  });
});
