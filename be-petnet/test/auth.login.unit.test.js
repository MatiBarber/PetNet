const authController = require('../controllers/authController');

describe('Validaciones de login (unit)', () => {
  let req, res;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  test('falla cuando faltan campos obligatorios', async () => {
      // Sin email
      req.body = { password: 'password123' };
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Email y contraseña son requeridos"
      });

      // Reset
      res.status.mockClear();
      res.json.mockClear();
      res.status.mockReturnThis();

      // Sin contraseña
      req.body = { email: 'usuario@email.com' };
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);

      // Reset
      res.status.mockClear();
      res.json.mockClear();
      res.status.mockReturnThis();

      // Campos vacíos
      req.body = { email: '', password: '' };
      await authController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('maneja credenciales incorrectas', async () => {
      // Email que no existe
      req.body = { email: 'noexiste@email.com', password: 'password123' };
      await authController.login(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Email o contraseña incorrecto"
      });
    });
});