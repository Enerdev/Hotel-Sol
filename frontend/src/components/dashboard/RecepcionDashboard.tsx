import {
  BedDouble,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Bookmark,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { StatCard } from './StatCard';
import { RoomsByFloor } from './RoomsByFloor';
import { RoomLegend } from './RoomTile';
import { CobroRapidoCard } from './CobroRapidoCard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Habitacion, DashboardStats } from '../../types';

export function RecepcionDashboard() {
  const stats = useApi<DashboardStats>(() => api.get('/habitaciones/dashboard'));
  const habs = useApi<Habitacion[]>(() => api.get('/habitaciones'));

  const haypendientesValidacion = (stats.data?.hab_pendiente_validacion ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Alerta destacada si hay limpiezas pendientes */}
      {haypendientesValidacion && (
        <div className="bg-accent/10 border border-accent/40 rounded-lg p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-accent shrink-0" />
            <div>
              <p className="text-text-primary font-medium">
                {stats.data?.hab_pendiente_validacion} habitación(es) lista(s) para validar
              </p>
              <p className="text-sm text-text-secondary">
                El personal de limpieza terminó. Revisa y valida para liberarlas.
              </p>
            </div>
          </div>
          <Link to="/limpieza">
            <Button>Ir a validar</Button>
          </Link>
        </div>
      )}

      {/* Stats operativos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Disponibles"
          value={stats.data?.hab_disponibles ?? 0}
          icon={CheckCircle2}
          tone="success"
          loading={stats.loading}
          hint="Listas para asignar"
        />
        <StatCard
          label="Ocupadas"
          value={stats.data?.hab_ocupadas ?? 0}
          icon={BedDouble}
          tone="info"
          loading={stats.loading}
        />
        <StatCard
          label="Reservadas"
          value={stats.data?.hab_reservadas ?? 0}
          icon={Bookmark}
          tone="accent"
          loading={stats.loading}
        />
        <StatCard
          label="Reservas activas"
          value={stats.data?.reservas_activas ?? 0}
          icon={Calendar}
          tone="default"
          loading={stats.loading}
        />
      </div>

      {/* ⭐ NUEVO: Card de Cobro Rápido */}
      <CobroRapidoCard />

      {/* Acciones rápidas */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link to="/reservas">
          <Card className="hover:border-accent/50 transition cursor-pointer h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-12 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
                <Calendar className="size-6 text-accent" />
              </div>
              <div>
                <p className="font-medium text-text-primary">Nueva reserva</p>
                <p className="text-sm text-text-secondary">
                  Registrar el ingreso de un huésped
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/clientes">
          <Card className="hover:border-accent/50 transition cursor-pointer h-full">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="size-12 rounded-lg bg-info/10 border border-info/30 flex items-center justify-center">
                <BedDouble className="size-6 text-info" />
              </div>
              <div>
                <p className="font-medium text-text-primary">Buscar cliente</p>
                <p className="text-sm text-text-secondary">
                  Por nombre o número de documento
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Mapa de habitaciones */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Estado de habitaciones</CardTitle>
              <p className="text-sm text-text-secondary mt-1">
                Click en una habitación para ver detalles
              </p>
            </div>
            <RoomLegend />
          </div>
        </CardHeader>
        <CardContent>
          {habs.loading && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {Array.from({ length: 25 }).map((_, i) => (
                <div
                  key={i}
                  className="h-22 rounded-lg bg-bg-elevated animate-pulse"
                />
              ))}
            </div>
          )}
          {habs.error && (
            <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
              Error: {habs.error}
            </div>
          )}
          {habs.data && habs.data.length > 0 && (
            <RoomsByFloor habitaciones={habs.data} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
