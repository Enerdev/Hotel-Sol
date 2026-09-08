import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import {
  BedDouble,
  Plus,
  Pencil,
  PowerOff,
  Power,
  Loader2,
  Bath,
  Tv,
  Wifi,
  Flame,
  Wind,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { HabitacionFormModal } from '../components/habitaciones/HabitacionFormModal';
import { HabOcupadaModal } from '../components/dashboard/HabOcupadaModal';
import { HabVaciaModal } from '../components/dashboard/HabVaciaModal';
import { CobroRapidoModal } from '../components/cobros/CobroRapidoModal';
import { TIPO_HABITACION_LABEL } from '../types';
import { cn } from '../lib/cn';
import type { Habitacion } from '../types';

type FiltroEstado = 'todas' | 'disponible' | 'ocupada' | 'reservada' | 'por_limpiar' | 'en_limpieza';

const FILTROS: { value: FiltroEstado; label: string; color: string }[] = [
  { value: 'todas', label: 'Todas', color: 'bg-bg-elevated border-border-color text-text-secondary' },
  { value: 'disponible', label: 'Disponibles', color: 'bg-success/10 border-success/40 text-success' },
  { value: 'ocupada', label: 'Ocupadas', color: 'bg-info/10 border-info/40 text-info' },
  { value: 'reservada', label: 'Reservadas', color: 'bg-purple-500/10 border-purple-500/40 text-purple-400' },
  { value: 'por_limpiar', label: 'Por limpiar', color: 'bg-warning/10 border-warning/40 text-warning' },
  { value: 'en_limpieza', label: 'En limpieza', color: 'bg-accent/10 border-accent/40 text-accent' },
];

export default function HabitacionesPage() {
  const { user } = useAuth();
  const esAdmin = user?.rol === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();

  const habs = useApi<Habitacion[]>(() => api.get('/habitaciones'));

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Habitacion | null>(null);
  const [mostrarInactivas, setMostrarInactivas] = useState(false);

  // Modales de detalle
  const [habSeleccionada, setHabSeleccionada] = useState<Habitacion | null>(null);
  const [tipoModal, setTipoModal] = useState<'vacia' | 'ocupada' | null>(null);
  const [cobroOpen, setCobroOpen] = useState(false);
  const [cobroHab, setCobroHab] = useState<Habitacion | null>(null);

  // Filtro desde URL
  const estadoUrl = searchParams.get('estado') as FiltroEstado | null;
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>(estadoUrl ?? 'todas');

  useEffect(() => {
    if (estadoUrl && estadoUrl !== filtroEstado) setFiltroEstado(estadoUrl);
  }, [estadoUrl]);

  function cambiarFiltro(f: FiltroEstado) {
    setFiltroEstado(f);
    if (f === 'todas') searchParams.delete('estado');
    else searchParams.set('estado', f);
    setSearchParams(searchParams);
  }

  function handleClickHab(h: Habitacion) {
    setHabSeleccionada(h);
    if (h.estado_ocupacion === 'ocupada') setTipoModal('ocupada');
    else setTipoModal('vacia');
  }

  function cerrarModales() {
    setHabSeleccionada(null);
    setTipoModal(null);
  }

  async function handleDesactivar(h: Habitacion) {
    if (!confirm(`¿Desactivar la habitación ${h.numero}?\n\nQuedará marcada como "fuera de servicio".`)) return;
    try {
      await api.patch(`/habitaciones/${h.id}/desactivar`);
      toast.success(`Habitación ${h.numero} desactivada`);
      habs.refetch();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Error'); }
  }

  async function handleActivar(h: Habitacion) {
    try {
      await api.patch(`/habitaciones/${h.id}/activar`);
      toast.success(`Habitación ${h.numero} reactivada`);
      habs.refetch();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Error'); }
  }

  const habsActivas = (habs.data ?? []).filter(h => mostrarInactivas ? true : !!h.activo);

  const habsFiltradas = habsActivas.filter(h => {
    if (filtroEstado === 'todas') return true;
    if (filtroEstado === 'por_limpiar') return h.estado_ocupacion === 'disponible' && h.estado_limpieza === 'sucia';
    if (filtroEstado === 'en_limpieza') return h.estado_limpieza === 'en_limpieza';
    return h.estado_ocupacion === filtroEstado;
  });

  const conteos: Record<FiltroEstado, number> = {
    todas: habsActivas.length,
    disponible: habsActivas.filter(h => h.estado_ocupacion === 'disponible' && h.estado_limpieza === 'limpia').length,
    ocupada: habsActivas.filter(h => h.estado_ocupacion === 'ocupada').length,
    reservada: habsActivas.filter(h => h.estado_ocupacion === 'reservada').length,
    por_limpiar: habsActivas.filter(h => h.estado_ocupacion === 'disponible' && h.estado_limpieza === 'sucia').length,
    en_limpieza: habsActivas.filter(h => h.estado_limpieza === 'en_limpieza').length,
  };

  const porPiso = habsFiltradas.reduce<Record<number, Habitacion[]>>((acc, h) => {
    if (!acc[h.piso]) acc[h.piso] = [];
    acc[h.piso].push(h);
    return acc;
  }, {});

  return (
    <>
      <Header
        title="Habitaciones"
        description={`${habsFiltradas.length} habitación${habsFiltradas.length !== 1 ? 'es' : ''} ${filtroEstado !== 'todas' ? `· ${FILTROS.find(f => f.value === filtroEstado)?.label}` : 'activas'}`}
        actions={esAdmin && (
          <Button onClick={() => setCreando(true)}>
            <Plus className="size-4" />Nueva habitación
          </Button>
        )}
      />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(f => (
            <button key={f.value} type="button" onClick={() => cambiarFiltro(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium border transition flex items-center gap-1.5',
                filtroEstado === f.value ? f.color : 'bg-bg-elevated border-border-color text-text-muted hover:text-text-primary'
              )}
            >
              {f.label}
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full', filtroEstado === f.value ? 'bg-white/20' : 'bg-bg-surface')}>
                {conteos[f.value]}
              </span>
            </button>
          ))}
        </div>

        {esAdmin && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id="mostrar-inactivas" checked={mostrarInactivas}
              onChange={e => setMostrarInactivas(e.target.checked)}
              className="size-4 rounded border-border-color bg-bg-elevated text-accent focus:ring-1 focus:ring-accent"
            />
            <label htmlFor="mostrar-inactivas" className="text-sm text-text-secondary cursor-pointer">
              Mostrar habitaciones inactivas/fuera de servicio
            </label>
          </div>
        )}

        {habs.loading && <div className="flex justify-center py-12"><Loader2 className="size-6 text-accent animate-spin" /></div>}
        {habs.error && <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">Error: {habs.error}</div>}

        {!habs.loading && !habs.error && habsFiltradas.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <BedDouble className="size-12 text-text-muted mb-3" />
            <p className="text-text-secondary">No hay habitaciones con este filtro</p>
            <button type="button" onClick={() => cambiarFiltro('todas')} className="text-accent text-sm mt-2 hover:underline">Ver todas</button>
          </div>
        )}

        {!habs.loading && !habs.error &&
          Object.entries(porPiso).sort(([a], [b]) => Number(a) - Number(b)).map(([piso, items]) => (
            <div key={piso}>
              <h2 className="text-sm font-semibold text-text-primary mb-3">
                Piso {piso} · {items.length} habitación{items.length !== 1 ? 'es' : ''}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map(h => (
                  <HabCard key={h.id} hab={h} esAdmin={esAdmin}
                    onClick={() => handleClickHab(h)}
                    onEdit={(e) => { e.stopPropagation(); setEditando(h); }}
                    onDesactivar={(e) => { e.stopPropagation(); handleDesactivar(h); }}
                    onActivar={(e) => { e.stopPropagation(); handleActivar(h); }}
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Modales edición */}
      <HabitacionFormModal
        open={creando || !!editando}
        habitacion={editando}
        onClose={() => { setCreando(false); setEditando(null); }}
        onSaved={() => { setCreando(false); setEditando(null); habs.refetch(); }}
      />

      {/* Modales detalle */}
      <HabVaciaModal
        open={tipoModal === 'vacia'}
        habitacion={habSeleccionada}
        onClose={cerrarModales}
        onCobroRapido={(h) => { setCobroHab(h); setCobroOpen(true); }}
        onChange={() => { cerrarModales(); habs.refetch(); }}
      />
      <HabOcupadaModal
        open={tipoModal === 'ocupada'}
        habitacion={habSeleccionada}
        onClose={cerrarModales}
        onCheckedOut={() => { cerrarModales(); habs.refetch(); }}
        onCobroRapido={(h) => { setCobroHab(h); setCobroOpen(true); }}
      />
      <CobroRapidoModal
        open={cobroOpen}
        habitaciones={habs.data ?? []}
        habitacionInicial={cobroHab}
        onClose={() => { setCobroOpen(false); setCobroHab(null); }}
        onSaved={() => { setCobroOpen(false); setCobroHab(null); habs.refetch(); }}
      />
    </>
  );
}

function HabCard({ hab, esAdmin, onClick, onEdit, onDesactivar, onActivar }: {
  hab: Habitacion; esAdmin: boolean;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDesactivar: (e: React.MouseEvent) => void;
  onActivar: (e: React.MouseEvent) => void;
}) {
  const activa = !!hab.activo;
  const fueraServicio = hab.estado_ocupacion === 'fuera_de_servicio';

  const estadoColor = {
    disponible_limpia: 'border-success/40',
    disponible_sucia: 'border-warning/40',
    ocupada: 'border-info/40',
    reservada: 'border-purple-500/40',
    fuera_de_servicio: 'border-danger/40',
  };

  const getEstadoKey = () => {
    if (hab.estado_ocupacion === 'disponible' && hab.estado_limpieza === 'limpia') return 'disponible_limpia';
    if (hab.estado_ocupacion === 'disponible') return 'disponible_sucia';
    return hab.estado_ocupacion as keyof typeof estadoColor;
  };

  return (
    <Card
      className={cn(
        'transition cursor-pointer hover:shadow-md hover:scale-[1.02]',
        !activa && 'opacity-60',
        estadoColor[getEstadoKey()] || 'border-border-color'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <BedDouble className="size-5 text-accent" />
              <p className="text-lg font-semibold text-text-primary">Hab. {hab.numero}</p>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">{TIPO_HABITACION_LABEL[hab.tipo]} · cap. {hab.capacidad}</p>
          </div>
          {esAdmin && (
            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="sm" onClick={onEdit} title="Editar"><Pencil className="size-3.5" /></Button>
              {activa ? (
                <Button variant="ghost" size="sm" onClick={onDesactivar} className="text-danger hover:bg-danger/10" title="Desactivar">
                  <PowerOff className="size-3.5" />
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={onActivar} className="text-success hover:bg-success/10" title="Reactivar">
                  <Power className="size-3.5" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Amenities */}
        <div className="flex flex-wrap gap-1.5">
          {hab.bano_privado && <Amenity icon={Bath} label="Baño privado" />}
          {hab.bano_con_jacuzzi && <Amenity icon={Bath} label="Jacuzzi" />}
          {hab.tiene_tv && <Amenity icon={Tv} label="TV" />}
          {hab.tiene_cable_tv && <Amenity icon={Tv} label="Cable" />}
          {hab.tiene_wifi && <Amenity icon={Wifi} label="WiFi" />}
          {hab.tiene_calefaccion && <Amenity icon={Flame} label="Calefacción" />}
          {hab.tiene_balcon && <Amenity icon={Wind} label="Balcón" />}
        </div>

        {/* Camas */}
        {hab.camas && hab.camas.length > 0 && (
          <div className="text-xs text-text-secondary">
            {hab.camas.map(c => `${c.cantidad}× ${c.tipo_cama.replace(/_/g, ' ')}`).join(', ')}
          </div>
        )}

        {/* Estado */}
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full border font-medium',
            hab.estado_ocupacion === 'disponible' && hab.estado_limpieza === 'limpia' && 'bg-success/10 border-success/40 text-success',
            hab.estado_ocupacion === 'disponible' && hab.estado_limpieza === 'sucia' && 'bg-warning/10 border-warning/40 text-warning',
            hab.estado_ocupacion === 'disponible' && hab.estado_limpieza === 'en_limpieza' && 'bg-accent/10 border-accent/40 text-accent',
            hab.estado_ocupacion === 'ocupada' && 'bg-info/10 border-info/40 text-info',
            hab.estado_ocupacion === 'reservada' && 'bg-purple-500/10 border-purple-500/40 text-purple-400',
            hab.estado_ocupacion === 'fuera_de_servicio' && 'bg-danger/10 border-danger/40 text-danger',
          )}>
            {hab.estado_ocupacion === 'disponible' && hab.estado_limpieza === 'limpia' && '✓ Disponible'}
            {hab.estado_ocupacion === 'disponible' && hab.estado_limpieza === 'sucia' && '⚡ Por limpiar'}
            {hab.estado_ocupacion === 'disponible' && hab.estado_limpieza === 'en_limpieza' && '🧹 En limpieza'}
            {hab.estado_ocupacion === 'ocupada' && '🔵 Ocupada'}
            {hab.estado_ocupacion === 'reservada' && '🟣 Reservada'}
            {hab.estado_ocupacion === 'fuera_de_servicio' && '⛔ Fuera de servicio'}
            {!activa && ' · Inactiva'}
          </span>
          <span className="text-xs text-text-muted">Click para detalles →</span>
        </div>

        {/* Precio */}
        <div className="pt-2 border-t border-border-color flex justify-between items-center">
          <span className="text-xs text-text-muted">Precio base/noche</span>
          <span className="text-sm font-semibold text-accent tabular-nums">S/ {Number(hab.precio_base_noche).toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Amenity({ icon: Icon, label }: { icon: typeof Bath; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-bg-elevated border border-border-color text-text-secondary">
      <Icon className="size-2.5" />{label}
    </span>
  );
}
