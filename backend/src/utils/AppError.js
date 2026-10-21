/** Error controlado: se traduce a una respuesta HTTP con su mensaje (apto para el cliente). */
export class AppError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errors = errors; // opcional: { campo: "mensaje" } en errores 400
  }
}
