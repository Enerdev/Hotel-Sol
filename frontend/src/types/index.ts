/**
 * Tipos espejo del backend.
 * Si cambias algo aquí, asegúrate de cambiarlo también en backend/src/types/index.ts
 */

export type Rol = 'admin' | 'recepcionista' | 'limpieza';

export interface Usuario {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  rol: Rol;
  rol_secundario: 'recepcionista' | 'limpieza' | null;
  email: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Usuario;
}

export type EstadoOcupacion =
  | 'disponible'
  | 'ocupada'
  | 'reservada'
  | 'fuera_de_servicio';

export type EstadoLimpieza =
  | 'limpia'
  | 'sucia'
  | 'en_limpieza'
  | 'limpieza_pendiente_validacion';

export type TipoHabitacion =
  | 'matrimonial_privada_ducha'
  | 'matrimonial_bano'
  | 'tv_cable'
  | 'simple'
  | 'doble_privada'
  | 'doble_tv_cable';

export interface Habitacion {
  id: number;
  numero: string;
  piso: number;
  tipo: TipoHabitacion;
  capacidad: number;
  bano_privado: number;
  tiene_ducha: number;
  bano_con_jacuzzi: number;
  tiene_tv: number;
  tiene_cable_tv: number;
  tiene_control_remoto: number;
  tiene_wifi: number;
  tiene_calefaccion: number;
  tiene_ventana: number;
  tiene_balcon: number;
  activo: number;
  estado_ocupacion: EstadoOcupacion;
  estado_limpieza: EstadoLimpieza;
  precio_base_noche: string;
  notas: string | null;
  camas?: Cama[];
}

export interface Cama {
  tipo_cama: string;
  cantidad: number;
}

export interface HabitacionDetalle extends Habitacion {
  camas: Cama[];
}

export type EstadoLimpiezaRegistro =
  | 'pendiente'
  | 'en_progreso'
  | 'completada_por_limpieza'
  | 'validada_por_recepcion'
  | 'rechazada';

export interface LimpiezaRegistro {
  id: number;
  habitacion_id: number;
  habitacion_numero: string;
  habitacion_piso: number;
  empleado_limpieza_id: number | null;
  empleado_nombre: string | null;
  recepcionista_validador_id: number | null;
  validador_nombre: string | null;
  turno: string | null;
  estado: EstadoLimpiezaRegistro;
  fecha_creacion: string;
  fecha_inicio_limpieza: string | null;
  fecha_fin_limpieza: string | null;
  notas_limpieza: string | null;
  duracion_minutos: number | null;
}

export interface DashboardStats {
  hab_disponibles: number;
  hab_ocupadas: number;
  hab_reservadas: number;
  hab_por_limpiar: number;
  hab_en_limpieza: number;
  hab_pendiente_validacion: number;
  clientes_frecuentes: number;
  reservas_activas: number;
}

// Diccionarios para mostrar enums de forma amigable
export const TIPO_HABITACION_LABEL: Record<TipoHabitacion, string> = {
  matrimonial_privada_ducha: 'Matrimonial privada c/ducha',
  matrimonial_bano: 'Matrimonial c/baño',
  tv_cable: 'TV cable',
  simple: 'Simple',
  doble_privada: 'Doble privada',
  doble_tv_cable: 'Doble c/TV cable',
};

export const ESTADO_OCUPACION_LABEL: Record<EstadoOcupacion, string> = {
  disponible: 'Disponible',
  ocupada: 'Ocupada',
  reservada: 'Reservada',
  fuera_de_servicio: 'Fuera de servicio',
};

export const ESTADO_LIMPIEZA_LABEL: Record<EstadoLimpieza, string> = {
  limpia: 'Limpia',
  sucia: 'Sucia',
  en_limpieza: 'En limpieza',
  limpieza_pendiente_validacion: 'Pendiente de validación',
};

// ============================================================================
// CLIENTES
// ============================================================================

export type TipoDocumento = 'DNI' | 'CI' | 'Pasaporte' | 'Otros';
export type TipoCliente = 'frecuente' | 'temporal';
export type MotivoViaje = 'turismo' | 'negocios' | 'salud' | 'familia' | 'transito' | 'otro';

export interface Cliente {
  id: number;
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  nacionalidad: string;
  procedencia: string | null;
  motivo_viaje: MotivoViaje | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  tipo_cliente: TipoCliente;
  descuento_porcentaje: string;
  total_estancias: number;
  monto_total_gastado: string;
  fecha_ultima_estancia: string | null;
  notas: string | null;
  activo: number;
}

export interface ClienteCreatePayload {
  tipo_documento: TipoDocumento;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  fecha_nacimiento?: string | null;
  nacionalidad?: string;
  procedencia?: string | null;
  motivo_viaje?: MotivoViaje;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  tipo_cliente?: TipoCliente;
  descuento_porcentaje?: number;
}

export const MOTIVO_VIAJE_LABEL: Record<MotivoViaje, string> = {
  turismo: 'Turismo',
  negocios: 'Negocios',
  salud: 'Salud',
  familia: 'Familia',
  transito: 'Tránsito',
  otro: 'Otro',
};

// ============================================================================
// RESERVAS
// ============================================================================

export type EstadoReserva = 'activa' | 'check_out' | 'cancelada' | 'fecha_abierta' | 'no_show';
export type EstadoPago = 'pagado' | 'pendiente' | 'parcial' | 'reembolsado';
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'yape' | 'plin' | 'online';
export type TipoEstancia = 'por_horas' | 'por_noche' | 'fecha_abierta';
export type OrigenReserva = 'presencial' | 'telefono' | 'web' | 'booking' | 'otro';

export interface Reserva {
  id: number;
  codigo: string;
  cliente_id: number;
  habitacion_id: number;
  recepcionista_id: number;
  habitacion_numero: string;
  habitacion_piso: number;
  habitacion_tipo: TipoHabitacion;
  cliente_nombre: string;
  cliente_documento: string;
  recepcionista_nombre: string;
  fecha_check_in: string;
  fecha_check_out: string | null;
  fecha_check_out_real: string | null;
  noches: number | null;
  horas: number | null;
  tipo_estancia: TipoEstancia;
  precio_total: string;
  monto_pagado: string;
  descuento_aplicado: string;
  estado_pago: EstadoPago;
  metodo_pago: MetodoPago | null;
  estado: EstadoReserva;
  origen: OrigenReserva;
  notas: string | null;
  creado_en: string;
}

export interface ReservaCreatePayload {
  cliente_id: number;
  habitacion_id: number;
  fecha_check_in: string;
  fecha_check_out?: string | null;
  noches?: number | null;
  horas?: number | null;
  tipo_estancia: TipoEstancia;
  precio_total: number;
  monto_pagado?: number;
  estado_pago?: EstadoPago;
  metodo_pago?: MetodoPago | null;
  origen?: OrigenReserva;
  notas?: string | null;
}

export interface TarifaFranja {
  id: number;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  tipo_habitacion: TipoHabitacion | 'todas';
  precio: string | null;
  activo: number;
}

export interface TemporadaConTarifas {
  id: number;
  nombre: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  multiplicador_precio: string;
  tarifas: Array<{
    id: number;
    temporada_id: number;
    tipo_habitacion: TipoHabitacion;
    precio: string;
  }>;
}

export const ESTADO_RESERVA_LABEL: Record<EstadoReserva, string> = {
  activa: 'Activa',
  check_out: 'Check-out',
  cancelada: 'Cancelada',
  fecha_abierta: 'Fecha abierta',
  no_show: 'No show',
};

export const ESTADO_PAGO_LABEL: Record<EstadoPago, string> = {
  pagado: 'Pagado',
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  reembolsado: 'Reembolsado',
};

export const METODO_PAGO_LABEL: Record<MetodoPago, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  yape: 'Yape',
  plin: 'Plin',
  online: 'Online',
};

// ============================================================================
// PERSONAL
// ============================================================================

export type Turno = 'mañana' | 'tarde' | 'noche' | 'rotativo';

export interface Empleado {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  rol: Rol;
  rol_secundario: 'recepcionista' | 'limpieza' | null;
  turno: Turno | null;
  hora_inicio_turno: string | null;
  hora_fin_turno: string | null;
  salario: string | null;
  activo: number;
  ultimo_login: string | null;
  creado_en: string;
}

export interface EmpleadoCreatePayload {
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  dni?: string | null;
  email?: string | null;
  telefono?: string | null;
  rol: Rol;
  turno?: Turno | null;
  hora_inicio_turno?: string | null;
  hora_fin_turno?: string | null;
  salario?: number | null;
}

export interface ProductividadLimpieza {
  empleado_id: number;
  empleado_nombre: string;
  username: string;
  activo: number;
  total_limpiezas: number;
  validadas: number;
  promedio_minutos: number | null;
  pago_calculado: number | null;
  tarifa_por_hab: number;
}

export interface LimpiezaDetalleItem {
  id: number;
  estado: string;
  fecha_inicio_limpieza: string | null;
  fecha_fin_limpieza: string | null;
  fecha_validacion: string | null;
  duracion_minutos: number | null;
  habitacion_numero: string;
  habitacion_piso: number;
  validador_nombre: string | null;
}

export const TURNO_LABEL: Record<Turno, string> = {
  mañana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
  rotativo: 'Rotativo',
};

export const ROL_LABEL: Record<Rol, string> = {
  admin: 'Administrador',
  recepcionista: 'Recepcionista',
  limpieza: 'Limpieza',
};

// ============================================================================
// PRODUCTOS Y VENTAS
// ============================================================================

export interface Producto {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: string;
  stock: number;
  unidad_medida: string;
  categoria: string;
  activo: number;
}

export interface ProductoCreatePayload {
  nombre: string;
  descripcion?: string | null;
  precio: number;
  stock?: number;
  unidad_medida?: string;
  categoria?: string;
}

export interface Venta {
  id: number;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
  fecha: string;
  notas: string | null;
  metodo_pago: string;
  numero_operacion: string | null;
  telefono_pago: string | null;
  producto_id: number;
  producto_nombre: string;
  unidad_medida: string;
  habitacion_id: number | null;
  habitacion_numero: string | null;
  vendedor_nombre: string | null;
  reserva_codigo: string | null;
}

export interface VentaCreatePayload {
  producto_id: number;
  cantidad: number;
  habitacion_id?: number | null;
  reserva_id?: number | null;
  metodo_pago?: 'efectivo' | 'tarjeta' | 'yape' | 'plin' | 'transferencia';
  numero_operacion?: string | null;
  telefono_pago?: string | null;
  notas?: string | null;
}

// ============================================================================
// REPORTES
// ============================================================================

export interface OcupacionDia {
  fecha: string;
  habs_ocupadas: number;
  num_reservas: number;
  ingresos: number;
  total_habs: number;
  tasa_ocupacion: number;
}

export interface ReporteIngresos {
  reservas: {
    num_reservas: number;
    ingresos_reservas: string | number;
    pagado_reservas: string | number;
  };
  ventas: {
    num_ventas: number;
    ingresos_ventas: string | number;
  };
  por_metodo: Array<{
    metodo_pago: string | null;
    num: number;
    total: string | number;
  }>;
  total_general: number;
}

export interface ClienteTop {
  id: number;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  tipo_cliente: TipoCliente;
  total_estancias: number;
  monto_total_gastado: string;
  fecha_ultima_estancia: string | null;
}

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

export interface ConfiguracionItem {
  clave: string;
  valor: string;
  descripcion: string | null;
}

// ============================================================================
// COBROS
// ============================================================================

export type TipoCobro =
  | 'venta_directa'
  | 'servicio_extra'
  | 'anticipo_reserva'
  | 'saldo_reserva'
  | 'lavanderia'
  | 'consumo_minibar'
  | 'otro';

export interface Cobro {
  id: number;
  codigo: string;
  concepto: string;
  tipo_cobro: TipoCobro;
  monto: string;
  metodo_pago: string;
  numero_operacion: string | null;
  telefono_pago: string | null;
  notas: string | null;
  anulado: number;
  motivo_anulacion: string | null;
  fecha_anulacion: string | null;
  fecha: string;
  cliente_id: number | null;
  cliente_display: string | null;
  reserva_id: number | null;
  reserva_codigo: string | null;
  habitacion_id: number | null;
  habitacion_numero: string | null;
  recepcionista_nombre: string | null;
}

export interface CobroResumenHoy {
  total: {
    total_cobros: number;
    total_monto: number;
  };
  por_metodo: Array<{
    metodo_pago: string;
    num: number;
    total: number;
  }>;
}

export const TIPO_COBRO_LABEL: Record<TipoCobro, string> = {
  venta_directa: 'Venta directa',
  servicio_extra: 'Servicio extra',
  anticipo_reserva: 'Anticipo de reserva',
  saldo_reserva: 'Saldo de reserva',
  lavanderia: 'Lavandería',
  consumo_minibar: 'Consumo minibar',
  otro: 'Otro',
};
