const request = require('supertest');
const app = require('../app');
const prisma = require('../prismaClient');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Mock del servicio de email para evitar errores en tests
jest.mock('../utils/emailServices', () => ({
  enviarNotificacionCambioEstado: jest.fn().mockResolvedValue(true)
}));

/**
 * HU: Ver solicitudes de adopción de mis publicaciones
 * 
 * Casos de prueba de integración:
 * - Seguridad: Validar que solo usuarios autenticados puedan ver solicitudes
 * - Seguridad: Validar que solo el dueño de la publicación pueda cambiar el estado
 * - Funcionalidad: Validar visualización correcta del panel de solicitudes recibidas
 * - Funcionalidad: Validar cambio de estado a "Aprobada"
 * - Funcionalidad: Validar cambio de estado a "Rechazada"
 * - Funcionalidad: Validar que al aprobar una solicitud, otras del mismo animal pasen a "Rechazada"
 * - Integración: Validar consumo del endpoint de actualización de estado
 * - Integración: Validar manejo de errores del servidor
 * - Funcionalidad: Validar que el estado inicial de toda solicitud sea "Pendiente"
 * - Funcionalidad: Validar que una solicitud aprobada no pueda volver a "Pendiente"
 * - Funcionalidad: Validar notificación por email tras cambio de estado
 */
describe('GET /requests/recibidas - Ver solicitudes de adopción recibidas', () => {
  let publicadorId;
  let solicitante1Id;
  let solicitante2Id;
  let publicadorToken;
  let solicitante1Token;
  let publicacionId;
  let solicitud1Id;
  let solicitud2Id;

  beforeAll(async () => {
    // Crear usuario publicador
    const publicador = await prisma.usuario.create({
      data: {
        nombre: 'Juan',
        apellido: 'Publicador',
        email: `publicador_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '1111111111',
        provincia: 'Buenos Aires',
        localidad: 'CABA'
      }
    });
    publicadorId = publicador.id;
    publicadorToken = jwt.sign({ userId: publicadorId, email: publicador.email }, JWT_SECRET);

    // Crear solicitantes
    const solicitante1 = await prisma.usuario.create({
      data: {
        nombre: 'María',
        apellido: 'Solicitante',
        email: `solicitante1_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '2222222222',
        provincia: 'Córdoba',
        localidad: 'Córdoba Capital'
      }
    });
    solicitante1Id = solicitante1.id;
    solicitante1Token = jwt.sign({ userId: solicitante1Id, email: solicitante1.email }, JWT_SECRET);

    const solicitante2 = await prisma.usuario.create({
      data: {
        nombre: 'Pedro',
        apellido: 'Adoptante',
        email: `solicitante2_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '3333333333',
        provincia: 'Santa Fe',
        localidad: 'Rosario'
      }
    });
    solicitante2Id = solicitante2.id;

    // Crear publicación del publicador
    const publicacion = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/foto.jpg',
        estado: 'disponible',
        usuarioId: publicadorId
      }
    });
    publicacionId = publicacion.id;

    // Crear mascota asociada a la publicación
    await prisma.mascota.create({
      data: {
        nombre: 'Firulais',
        sexo: 'Macho',
        tipo: 'Perro',
        tamaño: 'Mediano',
        descripcion: 'Perro amigable y juguetón',
        publicacionId: publicacionId
      }
    });

    // Crear solicitudes de adopción (estado inicial Pendiente)
    const solicitud1 = await prisma.solicitud.create({
      data: {
        estado: 'Pendiente',
        mensaje: 'Me encantaría adoptar a Firulais',
        usuarioId: solicitante1Id,
        publicacionId: publicacionId
      }
    });
    solicitud1Id = solicitud1.id;

    const solicitud2 = await prisma.solicitud.create({
      data: {
        estado: 'Pendiente',
        mensaje: 'Tengo experiencia con perros',
        usuarioId: solicitante2Id,
        publicacionId: publicacionId
      }
    });
    solicitud2Id = solicitud2.id;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await prisma.solicitud.deleteMany({
      where: { id: { in: [solicitud1Id, solicitud2Id] } }
    });
    await prisma.mascota.deleteMany({
      where: { publicacionId: publicacionId }
    });
    await prisma.publicacion.deleteMany({
      where: { id: publicacionId }
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [publicadorId, solicitante1Id, solicitante2Id] } }
    });
  });

  describe('Seguridad - Autenticación', () => {
    it('Debe devolver 401 si no se proporciona token de autenticación', async () => {
      const response = await request(app)
        .get('/requests/recibidas');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token de autorización no provisto o con formato incorrecto');
    });

    it('Debe devolver 401 si el token es inválido', async () => {
      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', 'Bearer token_invalido');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token inválido o expirado');
    });

    it('Debe devolver 401 si el token ha expirado', async () => {
      const expiredToken = jwt.sign(
        { userId: publicadorId, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token inválido o expirado');
    });
  });

  describe('Funcionalidad - Visualización de solicitudes recibidas', () => {
    it('Debe devolver 200 y lista de solicitudes para el usuario autenticado', async () => {
      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', `Bearer ${publicadorToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('solicitudes');
      expect(Array.isArray(response.body.solicitudes)).toBe(true);
      expect(response.body.solicitudes.length).toBe(2);
    });

    it('Debe incluir nombre del solicitante en la respuesta', async () => {
      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', `Bearer ${publicadorToken}`);

      expect(response.status).toBe(200);
      const solicitud = response.body.solicitudes[0];
      expect(solicitud).toHaveProperty('solicitante');
      expect(solicitud.solicitante).toHaveProperty('nombre');
      expect(solicitud.solicitante).toHaveProperty('apellido');
    });

    it('Debe incluir nombre del animal en la respuesta', async () => {
      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', `Bearer ${publicadorToken}`);

      expect(response.status).toBe(200);
      const solicitud = response.body.solicitudes[0];
      expect(solicitud).toHaveProperty('mascota');
      expect(solicitud.mascota).toBe('Firulais');
    });

    it('Debe incluir estado de la solicitud en la respuesta', async () => {
      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', `Bearer ${publicadorToken}`);

      expect(response.status).toBe(200);
      const solicitud = response.body.solicitudes[0];
      expect(solicitud).toHaveProperty('estado');
      expect(['Pendiente', 'Aprobada', 'Rechazada']).toContain(solicitud.estado);
    });

    it('Debe incluir mensaje de la solicitud en la respuesta', async () => {
      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', `Bearer ${publicadorToken}`);

      expect(response.status).toBe(200);
      const solicitud = response.body.solicitudes[0];
      expect(solicitud).toHaveProperty('mensaje');
      expect(typeof solicitud.mensaje).toBe('string');
    });

    it('Debe devolver mensaje apropiado si no hay solicitudes', async () => {
      // Crear un usuario sin publicaciones ni solicitudes
      const usuarioSinSolicitudes = await prisma.usuario.create({
        data: {
          nombre: 'Usuario',
          apellido: 'SinSolicitudes',
          email: `sin_solicitudes_${Date.now()}@example.com`,
          password: 'password',
          telefono: '4444444444',
          provincia: 'Mendoza',
          localidad: 'Mendoza'
        }
      });

      const tokenSinSolicitudes = jwt.sign(
        { userId: usuarioSinSolicitudes.id, email: usuarioSinSolicitudes.email },
        JWT_SECRET
      );

      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', `Bearer ${tokenSinSolicitudes}`);

      expect(response.status).toBe(200);
      expect(response.body.mensaje).toBe('No hay solicitudes para tus publicaciones.');
      expect(response.body.solicitudes).toEqual([]);

      // Limpiar
      await prisma.usuario.delete({ where: { id: usuarioSinSolicitudes.id } });
    });

    it('No debe devolver solicitudes de publicaciones de otros usuarios', async () => {
      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', `Bearer ${solicitante1Token}`);

      expect(response.status).toBe(200);
      expect(response.body.solicitudes).toEqual([]);
    });
  });

  describe('Funcionalidad - Estado inicial de solicitudes', () => {
    it('Debe verificar que toda solicitud recién creada tiene estado "Pendiente"', async () => {
      const response = await request(app)
        .get('/requests/recibidas')
        .set('Authorization', `Bearer ${publicadorToken}`);

      expect(response.status).toBe(200);
      // Verificar que ambas solicitudes tienen estado Pendiente
      response.body.solicitudes.forEach(solicitud => {
        expect(solicitud.estado).toBe('Pendiente');
      });
    });
  });
});

describe('PATCH /requests/:id/estado - Actualizar estado de solicitud', () => {
  let publicadorId;
  let solicitante1Id;
  let solicitante2Id;
  let otroUsuarioId;
  let publicadorToken;
  let solicitante1Token;
  let otroUsuarioToken;
  let publicacionId;
  let solicitud1Id;
  let solicitud2Id;
  let solicitudParaAprobarId;

  beforeAll(async () => {
    // Crear usuario publicador
    const publicador = await prisma.usuario.create({
      data: {
        nombre: 'Ana',
        apellido: 'Propietaria',
        email: `propietaria_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '5555555555',
        provincia: 'Buenos Aires',
        localidad: 'La Plata'
      }
    });
    publicadorId = publicador.id;
    publicadorToken = jwt.sign({ userId: publicadorId, email: publicador.email }, JWT_SECRET);

    // Crear solicitantes
    const solicitante1 = await prisma.usuario.create({
      data: {
        nombre: 'Carlos',
        apellido: 'Interesado',
        email: `interesado_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '6666666666',
        provincia: 'Tucumán',
        localidad: 'San Miguel de Tucumán'
      }
    });
    solicitante1Id = solicitante1.id;
    solicitante1Token = jwt.sign({ userId: solicitante1Id, email: solicitante1.email }, JWT_SECRET);

    const solicitante2 = await prisma.usuario.create({
      data: {
        nombre: 'Laura',
        apellido: 'Aspirante',
        email: `aspirante_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '7777777777',
        provincia: 'Salta',
        localidad: 'Salta Capital'
      }
    });
    solicitante2Id = solicitante2.id;

    // Crear otro usuario (no relacionado)
    const otroUsuario = await prisma.usuario.create({
      data: {
        nombre: 'Intruso',
        apellido: 'Ajeno',
        email: `intruso_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '8888888888',
        provincia: 'Jujuy',
        localidad: 'San Salvador de Jujuy'
      }
    });
    otroUsuarioId = otroUsuario.id;
    otroUsuarioToken = jwt.sign({ userId: otroUsuarioId, email: otroUsuario.email }, JWT_SECRET);

    // Crear publicación
    const publicacion = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/gato.jpg',
        estado: 'disponible',
        usuarioId: publicadorId
      }
    });
    publicacionId = publicacion.id;

    // Crear mascota
    await prisma.mascota.create({
      data: {
        nombre: 'Michi',
        sexo: 'Hembra',
        tipo: 'Gato',
        tamaño: 'Pequeño',
        descripcion: 'Gatita cariñosa',
        publicacionId: publicacionId
      }
    });

    // Crear solicitudes
    const solicitud1 = await prisma.solicitud.create({
      data: {
        estado: 'Pendiente',
        mensaje: 'Quiero adoptar a Michi',
        usuarioId: solicitante1Id,
        publicacionId: publicacionId
      }
    });
    solicitud1Id = solicitud1.id;

    const solicitud2 = await prisma.solicitud.create({
      data: {
        estado: 'Pendiente',
        mensaje: 'Me gustan los gatos',
        usuarioId: solicitante2Id,
        publicacionId: publicacionId
      }
    });
    solicitud2Id = solicitud2.id;

    // Crear otra publicación y solicitud para test de aprobar
    const otraPublicacion = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/perro.jpg',
        estado: 'disponible',
        usuarioId: publicadorId
      }
    });

    await prisma.mascota.create({
      data: {
        nombre: 'Rex',
        sexo: 'Macho',
        tipo: 'Perro',
        tamaño: 'Grande',
        descripcion: 'Perro guardián',
        publicacionId: otraPublicacion.id
      }
    });

    const solicitudParaAprobar = await prisma.solicitud.create({
      data: {
        estado: 'Pendiente',
        mensaje: 'Adoptar a Rex',
        usuarioId: solicitante1Id,
        publicacionId: otraPublicacion.id
      }
    });
    solicitudParaAprobarId = solicitudParaAprobar.id;
  });

  afterAll(async () => {
    // Limpiar datos - el orden importa para evitar violación de foreign keys
    await prisma.solicitud.deleteMany({
      where: { usuarioId: { in: [solicitante1Id, solicitante2Id] } }
    });
    await prisma.mascota.deleteMany({
      where: { publicacion: { usuarioId: publicadorId } }
    });
    await prisma.publicacion.deleteMany({
      where: { usuarioId: publicadorId }
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [publicadorId, solicitante1Id, solicitante2Id, otroUsuarioId] } }
    });
  });

  describe('Seguridad - Autenticación y autorización', () => {
    it('Debe devolver 401 si no se proporciona token', async () => {
      const response = await request(app)
        .patch(`/requests/${solicitud1Id}/estado`)
        .send({ nuevoEstado: 'Aprobada' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token de autorización no provisto o con formato incorrecto');
    });

    it('Debe devolver 401 si el token es inválido', async () => {
      const response = await request(app)
        .patch(`/requests/${solicitud1Id}/estado`)
        .set('Authorization', 'Bearer token_falso')
        .send({ nuevoEstado: 'Aprobada' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Token inválido o expirado');
    });

    it('Debe devolver 403 si otro usuario intenta cambiar el estado de una solicitud ajena', async () => {
      const response = await request(app)
        .patch(`/requests/${solicitud1Id}/estado`)
        .set('Authorization', `Bearer ${otroUsuarioToken}`)
        .send({ nuevoEstado: 'Aprobada' });

      expect(response.status).toBe(403);
      expect(response.body.message).toMatch(/no autorizado|prohibido/i);
    });
  });

  describe('Funcionalidad - Cambio de estado', () => {
    it('Debe devolver 400 si el estado no es válido', async () => {
      const response = await request(app)
        .patch(`/requests/${solicitud1Id}/estado`)
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'EstadoInvalido' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Estado no válido');
    });

    it('Debe devolver 404 si la solicitud no existe', async () => {
      const response = await request(app)
        .patch('/requests/99999/estado')
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'Aprobada' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Solicitud no encontrada');
    });

    it('Debe cambiar el estado a "Rechazada" correctamente', async () => {
      const response = await request(app)
        .patch(`/requests/${solicitud2Id}/estado`)
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'Rechazada' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.solicitud.estado).toBe('Rechazada');

      // Verificar en BD
      const solicitudActualizada = await prisma.solicitud.findUnique({
        where: { id: solicitud2Id }
      });
      expect(solicitudActualizada.estado).toBe('Rechazada');
    });

    it('Debe cambiar el estado a "Aprobada" correctamente', async () => {
      const response = await request(app)
        .patch(`/requests/${solicitudParaAprobarId}/estado`)
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'Aprobada' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.solicitud.estado).toBe('Aprobada');
      expect(response.body.message).toContain('correo enviado');

      // Verificar en BD
      const solicitudActualizada = await prisma.solicitud.findUnique({
        where: { id: solicitudParaAprobarId },
        include: { publicacion: true }
      });
      expect(solicitudActualizada.estado).toBe('Aprobada');
      
      // Validar que la publicación cambió a "no disponible"
      expect(solicitudActualizada.publicacion.estado).toBe('no disponible');
    });
  });

  describe('Integración - Consumo del endpoint', () => {
    it('Debe devolver 200 y JSON con la solicitud actualizada', async () => {
      // Crear nueva solicitud para este test
      const nuevaPublicacion = await prisma.publicacion.create({
        data: {
          foto: 'https://example.com/hamster.jpg',
          estado: 'disponible',
          usuarioId: publicadorId
        }
      });

      await prisma.mascota.create({
        data: {
          nombre: 'Hammy',
          sexo: 'Macho',
          tipo: 'Hamster',
          tamaño: 'Pequeño',
          descripcion: 'Hamster activo',
          publicacionId: nuevaPublicacion.id
        }
      });

      const nuevaSolicitud = await prisma.solicitud.create({
        data: {
          estado: 'Pendiente',
          mensaje: 'Quiero un hamster',
          usuarioId: solicitante1Id,
          publicacionId: nuevaPublicacion.id
        }
      });

      const response = await request(app)
        .patch(`/requests/${nuevaSolicitud.id}/estado`)
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'Rechazada' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/json/);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('solicitud');
      expect(response.body.solicitud).toHaveProperty('id', nuevaSolicitud.id);
      expect(response.body.solicitud).toHaveProperty('estado', 'Rechazada');
    });
  });

  describe('Integración - Manejo de errores', () => {
    it('Debe devolver 500 con mensaje apropiado si ocurre un error del servidor', async () => {
      // Simular error pasando ID inválido que cause error en el servidor
      const response = await request(app)
        .patch('/requests/invalid_id/estado')
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'Aprobada' });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/error|servidor/i);
    });
  });

  describe('Funcionalidad - Validación de solicitud aprobada', () => {
    it('Debe bloquear cambio de solicitud aprobada a otro estado', async () => {
      // Primero aprobar una solicitud
      const publicacionTest = await prisma.publicacion.create({
        data: {
          foto: 'https://example.com/test.jpg',
          estado: 'disponible',
          usuarioId: publicadorId
        }
      });

      await prisma.mascota.create({
        data: {
          nombre: 'TestPet',
          sexo: 'Hembra',
          tipo: 'Perro',
          tamaño: 'Mediano',
          descripcion: 'Test',
          publicacionId: publicacionTest.id
        }
      });

      const solicitudTest = await prisma.solicitud.create({
        data: {
          estado: 'Aprobada', // Ya aprobada
          mensaje: 'Test aprobada',
          usuarioId: solicitante1Id,
          publicacionId: publicacionTest.id
        }
      });

      // Intentar cambiar a Pendiente
      const response = await request(app)
        .patch(`/requests/${solicitudTest.id}/estado`)
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'Pendiente' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/no se puede modificar|aprobada/i);
    });
  });

  describe('Funcionalidad - Notificación por email', () => {
    it('Debe indicar que se envió notificación por email tras cambio de estado', async () => {
      // Crear nueva solicitud para este test
      const publicacionEmail = await prisma.publicacion.create({
        data: {
          foto: 'https://example.com/email.jpg',
          estado: 'disponible',
          usuarioId: publicadorId
        }
      });

      await prisma.mascota.create({
        data: {
          nombre: 'EmailPet',
          sexo: 'Macho',
          tipo: 'Gato',
          tamaño: 'Pequeño',
          descripcion: 'Test email',
          publicacionId: publicacionEmail.id
        }
      });

      const solicitudEmail = await prisma.solicitud.create({
        data: {
          estado: 'Pendiente',
          mensaje: 'Test email notification',
          usuarioId: solicitante1Id,
          publicacionId: publicacionEmail.id
        }
      });

      const response = await request(app)
        .patch(`/requests/${solicitudEmail.id}/estado`)
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'Aprobada' });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/correo enviado/i);
    });
  });
});

describe('Reglas de negocio - Aprobación de solicitudes', () => {
  let publicadorId;
  let solicitante1Id;
  let solicitante2Id;
  let solicitante3Id;
  let publicadorToken;
  let publicacionMultipleId;
  let solicitudA_Id;
  let solicitudB_Id;
  let solicitudC_Id;

  beforeAll(async () => {
    // Crear usuario publicador
    const publicador = await prisma.usuario.create({
      data: {
        nombre: 'Roberto',
        apellido: 'Dueño',
        email: `dueno_${Date.now()}@example.com`,
        password: 'password_hasheada',
        telefono: '9999999999',
        provincia: 'Neuquén',
        localidad: 'Neuquén Capital'
      }
    });
    publicadorId = publicador.id;
    publicadorToken = jwt.sign({ userId: publicadorId, email: publicador.email }, JWT_SECRET);

    // Crear 3 solicitantes
    const solicitante1 = await prisma.usuario.create({
      data: {
        nombre: 'Sol1',
        apellido: 'Apellido1',
        email: `sol1_${Date.now()}@example.com`,
        password: 'password',
        telefono: '1010101010',
        provincia: 'Chaco',
        localidad: 'Resistencia'
      }
    });
    solicitante1Id = solicitante1.id;

    const solicitante2 = await prisma.usuario.create({
      data: {
        nombre: 'Sol2',
        apellido: 'Apellido2',
        email: `sol2_${Date.now()}@example.com`,
        password: 'password',
        telefono: '2020202020',
        provincia: 'Formosa',
        localidad: 'Formosa'
      }
    });
    solicitante2Id = solicitante2.id;

    const solicitante3 = await prisma.usuario.create({
      data: {
        nombre: 'Sol3',
        apellido: 'Apellido3',
        email: `sol3_${Date.now()}@example.com`,
        password: 'password',
        telefono: '3030303030',
        provincia: 'Misiones',
        localidad: 'Posadas'
      }
    });
    solicitante3Id = solicitante3.id;

    // Crear publicación con múltiples solicitudes
    const publicacionMultiple = await prisma.publicacion.create({
      data: {
        foto: 'https://example.com/multiple.jpg',
        estado: 'disponible',
        usuarioId: publicadorId
      }
    });
    publicacionMultipleId = publicacionMultiple.id;

    await prisma.mascota.create({
      data: {
        nombre: 'Bobby',
        sexo: 'Macho',
        tipo: 'Perro',
        tamaño: 'Grande',
        descripcion: 'Perro muy solicitado',
        publicacionId: publicacionMultipleId
      }
    });

    // Crear 3 solicitudes pendientes para la misma publicación
    const solicitudA = await prisma.solicitud.create({
      data: {
        estado: 'Pendiente',
        mensaje: 'Solicitud A',
        usuarioId: solicitante1Id,
        publicacionId: publicacionMultipleId
      }
    });
    solicitudA_Id = solicitudA.id;

    const solicitudB = await prisma.solicitud.create({
      data: {
        estado: 'Pendiente',
        mensaje: 'Solicitud B',
        usuarioId: solicitante2Id,
        publicacionId: publicacionMultipleId
      }
    });
    solicitudB_Id = solicitudB.id;

    const solicitudC = await prisma.solicitud.create({
      data: {
        estado: 'Pendiente',
        mensaje: 'Solicitud C',
        usuarioId: solicitante3Id,
        publicacionId: publicacionMultipleId
      }
    });
    solicitudC_Id = solicitudC.id;
  });

  afterAll(async () => {
    // Limpiar datos - el orden importa para evitar violación de foreign keys
    // Primero borrar TODAS las solicitudes relacionadas con el publicador
    await prisma.solicitud.deleteMany({
      where: {
        OR: [
          { publicacionId: publicacionMultipleId },
          { usuarioId: { in: [solicitante1Id, solicitante2Id, solicitante3Id] } }
        ]
      }
    });
    
    // Borrar todas las mascotas del publicador
    await prisma.mascota.deleteMany({
      where: { publicacion: { usuarioId: publicadorId } }
    });
    
    // Borrar todas las publicaciones del publicador
    await prisma.publicacion.deleteMany({
      where: { usuarioId: publicadorId }
    });
    
    // Finalmente borrar los usuarios
    await prisma.usuario.deleteMany({
      where: { id: { in: [publicadorId, solicitante1Id, solicitante2Id, solicitante3Id] } }
    });
  });

  describe('Aprobación automática de cambios', () => {
    it('Al aprobar una solicitud, la publicación debe pasar a "no disponible"', async () => {
      const response = await request(app)
        .patch(`/requests/${solicitudA_Id}/estado`)
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'Aprobada' });

      expect(response.status).toBe(200);
      expect(response.body.solicitud.estado).toBe('Aprobada');

      // Verificar que la publicación cambió a no disponible
      const publicacion = await prisma.publicacion.findUnique({
        where: { id: publicacionMultipleId }
      });

      expect(publicacion.estado).toBe('no disponible');
    });

    it('Al aprobar una solicitud, las otras solicitudes del mismo animal deben pasar a "Rechazada"', async () => {
      // Ya aprobamos solicitudA_Id en el test anterior
      // Verificar que solicitudB y solicitudC fueron rechazadas automáticamente

      const solicitudB = await prisma.solicitud.findUnique({
        where: { id: solicitudB_Id }
      });

      const solicitudC = await prisma.solicitud.findUnique({
        where: { id: solicitudC_Id }
      });

      expect(solicitudB.estado).toBe('Rechazada');
      expect(solicitudC.estado).toBe('Rechazada');
    });

    it('Al rechazar una solicitud, la publicación debe permanecer disponible', async () => {
      // Crear nueva publicación y solicitud para este test
      const nuevaPublicacion = await prisma.publicacion.create({
        data: {
          foto: 'https://example.com/disponible.jpg',
          estado: 'disponible',
          usuarioId: publicadorId
        }
      });

      await prisma.mascota.create({
        data: {
          nombre: 'DisponiblePet',
          sexo: 'Hembra',
          tipo: 'Gato',
          tamaño: 'Mediano',
          descripcion: 'Test disponibilidad',
          publicacionId: nuevaPublicacion.id
        }
      });

      const nuevaSolicitud = await prisma.solicitud.create({
        data: {
          estado: 'Pendiente',
          mensaje: 'Test rechazo',
          usuarioId: solicitante1Id,
          publicacionId: nuevaPublicacion.id
        }
      });

      const response = await request(app)
        .patch(`/requests/${nuevaSolicitud.id}/estado`)
        .set('Authorization', `Bearer ${publicadorToken}`)
        .send({ nuevoEstado: 'Rechazada' });

      expect(response.status).toBe(200);

      // Verificar que la publicación sigue disponible
      const publicacion = await prisma.publicacion.findUnique({
        where: { id: nuevaPublicacion.id }
      });
      expect(publicacion.estado).toBe('disponible');
    });
  });
});
