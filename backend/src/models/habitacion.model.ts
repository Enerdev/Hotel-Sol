import { db } from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type {
  TipoHabitacion,
  EstadoOcupacion,
  EstadoLimpieza,
} from '../types/index.js';

export interface Habitacion extends RowDataPacket {
  id: number;
  numero: string;
  piso: number;
  tipo: TipoHabitacion;
  capacidad: number;
  bano_privado: number;
  tiene_ducha: number;
  tiene_tv: number;
  tiene_cable_tv: number;
  tiene_control_remoto: number;
  tiene_wifi: number;
  estado_ocupacion: EstadoOcupacion;
  estado_limpieza: EstadoLimpieza;
  precio_base_noche: string;
  notas: string | null;
  activo: number;
}

export const HabitacionModel = {
  async listAll(): Promise<Habitacion[]> {
    const [rows] = await db.query<Habitacion[]>(
      `SELECT * FROM habitaciones WHERE activo = TRUE ORDER BY piso, numero`
    );
    return rows;
  },

  async findById(id: number): Promise<Habitacion | null> {
    const [rows] = await db.query<Habitacion[]>(
      'SELECT * FROM habitaciones WHERE id = ? AND activo = TRUE',
      [id]
    );
    return rows[0] ?? null;
  },

  async listByEstadoLimpieza(estados: EstadoLimpieza[]): Promise<Habitacion[]> {
    if (estados.length === 0) return [];
    const placeholders = estados.map(() => '?').join(',');
    const [rows] = await db.query<Habitacion[]>(
      `SELECT * FROM habitaciones
       WHERE estado_limpieza IN (${placeholders}) AND activo = TRUE
       ORDER BY piso, numero`,
      estados
    );
    return rows;
  },

  async getCamas(habitacionId: number): Promise<Array<{ tipo_cama: string; cantidad: number }>> {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT tipo_cama, cantidad FROM camas_habitacion WHERE habitacion_id = ?',
      [habitacionId]
    );
    return rows as Array<{ tipo_cama: string; cantidad: number }>;
  },

  async updateEstado(
    id: number,
    cambios: Partial<{ estado_ocupacion: EstadoOcupacion; estado_limpieza: EstadoLimpieza }>
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (cambios.estado_ocupacion) {
      fields.push('estado_ocupacion = ?');
      values.push(cambios.estado_ocupacion);
    }
    if (cambios.estado_limpieza) {
      fields.push('estado_limpieza = ?');
      values.push(cambios.estado_limpieza);
    }
    if (fields.length === 0) return;
    values.push(id);
    await db.query<ResultSetHeader>(
      `UPDATE habitaciones SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },

  async getDashboardStats(): Promise<RowDataPacket | null> {
    const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM vista_dashboard_modulos');
    return rows[0] ?? null;
  },
};
