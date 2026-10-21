import { AppError } from '../utils/AppError.js';

// Reglas del contrato 04_Contrato_API_Auth.md (+ límite de 72 bytes por bcrypt).
export const RULES = {
  nombreMin: 2,
  nombreMax: 100,
  correoMax: 254,
  passwordMin: 12,
  passwordMaxBytes: 72 // bcrypt ignora en silencio lo que exceda 72 bytes
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeCorreo = (correo) => correo.trim().toLowerCase();

function ensureObject(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw new AppError(400, 'Datos inválidos', { body: 'Se esperaba un objeto JSON.' });
  }
}

function checkCorreo(raw, errors) {
  if (typeof raw !== 'string' || raw.trim() === '') {
    errors.correo = 'El correo es obligatorio.';
    return null;
  }
  const correo = normalizeCorreo(raw);
  if (correo.length > RULES.correoMax || !EMAIL_RE.test(correo)) {
    errors.correo = 'Escribe un correo válido (máximo 254 caracteres).';
    return null;
  }
  return correo;
}

function checkPasswordPresent(raw, errors) {
  if (typeof raw !== 'string' || raw.length === 0) {
    errors.password = 'La contraseña es obligatoria.';
    return null;
  }
  if (Buffer.byteLength(raw, 'utf8') > RULES.passwordMaxBytes) {
    errors.password = `La contraseña no puede superar ${RULES.passwordMaxBytes} bytes.`;
    return null;
  }
  return raw;
}

/**
 * Valida el cuerpo de registro. Solo lee nombre, correo y password:
 * cualquier otro campo (idUsuario, estado, passwordHash...) se ignora.
 */
export function validateRegister(body) {
  ensureObject(body);
  const errors = {};

  let nombre = null;
  if (typeof body.nombre !== 'string' || body.nombre.trim() === '') {
    errors.nombre = 'El nombre es obligatorio.';
  } else {
    nombre = body.nombre.trim();
    if (nombre.length < RULES.nombreMin || nombre.length > RULES.nombreMax) {
      errors.nombre = `El nombre debe tener entre ${RULES.nombreMin} y ${RULES.nombreMax} caracteres.`;
      nombre = null;
    }
  }

  const correo = checkCorreo(body.correo, errors);

  let password = checkPasswordPresent(body.password, errors);
  if (password !== null && password.length < RULES.passwordMin) {
    errors.password = `La contraseña debe tener al menos ${RULES.passwordMin} caracteres.`;
    password = null;
  }

  if (Object.keys(errors).length > 0) throw new AppError(400, 'Datos inválidos', errors);
  return { nombre, correo, password };
}

/** Login: no se aplican reglas de longitud mínima (no se revela la política con intentos). */
export function validateLogin(body) {
  ensureObject(body);
  const errors = {};
  const correo = checkCorreo(body.correo, errors);
  const password = checkPasswordPresent(body.password, errors);
  if (Object.keys(errors).length > 0) throw new AppError(400, 'Datos inválidos', errors);
  return { correo, password };
}
