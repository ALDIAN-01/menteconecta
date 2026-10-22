import { AppError } from '../utils/AppError.js';

export const ALLOWED_EMOTIONS = ['Calma', 'Alegría', 'Tristeza', 'Ansiedad'];
export const MAX_NOTE_LENGTH = 1000;

export function validateEmotion(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Datos inválidos', { body: 'Se esperaba un objeto JSON.' });
  }
  if (Object.keys(body).some((key) => !['emocion', 'intensidad', 'nota'].includes(key))) {
    throw new AppError(400, 'Datos inválidos', { body: 'No se permiten campos adicionales.' });
  }

  const errors = {};
  if (typeof body.emocion !== 'string' || !ALLOWED_EMOTIONS.includes(body.emocion)) {
    errors.emocion = `Selecciona una emoción permitida: ${ALLOWED_EMOTIONS.join(', ')}.`;
  }
  if (!Number.isInteger(body.intensidad) || body.intensidad < 1 || body.intensidad > 5) {
    errors.intensidad = 'La intensidad debe ser un número entero entre 1 y 5.';
  }

  let nota = null;
  if (body.nota !== undefined) {
    if (typeof body.nota !== 'string') {
      errors.nota = 'La nota debe ser texto.';
    } else if (body.nota.length > MAX_NOTE_LENGTH) {
      errors.nota = `La nota no puede superar ${MAX_NOTE_LENGTH} caracteres.`;
    } else {
      nota = body.nota.trim() || null;
    }
  }

  if (Object.keys(errors).length > 0) throw new AppError(400, 'Datos inválidos', errors);
  return { emocion: body.emocion, intensidad: body.intensidad, nota };
}

export function validateEmotionId(rawId) {
  if (typeof rawId !== 'string' || !/^[1-9]\d*$/.test(rawId)) {
    throw new AppError(400, 'Identificador de registro inválido.');
  }
  const idRegistro = Number(rawId);
  if (!Number.isSafeInteger(idRegistro)) throw new AppError(400, 'Identificador de registro inválido.');
  return idRegistro;
}
