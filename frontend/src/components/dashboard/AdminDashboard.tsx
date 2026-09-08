import { useEffect, useState } from 'react';
import {
  BedDouble,
  CheckCircle2,
  Calendar,
  Sparkles,
  Users,
  AlertTriangle,
  Bookmark,
  Wrench,
  Clock,
} from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { StatCard } from './StatCard';
import { RoomsByFloor } from './RoomsByFloor';
import { RoomLegend } from './RoomTile';
import { CobroRapidoCard } from './CobroRapidoCard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import type { Habitacion, DashboardStats } from '../../types';
import { useNavigate } from 'react-router-dom';

interface ReservaPasada {
  id: number;
  codigo: string;
  horas: number;
  fecha_check_out: string;
  habitacion_numero: string;
  habitacion_piso: number;
  habitacion_tipo: string;
  habitacion_id: number;
  cliente_nombre: string;
  minutos_pasados: number;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const stats = useApi<DashboardStats>(() => api.get('/habitaciones/dashboard'));
  const habs = useApi<Habitacion[]>(() => api.get('/habitaciones'));

  const [pasadasDeHora, setPasadasDeHora] = useState<ReservaPasada[]>([]);

  // Cargar reservas pasadas de hora cada 60 segundos
  useEffect(() => {
    function cargar() {
      api.get<ReservaPasada[]>('/reservas/pasadas-de-hora')
        .then(data => setPasadasDeHora(data))
        .catch(() => {});
    }
    cargar();
    const interval = setInterval(cargar, 60000);
    return () => clearInterval(interval);
  }, []);

  function formatMinutos(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  return (
    <div className="space-y-6">
      {/* ── Banner alertas: clientes pasados de hora ── */}
      {pasadasDeHora.length > 0 && (
        <div className="bg-danger/10 border-2 border-danger/40 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-danger shrink-0" />
            <div>
              <p className="text-text-primary font-semibold">
                {pasadasDeHora.length} habitación{pasadasDeHora.length !== 1 ? 'es' : ''} con cliente{pasadasDeHora.length !== 1 ? 's' : ''} pasado{pasadasDeHora.length !== 1 ? 's' : ''} de hora
              </p>
              <p className="text-xs text-text-secondary">Requieren atención — extender o hacer check-out</p>
            </div>
          </div>
          <div className="space-y-2">
            {pasadasDeHora.map(r => (
              <div key={r.id}
                className="flex items-center justify-between bg-bg-elevated rounded-md px-3 py-2 cursor-pointer hover:bg-danger/10 transition"
                onClick={() => {
                  const hab = habs.data?.find(h => h.id === r.habitacion_id);
                  if (hab) {
                    // Scroll al mapa y resaltar
                    document.getElementById(`hab-tile-${r.habitacion_id}`)?.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-md bg-danger/15 flex items-center justify-center">
                    <span className="text-sm font-bold text-danger">{r.habitacion_numero}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{r.cliente_nombre}</p>
                    <p className="text-xs text-text-secondary">
                      Piso {r.habitacion_piso} · {r.horas}h contratada{r.horas !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-danger tabular-nums">
                    +{formatMinutos(Number(r.minutos_pasados))}
                  </p>
                  <p className="text-xs text-text-muted">pasado del horario</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards de stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          label="Disponibles"
          onClick={() => navigate('/habitaciones?estado=disponible')}
          value={stats.data?.hab_disponibles ?? 0}
          icon={CheckCircle2}
          tone="success"
          loading={stats.loading}
        />
        <StatCard
          label="Ocupadas"
          onClick={() => navigate('/habitaciones?estado=ocupada')}
          value={stats.data?.hab_ocupadas ?? 0}
          icon={BedDouble}
          tone="info"
          loading={stats.loading}
        />
        <StatCard
          label="Reservadas"
          onClick={() => navigate('/reservas?estado=activa')}
          value={stats.data?.hab_reservadas ?? 0}
          icon={Bookmark}
          tone="accent"
          loading={stats.loading}
        />
        <StatCard
          label="Por limpiar"
          onClick={() => navigate('/limpieza')}
          value={stats.data?.hab_por_limpiar ?? 0}
          icon={Sparkles}
          tone="warning"
          loading={stats.loading}
        />
        <StatCard
          label="En limpieza"
          onClick={() => navigate('/limpieza')}
          value={stats.data?.hab_en_limpieza ?? 0}
          icon={Wrench}
          tone="info"
          loading={stats.loading}
        />
        <StatCard
          label="Por validar"
          onClick={() => navigate('/limpieza')}
          value={stats.data?.hab_pendiente_validacion ?? 0}
          icon={AlertTriangle}
          tone="warning"
          loading={stats.loading}
          hint="Limpieza terminada, esperando validación"
        />
        <StatCard
          label="Reservas activas"
          onClick={() => navigate('/reservas')}
          value={stats.data?.reservas_activas ?? 0}
          icon={Calendar}
          tone="accent"
          loading={stats.loading}
        />
        <StatCard
          label="Clientes frecuentes"
          onClick={() => navigate('/clientes')}
          value={stats.data?.clientes_frecuentes ?? 0}
          icon={Users}
          tone="default"
          loading={stats.loading}
        />
      </div>

      {/* Card de Cobro Rápido */}
      <CobroRapidoCard />

      {/* Mapa de habitaciones */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Mapa de habitaciones</CardTitle>
              <p className="text-sm text-text-secondary mt-1">
                Vista general de las {habs.data?.length ?? 25} habitaciones del hotel
              </p>
            </div>
            <RoomLegend />
          </div>
        </CardHeader>
        <CardContent>
          {habs.loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 25 }).map((_, i) => (
                <div key={i} className="h-22 rounded-lg bg-bg-elevated animate-pulse" />
              ))}
            </div>
          )}
          {habs.error && (
            <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
              Error cargando habitaciones: {habs.error}
            </div>
          )}
          {habs.data && habs.data.length > 0 && (
            <RoomsByFloor
              habitaciones={habs.data}
              onChange={() => {
                habs.refetch();
                stats.refetch();
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
