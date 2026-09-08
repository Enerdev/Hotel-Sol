import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFoundError } from '../utils/errors.js';

export const tarifasRouter = Router();
tarifasRouter.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: detectar franja activa según hora actual
// ─────────────────────────────────────────────────────────────────────────────
function getFranjaActual(): 'hasta_12' | 'hasta_19' | 'hasta_22' | 'madrugada' {
  const hora = new Date().getHours(); // hora local del servidor
  if (hora >= 5 && hora < 12)  return 'hasta_12';
  if (hora >= 12 && hora < 19) return 'hasta_19';
  if (hora >= 19 && hora < 22) return 'hasta_22';
  return 'madrugada'; // 22:00 - 04:59
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: detectar período especial activo hoy
// ─────────────────────────────────────────────────────────────────────────────
async function getPeriodoActivoHoy(): Promise<RowDataPacket | null> {
  const hoy = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM periodos_especiales
     WHERE activo = 1
       AND fecha_inicio <= ?
       AND fecha_fin >= ?
     ORDER BY fecha_inicio DESC
     LIMIT 1`,
    [hoy, hoy]
  );
  return rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tarifas/precio-actual/:tipoHabitacion
// Devuelve el precio que aplica AHORA para un tipo de habitación
// Usado por Recepción Express para mostrar precio automático
// ─────────────────────────────────────────────────────────────────────────────
tarifasRouter.get(
  '/precio-actual/:tipoHabitacion',
  asyncHandler(async (req, res) => {
    const { tipoHabitacion } = req.params;
    const franja = getFranjaActual();
    const periodo = await getPeriodoActivoHoy();

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM tarifas_horas
       WHERE tipo_habitacion = ? AND franja = ?`,
      [tipoHabitacion, franja]
    );

    if (!rows[0]) {
      res.json({
        franja,
        periodo: periodo?.tipo ?? 'normal',
        periodo_nombre: periodo?.nombre ?? null,
        precio: null,
        disponible: false,
      });
      return;
    }

    const tarifa = rows[0];

    // Determinar qué columna de precio usar según período activo
    let precio: number | null = tarifa.precio_normal;
    if (periodo) {
      switch (periodo.tipo) {
        case 'semana':
          precio = tarifa.precio_semana ?? tarifa.precio_normal;
          break;
        case 'fiestas':
          precio = tarifa.precio_fiestas ?? tarifa.precio_normal;
          break;
        case 'agosto':
          precio = tarifa.precio_agosto ?? tarifa.precio_normal;
          break;
        case 'personalizado':
          precio = tarifa.precio_fiestas ?? tarifa.precio_normal;
          break;
      }
    }

    res.json({
      franja,
      periodo: periodo?.tipo ?? 'normal',
      periodo_nombre: periodo?.nombre ?? null,
      precio,
      disponible: precio !== null,
    });
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tarifas/horas
// Devuelve todas las tarifas por horas (para panel admin)
// ─────────────────────────────────────────────────────────────────────────────
tarifasRouter.get(
  '/horas',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM tarifas_horas ORDER BY tipo_habitacion, franja`
    );
    res.json(rows);
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/tarifas/horas/:id
// Actualiza precios de una tarifa por horas (admin)
// ─────────────────────────────────────────────────────────────────────────────
const updateTarifaHoraSchema = z.object({
  precio_normal:  z.number().min(0).nullable().optional(),
  precio_semana:  z.number().min(0).nullable().optional(),
  precio_fiestas: z.number().min(0).nullable().optional(),
  precio_agosto:  z.number().min(0).nullable().optional(),
});

tarifasRouter.put(
  '/horas/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updateTarifaHoraSchema.parse(req.body);

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.precio_normal !== undefined)  { fields.push('precio_normal = ?');  values.push(data.precio_normal); }
    if (data.precio_semana !== undefined)  { fields.push('precio_semana = ?');  values.push(data.precio_semana); }
    if (data.precio_fiestas !== undefined) { fields.push('precio_fiestas = ?'); values.push(data.precio_fiestas); }
    if (data.precio_agosto !== undefined)  { fields.push('precio_agosto = ?');  values.push(data.precio_agosto); }

    if (fields.length === 0) {
      res.json({ ok: true, sinCambios: true });
      return;
    }

    values.push(id);
    const [result] = await db.query<ResultSetHeader>(
      `UPDATE tarifas_horas SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) throw new NotFoundError('Tarifa no encontrada');

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM tarifas_horas WHERE id = ?', [id]
    );
    res.json(rows[0]);
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tarifas/periodos
// Lista todos los períodos especiales
// ─────────────────────────────────────────────────────────────────────────────
tarifasRouter.get(
  '/periodos',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM periodos_especiales ORDER BY fecha_inicio DESC`
    );
    res.json(rows);
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tarifas/periodos
// Crea un nuevo período especial (admin)
// ─────────────────────────────────────────────────────────────────────────────
const createPeriodoSchema = z.object({
  nombre:       z.string().min(1).max(100),
  tipo:         z.enum(['semana', 'fiestas', 'agosto', 'personalizado']),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fecha_fin:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activo:       z.boolean().optional().default(true),
});

tarifasRouter.post(
  '/periodos',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = createPeriodoSchema.parse(req.body);

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO periodos_especiales (nombre, tipo, fecha_inicio, fecha_fin, activo)
       VALUES (?, ?, ?, ?, ?)`,
      [data.nombre, data.tipo, data.fecha_inicio, data.fecha_fin, data.activo ? 1 : 0]
    );

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM periodos_especiales WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/tarifas/periodos/:id
// Edita o activa/desactiva un período (admin)
// ─────────────────────────────────────────────────────────────────────────────
const updatePeriodoSchema = z.object({
  nombre:       z.string().min(1).max(100).optional(),
  tipo:         z.enum(['semana', 'fiestas', 'agosto', 'personalizado']).optional(),
  fecha_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  fecha_fin:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activo:       z.boolean().optional(),
});

tarifasRouter.put(
  '/periodos/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updatePeriodoSchema.parse(req.body);

    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.nombre !== undefined)       { fields.push('nombre = ?');       values.push(data.nombre); }
    if (data.tipo !== undefined)         { fields.push('tipo = ?');         values.push(data.tipo); }
    if (data.fecha_inicio !== undefined) { fields.push('fecha_inicio = ?'); values.push(data.fecha_inicio); }
    if (data.fecha_fin !== undefined)    { fields.push('fecha_fin = ?');    values.push(data.fecha_fin); }
    if (data.activo !== undefined)       { fields.push('activo = ?');       values.push(data.activo ? 1 : 0); }

    if (fields.length === 0) {
      res.json({ ok: true, sinCambios: true });
      return;
    }

    values.push(id);
    const [result] = await db.query<ResultSetHeader>(
      `UPDATE periodos_especiales SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) throw new NotFoundError('Período no encontrado');

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM periodos_especiales WHERE id = ?', [id]
    );
    res.json(rows[0]);
  })
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/tarifas/periodos/:id
// Elimina un período especial (admin)
// ─────────────────────────────────────────────────────────────────────────────
tarifasRouter.delete(
  '/periodos/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [result] = await db.query<ResultSetHeader>(
      'DELETE FROM periodos_especiales WHERE id = ?', [id]
    );
    if (result.affectedRows === 0) throw new NotFoundError('Período no encontrado');
    res.json({ ok: true });
  })
);
