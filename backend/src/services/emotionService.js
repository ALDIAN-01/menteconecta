import { AppError } from '../utils/AppError.js';

export function createEmotionService({ emociones, consentService }) {
  return {
    async create({ idUsuario, emocion, intensidad, nota }) {
      const { idConsentimiento } = await consentService.requireValidConsent(idUsuario);
      const record = await emociones.create({ idUsuario, idConsentimiento, emocion, intensidad, nota });
      if (!record) {
        await consentService.requireValidConsent(idUsuario);
        throw new AppError(500, 'No fue posible guardar el registro emocional.');
      }
      return { idRegistro: record.idRegistro, emocion, intensidad: record.intensidad, nota: record.nota, fecha: record.fecha };
    },

    async listMine(idUsuario) {
      return emociones.findAllByUser(idUsuario);
    },

    async deleteMine({ idRegistro, idUsuario }) {
      const deleted = await emociones.deleteByUser({ idRegistro, idUsuario });
      if (!deleted) throw new AppError(404, 'No se encontró el registro solicitado.');
    }
  };
}
