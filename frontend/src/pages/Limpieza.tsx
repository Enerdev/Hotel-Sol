import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  PlayCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  History,
  Filter,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Modal } from '../components/dialogs/Modal';
import { cn } from '../lib/cn';
import type { LimpiezaRegistro } from '../types';

const ESTADOS_LIMPIEZA = {
  pendiente: { label: 'Por limpiar', color: 'warning', icon: Sparkles },
  en_progreso: { label: 'En progreso', color: 'info', icon: Clock },
  completada_por_limpieza: { label: 'Esperando validación', color: 'accent', icon: AlertTriangle },
  validada_por_recepcion: { label: 'Validada', color: 'success', icon: CheckCircle2 },
  rechazada: { label: 'Rechazada', color: 'danger', icon: XCircle },
} as const;

const TURNO_LABEL: Record<string, string> = {
  mañana: 'Mañana',
  tarde: 'Tarde',
  noche: 'Noche',
};

type Tab = 'pendientes' | 'historial';

interface HistorialRegistro {
  id: number;
  estado: string;
  turno: string | null;
  fecha_creacion: string;
  fecha_inicio_limpieza: string | null;
  fecha_fin_limpieza: string | null;
  fecha_validacion: string | null;
  duracion_minutos: number | null;
  habitacion_numero: string;
  habitacion_piso: number;
  empleado_nombre: string | null;
  validador_nombre: string | null;
  notas_limpieza: string | null;
  notas_validacion: string | null;
  motivo_rechazo: string | null;
}

interface EmpleadoLimpieza {
  id: number;
  nombre: string;
}

export default function LimpiezaPage() {
  const { user } = useAuth();
  const { on } = useSocket();
  const [tab, setTab] = useState<Tab>('pendientes');

  const { data, loading, error, refetch } = useApi<LimpiezaRegistro[]>(() =>
    api.get('/limpieza/pendientes?_t=' + Date.now())
  );

  // Polling cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [refetch]);

  // Suscribirse a eventos de tiempo real
  useEffect(() => {
    const off1 = on('limpieza:cambio', () => refetch());
    const off2 = on('limpieza:lista_para_validar', () => refetch());
    const off3 = on('limpieza:validada', () => refetch());
    const off4 = on('limpieza:rechazada', (data: any) => {
      refetch();
      if (user?.rol === 'limpieza' || user?.rol_secundario === 'limpieza') {
        toast.error(
          `Habitación ${data?.habitacion_numero ?? ''} rechazada · ${data?.motivo ?? 'Revisa los detalles'}`,
          { duration: 8000 }
        );
      }
    });
    const off5 = on('limpieza:nueva_pendiente', () => refetch());
    const off6 = on('habitacion:disponible', () => refetch());
    return () => { off1(); off2(); off3(); off4(); off5(); off6(); };
  }, [on, refetch, user]);

  // Historial
  const [historial, setHistorial] = useState<HistorialRegistro[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [empleados, setEmpleados] = useState<EmpleadoLimpieza[]>([]);
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [filtroTurno, setFiltroTurno] = useState('');
  const [filtroEmpleado, setFiltroEmpleado] = useState('');

  useEffect(() => {
    if (tab === 'historial') {
      cargarEmpleados();
      cargarHistorial();
    }
  }, [tab]);

  async function cargarEmpleados() {
    try {
      const data = await api.get<EmpleadoLimpieza[]>('/limpieza/empleados');
      setEmpleados(data);
    } catch { }
  }

  async function cargarHistorial() {
    setLoadingHistorial(true);
    try {
      const params = new URLSearchParams();
      if (filtroDesde) params.set('desde', filtroDesde);
      if (filtroHasta) params.set('hasta', filtroHasta);
      if (filtroTurno) params.set('turno', filtroTurno);
      if (filtroEmpleado) params.set('empleado_id', filtroEmpleado);
      const q = params.toString() ? '?' + params.toString() : '';
      const data = await api.get<HistorialRegistro[]>('/limpieza/historial' + q);
      setHistorial(data);
    } catch (e) {
      toast.error('Error cargando historial');
    } finally {
      setLoadingHistorial(false);
    }
  }

  const [modalRechazar, setModalRechazar] = useState<LimpiezaRegistro | null>(null);

  if (!user) return null;

  const registros = data ?? [];
  const porValidar = registros.filter((r) => r.estado === 'completada_por_limpieza');
  const muestraBanner = (user.rol === 'recepcionista' || user.rol === 'admin') && porValidar.length > 0;

  const esLimpieza = user.rol === 'limpieza' || user.rol_secundario === 'limpieza';

  return (
    <>
      <Header
        title="Limpieza"
        description={esLimpieza ? 'Habitaciones que necesitan tu atención' : 'Flujo de limpieza y validación'}
      />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border-color">
          <button type="button" onClick={() => setTab('pendientes')}
            className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition',
              tab === 'pendientes' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <Sparkles className="size-4" />Pendientes
            {registros.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-xs">{registros.length}</span>
            )}
          </button>
          <button type="button" onClick={() => setTab('historial')}
            className={cn('flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition',
              tab === 'historial' ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            <History className="size-4" />Historial
          </button>
        </div>

        {/* ── TAB PENDIENTES ── */}
        {tab === 'pendientes' && (
          <>
            {muestraBanner && (
              <div className="bg-accent/10 border-2 border-accent/40 rounded-lg p-4 flex items-center gap-4">
                <AlertTriangle className="size-6 text-accent shrink-0" />
                <div>
                  <p className="text-text-primary font-medium">{porValidar.length} habitación(es) lista(s) para validar</p>
                  <p className="text-sm text-text-secondary">Revisa cada una y valida o rechaza la limpieza.</p>
                </div>
              </div>
            )}

            {loading && <div className="flex items-center justify-center py-12"><Loader2 className="size-6 text-accent animate-spin" /></div>}
            {error && <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">Error: {error}</div>}

            {!loading && !error && registros.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="size-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="size-8 text-success" />
                  </div>
                  <p className="text-text-primary font-medium text-lg">¡Todo está limpio!</p>
                  <p className="text-sm text-text-secondary mt-1">No hay habitaciones pendientes en este momento.</p>
                </CardContent>
              </Card>
            )}

            {!loading && registros.length > 0 && (
              <div className="space-y-3">
                {registros.map((r) => (
                  <RegistroCard
                    key={r.id}
                    registro={r}
                    userRol={user.rol}
                    userRolSecundario={user.rol_secundario ?? null}
                    userId={user.id}
                    onActionDone={refetch}
                    onRechazar={() => setModalRechazar(r)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB HISTORIAL ── */}
        {tab === 'historial' && (
          <div className="space-y-4">
            {/* Filtros */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="size-4 text-accent" />Filtros</CardTitle></CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="desde">Desde</Label>
                    <Input id="desde" type="date" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="hasta">Hasta</Label>
                    <Input id="hasta" type="date" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="turno">Turno</Label>
                    <select id="turno" value={filtroTurno} onChange={e => setFiltroTurno(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1 text-sm"
                    >
                      <option value="">Todos</option>
                      <option value="mañana">Mañana</option>
                      <option value="tarde">Tarde</option>
                      <option value="noche">Noche</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="empleado">Empleado</Label>
                    <select id="empleado" value={filtroEmpleado} onChange={e => setFiltroEmpleado(e.target.value)}
                      className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1 text-sm"
                    >
                      <option value="">Todos</option>
                      {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <Button size="sm" onClick={cargarHistorial} isLoading={loadingHistorial}>
                    <Filter className="size-4" />Aplicar filtros
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resumen por turno */}
            {historial.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {['mañana', 'tarde', 'noche'].map(turno => {
                  const delTurno = historial.filter(h => h.turno === turno);
                  const validadas = delTurno.filter(h => h.estado === 'validada_por_recepcion').length;
                  return (
                    <Card key={turno}>
                      <CardContent className="p-4">
                        <p className="text-xs text-text-muted uppercase mb-1">{TURNO_LABEL[turno]}</p>
                        <p className="text-2xl font-bold text-text-primary tabular-nums">{delTurno.length}</p>
                        <p className="text-xs text-success mt-1">{validadas} validadas</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Lista historial */}
            {loadingHistorial && <div className="flex justify-center py-8"><Loader2 className="size-6 text-accent animate-spin" /></div>}

            {!loadingHistorial && historial.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center text-text-secondary">No hay registros para los filtros seleccionados.</CardContent>
              </Card>
            )}

            {!loadingHistorial && historial.length > 0 && (
              <div className="space-y-2">
                {historial.map(h => {
                  const meta = ESTADOS_LIMPIEZA[h.estado as keyof typeof ESTADOS_LIMPIEZA] ?? { label: h.estado, color: 'default', icon: Sparkles };
                  const Icon = meta.icon;
                  const colorText = {
                    warning: 'text-warning', info: 'text-info', accent: 'text-accent',
                    success: 'text-success', danger: 'text-danger', default: 'text-text-secondary',
                  }[meta.color as string] ?? 'text-text-secondary';

                  return (
                    <Card key={h.id}>
                      <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                        <div className="size-12 rounded-lg bg-bg-elevated border border-border-color flex items-center justify-center shrink-0">
                          <span className="text-lg font-bold text-text-primary">{h.habitacion_numero}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-text-primary">Hab. {h.habitacion_numero} · Piso {h.habitacion_piso}</p>
                            <span className={cn('flex items-center gap-1 text-xs font-medium', colorText)}>
                              <Icon className="size-3" />{meta.label}
                            </span>
                            {h.turno && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-bg-elevated border border-border-color text-text-secondary">
                                {TURNO_LABEL[h.turno] ?? h.turno}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-text-secondary mt-1 flex gap-3 flex-wrap">
                            {h.empleado_nombre && <span>👤 {h.empleado_nombre}</span>}
                            {h.duracion_minutos && <span>⏱ {h.duracion_minutos} min</span>}
                            {h.validador_nombre && <span>✓ {h.validador_nombre}</span>}
                            <span>{new Date(h.fecha_creacion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          {h.motivo_rechazo && (
                            <p className="text-xs text-danger mt-1">Rechazada: {h.motivo_rechazo}</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <ModalRechazar
        registro={modalRechazar}
        onClose={() => setModalRechazar(null)}
        onDone={() => { setModalRechazar(null); refetch(); }}
      />
    </>
  );
}

// ============================================================================
// RegistroCard
// ============================================================================
interface RegistroCardProps {
  registro: LimpiezaRegistro;
  userRol: 'admin' | 'recepcionista' | 'limpieza';
  userRolSecundario: 'recepcionista' | 'limpieza' | null;
  userId: number;
  onActionDone: () => void;
  onRechazar: () => void;
}

function RegistroCard({ registro, userRol, userRolSecundario, userId, onActionDone, onRechazar }: RegistroCardProps) {
  const [busy, setBusy] = useState(false);
  const meta = ESTADOS_LIMPIEZA[registro.estado as keyof typeof ESTADOS_LIMPIEZA] ?? { label: registro.estado, color: 'default', icon: Sparkles };
  const Icon = meta.icon;

  const colorBox = {
    warning: 'bg-warning/10 border-warning/40', info: 'bg-info/10 border-info/40',
    accent: 'bg-accent/10 border-accent/40', success: 'bg-success/10 border-success/40',
    danger: 'bg-danger/10 border-danger/40', default: 'bg-bg-elevated border-border-color',
  }[meta.color as string] ?? 'bg-bg-elevated border-border-color';

  const colorText = {
    warning: 'text-warning', info: 'text-info', accent: 'text-accent',
    success: 'text-success', danger: 'text-danger', default: 'text-text-secondary',
  }[meta.color as string] ?? 'text-text-secondary';

  const esLimpieza = userRol === 'limpieza' || userRol === 'admin' || userRolSecundario === 'limpieza';

  const puedeTomar = registro.estado === 'pendiente' && esLimpieza;
  const puedeCompletar = registro.estado === 'en_progreso' && esLimpieza &&
    (registro.empleado_limpieza_id === userId || userRol === 'admin');
  const puedeValidar = registro.estado === 'completada_por_limpieza' &&
    (userRol === 'recepcionista' || userRol === 'admin');

  const handleTomar = async () => {
    setBusy(true);
    try {
      await api.post(`/limpieza/${registro.id}/tomar`, { turno: 'mañana' });
      toast.success(`Has tomado la habitación ${registro.habitacion_numero}`);
      onActionDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleCompletar = async () => {
    setBusy(true);
    try {
      await api.post(`/limpieza/${registro.id}/completar`, {});
      toast.success(`Habitación ${registro.habitacion_numero} marcada como limpia`);
      onActionDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const handleValidar = async () => {
    setBusy(true);
    try {
      await api.post(`/limpieza/${registro.id}/validar`, {});
      toast.success(`Habitación ${registro.habitacion_numero} validada y disponible`);
      onActionDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className={cn('border-2', colorBox)}>
      <CardContent className="p-5 flex items-center gap-4 flex-wrap">
        <div className="size-16 rounded-lg bg-bg-surface border border-border-color flex items-center justify-center shrink-0">
          <span className="text-2xl font-bold text-text-primary">{registro.habitacion_numero}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-text-primary">
            Habitación {registro.habitacion_numero}
            <span className="text-text-muted text-sm font-normal ml-2">· Piso {registro.habitacion_piso}</span>
          </p>
          <div className={cn('flex items-center gap-1.5 mt-1 text-sm', colorText)}>
            <Icon className="size-4" />
            <span className="font-medium">{meta.label}</span>
          </div>
          {registro.empleado_nombre && (
            <p className="text-xs text-text-secondary mt-1">
              👤 {registro.empleado_nombre}
              {registro.duracion_minutos !== null && registro.duracion_minutos > 0 && (
                <span> · {registro.duracion_minutos} min</span>
              )}
            </p>
          )}
          {registro.notas_limpieza && (
            <p className="text-xs text-text-secondary mt-1 italic">"{registro.notas_limpieza}"</p>
          )}
          {registro.estado === 'rechazada' && (registro as any).motivo_rechazo && (
            <p className="text-xs text-danger mt-1 flex items-center gap-1">
              <XCircle className="size-3 shrink-0" />
              Motivo: {(registro as any).motivo_rechazo}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {puedeTomar && (
            <Button onClick={handleTomar} isLoading={busy} size="md">
              <PlayCircle className="size-4" />Empezar limpieza
            </Button>
          )}
          {puedeCompletar && (
            <Button onClick={handleCompletar} isLoading={busy} size="md">
              <CheckCircle2 className="size-4" />Marcar como limpia
            </Button>
          )}
          {puedeValidar && (
            <>
              <Button onClick={handleValidar} isLoading={busy} size="md">
                <CheckCircle2 className="size-4" />Validar
              </Button>
              <Button onClick={onRechazar} disabled={busy} variant="outline" size="md">
                <XCircle className="size-4" />Rechazar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// ModalRechazar
// ============================================================================
function ModalRechazar({ registro, onClose, onDone }: {
  registro: LimpiezaRegistro | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (registro) setMotivo(''); }, [registro]);

  if (!registro) return null;

  const handleSubmit = async () => {
    if (motivo.trim().length < 3) { toast.error('El motivo debe tener al menos 3 caracteres'); return; }
    setBusy(true);
    try {
      await api.post(`/limpieza/${registro.id}/rechazar`, { motivo: motivo.trim() });
      toast.success(`Habitación ${registro.habitacion_numero} rechazada · re-limpiar`);
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={!!registro} onClose={onClose}
      title={`Rechazar limpieza · Hab. ${registro.habitacion_numero}`}
      description="Indica qué falta o por qué no fue aceptada. La habitación volverá a estado 'por limpiar'."
      size="md"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="motivo" className="text-sm font-medium text-text-secondary block mb-2">Motivo del rechazo</label>
          <textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: Falta limpiar el baño, no se cambió la sábana, etc."
            rows={4}
            className="w-full px-3 py-2 rounded-md bg-bg-elevated border border-border-color text-text-primary placeholder:text-text-muted hover:border-border-hover focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} variant="outline" disabled={busy}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="danger" isLoading={busy}>Rechazar limpieza</Button>
        </div>
      </div>
    </Modal>
  );
}
