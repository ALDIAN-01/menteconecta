import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createAuthRouter } from './routes/authRoutes.js';
import { createConsentRouter } from './routes/consentRoutes.js';
import { createEmotionRouter } from './routes/emotionRoutes.js';
import { createErrorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Construye la app Express sin abrir puertos ni conexiones (así se puede probar).
 * @param {{ authService: object, consentService: object, emotionService: object, config: object }} deps
 */
export function createApp({ authService, consentService, emotionService, config }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, methods: ['GET', 'POST', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter({ authService, config }));
  app.use('/api/consent', createConsentRouter({ authService, consentService }));
  app.use('/api/emotions', createEmotionRouter({ authService, emotionService }));

  app.use(notFoundHandler);
  app.use(createErrorHandler(config));
  return app;
}
