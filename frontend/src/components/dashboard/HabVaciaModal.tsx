import { useState } from 'react';
import {
  BedDouble,
  Sparkles,
  AlertTriangle,
  Bath,
  Tv,
  Wifi,
  Receipt,
  Zap,
} from 'lucide-react';
import { Modal } from '../dialogs/Modal';
import { Button } from '../ui/Button';
import { RecepcionExpressModal } from './RecepcionExpressModal';
import { TIPO_HABITACION_LABEL } from '../../types';
import type { Habitacion } from '../../types';
import { cn } from '../../lib/cn';

interface HabVaciaModalProps {
  open: boolean;
  habitacion: Habitacion | null;
  onClose: () => void;
  onCobroRapido?: (h: Habitacion) => void;
  onChange?: () => void;
}

export function HabVaciaModal({
  open,
  habitacion,
  onClose,
  onCobroRapido,
  onChange,
}: HabVaciaModalProps) {
  const [recepcionOpen, setRecepcionOpen] = useState(false);

  if (!habitacion) return null;

  const esDisponible =
    habitacion.estado_ocupacion === 'disponible' &&
    habitacion.estado_limpieza === 'limpia';
  const porLimpiar = habitacion.estado_limpieza === 'sucia';
  const enLimpieza = habitacion.estado_limpieza === 'en_limpieza';
  const pendienteValidacion =
    habitacion.estado_limpieza === 'limpieza_pendiente_validacion';
  const fueraServicio = habitacion.estado_ocupacion === 'fuera_de_servicio';

  return (
    <>
      <Modal
        open={open && !recepcionOpen}
        onClose={onClose}
        title={`Habitación ${habitacion.numero}`}
        description={`Piso ${habitacion.piso} · ${TIPO_HABITACION_LABEL[habitacion.tipo]}`}
        size="md"
      >
        <div className="space-y-4">
          {/* Estado actual */}
          <div
            className={cn(
              'rounded-md p-4 border',
              esDisponible && 'bg-success/10 border-success/40',
              porLimpiar && 'bg-warning/10 border-warning/40',
              enLimpieza && 'bg-info/10 border-info/40',
              pendienteValidacion && 'bg-accent/10 border-accent/40',
              fueraServicio && 'bg-danger/10 border-danger/40'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {esDisponible && (
                <>
                  <BedDouble className="size-5 text-success" />
                  <p className="font-semibold text-success">Habitación disponible</p>
                </>
              )}
              {porLimpiar && (
                <>
                  <Sparkles className="size-5 text-warning" />
                  <p className="font-semibold text-warning">Pendiente de limpieza</p>
                </>
              )}
              {enLimpieza && (
                <>
                  <Sparkles className="size-5 text-info" />
                  <p className="font-semibold text-info">En limpieza</p>
                </>
              )}
              {pendienteValidacion && (
                <>
                  <AlertTriangle className="size-5 text-accent" />
                  <p className="font-semibold text-accent">Limpia, esperando validación</p>
                </>
              )}
              {fueraServicio && (
                <>
                  <AlertTriangle className="size-5 text-danger" />
                  <p className="font-semibold text-danger">Fuera de servicio</p>
                </>
              )}
            </div>
            <p className="text-sm text-text-secondary">
              {esDisponible && 'Lista para asignar a un huésped. Usa "Recepción Express" para alquilarla ahora mismo.'}
              {porLimpiar && 'Falta limpiarla antes de poder asignar a un huésped.'}
              {enLimpieza && 'El personal de limpieza está trabajando en esta habitación.'}
              {pendienteValidacion && 'Limpieza terminada. Ve a "Limpieza" para validarla y liberarla.'}
              {fueraServicio && 'En construcción o reparación. El admin puede reactivarla.'}
            </p>
          </div>

          {/* Información de la habitación */}
          <div className="bg-bg-elevated rounded-md p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-text-muted">Capacidad</p>
                <p className="text-text-primary font-medium">
                  {habitacion.capacidad} persona{habitacion.capacidad !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Precio base/noche</p>
                <p className="text-text-primary font-medium tabular-nums">
                  S/ {Number(habitacion.precio_base_noche).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Amenities */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-color">
              {habitacion.bano_privado && <Amenity icon={Bath} label="Baño privado" />}
              {habitacion.tiene_tv && <Amenity icon={Tv} label="TV" />}
              {habitacion.tiene_cable_tv && <Amenity icon={Tv} label="Cable" />}
              {habitacion.tiene_wifi && <Amenity icon={Wifi} label="WiFi" />}
            </div>
          </div>

          {/* Acciones según estado */}
          <div className="flex flex-col gap-2">
            {esDisponible && (
              <Button onClick={() => setRecepcionOpen(true)} className="w-full">
                <Zap className="size-4" />
                Recepción Express (cliente llega ahora)
              </Button>
            )}
            {onCobroRapido && (esDisponible || porLimpiar) && (
              <Button
                variant="outline"
                onClick={() => { onCobroRapido(habitacion); onClose(); }}
                className="w-full"
              >
                <Receipt className="size-4" />
                Solo registrar un cobro (sin reserva)
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      <RecepcionExpressModal
        open={recepcionOpen}
        habitacion={habitacion}
        onClose={() => setRecepcionOpen(false)}
        onSaved={() => {
          setRecepcionOpen(false);
          onChange?.();
          onClose();
        }}
      />
    </>
  );
}

function Amenity({ icon: Icon, label }: { icon: typeof Bath; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-bg-surface border border-border-color text-text-secondary">
      <Icon className="size-3" />
      {label}
    </span>
  );
}
  