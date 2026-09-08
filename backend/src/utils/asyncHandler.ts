import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Envuelve un handler async para que cualquier `throw` o promise rejection
 * llegue al middleware de errores sin tener que escribir try/catch en cada ruta.
 *
 * Uso:
 *   router.get('/', asyncHandler(async (req, res) => {
 *     const data = await algunaQueryQuePuedeFallar();
 *     res.json(data);
 *   }));
 */
export function asyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<unknown>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
