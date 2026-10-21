import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createAuthController } from '../controllers/authController.js';
import { createAuthenticate } from '../middleware/authenticate.js';

// Express 4 no captura promesas rechazadas: este envoltorio las manda al manejador de errores.
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createAuthRouter({ authService, config }) {
  const controller = createAuthController(authService);
  const authenticate = createAuthenticate(authService);

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.authRateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' }
  });

  const router = Router();
  router.post('/register', limiter, wrap(controller.register));
  router.post('/login', limiter, wrap(controller.login));
  router.get('/me', authenticate, wrap(controller.me));
  return router;
}
