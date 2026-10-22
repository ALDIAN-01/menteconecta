import { Router } from 'express';
import { createConsentController } from '../controllers/consentController.js';
import { createAuthenticate } from '../middleware/authenticate.js';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createConsentRouter({ authService, consentService }) {
  const controller = createConsentController(consentService);
  const authenticate = createAuthenticate(authService);
  const router = Router();
  router.get('/status', authenticate, wrap(controller.status));
  router.post('/accept', authenticate, wrap(controller.accept));
  return router;
}
