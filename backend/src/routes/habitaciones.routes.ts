import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import type { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export const habitacionesRouter = Router();

habitacionesRouter.use(requireAuth);

// ============================================================================
// GET /api/habitaciones - listar todas (admin ve también las inactivas)
// ============================================================================
habitacionesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const esAdmin = req.user!.rol === 'admin';
    const incluirInactivas = req.query.todas === '1' || esAdmin;

    const whereClause = incluirInactivas ? '' : 'WHERE activo = TRUE';

    const [habs] = await db.query<RowDataPacket[]>(
      `SELECT * FROM habitaciones ${whereClause} ORDER BY piso, numero`
    );

    // Traer camas para cada habitación
    const [camas] = await db.query<RowDataPacket[]>(
      'SELECT * FROM camas_habitacion'
    );

    const camasPorHab = new Map<number, RowDataPacket[]>();
    for (const c of camas) {
      const arr = camasPorHab.get(c.habitacion_id) ?? [];
      arr.push(c);
      camasPorHab.set(c.habitacion_id, arr);
    }

    res.json(
      habs.map((h) => ({
        ...h,
        camas: camasPorHab.get(h.id) ?? [],
      }))
    );
  })
);

// ============================================================================
// GET /api/habitaciones/dashboard - estadísticas para el dashboard
// ============================================================================
habitacionesRouter.get(
  '/dashboard',
  asyncHandler(async (_req, res) => {
    const [habStats] = await db.query<RowDataPacket[]>(
      `SELECT
         SUM(estado_ocupacion = 'disponible' AND estado_limpieza = 'limpia') AS hab_disponibles,
         SUM(estado_ocupacion = 'ocupada') AS hab_ocupadas,
         SUM(estado_ocupacion = 'reservada') AS hab_reservadas,
         SUM(estado_limpieza = 'sucia') AS hab_por_limpiar,
         SUM(estado_limpieza = 'en_limpieza') AS hab_en_limpieza,
         SUM(estado_limpieza = 'limpieza_pendiente_validacion') AS hab_pendiente_validacion,
         SUM(estado_ocupacion = 'fuera_de_servicio') AS hab_fuera_servicio
       FROM habitaciones
       WHERE activo = TRUE`
    );

    const [reservasActivas] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS reservas_activas
       FROM reservas
       WHERE estado IN ('activa','fecha_abierta')`
    );

    const [clientesFreq] = await db.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS clientes_frecuentes
       FROM clientes
       WHERE tipo_cliente = 'frecuente' AND activo = TRUE`
    );

    res.json({
      hab_disponibles: Number(habStats[0]?.hab_disponibles) || 0,
      hab_ocupadas: Number(habStats[0]?.hab_ocupadas) || 0,
      hab_reservadas: Number(habStats[0]?.hab_reservadas) || 0,
      hab_por_limpiar: Number(habStats[0]?.hab_por_limpiar) || 0,
      hab_en_limpieza: Number(habStats[0]?.hab_en_limpieza) || 0,
      hab_pendiente_validacion: Number(habStats[0]?.hab_pendiente_validacion) || 0,
      hab_fuera_servicio: Number(habStats[0]?.hab_fuera_servicio) || 0,
      reservas_activas: Number(reservasActivas[0]?.reservas_activas) || 0,
      clientes_frecuentes: Number(clientesFreq[0]?.clientes_frecuentes) || 0,
    });
  })
);

// ============================================================================
// GET /api/habitaciones/:id - una habitación con sus camas
// ============================================================================
habitacionesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [habs] = await db.query<RowDataPacket[]>(
      'SELECT * FROM habitaciones WHERE id = ?',
      [id]
    );
    if (habs.length === 0) throw new NotFoundError('Habitación no encontrada');

    const [camas] = await db.query<RowDataPacket[]>(
      'SELECT * FROM camas_habitacion WHERE habitacion_id = ?',
      [id]
    );

    res.json({ ...habs[0], camas });
  })
);

// ============================================================================
// GET /api/habitaciones/:id/ocupante - cliente actualmente alojado
// ============================================================================
habitacionesRouter.get(
  '/:id/ocupante',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         r.id AS reserva_id, r.codigo, r.fecha_check_in, r.fecha_check_out,
         r.precio_total, r.monto_pagado, r.estado_pago, r.tipo_estancia,
         r.metodo_pago,
         c.id AS cliente_id,
         c.nombres, c.apellidos, c.tipo_documento, c.numero_documento,
         c.telefono, c.nacionalidad,
         CONCAT(u.nombres, ' ', u.apellidos) AS recepcionista_nombre
       FROM reservas r
       JOIN clientes c ON c.id = r.cliente_id
       LEFT JOIN usuarios u ON u.id = r.recepcionista_id
       WHERE r.habitacion_id = ? AND r.estado IN ('activa','fecha_abierta')
       ORDER BY r.fecha_check_in DESC
       LIMIT 1`,
      [id]
    );

    if (rows.length === 0) {
      res.json(null);
      return;
    }
    res.json(rows[0]);
  })
);

// ============================================================================
// POST /api/habitaciones - crear nueva (admin)
// ============================================================================
const tipoHabEnum = z.enum([
  'matrimonial_privada_ducha',
  'matrimonial_bano',
  'tv_cable',
  'simple',
  'doble_privada',
  'doble_tv_cable',
]);

const tipoCamaEnum = z.enum([
  'individual',
  'matrimonial',
  'queen',
  'king',
  'litera_individual',
  'litera_matrimonial',
  'sofa_cama',
]);

const camaSchema = z.object({
  tipo_cama: tipoCamaEnum,
  cantidad: z.number().int().positive().default(1),
});

const createHabSchema = z.object({
  numero: z.string().min(1).max(10),
  piso: z.number().int().min(1).max(20),
  tipo: tipoHabEnum,
  capacidad: z.number().int().min(1).max(10).default(1),
  bano_privado: z.boolean().default(true),
  tiene_ducha: z.boolean().default(true),
  bano_con_jacuzzi: z.boolean().default(false),
  tiene_tv: z.boolean().default(false),
  tiene_control_remoto: z.boolean().default(false),
  tiene_cable_tv: z.boolean().default(false),
  tiene_wifi: z.boolean().default(true),
  tiene_calefaccion: z.boolean().default(false),
  tiene_ventana: z.boolean().default(true),
  tiene_balcon: z.boolean().default(false),
  precio_base_noche: z.number().min(0).default(0),
  notas: z.string().nullable().optional(),
  imagen_url: z.string().nullable().optional(),
  // Estado inicial puede ser fuera_de_servicio si está en construcción
  estado_ocupacion: z
    .enum(['disponible', 'fuera_de_servicio'])
    .default('disponible'),
  camas: z.array(camaSchema).default([]),
});

habitacionesRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = createHabSchema.parse(req.body);

    // Verificar que el número no exista
    const [existe] = await db.query<RowDataPacket[]>(
      'SELECT id FROM habitaciones WHERE numero = ?',
      [data.numero]
    );
    if (existe.length > 0) {
      throw new BadRequestError(
        `Ya existe una habitación con número ${data.numero}`
      );
    }

    const conn = (await db.getConnection()) as PoolConnection;
    try {
      await conn.beginTransaction();

      const [result] = await conn.query<ResultSetHeader>(
        `INSERT INTO habitaciones (
           numero, piso, tipo, capacidad,
           bano_privado, tiene_ducha, bano_con_jacuzzi,
           tiene_tv, tiene_control_remoto, tiene_cable_tv,
           tiene_wifi, tiene_calefaccion, tiene_ventana, tiene_balcon,
           estado_ocupacion, estado_limpieza,
           precio_base_noche, notas, imagen_url, activo
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'limpia', ?, ?, ?, TRUE)`,
        [
          data.numero,
          data.piso,
          data.tipo,
          data.capacidad,
          data.bano_privado,
          data.tiene_ducha,
          data.bano_con_jacuzzi,
          data.tiene_tv,
          data.tiene_control_remoto,
          data.tiene_cable_tv,
          data.tiene_wifi,
          data.tiene_calefaccion,
          data.tiene_ventana,
          data.tiene_balcon,
          data.estado_ocupacion,
          data.precio_base_noche,
          data.notas ?? null,
          data.imagen_url ?? null,
        ]
      );
      const habId = result.insertId;

      // Insertar camas
      for (const cama of data.camas) {
        await conn.query(
          `INSERT INTO camas_habitacion (habitacion_id, tipo_cama, cantidad)
           VALUES (?, ?, ?)`,
          [habId, cama.tipo_cama, cama.cantidad]
        );
      }

      await conn.commit();

      const [hab] = await db.query<RowDataPacket[]>(
        'SELECT * FROM habitaciones WHERE id = ?',
        [habId]
      );
      const [camas] = await db.query<RowDataPacket[]>(
        'SELECT * FROM camas_habitacion WHERE habitacion_id = ?',
        [habId]
      );

      res.status(201).json({ ...hab[0], camas });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// ============================================================================
// PUT /api/habitaciones/:id - editar (admin)
// ============================================================================
const updateHabSchema = z.object({
  numero: z.string().min(1).max(10).optional(),
  piso: z.number().int().min(1).max(20).optional(),
  tipo: tipoHabEnum.optional(),
  capacidad: z.number().int().min(1).max(10).optional(),
  bano_privado: z.boolean().optional(),
  tiene_ducha: z.boolean().optional(),
  bano_con_jacuzzi: z.boolean().optional(),
  tiene_tv: z.boolean().optional(),
  tiene_control_remoto: z.boolean().optional(),
  tiene_cable_tv: z.boolean().optional(),
  tiene_wifi: z.boolean().optional(),
  tiene_calefaccion: z.boolean().optional(),
  tiene_ventana: z.boolean().optional(),
  tiene_balcon: z.boolean().optional(),
  precio_base_noche: z.number().min(0).optional(),
  notas: z.string().nullable().optional(),
  imagen_url: z.string().nullable().optional(),
  activo: z.boolean().optional(),
  estado_ocupacion: z
    .enum(['disponible', 'ocupada', 'reservada', 'fuera_de_servicio'])
    .optional(),
  camas: z.array(camaSchema).optional(),
});

habitacionesRouter.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updateHabSchema.parse(req.body);

    const [exist] = await db.query<RowDataPacket[]>(
      'SELECT id FROM habitaciones WHERE id = ?',
      [id]
    );
    if (exist.length === 0) throw new NotFoundError('Habitación no encontrada');

    // Si cambia numero, verificar que no exista en otra hab
    if (data.numero) {
      const [dup] = await db.query<RowDataPacket[]>(
        'SELECT id FROM habitaciones WHERE numero = ? AND id <> ?',
        [data.numero, id]
      );
      if (dup.length > 0) {
        throw new BadRequestError(`Ya existe otra habitación con número ${data.numero}`);
      }
    }

    const conn = (await db.getConnection()) as PoolConnection;
    try {
      await conn.beginTransaction();

      // Actualizar campos
      const fields: string[] = [];
      const values: unknown[] = [];
      const { camas, ...habFields } = data;
      for (const [key, val] of Object.entries(habFields)) {
        if (val !== undefined) {
          fields.push(`${key} = ?`);
          values.push(val);
        }
      }
      if (fields.length > 0) {
        values.push(id);
        await conn.query(
          `UPDATE habitaciones SET ${fields.join(', ')} WHERE id = ?`,
          values
        );
      }

      // Si se enviaron camas, reemplazar todas
      if (camas !== undefined) {
        await conn.query('DELETE FROM camas_habitacion WHERE habitacion_id = ?', [
          id,
        ]);
        for (const cama of camas) {
          await conn.query(
            `INSERT INTO camas_habitacion (habitacion_id, tipo_cama, cantidad)
             VALUES (?, ?, ?)`,
            [id, cama.tipo_cama, cama.cantidad]
          );
        }
      }

      await conn.commit();

      const [hab] = await db.query<RowDataPacket[]>(
        'SELECT * FROM habitaciones WHERE id = ?',
        [id]
      );
      const [camasFinal] = await db.query<RowDataPacket[]>(
        'SELECT * FROM camas_habitacion WHERE habitacion_id = ?',
        [id]
      );

      res.json({ ...hab[0], camas: camasFinal });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// ============================================================================
// PATCH /api/habitaciones/:id/activar
// PATCH /api/habitaciones/:id/desactivar
// ============================================================================
habitacionesRouter.patch(
  '/:id/desactivar',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    // Verificar que no esté ocupada
    const [hab] = await db.query<RowDataPacket[]>(
      'SELECT estado_ocupacion, numero FROM habitaciones WHERE id = ?',
      [id]
    );
    if (hab.length === 0) throw new NotFoundError('Habitación no encontrada');
    if (hab[0].estado_ocupacion === 'ocupada') {
      throw new BadRequestError(
        `No se puede desactivar la habitación ${hab[0].numero} porque está ocupada`
      );
    }

    await db.query(
      `UPDATE habitaciones
       SET activo = FALSE, estado_ocupacion = 'fuera_de_servicio'
       WHERE id = ?`,
      [id]
    );
    res.json({ ok: true });
  })
);

habitacionesRouter.patch(
  '/:id/activar',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await db.query(
      `UPDATE habitaciones
       SET activo = TRUE, estado_ocupacion = 'disponible'
       WHERE id = ?`,
      [id]
    );
    res.json({ ok: true });
  })
);
