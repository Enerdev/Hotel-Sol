import { Router } from 'express';
import { db } from '../config/db.js';
import type { RowDataPacket } from 'mysql2';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const reportesRouter = Router();

reportesRouter.use(requireAuth, requireRole('admin', 'recepcionista'));

// ----------------------------------------------------------------------------
// GET /api/reportes/ocupacion
// ----------------------------------------------------------------------------
reportesRouter.get(
  '/ocupacion',
  asyncHandler(async (req, res) => {
    const desde =
      typeof req.query.desde === 'string' && req.query.desde
        ? req.query.desde
        : null;
    const hasta =
      typeof req.query.hasta === 'string' && req.query.hasta
        ? req.query.hasta
        : null;

    const where: string[] = [];
    const params: unknown[] = [];
    if (desde) {
      where.push('DATE(r.fecha_check_in) >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('DATE(r.fecha_check_in) <= ?');
      params.push(hasta);
    }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [totalRows] = await db.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM habitaciones'
    );
    const totalHabs = Number(totalRows[0]?.total) || 25;

    const [porDia] = await db.query<RowDataPacket[]>(
      `SELECT
         DATE(r.fecha_check_in) AS fecha,
         COUNT(DISTINCT r.habitacion_id) AS habs_ocupadas,
         COUNT(r.id) AS num_reservas,
         COALESCE(SUM(r.precio_total), 0) AS ingresos
       FROM reservas r
       ${whereClause}
       GROUP BY DATE(r.fecha_check_in)
       ORDER BY fecha DESC
       LIMIT 60`,
      params
    );

    const enriched = porDia.map((d) => ({
      fecha: d.fecha,
      habs_ocupadas: Number(d.habs_ocupadas) || 0,
      num_reservas: Number(d.num_reservas) || 0,
      ingresos: Number(d.ingresos) || 0,
      total_habs: totalHabs,
      tasa_ocupacion:
        totalHabs > 0
          ? Math.round((Number(d.habs_ocupadas) / totalHabs) * 100)
          : 0,
    }));

    res.json(enriched);
  })
);

// ----------------------------------------------------------------------------
// GET /api/reportes/ingresos
// ----------------------------------------------------------------------------
reportesRouter.get(
  '/ingresos',
  asyncHandler(async (req, res) => {
    const desde =
      typeof req.query.desde === 'string' && req.query.desde
        ? req.query.desde
        : null;
    const hasta =
      typeof req.query.hasta === 'string' && req.query.hasta
        ? req.query.hasta
        : null;

    const buildReservasWhere = (): { sql: string; params: unknown[] } => {
      const w: string[] = [];
      const p: unknown[] = [];
      if (desde) {
        w.push('DATE(fecha_check_in) >= ?');
        p.push(desde);
      }
      if (hasta) {
        w.push('DATE(fecha_check_in) <= ?');
        p.push(hasta);
      }
      return { sql: w.length > 0 ? 'WHERE ' + w.join(' AND ') : '', params: p };
    };

    // FIX: fecha_venta (no fecha)
    const buildVentasWhere = (): { sql: string; params: unknown[] } => {
      const w: string[] = [];
      const p: unknown[] = [];
      if (desde) {
        w.push('DATE(fecha_venta) >= ?');
        p.push(desde);
      }
      if (hasta) {
        w.push('DATE(fecha_venta) <= ?');
        p.push(hasta);
      }
      return { sql: w.length > 0 ? 'WHERE ' + w.join(' AND ') : '', params: p };
    };

    const wR1 = buildReservasWhere();
    const [reservas] = await db.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS num_reservas,
         COALESCE(SUM(precio_total), 0) AS ingresos_reservas,
         COALESCE(SUM(monto_pagado), 0) AS pagado_reservas
       FROM reservas ${wR1.sql}`,
      wR1.params
    );

    const wV = buildVentasWhere();
    const [ventas] = await db.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS num_ventas,
         COALESCE(SUM(subtotal), 0) AS ingresos_ventas
       FROM ventas_productos ${wV.sql}`,
      wV.params
    );

    const wR2 = buildReservasWhere();
    const extraWhere = wR2.sql
      ? `${wR2.sql} AND metodo_pago IS NOT NULL`
      : 'WHERE metodo_pago IS NOT NULL';

    const [porMetodo] = await db.query<RowDataPacket[]>(
      `SELECT
         metodo_pago,
         COUNT(*) AS num,
         COALESCE(SUM(monto_pagado), 0) AS total
       FROM reservas ${extraWhere}
       GROUP BY metodo_pago
       ORDER BY total DESC`,
      wR2.params
    );

    const totalGeneral =
      Number(reservas[0]?.pagado_reservas || 0) +
      Number(ventas[0]?.ingresos_ventas || 0);

    res.json({
      reservas: {
        num_reservas: Number(reservas[0]?.num_reservas) || 0,
        ingresos_reservas: Number(reservas[0]?.ingresos_reservas) || 0,
        pagado_reservas: Number(reservas[0]?.pagado_reservas) || 0,
      },
      ventas: {
        num_ventas: Number(ventas[0]?.num_ventas) || 0,
        ingresos_ventas: Number(ventas[0]?.ingresos_ventas) || 0,
      },
      por_metodo: porMetodo.map((m) => ({
        metodo_pago: m.metodo_pago,
        num: Number(m.num) || 0,
        total: Number(m.total) || 0,
      })),
      total_general: totalGeneral,
    });
  })
);

// ----------------------------------------------------------------------------
// GET /api/reportes/clientes-top
// ----------------------------------------------------------------------------
reportesRouter.get(
  '/clientes-top',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, nombres, apellidos, tipo_documento, numero_documento,
              tipo_cliente, total_estancias, monto_total_gastado, fecha_ultima_estancia
       FROM clientes
       WHERE activo = TRUE
       ORDER BY monto_total_gastado DESC
       LIMIT 20`
    );
    res.json(rows);
  })
);

// ----------------------------------------------------------------------------
// GET /api/reportes/turnos
// ----------------------------------------------------------------------------
reportesRouter.get(
  '/turnos',
  asyncHandler(async (req, res) => {
    const desde = typeof req.query.desde === 'string' && req.query.desde ? req.query.desde : null;
    const hasta = typeof req.query.hasta === 'string' && req.query.hasta ? req.query.hasta : null;

    const turnos = [
      { nombre: 'Ma�ana',  inicio: '07:00:00', fin: '13:00:00' },
      { nombre: 'Tarde',   inicio: '13:00:00', fin: '18:00:00' },
      { nombre: 'Noche',   inicio: '18:00:00', fin: '23:00:00' },
      { nombre: 'Nochero', inicio: '23:00:00', fin: '07:00:00' },
    ];

    const dateFilter: string[] = [];
    const dateParams: unknown[] = [];
    if (desde) { dateFilter.push('DATE(r.fecha_check_in) >= ?'); dateParams.push(desde); }
    if (hasta) { dateFilter.push('DATE(r.fecha_check_in) <= ?'); dateParams.push(hasta); }
    const dateWhere = dateFilter.length > 0 ? 'AND ' + dateFilter.join(' AND ') : '';

    const resultados = await Promise.all(turnos.map(async (t) => {
      let timeFilter: string;
      if (t.inicio < t.fin) {
        timeFilter = `TIME(r.fecha_check_in) >= '${t.inicio}' AND TIME(r.fecha_check_in) < '${t.fin}'`;
      } else {
        timeFilter = `(TIME(r.fecha_check_in) >= '${t.inicio}' OR TIME(r.fecha_check_in) < '${t.fin}')`;
      }

      const [reservas] = await db.query<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS num_reservas,
           COALESCE(SUM(r.monto_pagado), 0) AS ingresos,
           COALESCE(SUM(CASE WHEN r.tipo_estancia = 'por_noche' THEN r.monto_pagado ELSE 0 END), 0) AS ingresos_noches,
           COALESCE(SUM(CASE WHEN r.tipo_estancia = 'por_horas' THEN r.monto_pagado ELSE 0 END), 0) AS ingresos_horas,
           COUNT(DISTINCT r.recepcionista_id) AS num_recepcionistas
         FROM reservas r
         WHERE ${timeFilter} ${dateWhere}`,
        dateParams
      );

      const [cobros] = await db.query<RowDataPacket[]>(
        `SELECT
           COUNT(*) AS num_cobros,
           COALESCE(SUM(c.monto), 0) AS ingresos_cobros
         FROM cobros c
         WHERE ${timeFilter.replace(/r\.fecha_check_in/g, 'c.fecha')}
        ${dateWhere.replace(/r\./g, 'c.').replace(/fecha_check_in/g, 'fecha')}`,
         dateParams
      );

      const [personal] = await db.query<RowDataPacket[]>(
        `SELECT
           CONCAT(u.nombres, ' ', u.apellidos) AS nombre,
           COUNT(r.id) AS reservas_atendidas,
           COALESCE(SUM(r.monto_pagado), 0) AS monto_gestionado
         FROM reservas r
         JOIN usuarios u ON u.id = r.recepcionista_id
         WHERE ${timeFilter} ${dateWhere}
         GROUP BY r.recepcionista_id, u.nombres, u.apellidos
         ORDER BY monto_gestionado DESC`,
        dateParams
      );

      return {
        turno: t.nombre,
        horario: `${t.inicio.slice(0,5)} - ${t.fin.slice(0,5)}`,
        num_reservas: Number(reservas[0]?.num_reservas) || 0,
        ingresos: Number(reservas[0]?.ingresos) || 0,
        ingresos_noches: Number(reservas[0]?.ingresos_noches) || 0,
        ingresos_horas: Number(reservas[0]?.ingresos_horas) || 0,
        ingresos_cobros: Number(cobros[0]?.ingresos_cobros) || 0,
        total: (Number(reservas[0]?.ingresos) || 0) + (Number(cobros[0]?.ingresos_cobros) || 0),
        personal: personal.map(p => ({
          nombre: p.nombre,
          reservas_atendidas: Number(p.reservas_atendidas) || 0,
          monto_gestionado: Number(p.monto_gestionado) || 0,
        })),
      };
    }));

    res.json(resultados);
  })
);
