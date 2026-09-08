import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import type { Rol } from '../types/index.js';

/**
 * Middleware: requiere que el request traiga un Authorization Bearer token válido.
 * Si lo es, popula req.user con { userId, username, rol }.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token no proporcionado');
  }

  const token = auth.slice(7).trim();
  if (!token) {
    throw new UnauthorizedError('Token vacío');
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    throw new UnauthorizedError('Token inválido o expirado');
  }
}

/**
 * Middleware: requiere que el usuario autenticado tenga uno de los roles dados.
 * Debe usarse SIEMPRE después de requireAuth.
 *
 * Uso:
 *   router.delete('/usuarios/:id', requireAuth, requireRole('admin'), handler);
 *   router.post('/limpiezas/validar', requireAuth, requireRole('admin', 'recepcionista'), handler);
 */
export function requireRole(...roles: Rol[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new UnauthorizedError();
    }
    const rolSecundario = (req.user as any).rol_secundario;
    if (!roles.includes(req.user.rol) && (!rolSecundario || !roles.includes(rolSecundario as Rol))) {
      throw new ForbiddenError(
        `Esta acción requiere uno de los siguientes roles: ${roles.join(', ')}`
      );
    }
    next();
  };
}
