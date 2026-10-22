import { loadConfig } from './config/env.js';
import { createApp } from './app.js';
import { createUsuarioRepository } from './db/usuarioRepository.js';
import { createConsentRepository } from './db/consentRepository.js';
import { createEmotionRepository } from './db/emotionRepository.js';
import { createAuthService } from './services/authService.js';
import { createConsentService } from './services/consentService.js';
import { createEmotionService } from './services/emotionService.js';
import { closePool, getPool } from './db/pool.js';

async function main() {
  const config = loadConfig();

  // Falla rápido y con un mensaje claro si no hay conexión con SQL Server.
  try {
    await getPool(config.db);
    console.log(`[db] Conectado a SQL Server (base "${config.db.database}").`);
  } catch (err) {
    console.error(`[db] No se pudo conectar a SQL Server: ${err.message}`);
    console.error('[db] Revisa backend/.env y la sección "SQL Server" del README. Prueba: npm run db:check');
    process.exit(1);
  }

  const authService = createAuthService({ usuarios: createUsuarioRepository(config.db), config });
  const consentService = createConsentService({
    consentimientos: createConsentRepository(config.db)
  });
  const emotionService = createEmotionService({
    emociones: createEmotionRepository(config.db),
    consentService
  });
  const app = createApp({ authService, consentService, emotionService, config });

  const server = app.listen(config.port, () => {
    console.log(`[api] MenteConecta API escuchando en http://localhost:${config.port}/api`);
    console.log(`[api] CORS permitido para: ${config.corsOrigin}`);
  });

  const shutdown = () => server.close(async () => { await closePool(); process.exit(0); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[api] Error al iniciar:', err.message);
  process.exit(1);
});
