// Cliente HTTP del módulo de autenticación. Rutas y cuerpos según docs/04_Contrato_API_Auth.md.

const API_URL = (import.meta.env?.VITE_API_URL ?? 'http://localhost:3000/api').replace(/\/+$/, '');

/** Error de la API con el status HTTP (0 = no hubo respuesta) y errores por campo si existen. */
export class ApiError extends Error {
  constructor(status, message, errors = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* respuesta sin JSON */
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message ?? 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      data?.errors ?? {}
    );
  }
  return data;
}

export const registerUser = ({ nombre, correo, password }) =>
  request('/auth/register', { method: 'POST', body: { nombre, correo, password } });

export const loginUser = ({ correo, password }) =>
  request('/auth/login', { method: 'POST', body: { correo, password } });

export const getCurrentUser = (token) => request('/auth/me', { token });

export const getConsentStatus = (token) => request('/consent/status', { token });

export const acceptEmotionalRecordConsent = (token) =>
  request('/consent/accept', { method: 'POST', token, body: { aceptado: true } });

export const createEmotionRecord = (token, record) =>
  request('/emotions', { method: 'POST', token, body: record });

export const getEmotionRecords = (token) => request('/emotions', { token });

export const deleteEmotionRecord = (token, idRegistro) =>
  request(`/emotions/${encodeURIComponent(idRegistro)}`, { method: 'DELETE', token });
