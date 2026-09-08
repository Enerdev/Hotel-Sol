import { useState } from 'react';
import { Receipt, Plus, TrendingUp, Smartphone } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { CobroRapidoModal } from '../cobros/CobroRapidoModal';
import type { Habitacion, CobroResumenHoy } from '../../types';

const METODO_LABEL_CORTO: Record<string, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transf.',
  online: 'Online',
};

export function CobroRapidoCard() {
  const [open, setOpen] = useState(false);
  const habitaciones = useApi<Habitacion[]>(() => api.get('/habitaciones'));
  const resumen = useApi<CobroResumenHoy>(() => api.get('/cobros/resumen/hoy'));

  // Refrescar al cerrar el modal
  const handleSaved = () => {
    setOpen(false);
    resumen.refetch();
  };

  const total = resumen.data?.total.total_monto ?? 0;
  const numCobros = resumen.data?.total.total_cobros ?? 0;

  return (
    <>
      <Card className="border-accent/30 bg-gradient-to-br from-accent/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-xl bg-accent/15 border border-accent/40 flex items-center justify-center">
                <Receipt className="size-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Cobro rápido</h3>
                <p className="text-xs text-text-secondary">
                  Productos, servicios o pagos directos
                </p>
              </div>
            </div>
            <Button onClick={() => setOpen(true)} size="md">
              <Plus className="size-4" />
              Nuevo cobro
            </Button>
          </div>

          {/* Resumen de hoy */}
          <div className="border-t border-border-color pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-text-muted uppercase tracking-wide">
                Hoy
              </p>
              <TrendingUp className="size-4 text-accent" />
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <p className="text-2xl font-semibold text-accent tabular-nums">
                S/ {total.toFixed(2)}
              </p>
              <p className="text-xs text-text-secondary">
                · {numCobros} cobro{numCobros !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Por método de pago */}
            {resumen.data && resumen.data.por_metodo.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {resumen.data.por_metodo.map((m) => (
                  <div
                    key={m.metodo_pago}
                    className="bg-bg-elevated rounded-md px-3 py-2 flex items-center justify-between"
                  >
                    <span className="text-xs text-text-secondary flex items-center gap-1">
                      {(m.metodo_pago === 'yape' || m.metodo_pago === 'plin') && (
                        <Smartphone className="size-3 text-info" />
                      )}
                      {METODO_LABEL_CORTO[m.metodo_pago] ?? m.metodo_pago}
                    </span>
                    <span className="text-sm text-text-primary tabular-nums font-medium">
                      S/ {Number(m.total).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {numCobros === 0 && (
              <p className="text-xs text-text-muted">
                Aún no hay cobros directos hoy
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <CobroRapidoModal
        open={open}
        habitaciones={habitaciones.data ?? []}
        onClose={() => setOpen(false)}
        onSaved={handleSaved}
      />
    </>
  );
}
