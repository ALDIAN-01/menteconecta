import sql from 'mssql';

let poolPromise = null;

/** Construye la configuración de `mssql` a partir de config.db. */
export function buildSqlConfig(db) {
  const options = {
    encrypt: db.encrypt,
    trustServerCertificate: db.trustServerCertificate
  };
  const sqlConfig = {
    server: db.server,
    database: db.database,
    user: db.user,
    password: db.password,
    options,
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
  };

  // Instancia con nombre (SQLEXPRESS) y puerto son excluyentes en tedious.
  if (db.instance) {
    options.instanceName = db.instance;
  } else {
    sqlConfig.port = db.port;
  }
  return sqlConfig;
}

/** Devuelve un pool único y reutilizable (se crea en la primera llamada). */
export function getPool(db) {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool(buildSqlConfig(db));
    pool.on('error', (err) => console.error('[db] error en el pool:', err.message));
    poolPromise = pool.connect().catch((err) => {
      poolPromise = null; // permite reintentar en la siguiente petición
      throw err;
    });
  }
  return poolPromise;
}

export async function closePool() {
  if (poolPromise) {
    const pool = await poolPromise.catch(() => null);
    poolPromise = null;
    if (pool) await pool.close();
  }
}

export { sql };
