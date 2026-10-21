// Validación del lado del cliente: solo mejora la experiencia de uso.
// El backend (backend/src/validation/authValidation.js) valida de forma independiente.
// Si cambias una regla, cámbiala en ambos archivos y en docs/04_Contrato_API_Auth.md.

export const RULES = {
  nombreMin: 2,
  nombreMax: 100,
  correoMax: 254,
  passwordMin: 12,
  passwordMaxBytes: 72
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const byteLength = (text) => new TextEncoder().encode(text).length;

function checkCorreo(correo) {
  const value = correo.trim();
  if (!value) return 'El correo es obligatorio.';
  if (value.length > RULES.correoMax || !EMAIL_RE.test(value)) return 'Escribe un correo válido.';
  return null;
}

function checkPasswordMax(password) {
  return byteLength(password) > RULES.passwordMaxBytes
    ? `La contraseña no puede superar ${RULES.passwordMaxBytes} bytes.`
    : null;
}

/** Devuelve { campo: "mensaje" } solo con los campos inválidos ({} si todo está bien). */
export function validateLogin({ correo, password }) {
  const errors = {};
  const correoError = checkCorreo(correo);
  if (correoError) errors.correo = correoError;
  if (!password) errors.password = 'La contraseña es obligatoria.';
  else if (checkPasswordMax(password)) errors.password = checkPasswordMax(password);
  return errors;
}

export function validateRegister({ nombre, correo, password, confirmPassword, acepta }) {
  const errors = {};
  const nombreLimpio = nombre.trim();
  if (!nombreLimpio) errors.nombre = 'El nombre es obligatorio.';
  else if (nombreLimpio.length < RULES.nombreMin || nombreLimpio.length > RULES.nombreMax) {
    errors.nombre = `El nombre debe tener entre ${RULES.nombreMin} y ${RULES.nombreMax} caracteres.`;
  }

  const correoError = checkCorreo(correo);
  if (correoError) errors.correo = correoError;

  if (!password) errors.password = 'La contraseña es obligatoria.';
  else if (password.length < RULES.passwordMin) {
    errors.password = `Usa al menos ${RULES.passwordMin} caracteres.`;
  } else if (checkPasswordMax(password)) errors.password = checkPasswordMax(password);

  if (!confirmPassword) errors.confirmPassword = 'Repite tu contraseña.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Las contraseñas no coinciden.';

  if (!acepta) errors.acepta = 'Debes aceptar los términos y la política de protección de datos.';
  return errors;
}
