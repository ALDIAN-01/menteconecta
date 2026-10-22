import { AppError } from '../utils/AppError.js';

/**
 * Exige "Authorization: Bearer <jwt>". Si es válido deja el id en req.auth.idUsuario.
 * El id SIEMPRE sale del token; nunca de req.body, req.query ni req.params.
 */
export function createAuthenticate(authService) {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization ?? '';
      const [scheme, token, ...rest] = header.split(' ');
      if (scheme !== 'Bearer' || !token || rest.length > 0) {
        throw new AppError(401, 'Falta el token de autenticación.');
      }
      const idUsuario = authService.verifyToken(token);
      await authService.getMe(idUsuario);
      req.auth = { idUsuario };
      next();
    } catch (err) {
      next(err);
    }
  };
}
