import { AppError } from '../utils/AppError.js';

export function validateConsentAcceptance(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Datos inválidos', { body: 'Se esperaba un objeto JSON.' });
  }
  if (Object.keys(body).some((key) => key !== 'aceptado')) {
    throw new AppError(400, 'Datos inválidos', { body: 'No se permiten campos adicionales.' });
  }
  if (body.aceptado !== true) {
    throw new AppError(400, 'Datos inválidos', { aceptado: 'Debes confirmar explícitamente la aceptación.' });
  }
  return { aceptado: true };
}
