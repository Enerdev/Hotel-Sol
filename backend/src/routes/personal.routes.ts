import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import type { RowDataPacket } from 'mysql2';
import { UsuarioModel } from '../models/usuario.model.js';
import { hashPassword } from '../utils/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFoundError, ConflictError } from '../utils/errors.js';

const removeUndefined = <T extends object>(obj: T): { [K in keyof T]?: Exclude<T[K], undefined> } =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as any;


export const personalRouter = Router();

// Solo admin puede gestionar personal
personalRouter.use(requireAuth, requireRole('admin'));

// ----------------------------------------------------------------------------
// GET /api/personal - listar usuarios (con filtro opcional por rol)
// ----------------------------------------------------------------------------
personalRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rol = typeof req.query.rol === 'string'
      ? (req.query.rol as 'admin' | 'recepcionista' | 'limpieza')
      : undefined;
    const usuarios = await UsuarioModel.listAll(rol);
    // Nunca devolver el hash
    const safe = usuarios.map((u) => {
      const { password_hash, ...rest } = u as RowDataPacket & { password_hash?: string };
      void password_hash;
      return rest;
    });
    res.json(safe);
  })
);

// ----------------------------------------------------------------------------
// GET /api/personal/:id
// ----------------------------------------------------------------------------
personalRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const u = await UsuarioModel.findById(Number(req.params.id));
    if (!u) throw new NotFoundError('Usuario no encontrado');
    const { password_hash, ...rest } = u as RowDataPacket & { password_hash?: string };
    void password_hash;
    res.json(rest);
  })
);

// ----------------------------------------------------------------------------
// POST /api/personal - crear empleado
// ----------------------------------------------------------------------------
const createSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  nombres: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  dni: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  telefono: z.string().optional().nullable(),
  rol: z.enum(['admin', 'recepcionista', 'limpieza']),
  rol_secundario: z.enum(['recepcionista', 'limpieza']).nullable().optional(),
  turno: z.enum(['mañana', 'tarde', 'noche', 'rotativo']).optional().nullable(),
  hora_inicio_turno: z.string().optional().nullable(),
  hora_fin_turno: z.string().optional().nullable(),
  salario: z.number().min(0).optional().nullable(),
});

personalRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);

    const existing = await UsuarioModel.findByUsername(data.username);
    if (existing) {
      throw new ConflictError('Ya existe un usuario con ese username');
    }

    const password_hash = await hashPassword(data.password);
    const id = await UsuarioModel.create({
      username: data.username,
      password_hash,
      nombres: data.nombres,
      apellidos: data.apellidos,
      dni: data.dni ?? null,
      email: data.email || null,
      telefono: data.telefono ?? null,
      rol: data.rol,
      rol_secundario: data.rol_secundario ?? null,
      turno: data.turno ?? null,
      hora_inicio_turno: data.hora_inicio_turno ?? null,
      hora_fin_turno: data.hora_fin_turno ?? null,
      salario: data.salario ?? null,
      activo: true,
    });

    const u = await UsuarioModel.findById(id);
    if (u) {
      const { password_hash: _h, ...rest } = u as RowDataPacket & { password_hash?: string };
      void _h;
      res.status(201).json(rest);
    } else {
      res.status(201).json({ id });
    }
  })
);

// ----------------------------------------------------------------------------
// PUT /api/personal/:id - actualizar empleado
// ----------------------------------------------------------------------------
const updateSchema = createSchema
  .omit({ username: true, password: true })
  .extend({
    password: z.string().min(6).optional(),
    activo: z.boolean().optional(),
  });

personalRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const exists = await UsuarioModel.findById(id);
    if (!exists) throw new NotFoundError('Usuario no encontrado');

    const data = removeUndefined(updateSchema.parse(req.body));

    // Si pasaron password, lo hasheamos y actualizamos por separado
    if (data.password) {
      const hash = await hashPassword(data.password);
      await UsuarioModel.updatePasswordHash(id, hash);
    }

    // Actualizar campos editables
    const { password: _pw, ...rest } = data;
    void _pw;
    await UsuarioModel.update(id, {
      ...rest,
      email: rest.email || null,
    });

    const updated = await UsuarioModel.findById(id);
    if (updated) {
      const { password_hash: _h, ...safe } = updated as RowDataPacket & { password_hash?: string };
      void _h;
      res.json(safe);
    } else {
      res.json({ id });
    }
  })
);

// ----------------------------------------------------------------------------
// POST /api/personal/:id/desactivar
// ----------------------------------------------------------------------------
personalRouter.post(
  '/:id/desactivar',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const u = await UsuarioModel.findById(id);
    if (!u) throw new NotFoundError('Usuario no encontrado');
    if (id === req.user!.userId) {
      throw new ConflictError('No puedes desactivarte a ti mismo');
    }
    await UsuarioModel.setActivo(id, false);
    res.json({ ok: true });
  })
);

// ----------------------------------------------------------------------------
// POST /api/personal/:id/activar
// ----------------------------------------------------------------------------
personalRouter.post(
  '/:id/activar',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const u = await UsuarioModel.findById(id);
    if (!u) throw new NotFoundError('Usuario no encontrado');
    await UsuarioModel.setActivo(id, true);
    res.json({ ok: true });
  })
);

// ============================================================================
// REPORTES DE PRODUCTIVIDAD
// ============================================================================

// ----------------------------------------------------------------------------
// GET /api/personal/productividad/limpieza
// Devuelve productividad de limpieza por empleado en un rango de fechas
// Query: desde=YYYY-MM-DD, hasta=YYYY-MM-DD, tarifa_por_hab=N (opcional)
// ----------------------------------------------------------------------------
personalRouter.get(
  '/productividad/limpieza',
  asyncHandler(async (req, res) => {
    const desde = typeof req.query.desde === 'string' ? req.query.desde : null;
    const hasta = typeof req.query.hasta === 'string' ? req.query.hasta : null;
    const tarifaPorHab = req.query.tarifa_por_hab
      ? Number(req.query.tarifa_por_hab)
      : 0;

    const where: string[] = ['u.rol = ?', 'lr.estado IN (?, ?)'];
    const params: unknown[] = ['limpieza', 'completada_por_limpieza', 'validada_por_recepcion'];

    if (desde) {
      where.push('DATE(lr.fecha_fin_limpieza) >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('DATE(lr.fecha_fin_limpieza) <= ?');
      params.push(hasta);
    }

    const sql = `
      SELECT
        u.id AS empleado_id,
        CONCAT(u.nombres, ' ', u.apellidos) AS empleado_nombre,
        u.username,
        u.activo,
        COUNT(lr.id) AS total_limpiezas,
        SUM(CASE WHEN lr.estado = 'validada_por_recepcion' THEN 1 ELSE 0 END) AS validadas,
        AVG(TIMESTAMPDIFF(MINUTE, lr.fecha_inicio_limpieza, lr.fecha_fin_limpieza)) AS promedio_minutos
      FROM usuarios u
      LEFT JOIN limpieza_registros lr ON lr.empleado_limpieza_id = u.id
        AND ${where.slice(1).join(' AND ')}
      WHERE u.rol = 'limpieza'
      GROUP BY u.id
      ORDER BY total_limpiezas DESC, u.apellidos ASC
    `;

    // Re-ordenar params: primero los de la JOIN, luego los del WHERE u.rol
    const [rows] = await db.query<RowDataPacket[]>(sql, params.slice(1));

    const enriched = rows.map((r) => ({
      ...r,
      total_limpiezas: Number(r.total_limpiezas) || 0,
      validadas: Number(r.validadas) || 0,
      promedio_minutos: r.promedio_minutos ? Number(r.promedio_minutos) : null,
      pago_calculado: tarifaPorHab > 0 ? Number(r.validadas) * tarifaPorHab : null,
      tarifa_por_hab: tarifaPorHab,
    }));

    res.json(enriched);
  })
);

// ----------------------------------------------------------------------------
// GET /api/personal/productividad/limpieza/:id/detalle
// Detalle de habitaciones limpiadas por un empleado
// ----------------------------------------------------------------------------
personalRouter.get(
  '/productividad/limpieza/:id/detalle',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const desde = typeof req.query.desde === 'string' ? req.query.desde : null;
    const hasta = typeof req.query.hasta === 'string' ? req.query.hasta : null;

    const where: string[] = ['lr.empleado_limpieza_id = ?'];
    const params: unknown[] = [id];

    if (desde) {
      where.push('DATE(lr.fecha_fin_limpieza) >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('DATE(lr.fecha_fin_limpieza) <= ?');
      params.push(hasta);
    }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         lr.id, lr.estado,
         lr.fecha_inicio_limpieza, lr.fecha_fin_limpieza, lr.fecha_validacion,
         TIMESTAMPDIFF(MINUTE, lr.fecha_inicio_limpieza, lr.fecha_fin_limpieza) AS duracion_minutos,
         h.numero AS habitacion_numero, h.piso AS habitacion_piso,
         CONCAT(v.nombres, ' ', v.apellidos) AS validador_nombre
       FROM limpieza_registros lr
       JOIN habitaciones h ON h.id = lr.habitacion_id
       LEFT JOIN usuarios v ON v.id = lr.recepcionista_validador_id
       WHERE ${where.join(' AND ')}
       ORDER BY lr.fecha_fin_limpieza DESC
       LIMIT 200`,
      params
    );

    res.json(rows);
  })
);
