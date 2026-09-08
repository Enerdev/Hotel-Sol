import { useState } from 'react';
import { toast } from 'sonner';
import {
  Calendar,
  User,
  BedDouble,
  CreditCard,
  LogOut,
  StickyNote,
  CheckCircle,
  XCircle,
  RotateCcw,
  Package,
} from 'lucide-react';
import { Modal } from '../dialogs/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { api, ApiError } from '../../services/api';
import {
  ESTADO_PAGO_LABEL,
  ESTADO_RESERVA_LABEL,
  METODO_PAGO_LABEL,
  TIPO_HABITACION_LABEL,
} from '../../types';
import { cn } from '../../lib/cn';
import type { Reserva, EstadoReserva, EstadoPago } from '../../types';

interface ReservaDetailModalProps {
  reserva: Reserva | null;
  onClose: () => void;
  onCheckOut: () => void;
}

export function ReservaDetailModal({ reserva, onClose, onCheckOut }: ReservaDetailModalProps) {
  const [busy, setBusy] = useState(false);

  // Cancelar
  const [mostrarCancelar, setMostrarCancelar] = useState(false);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [hacerDevolucion, setHacerDevolucion] = useState(false);
  const [montoDevolucion, setMontoDevolucion] = useState('');
  const [busyCancelar, setBusyCancelar] = useState(false);

  // Devolución (para reservas ya canceladas)
  const [mostrarDevolucion, setMostrarDevolucion] = useState(false);
  const [montoDevolucionExtra, setMontoDevolucionExtra] = useState('');
  const [motivoDevolucion, setMotivoDevolucion] = useState('');
  const [busyDevolucion, setBusyDevolucion] = useState(false);

  if (!reserva) return null;

  const puedeCheckOut = reserva.estado === 'activa' || reserva.estado === 'fecha_abierta';
  const puedeCancelar = reserva.estado === 'activa' || reserva.estado === 'fecha_abierta' || reserva.estado === 'no_show';
  const montoPagado = Number(reserva.monto_pagado);
  const puedeDevolucion = reserva.estado === 'cancelada' && montoPagado > 0 && reserva.estado_pago !== 'reembolsado';

  // Parsear artículos de las notas
  const articulosEntregados: string[] = [];
  let notasLimpias = reserva.notas ?? '';
  if (reserva.notas?.includes('Artículos:')) {
    const partes = reserva.notas.split(' | ');
    const partesLimpias: string[] = [];
    for (const parte of partes) {
      if (parte.startsWith('Artículos:')) {
        const items = parte.replace('Artículos:', '').trim().split(', ');
        articulosEntregados.push(...items);
      } else {
        partesLimpias.push(parte);
      }
    }
    notasLimpias = partesLimpias.join(' | ');
  }

  const handleCheckOut = async () => {
    if (!confirm(`¿Hacer check-out de la habitación ${reserva.habitacion_numero}? La habitación pasará a "por limpiar" automáticamente.`)) return;
    setBusy(true);
    try {
      await api.post(`/reservas/${reserva.id}/check-out`);
      toast.success(`Check-out realizado · Hab. ${reserva.habitacion_numero} pasó a limpieza`);
      onCheckOut();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleCancelar = async () => {
    if (motivoCancelacion.trim().length < 3) { toast.error('El motivo debe tener al menos 3 caracteres'); return; }
    if (hacerDevolucion && (!montoDevolucion || Number(montoDevolucion) <= 0)) { toast.error('Ingresa un monto de devolución válido'); return; }
    if (hacerDevolucion && Number(montoDevolucion) > montoPagado) { toast.error(`El monto no puede ser mayor a S/ ${montoPagado.toFixed(2)}`); return; }

    setBusyCancelar(true);
    try {
      await api.post(`/reservas/${reserva.id}/cancelar`, { motivo: motivoCancelacion.trim() });
      if (hacerDevolucion && Number(montoDevolucion) > 0) {
        await api.post(`/reservas/${reserva.id}/devolucion`, { monto: Number(montoDevolucion), motivo: motivoCancelacion.trim() });
        toast.success(`Reserva ${reserva.codigo} cancelada · Devolución de S/ ${Number(montoDevolucion).toFixed(2)} registrada`);
      } else {
        toast.success(`Reserva ${reserva.codigo} cancelada`);
      }
      onCheckOut();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al cancelar');
    } finally {
      setBusyCancelar(false);
    }
  };

  const handleDevolucion = async () => {
    if (!montoDevolucionExtra || Number(montoDevolucionExtra) <= 0) { toast.error('Ingresa un monto válido'); return; }
    if (Number(montoDevolucionExtra) > montoPagado) { toast.error(`El monto no puede ser mayor a S/ ${montoPagado.toFixed(2)}`); return; }
    setBusyDevolucion(true);
    try {
      await api.post(`/reservas/${reserva.id}/devolucion`, {
        monto: Number(montoDevolucionExtra),
        motivo: motivoDevolucion.trim() || undefined,
      });
      toast.success(`Devolución de S/ ${Number(montoDevolucionExtra).toFixed(2)} registrada en caja`);
      onCheckOut();
      onClose();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusyDevolucion(false);
    }
  };

  return (
    <Modal
      open={!!reserva}
      onClose={onClose}
      title={`Reserva ${reserva.codigo}`}
      description={`${reserva.cliente_nombre} · Hab. ${reserva.habitacion_numero}`}
      size="lg"
    >
      <div className="space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <BadgeEstado estado={reserva.estado} />
          <BadgePago estado={reserva.estado_pago} />
          {reserva.metodo_pago && (
            <span className="px-2 py-0.5 rounded-full bg-bg-elevated border border-border-color text-text-secondary text-xs">
              {METODO_PAGO_LABEL[reserva.metodo_pago]}
            </span>
          )}
        </div>

        {/* Cliente */}
        <Section title="Cliente" icon={User}>
          <Row label="Nombre" value={reserva.cliente_nombre} />
          <Row label="Documento" value={reserva.cliente_documento} />
        </Section>

        {/* Habitación */}
        <Section title="Habitación" icon={BedDouble}>
          <Row label="Número" value={`${reserva.habitacion_numero} · Piso ${reserva.habitacion_piso}`} />
          <Row label="Tipo" value={TIPO_HABITACION_LABEL[reserva.habitacion_tipo]} />
        </Section>

        {/* Fechas */}
        <Section title="Estancia" icon={Calendar}>
          <Row label="Check-in" value={formatDateTime(reserva.fecha_check_in)} />
          {reserva.fecha_check_out && <Row label="Check-out previsto" value={formatDateTime(reserva.fecha_check_out)} />}
          {reserva.fecha_check_out_real && <Row label="Check-out real" value={formatDateTime(reserva.fecha_check_out_real)} />}
          {reserva.noches !== null && reserva.noches > 0 && <Row label="Noches" value={String(reserva.noches)} />}
          {reserva.horas !== null && reserva.horas > 0 && <Row label="Horas" value={String(reserva.horas)} />}
        </Section>

        {/* Pago */}
        <Section title="Pago" icon={CreditCard}>
          <Row label="Total" value={`S/ ${Number(reserva.precio_total).toFixed(2)}`} highlight />
          <Row label="Pagado" value={`S/ ${montoPagado.toFixed(2)}`} />
          {Number(reserva.descuento_aplicado) > 0 && (
            <Row label="Descuento aplicado" value={`S/ ${Number(reserva.descuento_aplicado).toFixed(2)}`} />
          )}
        </Section>

        {/* Artículos entregados */}
        {articulosEntregados.length > 0 && (
          <Section title="Artículos entregados" icon={Package}>
            <div className="space-y-1">
              {articulosEntregados.map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="size-3.5 text-success shrink-0" />
                  <span className="text-sm text-text-primary">{item}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Notas */}
        {notasLimpias && (
          <Section title="Notas" icon={StickyNote}>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{notasLimpias}</p>
          </Section>
        )}

        {/* Panel devolución (reserva ya cancelada) */}
        {puedeDevolucion && (
          <div className="border border-info/40 rounded-md overflow-hidden">
            <button type="button" onClick={() => setMostrarDevolucion(!mostrarDevolucion)}
              className="w-full flex items-center justify-between px-4 py-3 bg-info/10 hover:bg-info/15 transition text-left"
            >
              <div className="flex items-center gap-2">
                <RotateCcw className="size-4 text-info" />
                <span className="text-sm font-semibold text-info">Registrar devolución</span>
              </div>
              <span className="text-xs text-info">Pagado: S/ {montoPagado.toFixed(2)}</span>
            </button>
            {mostrarDevolucion && (
              <div className="p-4 space-y-3 bg-bg-elevated border-t border-info/30">
                <p className="text-xs text-text-secondary">Registra el monto a devolver al cliente. Se descontará de la caja.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-text-secondary block mb-1">Monto a devolver S/ *</label>
                    <Input type="number" min={0.01} max={montoPagado} step="0.01"
                      value={montoDevolucionExtra} onChange={e => setMontoDevolucionExtra(e.target.value)}
                      placeholder={`Máx. S/ ${montoPagado.toFixed(2)}`} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-secondary block mb-1">Motivo (opcional)</label>
                    <Input value={motivoDevolucion} onChange={e => setMotivoDevolucion(e.target.value)}
                      placeholder="Ej: Cliente solicitó reembolso" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMostrarDevolucion(false)} className="flex-1">Cancelar</Button>
                  <Button size="sm" onClick={handleDevolucion} isLoading={busyDevolucion} className="flex-1">
                    <RotateCcw className="size-4" />Confirmar devolución
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Panel cancelar reserva */}
        {puedeCancelar && (
          <div className="border border-danger/40 rounded-md overflow-hidden">
            <button type="button" onClick={() => setMostrarCancelar(!mostrarCancelar)}
              className="w-full flex items-center justify-between px-4 py-3 bg-danger/10 hover:bg-danger/15 transition text-left"
            >
              <div className="flex items-center gap-2">
                <XCircle className="size-4 text-danger" />
                <span className="text-sm font-semibold text-danger">Cancelar reserva</span>
              </div>
              <span className="text-xs text-danger">No se puede deshacer</span>
            </button>
            {mostrarCancelar && (
              <div className="p-4 space-y-3 bg-bg-elevated border-t border-danger/30">
                <p className="text-xs text-text-secondary">La reserva {reserva.codigo} será cancelada y la habitación quedará disponible.</p>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1">Motivo de cancelación *</label>
                  <textarea value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)}
                    placeholder="Ej: Cliente no se presentó, solicitó cancelación, etc."
                    rows={3}
                    className="w-full px-3 py-2 rounded-md bg-bg-elevated border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:border-danger focus:ring-1 focus:ring-danger resize-none text-sm"
                  />
                </div>
                {montoPagado > 0 && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={hacerDevolucion}
                        onChange={e => { setHacerDevolucion(e.target.checked); if (e.target.checked) setMontoDevolucion(String(montoPagado)); }}
                        className="accent-[var(--color-info)]" />
                      <span className="text-sm text-text-primary">
                        Realizar devolución al cliente
                        <span className="text-text-muted ml-1">(pagó S/ {montoPagado.toFixed(2)})</span>
                      </span>
                    </label>
                    {hacerDevolucion && (
                      <div>
                        <label className="text-sm font-medium text-text-secondary block mb-1">Monto a devolver S/ *</label>
                        <Input type="number" min={0.01} max={montoPagado} step="0.01"
                          value={montoDevolucion} onChange={e => setMontoDevolucion(e.target.value)}
                          placeholder={`Máx. S/ ${montoPagado.toFixed(2)}`} />
                        <p className="text-xs text-text-muted mt-1">Se descontará automáticamente de la caja</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    onClick={() => { setMostrarCancelar(false); setMotivoCancelacion(''); setHacerDevolucion(false); setMontoDevolucion(''); }}
                    disabled={busyCancelar} className="flex-1">
                    Cancelar
                  </Button>
                  <Button variant="danger" size="sm" onClick={handleCancelar} isLoading={busyCancelar} className="flex-1">
                    <XCircle className="size-4" />Confirmar cancelación
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border-color">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
          {puedeCheckOut && (
            <Button onClick={handleCheckOut} isLoading={busy}>
              <LogOut className="size-4" />Hacer check-out
            </Button>
          )}
          {reserva.estado === 'check_out' && (
            <div className="flex items-center gap-1.5 text-success text-sm font-medium px-3">
              <CheckCircle className="size-4" />Reserva cerrada
            </div>
          )}
          {reserva.estado === 'cancelada' && (
            <div className="flex items-center gap-1.5 text-danger text-sm font-medium px-3">
              <XCircle className="size-4" />Reserva cancelada
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Calendar; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-4 text-accent" />
        <h3 className="text-xs font-semibold text-accent uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-1.5 pl-6">{children}</div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm gap-2">
      <span className="text-text-secondary">{label}</span>
      <span className={cn('text-right', highlight ? 'text-accent font-semibold' : 'text-text-primary')}>{value}</span>
    </div>
  );
}

const ESTADO_RESERVA_COLOR: Record<EstadoReserva, string> = {
  activa: 'bg-info/15 border-info/40 text-info',
  check_out: 'bg-success/15 border-success/40 text-success',
  cancelada: 'bg-danger/15 border-danger/40 text-danger',
  fecha_abierta: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
  no_show: 'bg-bg-elevated border-border-color text-text-secondary',
};

function BadgeEstado({ estado }: { estado: EstadoReserva }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', ESTADO_RESERVA_COLOR[estado])}>
      {ESTADO_RESERVA_LABEL[estado]}
    </span>
  );
}

const ESTADO_PAGO_COLOR: Record<EstadoPago, string> = {
  pagado: 'bg-success/15 border-success/40 text-success',
  pendiente: 'bg-warning/15 border-warning/40 text-warning',
  parcial: 'bg-accent/15 border-accent/40 text-accent',
  reembolsado: 'bg-bg-elevated border-border-color text-text-secondary',
};

function BadgePago({ estado }: { estado: EstadoPago }) {
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', ESTADO_PAGO_COLOR[estado])}>
      {ESTADO_PAGO_LABEL[estado]}
    </span>
  );
}

function formatDateTime(s: string): string {
  return new Date(s).toLocaleString('es-PE', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
