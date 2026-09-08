import { Router } from 'express';
import { db } from '../config/db.js';
import type { RowDataPacket } from 'mysql2';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const cajaRouter = Router();

// SOLO admin puede ver la caja contable
cajaRouter.use(requireAuth, requireRole('admin'));

// ============================================================================
// GET /api/caja/movimientos
// Lista todos los movimientos del periodo (cobros + ventas + pagos de reservas)
// ============================================================================
cajaRouter.get(
  '/movimientos',
  asyncHandler(async (req, res) => {
    const desde =
      typeof req.query.desde === 'string' && req.query.desde
        ? req.query.desde
        : null;
    const hasta =
      typeof req.query.hasta === 'string' && req.query.hasta
        ? req.query.hasta
        : null;

    // ---- Cobros directos ----
    const wC: string[] = ['c.anulado = FALSE'];
    const pC: unknown[] = [];
    if (desde) {
      wC.push('DATE(c.fecha) >= ?');
      pC.push(desde);
    }
    if (hasta) {
      wC.push('DATE(c.fecha) <= ?');
      pC.push(hasta);
    }

    const [cobros] = await db.query<RowDataPacket[]>(
      `SELECT
         c.id, c.codigo, c.concepto, c.monto, c.metodo_pago,
         c.numero_operacion, c.fecha, c.tipo_cobro,
         CASE
           WHEN c.cliente_id IS NOT NULL
           THEN (SELECT CONCAT(nombres,' ',apellidos) FROM clientes WHERE id=c.cliente_id)
           ELSE c.nombre_cliente
         END AS cliente_display,
         h.numero AS habitacion_numero,
         CONCAT(u.nombres,' ',u.apellidos) AS recepcionista_nombre
       FROM cobros c
       LEFT JOIN habitaciones h ON h.id = c.habitacion_id
       LEFT JOIN usuarios u ON u.id = c.recepcionista_id
       WHERE ${wC.join(' AND ')}
       ORDER BY c.fecha DESC`,
      pC
    );

    // ---- Ventas de productos ----
    const wV: string[] = [];
    const pV: unknown[] = [];
    if (desde) {
      wV.push('DATE(v.fecha_venta) >= ?');
      pV.push(desde);
    }
    if (hasta) {
      wV.push('DATE(v.fecha_venta) <= ?');
      pV.push(hasta);
    }
    const whereV = wV.length > 0 ? 'WHERE ' + wV.join(' AND ') : '';

    const [ventas] = await db.query<RowDataPacket[]>(
      `SELECT
         v.id, v.cantidad, v.precio_unitario, v.subtotal,
         v.metodo_pago, v.numero_operacion, v.fecha_venta AS fecha,
         p.nombre AS producto_nombre,
         h.numero AS habitacion_numero,
         CONCAT(u.nombres,' ',u.apellidos) AS recepcionista_nombre,
         r.codigo AS reserva_codigo
       FROM ventas_productos v
       JOIN productos p ON p.id = v.producto_id
       LEFT JOIN reservas r ON r.id = v.reserva_id
       LEFT JOIN habitaciones h ON h.id = r.habitacion_id
       LEFT JOIN usuarios u ON u.id = v.vendido_por_usuario_id
       ${whereV}
       ORDER BY v.fecha_venta DESC`,
      pV
    );

    // ---- Pagos de reservas ----
    const wR: string[] = ["r.estado IN ('activa','check_out','fecha_abierta')"];
    const pR: unknown[] = [];
    if (desde) {
      wR.push('DATE(r.fecha_check_in) >= ?');
      pR.push(desde);
    }
    if (hasta) {
      wR.push('DATE(r.fecha_check_in) <= ?');
      pR.push(hasta);
    }

    const [reservas] = await db.query<RowDataPacket[]>(
      `SELECT
         r.id, r.codigo, r.precio_total, r.monto_pagado,
         r.metodo_pago, r.numero_operacion, r.fecha_check_in AS fecha,
         r.estado_pago,
         CONCAT(c.nombres,' ',c.apellidos) AS cliente_display,
         h.numero AS habitacion_numero,
         CONCAT(u.nombres,' ',u.apellidos) AS recepcionista_nombre
       FROM reservas r
       JOIN clientes c ON c.id = r.cliente_id
       JOIN habitaciones h ON h.id = r.habitacion_id
       LEFT JOIN usuarios u ON u.id = r.recepcionista_id
       WHERE ${wR.join(' AND ')} AND r.monto_pagado > 0
       ORDER BY r.fecha_check_in DESC`,
      pR
    );

    // Normalizar todos los movimientos a una sola lista
    const movimientos = [
      ...cobros.map((c) => ({
        id: `cobro-${c.id}`,
        tipo: 'cobro' as const,
        fecha: c.fecha,
        codigo: c.codigo,
        descripcion: c.concepto,
        monto: Number(c.monto),
        metodo_pago: c.metodo_pago,
        numero_operacion: c.numero_operacion,
        cliente: c.cliente_display,
        habitacion: c.habitacion_numero,
        recepcionista: c.recepcionista_nombre,
        tipo_cobro: c.tipo_cobro,
      })),
      ...ventas.map((v) => ({
        id: `venta-${v.id}`,
        tipo: 'venta' as const,
        fecha: v.fecha,
        codigo: null,
        descripcion: `${v.cantidad}× ${v.producto_nombre}`,
        monto: Number(v.subtotal),
        metodo_pago: v.metodo_pago,
        numero_operacion: v.numero_operacion,
        cliente: null,
        habitacion: v.habitacion_numero,
        recepcionista: v.recepcionista_nombre,
        reserva_codigo: v.reserva_codigo,
      })),
      ...reservas.map((r) => ({
        id: `reserva-${r.id}`,
        tipo: 'reserva' as const,
        fecha: r.fecha,
        codigo: r.codigo,
        descripcion: `Pago de reserva (Hab. ${r.habitacion_numero})`,
        monto: Number(r.monto_pagado),
        metodo_pago: r.metodo_pago,
        numero_operacion: r.numero_operacion,
        cliente: r.cliente_display,
        habitacion: r.habitacion_numero,
        recepcionista: r.recepcionista_nombre,
        estado_pago: r.estado_pago,
        precio_total: Number(r.precio_total),
      })),
    ].sort((a, b) => (a.fecha > b.fecha ? -1 : 1));

    res.json(movimientos);
  })
);

// ============================================================================
// GET /api/caja/resumen - resumen por método de pago
// ============================================================================
cajaRouter.get(
  '/resumen',
  asyncHandler(async (req, res) => {
    const desde =
      typeof req.query.desde === 'string' && req.query.desde
        ? req.query.desde
        : null;
    const hasta =
      typeof req.query.hasta === 'string' && req.query.hasta
        ? req.query.hasta
        : null;

    // Helper para construir WHERE
    const buildWhere = (field: string, extra?: string) => {
      const w: string[] = [];
      const p: unknown[] = [];
      if (extra) w.push(extra);
      if (desde) {
        w.push(`DATE(${field}) >= ?`);
        p.push(desde);
      }
      if (hasta) {
        w.push(`DATE(${field}) <= ?`);
        p.push(hasta);
      }
      return { sql: w.length > 0 ? 'WHERE ' + w.join(' AND ') : '', params: p };
    };

    // Cobros directos
    const wC = buildWhere('c.fecha', 'c.anulado = FALSE');
    const [cobrosResumen] = await db.query<RowDataPacket[]>(
      `SELECT c.metodo_pago, COUNT(*) AS num, COALESCE(SUM(c.monto),0) AS total
       FROM cobros c ${wC.sql}
       GROUP BY c.metodo_pago`,
      wC.params
    );

    // Ventas
    const wV = buildWhere('v.fecha_venta');
    const [ventasResumen] = await db.query<RowDataPacket[]>(
      `SELECT v.metodo_pago, COUNT(*) AS num, COALESCE(SUM(v.subtotal),0) AS total
       FROM ventas_productos v ${wV.sql}
       GROUP BY v.metodo_pago`,
      wV.params
    );

    // Reservas
    const wR = buildWhere(
      'r.fecha_check_in',
      "r.estado IN ('activa','check_out','fecha_abierta') AND r.monto_pagado > 0 AND r.metodo_pago IS NOT NULL"
    );
    const [reservasResumen] = await db.query<RowDataPacket[]>(
      `SELECT r.metodo_pago, COUNT(*) AS num, COALESCE(SUM(r.monto_pagado),0) AS total
       FROM reservas r ${wR.sql}
       GROUP BY r.metodo_pago`,
      wR.params
    );

    // Consolidar por método de pago
    type Acc = { metodo: string; num: number; total: number };
    const map = new Map<string, Acc>();
    const acumular = (rows: RowDataPacket[]) => {
      for (const r of rows) {
        const m = r.metodo_pago || 'sin_metodo';
        const existing = map.get(m) ?? { metodo: m, num: 0, total: 0 };
        existing.num += Number(r.num) || 0;
        existing.total += Number(r.total) || 0;
        map.set(m, existing);
      }
    };
    acumular(cobrosResumen);
    acumular(ventasResumen);
    acumular(reservasResumen);

    const por_metodo = Array.from(map.values()).sort(
      (a, b) => b.total - a.total
    );
    const total_general = por_metodo.reduce((sum, m) => sum + m.total, 0);
    const total_movimientos = por_metodo.reduce((sum, m) => sum + m.num, 0);

    // Desglose por tipo (cobros, ventas, reservas)
    const total_cobros = cobrosResumen.reduce((s, r) => s + Number(r.total || 0), 0);
    const total_ventas = ventasResumen.reduce((s, r) => s + Number(r.total || 0), 0);
    const total_reservas = reservasResumen.reduce((s, r) => s + Number(r.total || 0), 0);

    res.json({
      total_general,
      total_movimientos,
      por_metodo,
      por_tipo: {
        cobros: total_cobros,
        ventas: total_ventas,
        reservas: total_reservas,
      },
    });
  })
);

// ============================================================================
// GET /api/caja/notificaciones - últimas notificaciones (cobros del día)
// ============================================================================
cajaRouter.get(
  '/notificaciones',
  asyncHandler(async (_req, res) => {
    const [cobros] = await db.query<RowDataPacket[]>(
      `SELECT
         c.id, c.codigo, c.concepto, c.monto, c.metodo_pago,
         c.fecha,
         CONCAT(u.nombres,' ',u.apellidos) AS recepcionista_nombre
       FROM cobros c
       LEFT JOIN usuarios u ON u.id = c.recepcionista_id
       WHERE c.anulado = FALSE AND DATE(c.fecha) = CURDATE()
       ORDER BY c.fecha DESC
       LIMIT 20`
    );

    res.json(cobros.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      concepto: c.concepto,
      monto: Number(c.monto),
      metodo_pago: c.metodo_pago,
      fecha: c.fecha,
      recepcionista_nombre: c.recepcionista_nombre,
    })));
  })
);
