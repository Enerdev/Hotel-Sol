/**
 * Errores HTTP estandarizados.
 * Cualquier endpoint puede arrojar `throw new HttpError(404, 'No encontrado')`
 * y el middleware de errores global responde con el status correcto.
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Solicitud inválida', details?: unknown) {
    super(400, message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'No autenticado') {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Sin permisos para esta acción') {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Recurso no encontrado') {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflicto con el estado actual') {
    super(409, message);
  }
}
