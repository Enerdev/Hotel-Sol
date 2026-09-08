import { useEffect, useState } from 'react';
import {
  Bed,
  Bath,
  Tv,
  Wifi,
  Wind,
  ShowerHead,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Modal } from '../dialogs/Modal';
import { api, ApiError } from '../../services/api';
import type {
  HabitacionDetalle,
  Habitacion,
  EstadoOcupacion,
  EstadoLimpieza,
} from '../../types';
import {
  TIPO_HABITACION_LABEL,
  ESTADO_OCUPACION_LABEL,
  ESTADO_LIMPIEZA_LABEL,
} from '../../types';
import { cn } from '../../lib/cn';

interface HabitacionDetailModalProps {
  habitacion: Habitacion | null;
  onClose: () => void;
}

const TIPO_CAMA_LABEL: Record<string, string> = {
  individual: 'Individual',
  matrimonial: 'Matrimonial',
  queen: 'Queen',
  king: 'King',
  litera_individual: 'Litera individual',
  litera_matrimonial: 'Litera matrimonial',
  sofa_cama: 'Sofá cama',
};

export function HabitacionDetailModal({
  habitacion,
  onClose,
}: HabitacionDetailModalProps) {
  const [detalle, setDetalle] = useState<HabitacionDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!habitacion) return;
    setLoading(true);
    setError(null);
    api
      .get<HabitacionDetalle>(`/habitaciones/${habitacion.id}`)
      .then(setDetalle)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Error'))
      .finally(() => setLoading(false));
  }, [habitacion]);

  if (!habitacion) return null;

  return (
    <Modal
      open={!!habitacion}
      onClose={onClose}
      title={`Habitación ${habitacion.numero}`}
      description={`${TIPO_HABITACION_LABEL[habitacion.tipo]} · Piso ${habitacion.piso}`}
      size="lg"
    >
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 text-accent animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
          {error}
        </div>
      )}

      {detalle && (
        <div className="space-y-6">
          {/* Estado actual */}
          <div className="grid grid-cols-2 gap-3">
            <EstadoBox
              label="Ocupación"
              value={ESTADO_OCUPACION_LABEL[detalle.estado_ocupacion as EstadoOcupacion]}
              estado={detalle.estado_ocupacion}
              tipo="ocupacion"
            />
            <EstadoBox
              label="Limpieza"
              value={ESTADO_LIMPIEZA_LABEL[detalle.estado_limpieza as EstadoLimpieza]}
              estado={detalle.estado_limpieza}
              tipo="limpieza"
            />
          </div>

          {/* Camas */}
          <Section icon={Bed} title="Camas">
            {detalle.camas.length === 0 ? (
              <p className="text-sm text-text-secondary">Sin camas registradas</p>
            ) : (
              <ul className="space-y-1">
                {detalle.camas.map((cama, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-sm text-text-primary"
                  >
                    <span className="size-1.5 rounded-full bg-accent" />
                    <span className="font-medium">{cama.cantidad}×</span>
                    <span>{TIPO_CAMA_LABEL[cama.tipo_cama] ?? cama.tipo_cama}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-xs text-text-muted mt-2">
              Capacidad total: {detalle.capacidad}{' '}
              {detalle.capacidad === 1 ? 'persona' : 'personas'}
            </p>
          </Section>

          {/* Baño */}
          <Section icon={Bath} title="Baño">
            <div className="grid sm:grid-cols-2 gap-2">
              <FeatureRow
                label="Baño privado"
                active={!!detalle.bano_privado}
              />
              <FeatureRow
                label="Ducha"
                active={!!detalle.tiene_ducha}
                icon={ShowerHead}
              />
            </div>
          </Section>

          {/* TV */}
          <Section icon={Tv} title="Televisión">
            <div className="grid sm:grid-cols-2 gap-2">
              <FeatureRow label="Tiene TV" active={!!detalle.tiene_tv} />
              <FeatureRow
                label="TV cable"
                active={!!detalle.tiene_cable_tv}
              />
              <FeatureRow
                label="Control remoto"
                active={!!detalle.tiene_control_remoto}
              />
            </div>
          </Section>

          {/* Otros amenities */}
          <Section icon={Wifi} title="Otros amenities">
            <div className="grid sm:grid-cols-2 gap-2">
              <FeatureRow label="WiFi" active={!!detalle.tiene_wifi} icon={Wifi} />
              <FeatureRow
                label="Aire acondicionado"
                active={false /* no está en la BD aún */}
                icon={Wind}
                hidden
              />
            </div>
          </Section>

          {/* Precio y notas */}
          <div className="bg-bg-elevated rounded-md p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Precio base / noche</span>
              <span className="text-lg font-semibold text-accent">
                S/ {Number(detalle.precio_base_noche).toFixed(2)}
              </span>
            </div>
            {detalle.notas && (
              <div>
                <p className="text-xs text-text-muted">Notas</p>
                <p className="text-sm text-text-primary">{detalle.notas}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ============================================================================
// Subcomponentes
// ============================================================================

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Bed;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-4 text-accent" />
        <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  );
}

function FeatureRow({
  label,
  active,
  icon: Icon,
  hidden,
}: {
  label: string;
  active: boolean;
  icon?: typeof Wifi;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm',
        active ? 'text-text-primary' : 'text-text-muted line-through'
      )}
    >
      {active ? (
        <CheckCircle className="size-4 text-success shrink-0" />
      ) : (
        <XCircle className="size-4 text-text-muted shrink-0" />
      )}
      {Icon && <Icon className="size-3.5 text-text-secondary" />}
      <span>{label}</span>
    </div>
  );
}

function EstadoBox({
  label,
  value,
  estado,
  tipo,
}: {
  label: string;
  value: string;
  estado: string;
  tipo: 'ocupacion' | 'limpieza';
}) {
  const colors: Record<string, string> = {
    // ocupación
    disponible: 'bg-success/10 border-success/40 text-success',
    ocupada: 'bg-info/10 border-info/40 text-info',
    reservada: 'bg-purple-500/10 border-purple-500/40 text-purple-400',
    fuera_de_servicio: 'bg-bg-elevated border-border-color text-text-muted',
    // limpieza
    limpia: 'bg-success/10 border-success/40 text-success',
    sucia: 'bg-warning/10 border-warning/40 text-warning',
    en_limpieza: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400',
    limpieza_pendiente_validacion: 'bg-accent/10 border-accent/40 text-accent',
  };
  const cls = colors[estado] ?? 'bg-bg-elevated border-border-color text-text-primary';
  void tipo;

  return (
    <div className={cn('rounded-md border-2 p-3', cls)}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-base font-semibold mt-0.5">{value}</p>
    </div>
  );
}
