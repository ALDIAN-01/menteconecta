import { Router } from 'express';
import { createEmotionController } from '../controllers/emotionController.js';
import { createAuthenticate } from '../middleware/authenticate.js';

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function createEmotionRouter({ authService, emotionService }) {
  const controller = createEmotionController(emotionService);
  const authenticate = createAuthenticate(authService);
  const router = Router();
  router.post('/', authenticate, wrap(controller.create));
  router.get('/', authenticate, wrap(controller.listMine));
  router.delete('/:id', authenticate, wrap(controller.deleteMine));
  return router;
}
