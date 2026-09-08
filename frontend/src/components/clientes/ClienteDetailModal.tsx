import {
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe2,
  Briefcase,
  TrendingUp,
  Pencil,
  Star,
} from 'lucide-react';
import { Modal } from '../dialogs/Modal';
import { Button } from '../ui/Button';
import type { Cliente } from '../../types';
import { MOTIVO_VIAJE_LABEL } from '../../types';

interface ClienteDetailModalProps {
  cliente: Cliente | null;
  onClose: () => void;
  onEdit: () => void;
}

export function ClienteDetailModal({
  cliente,
  onClose,
  onEdit,
}: ClienteDetailModalProps) {
  if (!cliente) return null;

  const esFrecuente = cliente.tipo_cliente === 'frecuente';

  return (
    <Modal
      open={!!cliente}
      onClose={onClose}
      title={`${cliente.nombres} ${cliente.apellidos}`}
      description={`${cliente.tipo_documento}: ${cliente.numero_documento}`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Tipo de cliente badge */}
        <div className="flex items-center gap-3 flex-wrap">
          {esFrecuente ? (
            <div className="px-3 py-1 rounded-full bg-accent/15 border border-accent/40 text-accent text-xs font-medium flex items-center gap-1.5">
              <Star className="size-3" />
              Cliente Frecuente
            </div>
          ) : (
            <div className="px-3 py-1 rounded-full bg-bg-elevated border border-border-color text-text-secondary text-xs font-medium">
              Cliente Temporal
            </div>
          )}
          {esFrecuente && Number(cliente.descuento_porcentaje) > 0 && (
            <div className="px-3 py-1 rounded-full bg-success/10 border border-success/40 text-success text-xs font-medium">
              {Number(cliente.descuento_porcentaje).toFixed(1)}% de descuento
            </div>
          )}
        </div>

        {/* Stats del cliente */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            label="Total de estancias"
            value={cliente.total_estancias}
            icon={Calendar}
          />
          <StatBox
            label="Total gastado"
            value={`S/ ${Number(cliente.monto_total_gastado).toFixed(2)}`}
            icon={TrendingUp}
          />
        </div>

        {/* Datos personales */}
        <Section title="Datos personales">
          <Row icon={Globe2} label="Nacionalidad" value={cliente.nacionalidad} />
          {cliente.procedencia && (
            <Row icon={MapPin} label="Procedencia" value={cliente.procedencia} />
          )}
          {cliente.motivo_viaje && (
            <Row
              icon={Briefcase}
              label="Motivo de viaje"
              value={MOTIVO_VIAJE_LABEL[cliente.motivo_viaje]}
            />
          )}
          {cliente.fecha_nacimiento && (
            <Row
              icon={Calendar}
              label="Fecha de nacimiento"
              value={new Date(cliente.fecha_nacimiento).toLocaleDateString('es-PE')}
            />
          )}
        </Section>

        {/* Contacto */}
        <Section title="Contacto">
          {cliente.telefono ? (
            <Row icon={Phone} label="Teléfono" value={cliente.telefono} />
          ) : (
            <p className="text-sm text-text-muted">Sin teléfono registrado</p>
          )}
          {cliente.email && (
            <Row icon={Mail} label="Email" value={cliente.email} />
          )}
          {cliente.direccion && (
            <Row icon={MapPin} label="Dirección" value={cliente.direccion} />
          )}
        </Section>

        {/* Última visita */}
        {cliente.fecha_ultima_estancia && (
          <div className="bg-bg-elevated rounded-md p-3">
            <p className="text-xs text-text-muted">Última visita</p>
            <p className="text-sm text-text-primary mt-0.5">
              {new Date(cliente.fecha_ultima_estancia).toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon className="size-4 text-text-muted mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-text-primary break-words">{value}</p>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Calendar;
}) {
  return (
    <div className="bg-bg-elevated rounded-md p-3 border border-border-color">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-text-muted">{label}</p>
        <Icon className="size-4 text-accent" />
      </div>
      <p className="text-xl font-semibold text-text-primary tabular-nums">
        {value}
      </p>
    </div>
  );
}
