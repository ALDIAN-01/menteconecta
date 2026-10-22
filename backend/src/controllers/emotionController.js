import { validateEmotion, validateEmotionId } from '../validation/emotionValidation.js';

export function createEmotionController(emotionService) {
  return {
    async create(req, res) {
      const input = validateEmotion(req.body);
      const record = await emotionService.create({ ...input, idUsuario: req.auth.idUsuario });
      res.status(201).json({ registro: record });
    },

    async listMine(req, res) {
      const registros = await emotionService.listMine(req.auth.idUsuario);
      res.status(200).json({ registros });
    },

    async deleteMine(req, res) {
      const idRegistro = validateEmotionId(req.params.id);
      await emotionService.deleteMine({ idRegistro, idUsuario: req.auth.idUsuario });
      res.status(204).end();
    }
  };
}
