import { getPool, sql } from './pool.js';

// Errores de SQL Server por violación de UNIQUE: 2627 (constraint) y 2601 (índice único).
const DUPLICATE_KEY_ERRORS = [2627, 2601];

export function isDuplicateKeyError(err) {
  const number = err?.number ?? err?.originalError?.info?.number;
  return DUPLICATE_KEY_ERRORS.includes(number);
}

/**
 * Acceso a dbo.Usuario. TODAS las consultas usan parámetros (.input) y nunca
 * concatenan datos del usuario dentro del SQL.
 * Los tipos coinciden con 01_schema_seed_MenteConecta.sql.
 */
export function createUsuarioRepository(dbConfig) {
  return {
    /** Devuelve la fila completa (incluye passwordHash: solo para uso interno del servicio). */
    async findByCorreo(correo) {
      const pool = await getPool(dbConfig);
      const result = await pool
        .request()
        .input('correo', sql.NVarChar(254), correo)
        .query(
          `SELECT idUsuario, nombre, correo, passwordHash, estado
             FROM dbo.Usuario
            WHERE correo = @correo`
        );
      return result.recordset[0] ?? null;
    },

    /** Usuario ACTIVO por id (sin passwordHash). */
    async findActiveById(idUsuario) {
      const pool = await getPool(dbConfig);
      const result = await pool
        .request()
        .input('idUsuario', sql.Int, idUsuario)
        .query(
          `SELECT idUsuario, nombre, correo
             FROM dbo.Usuario
            WHERE idUsuario = @idUsuario AND estado = 1`
        );
      return result.recordset[0] ?? null;
    },

    /** Inserta un usuario. `estado` y `fechaRegistro` los define la base (DEFAULT). */
    async create({ nombre, correo, passwordHash }) {
      const pool = await getPool(dbConfig);
      const result = await pool
        .request()
        .input('nombre', sql.NVarChar(100), nombre)
        .input('correo', sql.NVarChar(254), correo)
        .input('passwordHash', sql.VarChar(255), passwordHash)
        .query(
          `INSERT INTO dbo.Usuario (nombre, correo, passwordHash)
           OUTPUT INSERTED.idUsuario, INSERTED.nombre, INSERTED.correo
           VALUES (@nombre, @correo, @passwordHash)`
        );
      return result.recordset[0];
    }
  };
}
