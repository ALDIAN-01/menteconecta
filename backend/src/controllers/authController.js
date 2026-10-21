import { validateLogin, validateRegister } from '../validation/authValidation.js';

/** Controladores delgados: validan, delegan al servicio y dan formato a la respuesta del contrato. */
export function createAuthController(authService) {
  return {
    async register(req, res) {
      const data = validateRegister(req.body);
      const { user, token } = await authService.register(data);
      res.status(201).json({ message: 'Cuenta creada correctamente', user, token });
    },

    async login(req, res) {
      const data = validateLogin(req.body);
      const { user, token } = await authService.login(data);
      res.status(200).json({ message: 'Inicio de sesión correcto', user, token });
    },

    async me(req, res) {
      const { user } = await authService.getMe(req.auth.idUsuario);
      res.status(200).json({ user });
    }
  };
}
