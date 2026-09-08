import { Router } from 'express';
import { z } from 'zod';
import { ClienteModel } from '../models/cliente.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { NotFoundError } from '../utils/errors.js';

const removeUndefined = <T extends object>(obj: T): { [K in keyof T]?: Exclude<T[K], undefined> } =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as any;

export const clientesRouter = Router();

// Limpieza no toca clientes
clientesRouter.use(requireAuth, requireRole('admin', 'recepcionista'));

// ----------------------------------------------------------------------------
// GET /api/clientes/buscar?q=Pérez
// ----------------------------------------------------------------------------
clientesRouter.get(
  '/buscar',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '');
    const results = await ClienteModel.search(q);
    res.json(results);
  })
);

// ----------------------------------------------------------------------------
// GET /api/clientes/frecuentes
// ----------------------------------------------------------------------------
clientesRouter.get(
  '/frecuentes',
  asyncHandler(async (_req, res) => {
    const clientes = await ClienteModel.listFrecuentes();
    res.json(clientes);
  })
);

// ----------------------------------------------------------------------------
// GET /api/clientes/:id
// ----------------------------------------------------------------------------
clientesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const cliente = await ClienteModel.findById(Number(req.params.id));
    if (!cliente) throw new NotFoundError('Cliente no encontrado');
    res.json(cliente);
  })
);

// ----------------------------------------------------------------------------
// POST /api/clientes
// ----------------------------------------------------------------------------
const createSchema = z.object({
  tipo_documento: z.enum(['DNI', 'CI', 'Pasaporte', 'Otros']),
  numero_documento: z.string().min(1).max(20),
  nombres: z.string().min(1).max(100),
  apellidos: z.string().min(1).max(100),
  fecha_nacimiento: z.string().optional().nullable(),
  nacionalidad: z.string().optional(),
  procedencia: z.string().optional().nullable(),
  motivo_viaje: z
    .enum(['turismo', 'negocios', 'salud', 'familia', 'transito', 'otro'])
    .optional(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  direccion: z.string().optional().nullable(),
  tipo_cliente: z.enum(['frecuente', 'temporal']).optional(),
  descuento_porcentaje: z.number().min(0).max(100).optional(),
});

clientesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body) as unknown as import('../models/cliente.model.js').ClienteCreate;
    const id = await ClienteModel.create(data);
    const cliente = await ClienteModel.findById(id);
    res.status(201).json(cliente);
  })
);

// ----------------------------------------------------------------------------
// PUT /api/clientes/:id
// ----------------------------------------------------------------------------
clientesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const exists = await ClienteModel.findById(id);
    if (!exists) throw new NotFoundError('Cliente no encontrado');

    const data = removeUndefined(createSchema.partial().parse(req.body));
    await ClienteModel.update(id, data);

    const updated = await ClienteModel.findById(id);
    res.json(updated);
  })
);
