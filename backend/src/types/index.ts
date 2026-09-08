/**
 * Tipos compartidos del backend.
 * Espejo de los ENUMs del schema SQL.
 */

export type Rol = 'admin' | 'recepcionista' | 'limpieza';

export type EstadoOcupacion = 'disponible' | 'ocupada' | 'reservada' | 'fuera_de_servicio';

export type EstadoLimpieza =
  | 'limpia'
  | 'sucia'
  | 'en_limpieza'
  | 'limpieza_pendiente_validacion';

export type EstadoLimpiezaRegistro =
  | 'pendiente'
  | 'en_progreso'
  | 'completada_por_limpieza'
  | 'validada_por_recepcion'
  | 'rechazada';

export type TipoHabitacion =
  | 'matrimonial_privada_ducha'
  | 'matrimonial_bano'
  | 'tv_cable'
  | 'simple'
  | 'doble_privada'
  | 'doble_tv_cable';

export type TipoCliente = 'frecuente' | 'temporal';

export type TipoDocumento = 'DNI' | 'CI' | 'Pasaporte' | 'Otros';

export type Turno = 'mañana' | 'tarde' | 'noche' | 'rotativo';

export interface UsuarioBasico {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  rol: Rol;
}

export interface JwtPayload {
  userId: number;
  username: string;
  rol: Rol;
  rol_secundario?: 'recepcionista' | 'limpieza' | null;
}

/**
 * Extiende el Request de Express para que tenga `user` después del middleware de auth.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
