/**
 * Calcula el precio total de una reserva basándose en:
 * - El tipo de habitación
 * - El tipo de estancia (por noche o por horas)
 * - Las tarifas (por franja horaria) y temporadas
 * - El descuento del cliente (si es frecuente)
 *
 * Es una aproximación local del cálculo. La autoridad final está en el backend.
 */

import type {
  TipoHabitacion,
  TarifaFranja,
  TemporadaConTarifas,
  TipoEstancia,
  Cliente,
} from '../types';

interface CalcularPrecioParams {
  tipoHabitacion: TipoHabitacion;
  tipoEstancia: TipoEstancia;
  fechaCheckIn: string;       // ISO string "2026-05-02T14:00"
  fechaCheckOut?: string | null;
  noches?: number | null;
  horas?: number | null;
  tarifas: TarifaFranja[];
  temporadas: TemporadaConTarifas[];
  cliente?: Cliente | null;
  /** Precio base de la habitación (fallback si no hay tarifas) */
  precioBase?: number;
}

export interface PrecioCalculado {
  /** Subtotal sin descuento */
  subtotal: number;
  /** Descuento aplicado en monto */
  descuento: number;
  /** Total final */
  total: number;
  /** Detalle de cómo se calculó (para mostrar al usuario) */
  detalle: string;
  /** Si había una temporada especial */
  temporada?: string;
}

export function calcularPrecio(p: CalcularPrecioParams): PrecioCalculado {
  let subtotal = 0;
  let detalle = '';
  let temporadaUsada: string | undefined;

  if (p.tipoEstancia === 'por_horas' && p.horas && p.horas > 0) {
    // ── Cálculo por horas ──
    const horaInicio = extractHora(p.fechaCheckIn);
    const tarifa = encontrarFranja(horaInicio, p.tipoHabitacion, p.tarifas);

    if (tarifa && tarifa.precio !== null) {
      const precioFranja = Number(tarifa.precio);
      subtotal = precioFranja;
      detalle = `Franja "${tarifa.nombre}": S/ ${precioFranja.toFixed(2)}`;
    } else {
      subtotal = (p.precioBase ?? 0) * (p.horas / 8); // estimado proporcional
      detalle = 'Sin tarifa específica · estimado proporcional';
    }
  } else if (p.tipoEstancia === 'por_noche' && p.noches && p.noches > 0) {
    // ── Cálculo por noches ──
    const temporada = encontrarTemporada(p.fechaCheckIn, p.temporadas);
    let precioPorNoche = p.precioBase ?? 0;

    if (temporada) {
      const tarifaTemp = temporada.tarifas.find(
        (t) => t.tipo_habitacion === p.tipoHabitacion
      );
      if (tarifaTemp) {
        precioPorNoche = Number(tarifaTemp.precio);
        temporadaUsada = temporada.nombre;
      }
    }

    subtotal = precioPorNoche * p.noches;
    detalle = `${p.noches} noche${p.noches !== 1 ? 's' : ''} × S/ ${precioPorNoche.toFixed(2)}`;
    if (temporadaUsada) {
      detalle += ` (${temporadaUsada})`;
    }
  } else if (p.tipoEstancia === 'fecha_abierta') {
    subtotal = 0;
    detalle = 'Estancia con fecha abierta · se calcula al check-out';
  }

  // ── Descuento del cliente frecuente ──
  let descuento = 0;
  if (p.cliente?.tipo_cliente === 'frecuente') {
    const pct = Number(p.cliente.descuento_porcentaje);
    if (pct > 0) {
      descuento = (subtotal * pct) / 100;
    }
  }

  const total = Math.max(0, subtotal - descuento);

  const result: PrecioCalculado = {
    subtotal,
    descuento,
    total,
    detalle,
  };

  if (temporadaUsada) {
    result.temporada = temporadaUsada;
  }

  return result;
}

function extractHora(isoString: string): string {
  // De "2026-05-02T14:30" extrae "14:30"
  const match = isoString.match(/T(\d{2}:\d{2})/);
  return match ? match[1] + ':00' : '12:00:00';
}

function encontrarFranja(
  hora: string,
  tipo: TipoHabitacion,
  tarifas: TarifaFranja[]
): TarifaFranja | undefined {
  // Convertir HH:MM:SS a minutos para comparación
  const m = horaToMinutos(hora);
  const candidatas = tarifas.filter(
    (t) =>
      (t.tipo_habitacion === tipo || t.tipo_habitacion === 'todas') &&
      t.activo
  );

  for (const t of candidatas) {
    const ini = horaToMinutos(t.hora_inicio);
    const fin = horaToMinutos(t.hora_fin);
    // Casos: rango normal o que cruza medianoche
    if (ini < fin) {
      if (m >= ini && m < fin) return t;
    } else {
      // Cruza medianoche
      if (m >= ini || m < fin) return t;
    }
  }
  return undefined;
}

function horaToMinutos(hora: string): number {
  const [h, m] = hora.split(':');
  return Number(h) * 60 + Number(m);
}

function encontrarTemporada(
  fechaCheckIn: string,
  temporadas: TemporadaConTarifas[]
): TemporadaConTarifas | undefined {
  const fecha = fechaCheckIn.slice(0, 10);
  return temporadas.find((t) => fecha >= t.fecha_inicio && fecha <= t.fecha_fin);
}
