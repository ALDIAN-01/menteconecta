import { getPool, sql } from './pool.js';

export function createEmotionRepository(dbConfig) {
  return {
    async create({ idUsuario, idConsentimiento, emocion, intensidad, nota }) {
      const pool = await getPool(dbConfig);
      const result = await pool
        .request()
        .input('idUsuario', sql.Int, idUsuario)
        .input('idConsentimiento', sql.Int, idConsentimiento)
        .input('finalidad', sql.NVarChar(30), 'REGISTRO_EMOCIONAL')
        .input('emocion', sql.NVarChar(50), emocion)
        .input('intensidad', sql.TinyInt, intensidad)
        .input('nota', sql.NVarChar(1000), nota)
        .query(
          `INSERT INTO dbo.RegistroEmocional
             (idUsuario, idEmocion, idConsentimiento, fecha, intensidad, nota)
           OUTPUT INSERTED.idRegistro, INSERTED.fecha, INSERTED.intensidad, INSERTED.nota
           SELECT @idUsuario, e.idEmocion, c.idConsentimiento, SYSUTCDATETIME(), @intensidad, @nota
             FROM dbo.Emocion AS e
             INNER JOIN dbo.ConsentimientoDatos AS c
               ON c.idConsentimiento = @idConsentimiento
              AND c.idUsuario = @idUsuario
             INNER JOIN dbo.PoliticaPrivacidad AS p ON p.idPolitica = c.idPolitica
            WHERE e.nombre = @emocion
              AND c.aceptado = 1
              AND c.finalidad = @finalidad
              AND c.revocadoEn IS NULL
              AND p.vigenteDesde <= SYSUTCDATETIME()
              AND (p.vigenteHasta IS NULL OR p.vigenteHasta > SYSUTCDATETIME())`
        );
      return result.recordset[0] ?? null;
    },

    async findAllByUser(idUsuario) {
      const pool = await getPool(dbConfig);
      const result = await pool
        .request()
        .input('idUsuario', sql.Int, idUsuario)
        .query(
          `SELECT r.idRegistro, e.nombre AS emocion, r.intensidad, r.nota, r.fecha
             FROM dbo.RegistroEmocional AS r
             INNER JOIN dbo.Emocion AS e ON e.idEmocion = r.idEmocion
            WHERE r.idUsuario = @idUsuario
            ORDER BY r.fecha DESC, r.idRegistro DESC`
        );
      return result.recordset;
    },

    async deleteByUser({ idRegistro, idUsuario }) {
      const pool = await getPool(dbConfig);
      const result = await pool
        .request()
        .input('idRegistro', sql.Int, idRegistro)
        .input('idUsuario', sql.Int, idUsuario)
        .query(
          `DELETE FROM dbo.RegistroEmocional
            WHERE idRegistro = @idRegistro AND idUsuario = @idUsuario`
        );
      return result.rowsAffected[0] === 1;
    }
  };
}
