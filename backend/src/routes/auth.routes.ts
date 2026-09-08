import { Router } from 'express';
import { z } from 'zod';
import { UsuarioModel } from '../models/usuario.model.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from '../utils/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { UnauthorizedError } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

// ----------------------------------------------------------------------------
// POST /api/auth/login
// ----------------------------------------------------------------------------
const loginSchema = z.object({
  username: z.string().min(1, 'Username requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    const usuario = await UsuarioModel.findByUsername(username);
    if (!usuario) {
      throw new UnauthorizedError('Usuario o contraseña incorrectos');
    }

    const valid = await verifyPassword(password, usuario.password_hash);
    if (!valid) {
      throw new UnauthorizedError('Usuario o contraseña incorrectos');
    }

    const payload = {
      userId: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      rol_secundario: usuario.rol_secundario ?? null,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    UsuarioModel.updateLastLogin(usuario.id).catch(() => {});

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: usuario.id,
        username: usuario.username,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        rol: usuario.rol,
        rol_secundario: usuario.rol_secundario ?? null,
        email: usuario.email,
      },
    });
  })
);

// ----------------------------------------------------------------------------
// POST /api/auth/refresh
// ----------------------------------------------------------------------------
const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

authRouter.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const payload = verifyRefreshToken(refreshToken);

    const usuario = await UsuarioModel.findById(payload.userId);
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedError('Sesión inválida');
    }

    const newPayload = {
      userId: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      rol_secundario: usuario.rol_secundario ?? null,
    };

    const accessToken = signAccessToken(newPayload);
    const refreshToken2 = signRefreshToken(newPayload);

    res.json({
      accessToken,
      refreshToken: refreshToken2,
      user: {
        id: usuario.id,
        username: usuario.username,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        rol: usuario.rol,
        rol_secundario: usuario.rol_secundario ?? null,
        email: usuario.email,
      },
    });
  })
);

// ----------------------------------------------------------------------------
// GET /api/auth/me
// ----------------------------------------------------------------------------
authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const usuario = await UsuarioModel.findById(req.user!.userId);
    if (!usuario) throw new UnauthorizedError('Usuario no encontrado');

    res.json({
      id: usuario.id,
      username: usuario.username,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      rol: usuario.rol,
      rol_secundario: usuario.rol_secundario ?? null,
      email: usuario.email,
    });
  })
);