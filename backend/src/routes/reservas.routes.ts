import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import type {
  RowDataPacket,
  ResultSetHeader,
  PoolConnection,
} from 'mysql2/promise';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { getIO } from '../sockets/index.js';

export const reservasRouter = Router();

reservasRouter.use(requireAuth);

// ============================================================================
// GET /api/reservas - listar con filtros
// ============================================================================
reservasRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const estado = typeof req.query.estado === 'string' ? req.query.estado : null;
    const desde = typeof req.query.desde === 'string' && req.query.desde ? req.query.desde : null;
    const hasta = typeof req.query.hasta === 'string' && req.query.hasta ? req.query.hasta : null;
    const habitacion_id = req.query.habitacion_id ? Number(req.query.habitacion_id) : null;
    const cliente_id = req.query.cliente_id ? Number(req.query.cliente_id) : null;

    const where: string[] = [];
    const params: unknown[] = [];
    if (estado) { where.push('r.estado = ?'); params.push(estado); }
    if (desde) { where.push('DATE(r.fecha_check_in) >= ?'); params.push(desde); }
    if (hasta) { where.push('DATE(r.fecha_check_in) <= ?'); params.push(hasta); }
    if (habitacion_id) { where.push('r.habitacion_id = ?'); params.push(habitacion_id); }
    if (cliente_id) { where.push('r.cliente_id = ?'); params.push(cliente_id); }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         r.*,
         h.numero AS habitacion_numero, h.piso AS habitacion_piso, h.tipo AS habitacion_tipo,
         CONCAT(c.nombres, ' ', c.apellidos) AS cliente_nombre,
         CONCAT(c.tipo_documento, ': ', c.numero_documento) AS cliente_documento,
         CONCAT(u.nombres, ' ', u.apellidos) AS recepcionista_nombre
       FROM reservas r
       JOIN habitaciones h ON h.id = r.habitacion_id
       JOIN clientes c ON c.id = r.cliente_id
       LEFT JOIN usuarios u ON u.id = r.recepcionista_id
       ${whereClause}
       ORDER BY r.fecha_check_in DESC
       LIMIT 200`,
      params
    );

    res.json(rows);
  })
);

// ============================================================================
// GET /api/reservas/:id - una reserva
// ============================================================================
reservasRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         r.*,
         h.numero AS habitacion_numero, h.piso AS habitacion_piso, h.tipo AS habitacion_tipo,
         CONCAT(c.nombres, ' ', c.apellidos) AS cliente_nombre,
         c.tipo_documento, c.numero_documento, c.telefono AS cliente_telefono,
         CONCAT(u.nombres, ' ', u.apellidos) AS recepcionista_nombre
       FROM reservas r
       JOIN habitaciones h ON h.id = r.habitacion_id
       JOIN clientes c ON c.id = r.cliente_id
       LEFT JOIN usuarios u ON u.id = r.recepcionista_id
       WHERE r.id = ?`,
      [id]
    );
    if (rows.length === 0) throw new NotFoundError('Reserva no encontrada');
    res.json(rows[0]);
  })
);

// ============================================================================
// POST /api/reservas - crear reserva tradicional
// ============================================================================
const createReservaSchema = z.object({
  cliente_id: z.number().int().positive(),
  habitacion_id: z.number().int().positive(),
  fecha_check_in: z.string(),
  fecha_check_out: z.string().nullable().optional(),
  noches: z.number().int().positive().nullable().optional(),
  horas: z.number().int().positive().nullable().optional(),
  tipo_estancia: z.enum(['por_horas', 'por_noche', 'fecha_abierta']),
  precio_total: z.number().min(0),
  monto_pagado: z.number().min(0).default(0),
  estado_pago: z.enum(['pagado', 'pendiente', 'parcial', 'reembolsado']).default('pendiente'),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'yape', 'plin', 'online']).nullable().optional(),
  numero_operacion: z.string().max(50).nullable().optional(),
  telefono_pago: z.string().max(20).nullable().optional(),
  origen: z.enum(['presencial', 'telefono', 'web', 'booking', 'otro']).default('presencial'),
  notas: z.string().nullable().optional(),
});

reservasRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createReservaSchema.parse(req.body);

    const [habs] = await db.query<RowDataPacket[]>(
      'SELECT estado_ocupacion, numero FROM habitaciones WHERE id = ? AND activo = TRUE',
      [data.habitacion_id]
    );
    if (habs.length === 0) throw new NotFoundError('Habitación no encontrada');

    const [ultima] = await db.query<RowDataPacket[]>(
      `SELECT codigo FROM reservas WHERE codigo LIKE CONCAT('R-', YEAR(NOW()), '-%') ORDER BY id DESC LIMIT 1`
    );
    let numero = 1;
    if (ultima.length > 0) {
      const partes = ultima[0].codigo.split('-');
      numero = parseInt(partes[partes.length - 1], 10) + 1;
    }
    const codigo = `R-${new Date().getFullYear()}-${String(numero).padStart(5, '0')}`;

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO reservas (
         codigo, cliente_id, habitacion_id, recepcionista_id,
         fecha_check_in, fecha_check_out,
         noches, horas, tipo_estancia,
         precio_total, monto_pagado, estado_pago, metodo_pago,
         numero_operacion, telefono_pago,
         estado, origen, notas
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa', ?, ?)`,
      [
        codigo, data.cliente_id, data.habitacion_id, req.user!.userId,
        data.fecha_check_in, data.fecha_check_out ?? null,
        data.noches ?? null, data.horas ?? null, data.tipo_estancia,
        data.precio_total, data.monto_pagado, data.estado_pago, data.metodo_pago ?? null,
        data.numero_operacion ?? null, data.telefono_pago ?? null,
        data.origen, data.notas ?? null,
      ]
    );

    if (data.fecha_check_in) {
      const checkIn = new Date(data.fecha_check_in);
      const ahora = new Date();
      if (checkIn <= ahora) {
        await db.query("UPDATE habitaciones SET estado_ocupacion = 'ocupada' WHERE id = ?", [data.habitacion_id]);
      } else {
        await db.query("UPDATE habitaciones SET estado_ocupacion = 'reservada' WHERE id = ?", [data.habitacion_id]);
      }
    }

    res.status(201).json({ ok: true, id: result.insertId, codigo });
  })
);

// ============================================================================
// POST /api/reservas/recepcion-express
// ============================================================================
const tipoDocumentoEnum = z.enum(['DNI', 'CI', 'Pasaporte', 'Otros']);

const recepcionExpressSchema = z
  .object({
    cliente_id: z.number().int().positive().nullable().optional(),
    cliente_nuevo: z.object({
      tipo_documento: tipoDocumentoEnum,
      numero_documento: z.string().min(1).max(20),
      nombres: z.string().min(1).max(100),
      apellidos: z.string().min(1).max(100),
      nacionalidad: z.string().max(100).default('Peruana'),
      procedencia: z.string().max(100).nullable().optional(),
      telefono: z.string().max(20).nullable().optional(),
    }).optional(),
    habitacion_id: z.number().int().positive(),
    tipo_estancia: z.enum(['por_noche', 'por_horas']),
    noches: z.number().int().positive().nullable().optional(),
    horas: z.number().int().positive().nullable().optional(),
    precio_total: z.number().positive(),
    notas: z.string().nullable().optional(),
    metodo_pago: z.enum(['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia']),
    numero_operacion: z.string().max(50).nullable().optional(),
    telefono_pago: z.string().max(20).nullable().optional(),
  })
  .refine((d) => !!d.cliente_id || !!d.cliente_nuevo, {
    message: 'Falta cliente (cliente_id o cliente_nuevo)',
    path: ['cliente_id'],
  })
  .refine(
    (d) => {
      if (d.tipo_estancia === 'por_noche' && (!d.noches || d.noches < 1)) return false;
      if (d.tipo_estancia === 'por_horas' && (!d.horas || d.horas < 1)) return false;
      return true;
    },
    { message: 'Indica noches u horas según el tipo de estancia', path: ['noches'] }
  )
  .refine(
    (d) => {
      if (['yape', 'plin', 'transferencia'].includes(d.metodo_pago) && !d.numero_operacion) return false;
      return true;
    },
    { message: 'Para Yape, Plin o Transferencia el N° de operación es obligatorio', path: ['numero_operacion'] }
  );

reservasRouter.post(
  '/recepcion-express',
  asyncHandler(async (req, res) => {
    const data = recepcionExpressSchema.parse(req.body);

    const [habs] = await db.query<RowDataPacket[]>(
      `SELECT id, numero, estado_ocupacion, estado_limpieza, activo FROM habitaciones WHERE id = ?`,
      [data.habitacion_id]
    );
    if (habs.length === 0) throw new NotFoundError('Habitación no encontrada');
    const hab = habs[0];
    if (!hab.activo) throw new BadRequestError('La habitación está inactiva');
    if (hab.estado_ocupacion !== 'disponible') throw new BadRequestError(`La habitación ${hab.numero} no está disponible (${hab.estado_ocupacion})`);
    if (hab.estado_limpieza !== 'limpia') throw new BadRequestError(`La habitación ${hab.numero} no está limpia todavía`);

    const conn = (await db.getConnection()) as PoolConnection;
    try {
      await conn.beginTransaction();

      let clienteId: number;
      if (data.cliente_id) {
        const [existe] = await conn.query<RowDataPacket[]>('SELECT id FROM clientes WHERE id = ? AND activo = TRUE', [data.cliente_id]);
        if (existe.length === 0) throw new NotFoundError('Cliente no encontrado');
        clienteId = data.cliente_id;
      } else if (data.cliente_nuevo) {
        const cn = data.cliente_nuevo;
        const [dup] = await conn.query<RowDataPacket[]>('SELECT id FROM clientes WHERE tipo_documento = ? AND numero_documento = ?', [cn.tipo_documento, cn.numero_documento]);
        if (dup.length > 0) {
          await conn.query(
            `UPDATE clientes SET activo = TRUE, nombres = ?, apellidos = ?, nacionalidad = ?, procedencia = ?, telefono = ? WHERE id = ?`,
            [cn.nombres, cn.apellidos, cn.nacionalidad, cn.procedencia ?? null, cn.telefono ?? null, dup[0].id]
          );
          clienteId = dup[0].id;
        } else {
          const [ins] = await conn.query<ResultSetHeader>(
            `INSERT INTO clientes (tipo_documento, numero_documento, nombres, apellidos, nacionalidad, procedencia, telefono, activo, tipo_cliente) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 'temporal')`,
            [cn.tipo_documento, cn.numero_documento, cn.nombres, cn.apellidos, cn.nacionalidad, cn.procedencia ?? null, cn.telefono ?? null]
          );
          clienteId = ins.insertId;
        }
      } else {
        throw new BadRequestError('Falta cliente_id o cliente_nuevo');
      }

      const ahora = new Date();
      const checkIn = ahora.toISOString().slice(0, 19).replace('T', ' ');
      const checkOut = new Date(ahora);
      if (data.tipo_estancia === 'por_noche') {
        checkOut.setDate(checkOut.getDate() + (data.noches ?? 1));
        checkOut.setHours(12, 0, 0, 0);
      } else {
        checkOut.setHours(checkOut.getHours() + (data.horas ?? 1));
      }
      const checkOutStr = checkOut.toISOString().slice(0, 19).replace('T', ' ');

      const [ultima] = await conn.query<RowDataPacket[]>(
        `SELECT codigo FROM reservas WHERE codigo LIKE CONCAT('R-', YEAR(NOW()), '-%') ORDER BY id DESC LIMIT 1`
      );
      let numero = 1;
      if (ultima.length > 0) {
        const partes = ultima[0].codigo.split('-');
        numero = parseInt(partes[partes.length - 1], 10) + 1;
      }
      const codigo = `R-${new Date().getFullYear()}-${String(numero).padStart(5, '0')}`;

      const [resRes] = await conn.query<ResultSetHeader>(
        `INSERT INTO reservas (
           codigo, cliente_id, habitacion_id, recepcionista_id,
           fecha_check_in, fecha_check_out,
           noches, horas, tipo_estancia,
           precio_total, monto_pagado, estado_pago, metodo_pago,
           numero_operacion, telefono_pago,
           estado, origen, notas
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pagado', ?, ?, ?, 'activa', 'presencial', ?)`,
        [
          codigo, clienteId, data.habitacion_id, req.user!.userId,
          checkIn, checkOutStr,
          data.tipo_estancia === 'por_noche' ? data.noches ?? 1 : null,
          data.tipo_estancia === 'por_horas' ? data.horas ?? 1 : null,
          data.tipo_estancia, data.precio_total, data.precio_total,
          data.metodo_pago, data.numero_operacion ?? null, data.telefono_pago ?? null,
          data.notas ?? null,
        ]
      );
      const reservaId = resRes.insertId;

      await conn.query(`UPDATE habitaciones SET estado_ocupacion = 'ocupada' WHERE id = ?`, [data.habitacion_id]);
      await conn.query(
        `UPDATE clientes SET total_estancias = total_estancias + 1, monto_total_gastado = monto_total_gastado + ?, fecha_ultima_estancia = NOW() WHERE id = ?`,
        [data.precio_total, clienteId]
      );

      await conn.commit();

      try {
        const io = getIO();
        io.to('admins').emit('cobro:nuevo', {
          id: reservaId, codigo,
          concepto: `Recepción Express - Hab. ${hab.numero}`,
          monto: data.precio_total, metodo_pago: data.metodo_pago,
          recepcionista_nombre: req.user!.username,
          fecha: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('[recepcion-express] socket error', err);
      }

      res.status(201).json({
        ok: true, reserva_id: reservaId, cliente_id: clienteId,
        codigo, habitacion_numero: hab.numero,
        precio_total: data.precio_total, check_in: checkIn, check_out: checkOutStr,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// ============================================================================
// POST /api/reservas/:id/check-out
// ============================================================================
reservasRouter.post(
  '/:id/check-out',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    const [reservas] = await db.query<RowDataPacket[]>(
      `SELECT id, codigo, habitacion_id, estado FROM reservas WHERE id = ?`, [id]
    );
    if (reservas.length === 0) throw new NotFoundError('Reserva no encontrada');
    const reserva = reservas[0];

    if (reserva.estado === 'check_out') throw new BadRequestError('La reserva ya tiene check-out');
    if (reserva.estado === 'cancelada') throw new BadRequestError('La reserva está cancelada');

    const conn = (await db.getConnection()) as PoolConnection;
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE reservas SET estado = 'check_out', fecha_check_out_real = NOW() WHERE id = ?`, [id]);
      await conn.query(`UPDATE habitaciones SET estado_ocupacion = 'disponible', estado_limpieza = 'sucia' WHERE id = ?`, [reserva.habitacion_id]);
      await conn.commit();

      try {
        const io = getIO();
        io.to('limpieza').emit('habitacion:por_limpiar', { habitacion_id: reserva.habitacion_id });
        io.to('admins').emit('reserva:check_out', { reserva_id: id, codigo: reserva.codigo });
      } catch (err) {
        console.warn('[check-out] socket error', err);
      }

      res.json({ ok: true, codigo: reserva.codigo });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  })
);

// ============================================================================
// POST /api/reservas/:id/cancelar
// ============================================================================
const cancelarSchema = z.object({
  motivo: z.string().min(3).max(500).optional(),
});

reservasRouter.post(
  '/:id/cancelar',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { motivo } = cancelarSchema.parse(req.body);

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, codigo, habitacion_id, estado FROM reservas WHERE id = ?', [id]
    );
    if (rows.length === 0) throw new NotFoundError('Reserva no encontrada');
    const reserva = rows[0];

    if (reserva.estado === 'cancelada') throw new BadRequestError('La reserva ya está cancelada');
    if (reserva.estado === 'check_out') throw new BadRequestError('La reserva ya tiene check-out');

    await db.query(
      `UPDATE reservas SET estado = 'cancelada', notas = CONCAT(IFNULL(notas,''), ' | Cancelada: ', ?) WHERE id = ?`,
      [motivo ?? 'Sin motivo', id]
    );
    await db.query(
      `UPDATE habitaciones SET estado_ocupacion = 'disponible' WHERE id = ? AND estado_ocupacion != 'ocupada'`,
      [reserva.habitacion_id]
    );
    await db.query(
      `UPDATE habitaciones SET estado_ocupacion = 'disponible', estado_limpieza = 'sucia' WHERE id = ? AND estado_ocupacion = 'ocupada'`,
      [reserva.habitacion_id]
    );

    try {
      const io = getIO();
      io.to('admins').emit('reserva:cancelada', { reserva_id: id, codigo: reserva.codigo, motivo });
      io.to('recepcion').emit('reserva:cancelada', { reserva_id: id, codigo: reserva.codigo, motivo });
    } catch (err) {
      console.warn('[cancelar] socket error', err);
    }

    res.json({ ok: true, codigo: reserva.codigo });
  })
);

// ============================================================================
// POST /api/reservas/:id/cobrar-saldo
// ============================================================================
const cobrarSaldoSchema = z.object({
  monto: z.number().positive(),
  metodo_pago: z.enum(['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia']),
  numero_operacion: z.string().max(50).nullable().optional(),
  telefono_pago: z.string().max(20).nullable().optional(),
});

reservasRouter.post(
  '/:id/cobrar-saldo',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = cobrarSaldoSchema.parse(req.body);

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, codigo, precio_total, monto_pagado, estado_pago, estado FROM reservas WHERE id = ?', [id]
    );
    if (rows.length === 0) throw new NotFoundError('Reserva no encontrada');
    const reserva = rows[0];

    if (reserva.estado !== 'activa') throw new BadRequestError('Solo se puede cobrar en reservas activas');

    const saldo = Number(reserva.precio_total) - Number(reserva.monto_pagado);
    if (saldo <= 0) throw new BadRequestError('La reserva ya está pagada completamente');

    const nuevoMontoPagado = Number(reserva.monto_pagado) + data.monto;
    const nuevoEstado = nuevoMontoPagado >= Number(reserva.precio_total) ? 'pagado' : 'parcial';

    await db.query(
      `UPDATE reservas SET monto_pagado = ?, estado_pago = ?, metodo_pago = ?,
         numero_operacion = COALESCE(?, numero_operacion), telefono_pago = COALESCE(?, telefono_pago)
       WHERE id = ?`,
      [nuevoMontoPagado, nuevoEstado, data.metodo_pago, data.numero_operacion ?? null, data.telefono_pago ?? null, id]
    );

    try {
      await db.query(
        `INSERT INTO cobros (reserva_id, concepto, monto, metodo_pago, recepcionista_id, tipo_cobro)
         VALUES (?, ?, ?, ?, ?, 'anticipo_reserva')`,
        [id, `Cobro saldo pendiente - Reserva ${reserva.codigo}`, data.monto, data.metodo_pago, req.user!.userId]
      );
    } catch (e) {
      console.warn('[cobrar-saldo] no se pudo registrar en cobros:', e);
    }

    res.json({ ok: true, monto_cobrado: data.monto, monto_pagado: nuevoMontoPagado, estado_pago: nuevoEstado });
  })
);

// ============================================================================
// POST /api/reservas/:id/devolucion
// ============================================================================
const devolucionSchema = z.object({
  monto: z.number().positive(),
  motivo: z.string().min(3).max(500).optional(),
});

reservasRouter.post(
  '/:id/devolucion',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { monto, motivo } = devolucionSchema.parse(req.body);

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, codigo, precio_total, monto_pagado, estado_pago, estado FROM reservas WHERE id = ?', [id]
    );
    if (rows.length === 0) throw new NotFoundError('Reserva no encontrada');
    const reserva = rows[0];

    if (reserva.estado !== 'cancelada') throw new BadRequestError('Solo se puede hacer devolución en reservas canceladas');
    if (monto > Number(reserva.monto_pagado)) throw new BadRequestError(`El monto a devolver (S/ ${monto}) no puede ser mayor al monto pagado (S/ ${reserva.monto_pagado})`);

    await db.query(`UPDATE reservas SET estado_pago = 'reembolsado' WHERE id = ?`, [id]);

    try {
      await db.query(
        `INSERT INTO cobros (reserva_id, concepto, monto, metodo_pago, recepcionista_id, tipo_cobro)
         VALUES (?, ?, ?, 'efectivo', ?, 'devolucion')`,
        [
          id,
          `Devolución - Reserva ${reserva.codigo}${motivo ? ': ' + motivo : ''}`,
          -Math.abs(monto),
          req.user!.userId,
        ]
      );
    } catch (e) {
      console.warn('[devolucion] no se pudo registrar en cobros:', e);
    }

    res.json({ ok: true, monto_devuelto: monto });
  })
);