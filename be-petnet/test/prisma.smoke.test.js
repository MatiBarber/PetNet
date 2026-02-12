const prisma = require('../prismaClient');

describe('Prisma smoke test - Usuario', () => {
  it('crea y lee un Usuario', async () => {
    const created = await prisma.usuario.create({
      data: {
        nombre: 'Test',
        apellido: 'User',
        email: `test_${Date.now()}@example.com`,
        password: 'hash',
        telefono: '1234567890',
        provincia: 'TestProvincia',
        localidad: 'TestLocalidad',
      },
    });

    expect(created.id).toBeGreaterThan(0);

    const found = await prisma.usuario.findUnique({ where: { id: created.id } });
    expect(found).not.toBeNull();
    expect(found.email).toBe(created.email);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
