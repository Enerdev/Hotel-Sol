import { db } from '../config/db.js';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import type { Rol } from '../types/index.js';

export interface UsuarioCompleto extends RowDataPacket {
  id: number;
  username: string;
  password_hash: string;
  nombres: string;
  apellidos: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  rol: Rol;
  rol_secundario: 'recepcionista' | 'limpieza' | null;
  turno: string | null;
  hora_inicio_turno: string | null;
  hora_fin_turno: string | null;
  salario: string | null;
  activo: boolean | number;
  ultimo_login: string | null;
  creado_en: string;
}

export interface UsuarioCreateInput {
  username: string;
  password_hash: string;
  nombres: string;
  apellidos: string;
  dni?: string | null | undefined;
  email?: string | null | undefined;
  telefono?: string | null | undefined;
  rol: Rol;
  rol_secundario?: 'recepcionista' | 'limpieza' | null;
  turno?: string | null | undefined;
  hora_inicio_turno?: string | null | undefined;
  hora_fin_turno?: string | null | undefined;
  salario?: number | null | undefined;
  activo?: boolean | undefined;
}

export const UsuarioModel = {
  async findByUsername(username: string): Promise<UsuarioCompleto | null> {
    const [rows] = await db.query<UsuarioCompleto[]>(
      'SELECT * FROM usuarios WHERE username = ? AND activo = TRUE LIMIT 1',
      [username]
    );
    return rows[0] ?? null;
  },

  async findById(id: number): Promise<UsuarioCompleto | null> {
    const [rows] = await db.query<UsuarioCompleto[]>(
      'SELECT * FROM usuarios WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0] ?? null;
  },

  async updatePasswordHash(id: number, hash: string): Promise<void> {
    await db.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);
  },

  async updateLastLogin(id: number): Promise<void> {
    await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [id]);
  },

  async listAll(filtroRol?: Rol): Promise<UsuarioCompleto[]> {
    if (filtroRol) {
      const [rows] = await db.query<UsuarioCompleto[]>(
        `SELECT id, username, nombres, apellidos, dni, email, telefono,
                rol, rol_secundario, turno, hora_inicio_turno, hora_fin_turno, salario,
                activo, ultimo_login, creado_en
         FROM usuarios WHERE rol = ? ORDER BY activo DESC, apellidos`,
        [filtroRol]
      );
      return rows;
    }
    const [rows] = await db.query<UsuarioCompleto[]>(
      `SELECT id, username, nombres, apellidos, dni, email, telefono,
              rol, rol_secundario, turno, hora_inicio_turno, hora_fin_turno, salario,
              activo, ultimo_login, creado_en
       FROM usuarios ORDER BY rol, activo DESC, apellidos`
    );
    return rows;
  },

  async create(data: UsuarioCreateInput): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO usuarios (
        username, password_hash, nombres, apellidos, dni, email, telefono,
        rol, rol_secundario, turno, hora_inicio_turno, hora_fin_turno, salario, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.username,
        data.password_hash,
        data.nombres,
        data.apellidos,
        data.dni ?? null,
        data.email ?? null,
        data.telefono ?? null,
        data.rol,
        data.rol_secundario ?? null,
        data.turno ?? null,
        data.hora_inicio_turno ?? null,
        data.hora_fin_turno ?? null,
        data.salario ?? null,
        data.activo ?? true,
      ]
    );
    return result.insertId;
  },

  async update(
    id: number,
    data: Partial<Omit<UsuarioCreateInput, 'username' | 'password_hash'>>
  ): Promise<void> {
    const allowed = [
      'nombres',
      'apellidos',
      'dni',
      'email',
      'telefono',
      'rol',
      'rol_secundario',
      'turno',
      'hora_inicio_turno',
      'hora_fin_turno',
      'salario',
      'activo',
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
    await db.query(`UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async setActivo(id: number, activo: boolean): Promise<void> {
    await db.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, id]);
  },
};