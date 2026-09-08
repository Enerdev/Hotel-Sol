import { Router } from 'express';
import { z } from 'zod';
import { db } from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { LimpiezaModel } from '../models/limpieza.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFoundError, ConflictError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { getSocketServer, emitToRoom } from '../sockets/index.js';

export const limpiezaRouter = Router();
limpiezaRouter.use(requireAuth);

// ----------------------------------------------------------------------------
// GET /api/limpieza/pendientes
// ----------------------------------------------------------------------------
limpiezaRouter.get(
  '/pendientes',
  asyncHandler(async (_req, res) => {
    const lista = await LimpiezaModel.listPendientes();
    res.json(lista);
  })
);

// ----------------------------------------------------------------------------
// GET /api/limpieza/historial
// ----------------------------------------------------------------------------
limpiezaRouter.get(
  '/historial',
  asyncHandler(async (req, res) => {
    const desde = typeof req.query.desde === 'string' ? req.query.desde : null;
    const hasta = typeof req.query.hasta === 'string' ? req.query.hasta : null;
    const turno = typeof req.query.turno === 'string' ? req.query.turno : null;
    const empleado_id = req.query.empleado_id ? Number(req.query.empleado_id) : null;

    const where: string[] = ['lr.estado IN (?, ?, ?, ?)'];
    const params: unknown[] = ['completada_por_limpieza', 'validada_por_recepcion', 'rechazada', 'en_progreso'];

    if (desde) { where.push('DATE(lr.fecha_creacion) >= ?'); params.push(desde); }
    if (hasta) { where.push('DATE(lr.fecha_creacion) <= ?'); params.push(hasta); }
    if (turno) { where.push('lr.turno = ?'); params.push(turno); }
    if (empleado_id) { where.push('lr.empleado_limpieza_id = ?'); params.push(empleado_id); }

    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT
         lr.id, lr.estado, lr.turno,
         lr.fecha_creacion, lr.fecha_inicio_limpieza, lr.fecha_fin_limpieza, lr.fecha_validacion,
         TIMESTAMPDIFF(MINUTE, lr.fecha_inicio_limpieza, lr.fecha_fin_limpieza) AS duracion_minutos,
         h.numero AS habitacion_numero, h.piso AS habitacion_piso,
         CONCAT(u.nombres, ' ', u.apellidos) AS empleado_nombre,
         CONCAT(v.nombres, ' ', v.apellidos) AS validador_nombre,
         lr.notas_limpieza, lr.notas_validacion, lr.motivo_rechazo
       FROM limpieza_registros lr
       JOIN habitaciones h ON h.id = lr.habitacion_id
       LEFT JOIN usuarios u ON u.id = lr.empleado_limpieza_id
       LEFT JOIN usuarios v ON v.id = lr.recepcionista_validador_id
       WHERE ${where.join(' AND ')}
       ORDER BY lr.fecha_creacion DESC
       LIMIT 200`,
      params
    );
    res.json(rows);
  })
);

// ----------------------------------------------------------------------------
// GET /api/limpieza/empleados
// ----------------------------------------------------------------------------
limpiezaRouter.get(
  '/empleados',
  asyncHandler(async (_req, res) => {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id, CONCAT(nombres, ' ', apellidos) AS nombre
       FROM usuarios
       WHERE (rol = 'limpieza' OR rol_secundario = 'limpieza') AND activo = TRUE
       ORDER BY apellidos`
    );
    res.json(rows);
  })
);

// ----------------------------------------------------------------------------
// POST /api/limpieza/solicitud-cliente
// ----------------------------------------------------------------------------
limpiezaRouter.post(
  '/solicitud-cliente',
  requireRole('admin', 'recepcionista'),
  asyncHandler(async (req, res) => {
    const { habitacion_id, notas } = req.body;
    if (!habitacion_id) throw new BadRequestError('Falta habitacion_id');

    const [habs] = await db.query<RowDataPacket[]>(
      'SELECT id, numero FROM habitaciones WHERE id = ? AND activo = TRUE',
      [habitacion_id]
    );
    if (habs.length === 0) throw new NotFoundError('Habitación no encontrada');
    const hab = habs[0];

    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO limpieza_registros (habitacion_id, estado, notas_limpieza)
       VALUES (?, 'pendiente', ?)`,
      [habitacion_id, notas ? `[SOLICITUD CLIENTE] ${notas}` : '[SOLICITUD CLIENTE]']
    );

    const registro = await LimpiezaModel.findById(result.insertId);

    emitToRoom('limpieza', 'limpieza:nueva_pendiente', { ...registro, prioridad: true });
    emitToRoom('admin', 'limpieza:nueva_pendiente', { ...registro, prioridad: true });
    emitToRoom('recepcion', 'limpieza:nueva_pendiente', registro);

    res.status(201).json({ ok: true, registro_id: result.insertId, habitacion_numero: hab.numero });
  })
);

// ----------------------------------------------------------------------------
// POST /api/limpieza/:id/tomar
// ----------------------------------------------------------------------------
const tomarSchema = z.object({
  turno: z.enum(['mañana', 'tarde', 'noche']).default('mañana'),
});

limpiezaRouter.post(
  '/:id/tomar',
  requireRole('limpieza', 'admin', 'recepcionista'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { turno } = tomarSchema.parse(req.body);

    const registro = await LimpiezaModel.findById(id);
    if (!registro) throw new NotFoundError('Registro de limpieza no encontrado');
    if (registro.estado !== 'pendiente') {
      throw new ConflictError('Esta habitación ya fue tomada por otra persona');
    }

    await LimpiezaModel.tomar(id, req.user!.userId, turno);
    const updated = await LimpiezaModel.findById(id);

    emitToRoom('admin', 'limpieza:cambio', updated);
    emitToRoom('recepcion', 'limpieza:cambio', updated);
    emitToRoom('limpieza', 'limpieza:cambio', updated);

    res.json(updated);
  })
);

// ----------------------------------------------------------------------------
// POST /api/limpieza/:id/completar
// ----------------------------------------------------------------------------
const completarSchema = z.object({
  notas: z.string().max(1000).optional(),
});

limpiezaRouter.post(
  '/:id/completar',
  requireRole('limpieza', 'admin', 'recepcionista'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { notas } = completarSchema.parse(req.body);

    const registro = await LimpiezaModel.findById(id);
    if (!registro) throw new NotFoundError('Registro no encontrado');
    if (registro.estado !== 'en_progreso') {
      throw new ConflictError('Solo se pueden completar limpiezas en progreso');
    }
    if (registro.empleado_limpieza_id !== req.user!.userId && req.user!.rol !== 'admin') {
      throw new ForbiddenError('Solo quien tomó la habitación puede marcarla como limpia');
    }

    await LimpiezaModel.marcarCompletada(id, req.user!.userId, notas);
    const updated = await LimpiezaModel.findById(id);

    emitToRoom('recepcion', 'limpieza:lista_para_validar', updated);
    emitToRoom('admin', 'limpieza:lista_para_validar', updated);
    emitToRoom('limpieza', 'limpieza:cambio', updated);
    emitToRoom('admin', 'limpieza:cambio', updated);

    res.json(updated);
  })
);

// ----------------------------------------------------------------------------
// POST /api/limpieza/:id/validar
// ----------------------------------------------------------------------------
const validarSchema = z.object({
  notas: z.string().max(1000).optional(),
});

limpiezaRouter.post(
  '/:id/validar',
  requireRole('admin', 'recepcionista'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { notas } = validarSchema.parse(req.body);

    const registro = await LimpiezaModel.findById(id);
    if (!registro) throw new NotFoundError('Registro no encontrado');
    if (registro.estado !== 'completada_por_limpieza') {
      throw new ConflictError('Esta limpieza no está esperando validación');
    }

    await LimpiezaModel.validar(id, req.user!.userId, notas);
    const updated = await LimpiezaModel.findById(id);

    const io = getSocketServer();
    io.emit('habitacion:disponible', { habitacion_id: registro.habitacion_id });
    emitToRoom('limpieza', 'limpieza:validada', updated);
    emitToRoom('recepcion', 'limpieza:validada', updated);
    emitToRoom('admin', 'limpieza:validada', updated);

    res.json(updated);
  })
);

// ----------------------------------------------------------------------------
// POST /api/limpieza/:id/rechazar
// ----------------------------------------------------------------------------
const rechazarSchema = z.object({
  motivo: z.string().min(3).max(1000),
});

limpiezaRouter.post(
  '/:id/rechazar',
  requireRole('admin', 'recepcionista'),
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { motivo } = rechazarSchema.parse(req.body);

    const registro = await LimpiezaModel.findById(id);
    if (!registro) throw new NotFoundError('Registro no encontrado');
    if (registro.estado !== 'completada_por_limpieza') {
      throw new ConflictError('Solo se puede rechazar limpiezas pendientes de validación');
    }

    await LimpiezaModel.rechazar(id, req.user!.userId, motivo);
    const updated = await LimpiezaModel.findById(id);

    emitToRoom('limpieza', 'limpieza:rechazada', { ...updated, motivo });
    emitToRoom('recepcion', 'limpieza:rechazada', updated);
    emitToRoom('admin', 'limpieza:rechazada', updated);

    res.json(updated);
  })
);

// ----------------------------------------------------------------------------
// GET /api/limpieza/stats
// ----------------------------------------------------------------------------
limpiezaRouter.get(
  '/stats',
  requireRole('admin', 'recepcionista'),
  asyncHandler(async (req, res) => {
    const desde = typeof req.query.desde === 'string' ? req.query.desde : undefined;
    const hasta = typeof req.query.hasta === 'string' ? req.query.hasta : undefined;
    const stats = await LimpiezaModel.statsPorEmpleado(desde, hasta);
    res.json(stats);
  })
);
