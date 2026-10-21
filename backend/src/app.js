import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createAuthRouter } from './routes/authRoutes.js';
import { createErrorHandler, notFoundHandler } from './middleware/errorHandler.js';

/**
 * Construye la app Express sin abrir puertos ni conexiones (así se puede probar).
 * @param {{ authService: object, config: object }} deps
 */
export function createApp({ authService, config }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin, methods: ['GET', 'POST'], allowedHeaders: ['Content-Type', 'Authorization'] }));
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter({ authService, config }));

  app.use(notFoundHandler);
  app.use(createErrorHandler(config));
  return app;
}
