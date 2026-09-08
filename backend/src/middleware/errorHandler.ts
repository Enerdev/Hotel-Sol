import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../utils/errors.js';
import { env } from '../config/env.js';

/**
 * Middleware global de manejo de errores.
 * Captura cualquier error que llegue desde una ruta y devuelve una respuesta JSON consistente.
 *
 * Express identifica este middleware como manejador de errores porque tiene 4 parámetros.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Errores de validación de Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos inválidos',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Errores HTTP propios
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Errores de MySQL (foreign key, duplicate, etc.)
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string; message: string }).code;
    if (code === 'ER_DUP_ENTRY') {
      res.status(409).json({
        error: 'Ya existe un registro con esos datos',
      });
      return;
    }
    if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_ROW_IS_REFERENCED_2') {
      res.status(400).json({
        error: 'Referencia inválida o registro en uso por otra entidad',
      });
      return;
    }
  }

  // Cualquier otro error: 500
  console.error('💥 Error no controlado:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    ...(env.NODE_ENV === 'development' && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
}

/**
 * Middleware para rutas no encontradas (404).
 * Se monta DESPUÉS de todas las rutas pero antes del errorHandler.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.path,
    method: req.method,
  });
}
