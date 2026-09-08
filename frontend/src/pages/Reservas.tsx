import { useEffect, useState, useMemo } from 'react';
import { Plus, Calendar, Search, Loader2 } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Header } from '../components/layout/Header';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { NuevaReservaModal } from '../components/reservas/NuevaReservaModal';
import { ReservaDetailModal } from '../components/reservas/ReservaDetailModal';
import {
  ESTADO_PAGO_LABEL,
  ESTADO_RESERVA_LABEL,
  TIPO_HABITACION_LABEL,
} from '../types';
import { cn } from '../lib/cn';
import type { Reserva, EstadoReserva, EstadoPago } from '../types';

type FiltroEstado = 'todas' | 'activa' | 'fecha_abierta' | 'check_out' | 'cancelada';

export default function ReservasPage() {
  const { data, loading, error, refetch } = useApi<Reserva[]>(() =>
    api.get('/reservas')
  );
  const { on } = useSocket();

  const [filtro, setFiltro] = useState<FiltroEstado>('activa');
  const [busqueda, setBusqueda] = useState('');
  const [creando, setCreando] = useState(false);
  const [seleccionada, setSeleccionada] = useState<Reserva | null>(null);

  // Tiempo real: nuevas reservas
  useEffect(() => {
    const off = on('reserva:creada', () => refetch());
    return () => off();
  }, [on, refetch]);

  // Filtrado
  const reservasFiltradas = useMemo(() => {
    if (!data) return [];
    return data.filter((r) => {
      if (filtro !== 'todas' && r.estado !== filtro) return false;
      if (busqueda) {
        const b = busqueda.trim().toLowerCase();
        const match =
          r.codigo.toLowerCase().includes(b) ||
          r.cliente_nombre.toLowerCase().includes(b) ||
          r.habitacion_numero.includes(b) ||
          r.cliente_documento.toLowerCase().includes(b);
        if (!match) return false;
      }
      return true;
    });
  }, [data, filtro, busqueda]);

  return (
    <>
      <Header
        title="Reservas"
        description={`${data?.length ?? 0} reservas en total`}
        actions={
          <Button onClick={() => setCreando(true)}>
            <Plus className="size-4" />
            Nueva reserva
          </Button>
        }
      />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <FiltroChip active={filtro === 'todas'} onClick={() => setFiltro('todas')}>
              Todas
            </FiltroChip>
            <FiltroChip active={filtro === 'activa'} onClick={() => setFiltro('activa')}>
              Activas
            </FiltroChip>
            <FiltroChip
              active={filtro === 'fecha_abierta'}
              onClick={() => setFiltro('fecha_abierta')}
            >
              Fecha abierta
            </FiltroChip>
            <FiltroChip
              active={filtro === 'check_out'}
              onClick={() => setFiltro('check_out')}
            >
              Check-out
            </FiltroChip>
            <FiltroChip
              active={filtro === 'cancelada'}
              onClick={() => setFiltro('cancelada')}
            >
              Canceladas
            </FiltroChip>
          </div>
          <div className="relative flex-1 min-w-[260px]">
            <Search className="size-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, cliente, habitación..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 text-accent animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
            Error: {error}
          </div>
        )}

        {/* Vacío */}
        {!loading && reservasFiltradas.length === 0 && !error && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="size-16 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-3">
                <Calendar className="size-8 text-text-muted" />
              </div>
              <p className="text-text-primary font-medium">
                {data && data.length === 0
                  ? 'No hay reservas todavía'
                  : 'No se encontraron reservas'}
              </p>
              {data && data.length === 0 && (
                <Button onClick={() => setCreando(true)} className="mt-4">
                  <Plus className="size-4" />
                  Crear primera reserva
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista */}
        {!loading && reservasFiltradas.length > 0 && (
          <div className="space-y-2">
            {reservasFiltradas.map((r) => (
              <ReservaListItem
                key={r.id}
                reserva={r}
                onClick={() => setSeleccionada(r)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      <NuevaReservaModal
        open={creando}
        onClose={() => setCreando(false)}
        onCreated={() => {
          setCreando(false);
          refetch();
        }}
      />
      <ReservaDetailModal
        reserva={seleccionada}
        onClose={() => setSeleccionada(null)}
        onCheckOut={() => {
          setSeleccionada(null);
          refetch();
        }}
      />
    </>
  );
}

// ============================================================================
// FiltroChip
// ============================================================================

function FiltroChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-md text-sm font-medium border transition',
        active
          ? 'bg-accent/15 text-accent border-accent/50'
          : 'bg-bg-elevated text-text-secondary border-border-color hover:text-text-primary'
      )}
    >
      {children}
    </button>
  );
}

// ============================================================================
// ReservaListItem
// ============================================================================

const ESTADO_RESERVA_COLOR: Record<EstadoReserva, string> = {
  activa: 'bg-info/15 text-info',
  check_out: 'bg-success/15 text-success',
  cancelada: 'bg-danger/15 text-danger',
  fecha_abierta: 'bg-purple-500/15 text-purple-400',
  no_show: 'bg-bg-elevated text-text-secondary',
};

const ESTADO_PAGO_COLOR: Record<EstadoPago, string> = {
  pagado: 'text-success',
  pendiente: 'text-warning',
  parcial: 'text-accent',
  reembolsado: 'text-text-muted',
};

function ReservaListItem({
  reserva,
  onClick,
}: {
  reserva: Reserva;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-bg-surface border border-border-color rounded-lg p-4 hover:border-accent/50 transition-all"
    >
      <div className="flex items-center gap-4 flex-wrap">
        {/* Habitación */}
        <div className="size-12 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
          <span className="text-lg font-bold text-accent">
            {reserva.habitacion_numero}
          </span>
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-text-primary">{reserva.cliente_nombre}</p>
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                ESTADO_RESERVA_COLOR[reserva.estado]
              )}
            >
              {ESTADO_RESERVA_LABEL[reserva.estado]}
            </span>
          </div>
          <div className="text-xs text-text-secondary mt-1 flex items-center gap-3 flex-wrap">
            <span className="font-mono">{reserva.codigo}</span>
            <span>· {TIPO_HABITACION_LABEL[reserva.habitacion_tipo]}</span>
            <span>· {formatShortDate(reserva.fecha_check_in)}</span>
          </div>
        </div>

        {/* Pago */}
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-text-primary tabular-nums">
            S/ {Number(reserva.precio_total).toFixed(2)}
          </p>
          <p className={cn('text-xs', ESTADO_PAGO_COLOR[reserva.estado_pago])}>
            {ESTADO_PAGO_LABEL[reserva.estado_pago]}
          </p>
        </div>
      </div>
    </button>
  );
}

function formatShortDate(s: string): string {
  return new Date(s).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
  });
}
