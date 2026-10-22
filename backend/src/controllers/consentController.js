import { validateConsentAcceptance } from '../validation/consentValidation.js';

export function createConsentController(consentService) {
  return {
    async status(req, res) {
      const status = await consentService.getStatus(req.auth.idUsuario);
      res.status(200).json(status);
    },

    async accept(req, res) {
      validateConsentAcceptance(req.body);
      const { status, created } = await consentService.accept(req.auth.idUsuario);
      res.status(created ? 201 : 200).json({
        message: created ? 'Consentimiento registrado.' : 'El consentimiento ya estaba vigente.',
        ...status
      });
    }
  };
}
