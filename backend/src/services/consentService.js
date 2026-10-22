import { AppError } from '../utils/AppError.js';
import { EMOTIONAL_RECORD_PURPOSE } from '../db/consentRepository.js';

const toStatus = (policy, row) => {
  const accepted = row?.aceptado === true;
  const valid = accepted && row.revocadoEn === null;
  return {
    consentimiento: {
      finalidad: EMOTIONAL_RECORD_PURPOSE,
      aceptado: accepted,
      valido: valid,
      fechaAceptacion: row?.fechaAceptacion ?? null,
      revocadoEn: row?.revocadoEn ?? null,
      version: policy.version
    },
    politica: {
      version: policy.version,
      contenido: policy.contenido,
      esBorrador: /^\s*BORRADOR\b/i.test(policy.contenido)
    },
    idConsentimiento: valid ? row.idConsentimiento : null,
    idPolitica: policy.idPolitica
  };
};

export function createConsentService({ consentimientos }) {
  async function loadStatus(idUsuario) {
    const policy = await consentimientos.findCurrentPolicy();
    if (!policy) throw new AppError(503, 'No hay una política de consentimiento vigente disponible.');
    const row = await consentimientos.findConsent({
      idUsuario,
      idPolitica: policy.idPolitica,
      finalidad: EMOTIONAL_RECORD_PURPOSE
    });
    return toStatus(policy, row);
  }

  return {
    async getStatus(idUsuario) {
      const { idConsentimiento: _idConsentimiento, idPolitica: _idPolitica, ...status } = await loadStatus(idUsuario);
      return status;
    },

    async accept(idUsuario) {
      const current = await loadStatus(idUsuario);
      if (current.consentimiento.valido) {
        const { idConsentimiento: _idConsentimiento, idPolitica: _idPolitica, ...status } = current;
        return { status, created: false };
      }
      const created = await consentimientos.recordAcceptance({
        idUsuario,
        idPolitica: current.idPolitica,
        finalidad: EMOTIONAL_RECORD_PURPOSE
      });
      const updated = await loadStatus(idUsuario);
      if (!updated.consentimiento.valido) {
        throw new AppError(503, 'No fue posible registrar el consentimiento. Inténtalo de nuevo.');
      }
      const { idConsentimiento: _idConsentimiento, idPolitica: _idPolitica, ...status } = updated;
      return { status, created: Boolean(created) };
    },

    async requireValidConsent(idUsuario) {
      const status = await loadStatus(idUsuario);
      if (!status.consentimiento.valido) {
        throw new AppError(403, 'Se requiere un consentimiento vigente para registrar emociones.');
      }
      return { idConsentimiento: status.idConsentimiento };
    }
  };
}
