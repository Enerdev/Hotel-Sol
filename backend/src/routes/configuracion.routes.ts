import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import type { RowDataPacket } from 'mysql2';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const configuracionRouter = Router();

configuracionRouter.use(requireAuth);

// GET /api/configuracion - todas las claves
configuracionRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT clave, valor, descripcion FROM configuracion_hotel ORDER BY clave'
    );
    res.json(rows);
  })
);

// PUT /api/configuracion/:clave - actualizar (solo admin)
const updateSchema = z.object({
  valor: z.string().max(500),
});

configuracionRouter.put(
  '/:clave',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { clave } = req.params;
    const { valor } = updateSchema.parse(req.body);

    await db.query(
      `INSERT INTO configuracion_hotel (clave, valor)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE valor = VALUES(valor)`,
      [clave, valor]
    );

    res.json({ clave, valor });
  })
);

// ============================================================================
// GET /api/configuracion/facturacion - datos para generar comprobantes
// ============================================================================
configuracionRouter.get(
  '/facturacion',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT clave, valor FROM configuracion_hotel WHERE clave IN (
        'hotel_nombre','hotel_ruc','hotel_direccion','hotel_ciudad',
        'hotel_telefono','hotel_email',
        'factura_serie_boleta','factura_serie_factura',
        'factura_correlativo_boleta','factura_correlativo_factura'
      )`
    );
    const config: Record<string, string> = {};
    for (const row of rows) config[row.clave] = row.valor;
    res.json(config);
  })
);

// POST /api/configuracion/facturacion/siguiente-numero - obtiene y avanza correlativo
configuracionRouter.post(
  '/facturacion/siguiente-numero',
  requireRole('admin', 'recepcionista'),
  asyncHandler(async (req, res) => {
    const { tipo } = z.object({ tipo: z.enum(['boleta', 'factura']) }).parse(req.body);
    const claveCorrelativo = `factura_correlativo_${tipo}`;
    const claveSerie = `factura_serie_${tipo}`;

    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT clave, valor FROM configuracion_hotel WHERE clave IN (?, ?)',
      [claveCorrelativo, claveSerie]
    );
    const map: Record<string, string> = {};
    for (const r of rows) map[r.clave] = r.valor;

    const correlativo = parseInt(map[claveCorrelativo] ?? '1', 10);
    const serie = map[claveSerie] ?? (tipo === 'boleta' ? 'B001' : 'F001');
    const numero = `${serie}-${String(correlativo).padStart(8, '0')}`;

    await db.query(
      'UPDATE configuracion_hotel SET valor = ? WHERE clave = ?',
      [String(correlativo + 1), claveCorrelativo]
    );

    res.json({ numero, serie, correlativo });
  })
);
