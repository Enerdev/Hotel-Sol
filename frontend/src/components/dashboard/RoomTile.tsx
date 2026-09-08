import { cn } from '../../lib/cn';
import type {
  Habitacion,
  EstadoOcupacion,
  EstadoLimpieza,
} from '../../types';
import { TIPO_HABITACION_LABEL } from '../../types';

interface RoomTileProps {
  habitacion: Habitacion;
  onClick?: ((habitacion: Habitacion) => void) | undefined;
  size?: 'sm' | 'md';
}

/**
 * Determina el estado VISUAL combinado de una habitación.
 * Si está ocupada, prevalece eso. Si está disponible pero sucia, muestra eso, etc.
 */
type EstadoVisual =
  | 'disponible'
  | 'ocupada'
  | 'reservada'
  | 'sucia'
  | 'en_limpieza'
  | 'pendiente_validacion'
  | 'fuera';

function getEstadoVisual(
  ocupacion: EstadoOcupacion,
  limpieza: EstadoLimpieza
): EstadoVisual {
  if (ocupacion === 'fuera_de_servicio') return 'fuera';
  if (ocupacion === 'ocupada') return 'ocupada';
  if (ocupacion === 'reservada') return 'reservada';
  // disponible: importa el estado de limpieza
  if (limpieza === 'limpieza_pendiente_validacion') return 'pendiente_validacion';
  if (limpieza === 'en_limpieza') return 'en_limpieza';
  if (limpieza === 'sucia') return 'sucia';
  return 'disponible';
}

const estadoStyles: Record<
  EstadoVisual,
  { bg: string; border: string; text: string; label: string }
> = {
  disponible: {
    bg: 'bg-success/10',
    border: 'border-success/40',
    text: 'text-success',
    label: 'Disponible',
  },
  ocupada: {
    bg: 'bg-info/10',
    border: 'border-info/40',
    text: 'text-info',
    label: 'Ocupada',
  },
  reservada: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/40',
    text: 'text-purple-400',
    label: 'Reservada',
  },
  sucia: {
    bg: 'bg-warning/10',
    border: 'border-warning/40',
    text: 'text-warning',
    label: 'Por limpiar',
  },
  en_limpieza: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/40',
    text: 'text-cyan-400',
    label: 'En limpieza',
  },
  pendiente_validacion: {
    bg: 'bg-accent/10',
    border: 'border-accent/40',
    text: 'text-accent',
    label: 'Validar',
  },
  fuera: {
    bg: 'bg-bg-elevated',
    border: 'border-border-color',
    text: 'text-text-muted',
    label: 'Fuera',
  },
};

export function RoomTile({ habitacion, onClick, size = 'md' }: RoomTileProps) {
  const visual = getEstadoVisual(
    habitacion.estado_ocupacion,
    habitacion.estado_limpieza
  );
  const styles = estadoStyles[visual];

  const isClickable = !!onClick;

  return (
    <button
      type="button"
      onClick={() => onClick?.(habitacion)}
      disabled={!isClickable}
      className={cn(
        'relative rounded-lg border-2 p-3 transition-all text-left',
        styles.bg,
        styles.border,
        size === 'md' ? 'min-h-[5.5rem]' : 'min-h-[4.5rem]',
        isClickable && 'hover:scale-[1.02] hover:shadow-md cursor-pointer',
        !isClickable && 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <span className="font-bold text-text-primary text-lg">
          {habitacion.numero}
        </span>
        <span className={cn('text-xs font-medium', styles.text)}>
          {styles.label}
        </span>
      </div>
      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
        {TIPO_HABITACION_LABEL[habitacion.tipo]}
      </p>
    </button>
  );
}

/** Leyenda de colores para mostrar al lado de los mapas de habitaciones */
export function RoomLegend() {
  const items: Array<{ visual: EstadoVisual }> = [
    { visual: 'disponible' },
    { visual: 'ocupada' },
    { visual: 'reservada' },
    { visual: 'sucia' },
    { visual: 'en_limpieza' },
    { visual: 'pendiente_validacion' },
    { visual: 'fuera' },
  ];

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {items.map(({ visual }) => {
        const s = estadoStyles[visual];
        return (
          <div key={visual} className="flex items-center gap-1.5">
            <span
              className={cn('size-3 rounded border-2', s.bg, s.border)}
              aria-hidden
            />
            <span className="text-text-secondary">{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}
