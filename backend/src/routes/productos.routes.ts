import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

export const productosRouter = Router();

productosRouter.use(requireAuth);

// ============================================================================
// PRODUCTOS - CRUD
// ============================================================================

productosRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM productos WHERE activo = TRUE ORDER BY nombre'
    );
    res.json(rows);
  })
);

const updateProductoSchema = z.object({
  nombre: z.string().min(1).max(100).optional(),
  descripcion: z.string().nullable().optional(),
  precio: z.number().min(0).optional(),
  stock: z.number().min(0).int().optional(),
  unidad_medida: z.string().max(20).optional(),
  categoria: z.string().max(50).optional(),
  activo: z.boolean().optional(),
});

productosRouter.put(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const data = updateProductoSchema.parse(req.body);

    const [exists] = await db.query<RowDataPacket[]>(
      'SELECT id FROM productos WHERE id = ?',
      [id]
    );
    if (exists.length === 0) throw new NotFoundError('Producto no encontrado');

    const fields: string[] = [];
    const values: unknown[] = [];
    for (const [key, val] of Object.entries(data)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
    if (fields.length === 0) {
      const [rows] = await db.query<RowDataPacket[]>(
        'SELECT * FROM productos WHERE id = ?',
        [id]
      );
      res.json(rows[0]);
      return;
    }
    values.push(id);

    await db.query(`UPDATE productos SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM productos WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  })
);

const createProductoSchema = z.object({
  nombre: z.string().min(1).max(100),
  descripcion: z.string().nullable().optional(),
  precio: z.number().min(0),
  stock: z.number().min(0).int().default(0),
  unidad_medida: z.string().max(20).default('unidad'),
  categoria: z.string().max(50).default('general'),
});

productosRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const data = createProductoSchema.parse(req.body);
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO productos (nombre, descripcion, precio, stock, unidad_medida, categoria, activo)
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
      [
        data.nombre,
        data.descripcion ?? null,
        data.precio,
        data.stock,
        data.unidad_medida,
        data.categoria,
      ]
    );
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT * FROM productos WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  })
);

// ============================================================================
// VENTAS - CON NOMBRES DE COLUMNAS CORRECTOS:
// vendido_por_usuario_id (no recepcionista_id)
// fecha_venta (no fecha)
// ============================================================================

productosRouter.get(
  '/ventas/lista',
  asyncHandler(async (req, res) => {
    const desde =
      typeof req.query.desde === 'string' && req.query.desde
        ? req.query.desde
        : null;
    const hasta =
      typeof req.query.hasta === 'string' && req.query.hasta
        ? req.query.hasta
        : null;
    const habitacion_id = req.query.habitacion_id
      ? Number(req.query.habitacion_id)
      : null;

    const where: string[] = [];
    const params: unknown[] = [];
    if (desde) {
      where.push('DATE(v.fecha_venta) >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('DATE(v.fecha_venta) <= ?');
      params.push(hasta);
    }
    if (habitacion_id) {
      where.push('r.habitacion_id = ?');
      params.push(habitacion_id);
    }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         v.id, v.cantidad, v.precio_unitario, v.subtotal,
         v.fecha_venta AS fecha, v.notas,
         v.metodo_pago, v.numero_operacion, v.telefono_pago,
         p.id AS producto_id, p.nombre AS producto_nombre, p.unidad_medida,
         r.habitacion_id AS habitacion_id,
         h.numero AS habitacion_numero,
         CONCAT(u.nombres, ' ', u.apellidos) AS vendedor_nombre,
         r.codigo AS reserva_codigo
       FROM ventas_productos v
       JOIN productos p ON p.id = v.producto_id
       LEFT JOIN reservas r ON r.id = v.reserva_id
       LEFT JOIN habitaciones h ON h.id = r.habitacion_id
       LEFT JOIN usuarios u ON u.id = v.vendido_por_usuario_id
       ${whereClause}
       ORDER BY v.fecha_venta DESC
       LIMIT 200`,
      params
    );

    res.json(rows);
  })
);

const createVentaSchema = z
  .object({
    producto_id: z.number().int().positive(),
    cantidad: z.number().int().positive(),
    habitacion_id: z.number().int().positive().nullable().optional(),
    reserva_id: z.number().int().positive().nullable().optional(),
    metodo_pago: z
      .enum(['efectivo', 'tarjeta', 'yape', 'plin', 'transferencia'])
      .default('efectivo'),
    numero_operacion: z.string().max(50).nullable().optional(),
    telefono_pago: z.string().max(20).nullable().optional(),
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

productosRouter.post(
  '/ventas',
  asyncHandler(async (req, res) => {
    const data = createVentaSchema.parse(req.body);

    const [productos] = await db.query<RowDataPacket[]>(
      'SELECT id, nombre, precio, stock, activo FROM productos WHERE id = ?',
      [data.producto_id]
    );
    const producto = productos[0];
    if (!producto) throw new NotFoundError('Producto no encontrado');
    if (!producto.activo) throw new BadRequestError('El producto está desactivado');
    if (producto.stock < data.cantidad) {
      throw new BadRequestError(
        `Stock insuficiente. Disponible: ${producto.stock}, solicitado: ${data.cantidad}`
      );
    }

    const precio_unitario = Number(producto.precio);

    // Si se envía habitacion_id sin reserva_id, buscar la reserva activa
    let reservaId: number | null = data.reserva_id ?? null;
    if (!reservaId && data.habitacion_id) {
      const [reservas] = await db.query<RowDataPacket[]>(
        `SELECT id FROM reservas
         WHERE habitacion_id = ? AND estado IN ('activa','fecha_abierta')
         ORDER BY fecha_check_in DESC LIMIT 1`,
        [data.habitacion_id]
      );
      if (reservas.length > 0) {
        reservaId = reservas[0].id;
      }
    }

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO ventas_productos
        (producto_id, cantidad, precio_unitario, reserva_id,
         vendido_por_usuario_id, metodo_pago, numero_operacion, telefono_pago,
         fecha_venta, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        data.producto_id,
        data.cantidad,
        precio_unitario,
        reservaId,
        req.user!.userId,
        data.metodo_pago,
        data.numero_operacion ?? null,
        data.telefono_pago ?? null,
        data.notas ?? null,
      ]
    );

    await db.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [
      data.cantidad,
      data.producto_id,
    ]);

    res.status(201).json({
      id: result.insertId,
      producto_nombre: producto.nombre,
      subtotal: precio_unitario * data.cantidad,
      ok: true,
    });
  })
);

productosRouter.get(
  '/ventas/resumen',
  requireRole('admin', 'recepcionista'),
  asyncHandler(async (req, res) => {
    const desde =
      typeof req.query.desde === 'string' && req.query.desde
        ? req.query.desde
        : null;
    const hasta =
      typeof req.query.hasta === 'string' && req.query.hasta
        ? req.query.hasta
        : null;

    const buildWhere = () => {
      const w: string[] = [];
      const p: unknown[] = [];
      if (desde) {
        w.push('DATE(v.fecha_venta) >= ?');
        p.push(desde);
      }
      if (hasta) {
        w.push('DATE(v.fecha_venta) <= ?');
        p.push(hasta);
      }
      return { sql: w.length > 0 ? 'WHERE ' + w.join(' AND ') : '', params: p };
    };

    const w1 = buildWhere();
    const [porProducto] = await db.query<RowDataPacket[]>(
      `SELECT
         p.id, p.nombre,
         COALESCE(SUM(v.cantidad), 0) AS total_unidades,
         COALESCE(SUM(v.subtotal), 0) AS total_ingresos,
         COUNT(v.id) AS num_ventas
       FROM ventas_productos v
       JOIN productos p ON p.id = v.producto_id
       ${w1.sql}
       GROUP BY p.id
       ORDER BY total_ingresos DESC`,
      w1.params
    );

    const w2 = buildWhere();
    const [totales] = await db.query<RowDataPacket[]>(
      `SELECT
         COUNT(*) AS total_ventas,
         COALESCE(SUM(subtotal), 0) AS total_ingresos,
         COALESCE(SUM(cantidad), 0) AS total_unidades
       FROM ventas_productos v
       ${w2.sql}`,
      w2.params
    );

    res.json({
      totales: {
        total_ventas: Number(totales[0]?.total_ventas) || 0,
        total_ingresos: Number(totales[0]?.total_ingresos) || 0,
        total_unidades: Number(totales[0]?.total_unidades) || 0,
      },
      por_producto: porProducto.map((p) => ({
        ...p,
        total_unidades: Number(p.total_unidades) || 0,
        total_ingresos: Number(p.total_ingresos) || 0,
        num_ventas: Number(p.num_ventas) || 0,
      })),
    });
  })
);
