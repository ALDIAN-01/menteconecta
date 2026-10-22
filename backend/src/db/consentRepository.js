import { getPool, sql } from './pool.js';

export const EMOTIONAL_RECORD_PURPOSE = 'REGISTRO_EMOCIONAL';

export function createConsentRepository(dbConfig) {
  return {
    async findCurrentPolicy() {
      const pool = await getPool(dbConfig);
      const result = await pool.request().query(
        `SELECT TOP (1) idPolitica, version, contenido
           FROM dbo.PoliticaPrivacidad
          WHERE vigenteDesde <= SYSUTCDATETIME()
            AND (vigenteHasta IS NULL OR vigenteHasta > SYSUTCDATETIME())
          ORDER BY vigenteDesde DESC, idPolitica DESC`
      );
      return result.recordset[0] ?? null;
    },

    async findConsent({ idUsuario, idPolitica, finalidad }) {
      const pool = await getPool(dbConfig);
      const result = await pool
        .request()
        .input('idUsuario', sql.Int, idUsuario)
        .input('idPolitica', sql.Int, idPolitica)
        .input('finalidad', sql.NVarChar(30), finalidad)
        .query(
          `SELECT TOP (1) idConsentimiento, aceptado, fechaAceptacion, revocadoEn
             FROM dbo.ConsentimientoDatos
            WHERE idUsuario = @idUsuario
              AND idPolitica = @idPolitica
              AND finalidad = @finalidad
            ORDER BY fechaAceptacion DESC, idConsentimiento DESC`
        );
      return result.recordset[0] ?? null;
    },

    async recordAcceptance({ idUsuario, idPolitica, finalidad }) {
      const pool = await getPool(dbConfig);
      const result = await pool
        .request()
        .input('idUsuario', sql.Int, idUsuario)
        .input('idPolitica', sql.Int, idPolitica)
        .input('finalidad', sql.NVarChar(30), finalidad)
        .query(
          `INSERT INTO dbo.ConsentimientoDatos (idUsuario, idPolitica, finalidad, aceptado)
           OUTPUT INSERTED.idConsentimiento
           SELECT @idUsuario, p.idPolitica, @finalidad, 1
             FROM dbo.PoliticaPrivacidad AS p
            WHERE p.idPolitica = @idPolitica
              AND p.vigenteDesde <= SYSUTCDATETIME()
              AND (p.vigenteHasta IS NULL OR p.vigenteHasta > SYSUTCDATETIME())
              AND NOT EXISTS (
                SELECT 1
                  FROM dbo.ConsentimientoDatos AS c
                 WHERE c.idUsuario = @idUsuario
                   AND c.idPolitica = p.idPolitica
                   AND c.finalidad = @finalidad
                   AND c.aceptado = 1
                   AND c.revocadoEn IS NULL
              )`
        );
      return result.recordset[0] ?? null;
    }
  };
}
