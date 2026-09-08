import type { TipoHabitacion } from '../../types';
import { TIPO_HABITACION_LABEL } from '../../types';
import { cn } from '../../lib/cn';

export type FiltroPiso = 'todos' | 2 | 3 | 4;
export type FiltroEstado =
  | 'todos'
  | 'disponible'
  | 'ocupada'
  | 'reservada'
  | 'sucia'
  | 'en_limpieza'
  | 'pendiente_validacion'
  | 'fuera';

export interface Filtros {
  piso: FiltroPiso;
  estado: FiltroEstado;
  tipo: TipoHabitacion | 'todos';
}

interface HabitacionesFiltrosProps {
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  /** Conteos para mostrar al lado de cada filtro */
  conteos?: {
    porEstado: Record<string, number>;
  };
}

export function HabitacionesFiltros({
  filtros,
  onChange,
}: HabitacionesFiltrosProps) {
  return (
    <div className="bg-bg-surface border border-border-color rounded-lg p-4 space-y-4">
      {/* Por piso */}
      <FilterRow label="Piso">
        <Chip
          active={filtros.piso === 'todos'}
          onClick={() => onChange({ ...filtros, piso: 'todos' })}
        >
          Todos
        </Chip>
        {[2, 3, 4].map((p) => (
          <Chip
            key={p}
            active={filtros.piso === p}
            onClick={() => onChange({ ...filtros, piso: p as 2 | 3 | 4 })}
          >
            Piso {p}
          </Chip>
        ))}
      </FilterRow>

      {/* Por estado */}
      <FilterRow label="Estado">
        <Chip
          active={filtros.estado === 'todos'}
          onClick={() => onChange({ ...filtros, estado: 'todos' })}
        >
          Todos
        </Chip>
        <Chip
          active={filtros.estado === 'disponible'}
          onClick={() => onChange({ ...filtros, estado: 'disponible' })}
          color="success"
        >
          Disponibles
        </Chip>
        <Chip
          active={filtros.estado === 'ocupada'}
          onClick={() => onChange({ ...filtros, estado: 'ocupada' })}
          color="info"
        >
          Ocupadas
        </Chip>
        <Chip
          active={filtros.estado === 'reservada'}
          onClick={() => onChange({ ...filtros, estado: 'reservada' })}
          color="purple"
        >
          Reservadas
        </Chip>
        <Chip
          active={filtros.estado === 'sucia'}
          onClick={() => onChange({ ...filtros, estado: 'sucia' })}
          color="warning"
        >
          Sucias
        </Chip>
        <Chip
          active={filtros.estado === 'en_limpieza'}
          onClick={() => onChange({ ...filtros, estado: 'en_limpieza' })}
          color="info"
        >
          En limpieza
        </Chip>
        <Chip
          active={filtros.estado === 'pendiente_validacion'}
          onClick={() => onChange({ ...filtros, estado: 'pendiente_validacion' })}
          color="accent"
        >
          Por validar
        </Chip>
      </FilterRow>

      {/* Por tipo */}
      <FilterRow label="Tipo">
        <Chip
          active={filtros.tipo === 'todos'}
          onClick={() => onChange({ ...filtros, tipo: 'todos' })}
        >
          Todos
        </Chip>
        {(Object.keys(TIPO_HABITACION_LABEL) as TipoHabitacion[]).map((t) => (
          <Chip
            key={t}
            active={filtros.tipo === t}
            onClick={() => onChange({ ...filtros, tipo: t })}
          >
            {TIPO_HABITACION_LABEL[t]}
          </Chip>
        ))}
      </FilterRow>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 flex-wrap">
      <span className="text-sm font-medium text-text-secondary mt-1.5 w-12 shrink-0">
        {label}:
      </span>
      <div className="flex flex-wrap gap-2 flex-1">{children}</div>
    </div>
  );
}

type ChipColor = 'default' | 'success' | 'info' | 'warning' | 'danger' | 'accent' | 'purple';

function Chip({
  children,
  active,
  onClick,
  color = 'default',
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  color?: ChipColor;
}) {
  const activeColor: Record<ChipColor, string> = {
    default: 'bg-text-primary text-text-inverse border-text-primary',
    success: 'bg-success/20 text-success border-success/50',
    info: 'bg-info/20 text-info border-info/50',
    warning: 'bg-warning/20 text-warning border-warning/50',
    danger: 'bg-danger/20 text-danger border-danger/50',
    accent: 'bg-accent/20 text-accent border-accent/50',
    purple: 'bg-purple-500/20 text-purple-400 border-purple-500/50',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1 rounded-md text-xs font-medium border transition',
        active
          ? activeColor[color]
          : 'bg-bg-elevated text-text-secondary border-border-color hover:border-border-hover hover:text-text-primary'
      )}
    >
      {children}
    </button>
  );
}
