import { AppError } from '../utils/AppError.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ message: 'Ruta no encontrada.' });
}

/**
 * Manejo centralizado de errores. Al cliente solo llegan mensajes controlados:
 * nunca stack traces, SQL, contraseñas ni tokens. No se registra el cuerpo de la petición.
 */
export function createErrorHandler(config) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, _next) => {
    if (err instanceof AppError) {
      const body = { message: err.message };
      if (err.errors) body.errors = err.errors;
      return res.status(err.status).json(body);
    }

    // Errores del parser JSON de Express
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ message: 'Datos inválidos', errors: { body: 'JSON mal formado.' } });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ message: 'La petición es demasiado grande.' });
    }

    // Error inesperado: se registra en el servidor (stack solo en desarrollo) y se responde genérico.
    console.error(`[error] ${req.method} ${req.path}:`, config.isProduction ? err?.message : err);
    return res.status(500).json({ message: 'Error interno del servidor. Inténtalo de nuevo más tarde.' });
  };
}
