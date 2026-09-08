import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { getIO } from '../sockets/index.js';

export const cobrosRouter = Router();

cobrosRouter.use(requireAuth, requireRole('admin', 'recepcionista'));

cobrosRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const desde =
      typeof req.query.desde === 'string' && req.query.desde
        ? req.query.desde
        : null;
    const hasta =
      typeof req.query.hasta === 'string' && req.query.hasta
        ? req.query.hasta
        : null;
    const incluir_anulados = req.query.incluir_anulados === '1';

    const where: string[] = [];
    const params: unknown[] = [];
    if (!incluir_anulados) {
      where.push('c.anulado = FALSE');
    }
    if (desde) {
      where.push('DATE(c.fecha) >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('DATE(c.fecha) <= ?');
      params.push(hasta);
    }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         c.id, c.codigo, c.concepto, c.tipo_cobro, c.monto,
         c.metodo_pago, c.numero_operacion, c.telefono_pago,
         c.notas, c.anulado, c.motivo_anulacion, c.fecha_anulacion,
         c.fecha,
         c.cliente_id,
         CASE
           WHEN c.cliente_id IS NOT NULL THEN CONCAT(cl.nombres, ' ', cl.apellidos)
           ELSE c.nombre_cliente
         END AS cliente_display,
         c.reserva_id,
         r.codigo AS reserva_codigo,
         c.habitacion_id,
         h.numero AS habitacion_numero,
         CONCAT(u.nombres, ' ', u.apellidos) AS recepcionista_nombre
       FROM cobros c
       LEFT JOIN clientes cl ON cl.id = c.cliente_id
       LEFT JOIN reservas r ON r.id = c.reserva_id
       LEFT JOIN habitaciones h ON h.id = c.habitacion_id
       LEFT JOIN usuarios u ON u.id = c.recepcionista_id
       ${whereClause}
       ORDER BY c.fecha DESC
       LIMIT 200`,
      params
    );

    res.json(rows);
  })
);

const createCobroSchema = z
  .object({
    concepto: z.string().min(1).max(255),
    tipo_cobro: z
      .enum([
        'venta_directa',
        'servicio_extra',
        'anticipo_reserva',
        'saldo_reserva',
        'lavanderia',
        'consumo_minibar',
        'otro',
      ])
      .default('venta_directa'),
    monto: z.number().positive(),
    metodo_pago: z.enum([
      'efectivo',
      'tarjeta',
      'yape',
      'plin',
      'transferencia',
      'online',
    ]),
    numero_operacion: z.string().max(50).nullable().optional(),
    telefono_pago: z.string().max(20).nullable().optional(),
    cliente_id: z.number().int().positive().nullable().optional(),
    nombre_cliente: z.string().max(200).nullable().optional(),
    reserva_id: z.number().int().positive().nullable().optional(),
    habitacion_id: z.number().int().positive().nullable().optional(),
    notas: z.string().nullable().optional(),
  })
  .refine(
    (data) => {
      if (
        ['yape', 'plin', 'transferencia'].includes(data.metodo_pago) &&
        !data.numero_operacion
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Para Yape, Plin o Transferencia es obligatorio el N° de operación',
      path: ['numero_operacion'],
    }
  );

cobrosRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createCobroSchema.parse(req.body);

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO cobros (
        concepto, tipo_cobro, monto, metodo_pago,
        numero_operacion, telefono_pago,
        cliente_id, nombre_cliente, reserva_id, habitacion_id,
        recepcionista_id, notas
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.concepto,
        data.tipo_cobro,
        data.monto,
        data.metodo_pago,
        data.numero_operacion ?? null,
        data.telefono_pago ?? null,
        data.cliente_id ?? null,
        data.nombre_cliente ?? null,
        data.reserva_id ?? null,
        data.habitacion_id ?? null,
        req.user!.userId,
        data.notas ?? null,
      ]
    );

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT c.*, CASE
         WHEN c.cliente_id IS NOT NULL THEN
           (SELECT CONCAT(nombres, ' ', apellidos) FROM clientes WHERE id = c.cliente_id)
         ELSE c.nombre_cliente
       END AS cliente_display,
       (SELECT CONCAT(nombres, ' ', apellidos) FROM usuarios WHERE id = c.recepcionista_id) AS recepcionista_nombre
       FROM cobros c WHERE c.id = ?`,
      [result.insertId]
    );

    const cobroCreado = rows[0];

    // 🔔 Emitir notificación SOLO al room del admin
    try {
      const io = getIO();
      io.to('admins').emit('cobro:nuevo', {
        id: cobroCreado.id,
        codigo: cobroCreado.codigo,
        concepto: cobroCreado.concepto,
        monto: Number(cobroCreado.monto),
        metodo_pago: cobroCreado.metodo_pago,
        recepcionista_nombre: cobroCreado.recepcionista_nombre,
        fecha: cobroCreado.fecha,
      });
    } catch (err) {
      // No interrumpir la creación del cobro si falla el socket
      console.warn('[cobros] No se pudo emitir cobro:nuevo', err);
    }

    res.status(201).json(cobroCreado);
  })
);

const anularSchema = z.object({
  motivo: z.string().min(3).max(255),
});

cobrosRouter.post(
  '/:id/anular',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { motivo } = anularSchema.parse(req.body);

    const [exist] = await db.query<RowDataPacket[]>(
      'SELECT id, anulado, codigo FROM cobros WHERE id = ?',
      [id]
    );
    if (exist.length === 0) throw new NotFoundError('Cobro no encontrado');
    if (exist[0].anulado) throw new BadRequestError('El cobro ya está anulado');

    await db.query(
      `UPDATE cobros
       SET anulado = TRUE, motivo_anulacion = ?, fecha_anulacion = NOW()
       WHERE id = ?`,
      [motivo, id]
    );

    // Notificar al admin
    try {
      const io = getIO();
      io.to('admins').emit('cobro:anulado', {
        id,
        codigo: exist[0].codigo,
        motivo,
      });
    } catch (err) {
      console.warn('[cobros] No se pudo emitir cobro:anulado', err);
    }

    res.json({ ok: true });
  })
);

cobrosRouter.get(
  '/resumen/hoy',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         metodo_pago,
         COUNT(*) AS num_por_metodo,
         COALESCE(SUM(monto), 0) AS monto_por_metodo
       FROM cobros
       WHERE DATE(fecha) = CURDATE() AND anulado = FALSE
       GROUP BY metodo_pago`
    );

    const [total] = await db.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total_cobros,
         COALESCE(SUM(monto), 0) AS total_monto
       FROM cobros
       WHERE DATE(fecha) = CURDATE() AND anulado = FALSE`
    );

    res.json({
      total: {
        total_cobros: Number(total[0]?.total_cobros) || 0,
        total_monto: Number(total[0]?.total_monto) || 0,
      },
      por_metodo: rows.map((r) => ({
        metodo_pago: r.metodo_pago,
        num: Number(r.num_por_metodo) || 0,
        total: Number(r.monto_por_metodo) || 0,
      })),
    });
  })
);
