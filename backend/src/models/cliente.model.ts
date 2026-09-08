import { db } from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { TipoCliente, TipoDocumento } from '../types/index.js';

export interface Cliente extends RowDataPacket {
  id: number;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  nacionalidad: string;
  procedencia: string | null;
  motivo_viaje: string | null;
  telefono: string | null;
  email: string | null;
  tipo_cliente: TipoCliente;
  descuento_porcentaje: string;
  total_estancias: number;
  monto_total_gastado: string;
  fecha_ultima_estancia: string | null;
}

export interface ClienteCreate {
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento?: string | null | undefined;
  nacionalidad?: string | undefined;
  procedencia?: string | null | undefined;
  motivo_viaje?: string | undefined;
  telefono?: string | null | undefined;
  email?: string | null | undefined;
  direccion?: string | null | undefined;
  tipo_cliente?: TipoCliente | undefined;
  descuento_porcentaje?: number | undefined;
}

export const ClienteModel = {
  async findById(id: number): Promise<Cliente | null> {
    const [rows] = await db.query<Cliente[]>('SELECT * FROM clientes WHERE id = ?', [id]);
    return rows[0] ?? null;
  },

  async findByDocumento(tipo: TipoDocumento, numero: string): Promise<Cliente | null> {
    const [rows] = await db.query<Cliente[]>(
      'SELECT * FROM clientes WHERE tipo_documento = ? AND numero_documento = ?',
      [tipo, numero]
    );
    return rows[0] ?? null;
  },

  /**
   * Búsqueda con índice fulltext (rápida) + LIKE (fallback para coincidencias parciales).
   */
  async search(query: string, limit = 20): Promise<Cliente[]> {
    const q = query.trim();
    if (!q) return [];

    // Si el query parece un documento (sólo números/letras), busca por documento
    const looksLikeDoc = /^[A-Za-z0-9]+$/.test(q);
    if (looksLikeDoc) {
      const [rows] = await db.query<Cliente[]>(
        `SELECT * FROM clientes
         WHERE numero_documento LIKE ? OR nombres LIKE ? OR apellidos LIKE ?
         ORDER BY apellidos, nombres
         LIMIT ?`,
        [`%${q}%`, `%${q}%`, `%${q}%`, limit]
      );
      return rows;
    }

    // Búsqueda por texto: combina FULLTEXT y LIKE
    const [rows] = await db.query<Cliente[]>(
      `SELECT * FROM clientes
       WHERE MATCH(nombres, apellidos, numero_documento) AGAINST(? IN NATURAL LANGUAGE MODE)
          OR CONCAT(nombres, ' ', apellidos) LIKE ?
       ORDER BY apellidos, nombres
       LIMIT ?`,
      [q, `%${q}%`, limit]
    );
    return rows;
  },

  async listFrecuentes(): Promise<Cliente[]> {
    const [rows] = await db.query<Cliente[]>(
      `SELECT * FROM vista_clientes_frecuentes ORDER BY total_estancias DESC`
    );
    return rows;
  },

  async create(data: ClienteCreate): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO clientes (
        tipo_documento, numero_documento, nombres, apellidos,
        fecha_nacimiento, nacionalidad, procedencia, motivo_viaje,
        telefono, email, direccion, tipo_cliente, descuento_porcentaje
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.tipo_documento,
        data.numero_documento,
        data.nombres,
        data.apellidos,
        data.fecha_nacimiento ?? null,
        data.nacionalidad ?? 'Peruana',
        data.procedencia ?? null,
        data.motivo_viaje ?? 'turismo',
        data.telefono ?? null,
        data.email ?? null,
        data.direccion ?? null,
        data.tipo_cliente ?? 'temporal',
        data.descuento_porcentaje ?? 0,
      ]
    );
    return result.insertId;
  },

  async update(id: number, data: Partial<ClienteCreate>): Promise<void> {
    const allowed = [
      'tipo_documento',
      'numero_documento',
      'nombres',
      'apellidos',
      'fecha_nacimiento',
      'nacionalidad',
      'procedencia',
      'motivo_viaje',
      'telefono',
      'email',
      'direccion',
      'tipo_cliente',
      'descuento_porcentaje',
    ] as const;

    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of allowed) {
      if (key in data) {
        fields.push(`${key} = ?`);
        values.push((data as Record<string, unknown>)[key] ?? null);
      }
    }
    if (fields.length === 0) return;
    values.push(id);
    await db.query<ResultSetHeader>(
      `UPDATE clientes SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  },
};
