import { useState } from 'react';
import { RoomTile } from './RoomTile';
import { HabVaciaModal } from './HabVaciaModal';
import { HabOcupadaModal } from './HabOcupadaModal';
import { CobroRapidoModal } from '../cobros/CobroRapidoModal';
import type { Habitacion } from '../../types';

interface RoomsByFloorProps {
  habitaciones: Habitacion[];
  /** Refrescar el dashboard después de una acción */
  onChange?: () => void;
}

export function RoomsByFloor({ habitaciones, onChange }: RoomsByFloorProps) {
  const [habSeleccionada, setHabSeleccionada] = useState<Habitacion | null>(null);
  const [tipoModal, setTipoModal] = useState<'vacia' | 'ocupada' | null>(null);

  const [cobroOpen, setCobroOpen] = useState(false);
  const [cobroHabitacion, setCobroHabitacion] = useState<Habitacion | null>(null);

  const porPiso = habitaciones.reduce<Record<number, Habitacion[]>>((acc, h) => {
    if (!acc[h.piso]) acc[h.piso] = [];
    acc[h.piso].push(h);
    return acc;
  }, {});

  const handleClick = (h: Habitacion) => {
    if (h.estado_ocupacion === 'ocupada') {
      setHabSeleccionada(h);
      setTipoModal('ocupada');
    } else {
      setHabSeleccionada(h);
      setTipoModal('vacia');
    }
  };

  const cerrarModales = () => {
    setHabSeleccionada(null);
    setTipoModal(null);
  };

  const handleCobroRapido = (h: Habitacion) => {
    setCobroHabitacion(h);
    setCobroOpen(true);
  };

  return (
    <>
      <div className="space-y-5">
        {Object.entries(porPiso)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([piso, items]) => (
            <div key={piso}>
              <h3 className="text-xs font-semibold text-text-secondary uppercase mb-2 tracking-wide">
                Piso {piso}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {items
                  .sort((a, b) => a.numero.localeCompare(b.numero))
                  .map((h) => (
                    <RoomTile
                      key={h.id}
                      habitacion={h}
                      onClick={handleClick}
                    />
                  ))}
              </div>
            </div>
          ))}
      </div>

      <HabVaciaModal
        open={tipoModal === 'vacia'}
        habitacion={habSeleccionada}
        onClose={cerrarModales}
        onCobroRapido={handleCobroRapido}
        onChange={() => {
          cerrarModales();
          onChange?.();
        }}
      />

      <HabOcupadaModal
        open={tipoModal === 'ocupada'}
        habitacion={habSeleccionada}
        onClose={cerrarModales}
        onCheckedOut={() => {
          cerrarModales();
          onChange?.();
        }}
        onCobroRapido={(h) => handleCobroRapido(h)}
      />

      <CobroRapidoModal
        open={cobroOpen}
        habitaciones={habitaciones}
        habitacionInicial={cobroHabitacion}
        onClose={() => {
          setCobroOpen(false);
          setCobroHabitacion(null);
        }}
        onSaved={() => {
          setCobroOpen(false);
          setCobroHabitacion(null);
          onChange?.();
        }}
      />
    </>
  );
}
