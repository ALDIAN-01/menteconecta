// Verifica la conexión desde Node y que exista dbo.Usuario.  Uso: npm run db:check
import { loadConfig } from '../src/config/env.js';
import { closePool, getPool } from '../src/db/pool.js';

try {
  const config = loadConfig();
  const pool = await getPool(config.db);
  const info = await pool.request().query('SELECT DB_NAME() AS base, @@VERSION AS version');
  console.log(`✔ Conexión correcta. Base: ${info.recordset[0].base}`);
  console.log(`  ${info.recordset[0].version.split('\n')[0]}`);

  const tabla = await pool
    .request()
    .query("SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='dbo' AND TABLE_NAME='Usuario'");
  if (tabla.recordset[0].n === 1) {
    console.log('✔ Existe la tabla dbo.Usuario.');
  } else {
    console.log('✘ No existe dbo.Usuario: ejecuta database/01_schema_seed_MenteConecta.sql en SSMS.');
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`✘ ${err.message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
