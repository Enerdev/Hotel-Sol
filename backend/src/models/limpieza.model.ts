import { db } from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { EstadoLimpiezaRegistro } from '../types/index.js';

export interface LimpiezaRegistro extends RowDataPacket {
  id: number;
  habitacion_id: number;
  habitacion_numero: string;
  habitacion_piso: number;
  reserva_previa_id: number | null;
  empleado_limpieza_id: number | null;
  empleado_nombre: string | null;
  recepcionista_validador_id: number | null;
  validador_nombre: string | null;
  turno: string | null;
  estado: EstadoLimpiezaRegistro;
  fecha_creacion: string;
  fecha_inicio_limpieza: string | null;
  fecha_fin_limpieza: string | null;
  fecha_validacion: string | null;
  notas_limpieza: string | null;
  notas_validacion: string | null;
  motivo_rechazo: string | null;
  duracion_minutos: number | null;
}

export const LimpiezaModel = {
  async listPendientes(): Promise<LimpiezaRegistro[]> {
    const [rows] = await db.query<LimpiezaRegistro[]>(
      `SELECT
         lr.*,
         h.numero AS habitacion_numero,
         h.piso AS habitacion_piso,
         CONCAT(u.nombres,' ',u.apellidos) AS empleado_nombre,
         CONCAT(v.nombres,' ',v.apellidos) AS validador_nombre
       FROM limpieza_registros lr
       JOIN habitaciones h ON h.id = lr.habitacion_id
       LEFT JOIN usuarios u ON u.id = lr.empleado_limpieza_id
       LEFT JOIN usuarios v ON v.id = lr.recepcionista_validador_id
       WHERE lr.estado IN ('pendiente','en_progreso','completada_por_limpieza')
       ORDER BY lr.fecha_creacion ASC`
    );
    return rows;
  },

  async findById(id: number): Promise<LimpiezaRegistro | null> {
    const [rows] = await db.query<LimpiezaRegistro[]>(
      `SELECT
         lr.*,
         h.numero AS habitacion_numero,
         h.piso AS habitacion_piso,
         CONCAT(u.nombres,' ',u.apellidos) AS empleado_nombre,
         CONCAT(v.nombres,' ',v.apellidos) AS validador_nombre
       FROM limpieza_registros lr
       JOIN habitaciones h ON h.id = lr.habitacion_id
       LEFT JOIN usuarios u ON u.id = lr.empleado_limpieza_id
       LEFT JOIN usuarios v ON v.id = lr.recepcionista_validador_id
       WHERE lr.id = ?`,
      [id]
    );
    return rows[0] ?? null;
  },

  /**
   * Limpiadora "toma" una habitación pendiente y empieza a limpiarla.
   */
  async tomar(registroId: number, empleadoId: number, turno: string): Promise<void> {
    await db.query<ResultSetHeader>(
      `UPDATE limpieza_registros
       SET empleado_limpieza_id = ?,
           turno = ?,
           estado = 'en_progreso',
           fecha_inicio_limpieza = NOW()
       WHERE id = ? AND estado = 'pendiente'`,
      [empleadoId, turno, registroId]
    );
  },

  /**
   * Limpiadora marca como completada (espera validación de recepción).
   */
  async marcarCompletada(registroId: number, empleadoId: number, notas?: string): Promise<void> {
    await db.query<ResultSetHeader>(
      `UPDATE limpieza_registros
       SET estado = 'completada_por_limpieza',
           fecha_fin_limpieza = NOW(),
           notas_limpieza = ?
       WHERE id = ? AND empleado_limpieza_id = ? AND estado = 'en_progreso'`,
      [notas ?? null, registroId, empleadoId]
    );
  },

  /**
   * Recepción valida la limpieza → habitación queda disponible.
   */
  async validar(registroId: number, validadorId: number, notas?: string): Promise<void> {
    await db.query<ResultSetHeader>(
      `UPDATE limpieza_registros
       SET estado = 'validada_por_recepcion',
           recepcionista_validador_id = ?,
           fecha_validacion = NOW(),
           notas_validacion = ?
       WHERE id = ? AND estado = 'completada_por_limpieza'`,
      [validadorId, notas ?? null, registroId]
    );
  },

  /**
   * Recepción rechaza la limpieza → vuelve a estado 'pendiente' (re-limpiar).
   */
  async rechazar(registroId: number, validadorId: number, motivo: string): Promise<void> {
    await db.query<ResultSetHeader>(
      `UPDATE limpieza_registros
       SET estado = 'rechazada',
           recepcionista_validador_id = ?,
           fecha_rechazo = NOW(),
           motivo_rechazo = ?
       WHERE id = ? AND estado = 'completada_por_limpieza'`,
      [validadorId, motivo, registroId]
    );

    // Crear nuevo registro pendiente para que se limpie de nuevo
    const [original] = await db.query<RowDataPacket[]>(
      'SELECT habitacion_id, reserva_previa_id FROM limpieza_registros WHERE id = ?',
      [registroId]
    );
    const orig = original[0];
    if (orig) {
      await db.query<ResultSetHeader>(
        `INSERT INTO limpieza_registros (habitacion_id, reserva_previa_id, estado)
         VALUES (?, ?, 'pendiente')`,
        [orig.habitacion_id, orig.reserva_previa_id ?? null]
      );

      await db.query(
        `UPDATE habitaciones SET estado_limpieza = 'sucia' WHERE id = ?`,
        [orig.habitacion_id]
      );
    }
  },

  /**
   * Reportes: limpiezas por empleado en una fecha o rango
   */
  async statsPorEmpleado(desde?: string, hasta?: string): Promise<RowDataPacket[]> {
    const where: string[] = [];
    const params: unknown[] = [];
    if (desde) {
      where.push('fecha >= ?');
      params.push(desde);
    }
    if (hasta) {
      where.push('fecha <= ?');
      params.push(hasta);
    }
    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM vista_limpieza_por_empleado ${whereSql} ORDER BY fecha DESC, empleado_nombre`,
      params
    );
    return rows;
  },
};
