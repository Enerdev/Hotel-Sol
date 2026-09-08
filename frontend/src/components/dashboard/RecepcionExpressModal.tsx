import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import {
  Search,
  UserPlus,
  CheckCircle,
  Calendar,
  Clock,
  Receipt,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from '../dialogs/Modal';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { useDebounce } from '../../hooks/useDebounce';
import { api, ApiError } from '../../services/api';
import {
  MetodoPagoFields,
  validarMetodoPago,
  type MetodoPagoExt,
} from '../cobros/MetodoPagoFields';
import { TIPO_HABITACION_LABEL } from '../../types';
import type { Habitacion, Cliente, TipoDocumento } from '../../types';
import { cn } from '../../lib/cn';

interface RecepcionExpressModalProps {
  open: boolean;
  habitacion: Habitacion | null;
  onClose: () => void;
  onSaved: () => void;
}

type TipoEstancia = 'por_noche' | 'por_horas';

interface TarifaActual {
  franja: 'hasta_12' | 'hasta_19' | 'hasta_22' | 'madrugada';
  periodo: 'normal' | 'semana' | 'fiestas' | 'agosto' | 'personalizado';
  periodo_nombre: string | null;
  precio: string | null;
  disponible: boolean;
}

const FRANJA_LABEL: Record<string, string> = {
  hasta_12:  'Hasta las 12:00 pm',
  hasta_19:  'Hasta las 7:00 pm',
  hasta_22:  'Hasta las 10:00 pm',
  madrugada: 'Madrugada',
};

const PERIODO_COLOR: Record<string, string> = {
  normal:        'bg-bg-elevated text-text-secondary border-border-color',
  semana:        'bg-blue-500/10 text-blue-400 border-blue-500/30',
  fiestas:       'bg-orange-500/10 text-orange-400 border-orange-500/30',
  agosto:        'bg-red-500/10 text-red-400 border-red-500/30',
  personalizado: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

export function RecepcionExpressModal({
  open,
  habitacion,
  onClose,
  onSaved,
}: RecepcionExpressModalProps) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const debounced = useDebounce(busqueda, 300);
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [modoNuevo, setModoNuevo] = useState(false);
  const [nuevoTipoDoc, setNuevoTipoDoc] = useState<TipoDocumento>('DNI');
  const [nuevoNumeroDoc, setNuevoNumeroDoc] = useState('');
  const [nuevoNombres, setNuevoNombres] = useState('');
  const [nuevoApellidos, setNuevoApellidos] = useState('');
  const [nuevaNacionalidad, setNuevaNacionalidad] = useState('Peruana');
  const [nuevaProcedencia, setNuevaProcedencia] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [tipoEstancia, setTipoEstancia] = useState<TipoEstancia>('por_noche');
  const [noches, setNoches] = useState(1);
  const [precioTotal, setPrecioTotal] = useState(0);
  const [articulos, setArticulos] = useState({ papel: true, toalla: true, jabon: true });
  const [notas, setNotas] = useState('');
  const [tarifaActual, setTarifaActual] = useState<TarifaActual | null>(null);
  const [loadingTarifa, setLoadingTarifa] = useState(false);
  const [horaActual, setHoraActual] = useState(() => new Date());
  const [metodoPago, setMetodoPago] = useState<MetodoPagoExt>('efectivo');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [telefonoPago, setTelefonoPago] = useState('');
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setHoraActual(new Date()), 60_000);
    return () => clearInterval(interval);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setCliente(null); setBusqueda(''); setResultados([]); setModoNuevo(false);
    setNuevoTipoDoc('DNI'); setNuevoNumeroDoc(''); setNuevoNombres(''); setNuevoApellidos('');
    setNuevaNacionalidad('Peruana'); setNuevaProcedencia(''); setNuevoTelefono('');
    setTipoEstancia('por_noche'); setNoches(1); setNotas('');
    setArticulos({ papel: true, toalla: true, jabon: true });
    setMetodoPago('efectivo'); setNumeroOperacion(''); setTelefonoPago('');
    setPagoConfirmado(false); setTarifaActual(null); setHoraActual(new Date());
    if (habitacion) setPrecioTotal(Number(habitacion.precio_base_noche) || 0);
  }, [open, habitacion]);

  useEffect(() => {
    if (!open || !habitacion || tipoEstancia !== 'por_horas') return;
    setLoadingTarifa(true);
    api.get<TarifaActual>(`/tarifas/precio-actual/${habitacion.tipo}`)
      .then((data) => {
        setTarifaActual(data);
        setPrecioTotal(data.precio !== null ? Number(data.precio) : 0);
      })
      .catch(() => { setTarifaActual(null); toast.error('No se pudo cargar la tarifa por horas'); })
      .finally(() => setLoadingTarifa(false));
  }, [open, habitacion, tipoEstancia]);

  useEffect(() => {
    if (!habitacion || tipoEstancia !== 'por_noche') return;
    setPrecioTotal((Number(habitacion.precio_base_noche) || 0) * noches);
  }, [tipoEstancia, noches, habitacion]);

  useEffect(() => {
    if (!debounced.trim()) { setResultados([]); return; }
    api.get<Cliente[]>(`/clientes/buscar?q=${encodeURIComponent(debounced)}`)
      .then((data) => setResultados(data.slice(0, 5)))
      .catch(() => setResultados([]));
  }, [debounced]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!habitacion) return;
    if (!cliente && !modoNuevo) { toast.error('Selecciona o registra un cliente'); return; }
    if (modoNuevo && (!nuevoNumeroDoc.trim() || !nuevoNombres.trim() || !nuevoApellidos.trim())) {
      toast.error('Llena documento, nombres y apellidos del cliente'); return;
    }
    if (precioTotal <= 0) { toast.error('El precio total debe ser mayor a 0'); return; }
    if (tipoEstancia === 'por_horas' && tarifaActual && !tarifaActual.disponible) {
      toast.error('No hay tarifa disponible para la franja horaria actual'); return;
    }
    const errorMP = validarMetodoPago(metodoPago, numeroOperacion, { confirmado: pagoConfirmado, montoTotal: precioTotal });
    if (errorMP) { toast.error(errorMP); return; }
    if (metodoPago === 'online') { toast.error('Método "online" no aplica para recepción presencial'); return; }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        habitacion_id: habitacion.id, tipo_estancia: tipoEstancia,
        noches: tipoEstancia === 'por_noche' ? noches : null,
        horas: tipoEstancia === 'por_horas' ? 1 : null,
        precio_total: precioTotal, notas: (() => {
          const arts = [
            articulos.papel && 'Papel higiénico',
            articulos.toalla && 'Toalla',
            articulos.jabon && 'Jabón',
          ].filter(Boolean).join(', ');
          const articulosStr = arts ? `Artículos: ${arts}` : '';
          const notasStr = notas.trim();
          return [articulosStr, notasStr].filter(Boolean).join(' | ') || null;
        })(),
        metodo_pago: metodoPago, numero_operacion: numeroOperacion.trim() || null,
        telefono_pago: telefonoPago.trim() || null,
      };
      if (cliente) {
        payload.cliente_id = cliente.id;
      } else {
        payload.cliente_nuevo = {
          tipo_documento: nuevoTipoDoc, numero_documento: nuevoNumeroDoc.trim(),
          nombres: nuevoNombres.trim(), apellidos: nuevoApellidos.trim(),
          nacionalidad: nuevaNacionalidad.trim() || 'Peruana',
          procedencia: nuevaProcedencia.trim() || null, telefono: nuevoTelefono.trim() || null,
        };
      }
      const resp = await api.post<{ codigo: string; habitacion_numero: string; precio_total: number }>(
        '/reservas/recepcion-express', payload
      );
      toast.success(`✓ Recepción ${resp.codigo} · Hab. ${resp.habitacion_numero} · S/ ${Number(resp.precio_total).toFixed(2)} cobrado`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (!habitacion) return null;

  return (
    <Modal open={open} onClose={onClose}
      title={`Recepción express - Habitación ${habitacion.numero}`}
      description={`${TIPO_HABITACION_LABEL[habitacion.tipo]} · Piso ${habitacion.piso}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. CLIENTE */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">1. Cliente</h3>
          {cliente ? (
            <div className="p-3 bg-success/10 border border-success/40 rounded-md flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-4 text-success" />
                <div>
                  <p className="text-sm font-medium text-text-primary">{cliente.nombres} {cliente.apellidos}</p>
                  <p className="text-xs text-text-secondary">{cliente.tipo_documento}: {cliente.numero_documento}</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setCliente(null)}>Cambiar</Button>
            </div>
          ) : modoNuevo ? (
            <div className="space-y-2 p-3 bg-bg-elevated rounded-md">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs text-text-secondary">Datos del cliente nuevo</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setModoNuevo(false)}>Buscar existente</Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select value={nuevoTipoDoc} onChange={(e) => setNuevoTipoDoc(e.target.value as TipoDocumento)} className="h-9 px-2 rounded-md bg-bg-surface border border-border-color text-text-primary text-sm">
                  <option value="DNI">DNI</option><option value="CI">CI</option>
                  <option value="Pasaporte">Pasaporte</option><option value="Otros">Otros</option>
                </select>
                <Input value={nuevoNumeroDoc} onChange={(e) => setNuevoNumeroDoc(e.target.value)} placeholder="N° documento *" className="col-span-2 h-9" />
                <Input value={nuevoNombres} onChange={(e) => setNuevoNombres(e.target.value)} placeholder="Nombres *" className="h-9" />
                <Input value={nuevoApellidos} onChange={(e) => setNuevoApellidos(e.target.value)} placeholder="Apellidos *" className="col-span-2 h-9" />
                <Input value={nuevaNacionalidad} onChange={(e) => setNuevaNacionalidad(e.target.value)} placeholder="Nacionalidad" className="h-9" />
                <Input value={nuevaProcedencia} onChange={(e) => setNuevaProcedencia(e.target.value)} placeholder="Procedencia (ciudad)" className="h-9" />
                <Input value={nuevoTelefono} onChange={(e) => setNuevoTelefono(e.target.value)} placeholder="Teléfono" className="h-9" />
              </div>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="size-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por DNI o nombre..." className="pl-9" />
              </div>
              {resultados.length > 0 && (
                <div className="mt-1 bg-bg-surface border border-border-color rounded-md max-h-40 overflow-y-auto">
                  {resultados.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setCliente(c); setBusqueda(''); setResultados([]); }} className="w-full text-left px-3 py-2 hover:bg-bg-elevated text-sm border-b border-border-color/40 last:border-0">
                      <span className="text-text-primary">{c.nombres} {c.apellidos}</span>
                      <span className="text-text-muted text-xs ml-2">{c.tipo_documento} {c.numero_documento}</span>
                    </button>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setModoNuevo(true)} className="mt-2">
                <UserPlus className="size-3.5" />Cliente nuevo (no está registrado)
              </Button>
            </>
          )}
        </div>

        {/* 2. TIPO DE ESTANCIA */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">2. Tipo de estancia</h3>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setTipoEstancia('por_noche')}
              className={cn('p-3 rounded-md border text-left transition', tipoEstancia === 'por_noche' ? 'bg-accent/10 border-accent/50' : 'bg-bg-elevated border-border-color hover:border-accent/30')}>
              <div className="flex items-center gap-2 mb-1"><Calendar className="size-4 text-accent" /><span className="text-sm font-medium text-text-primary">Por noche</span></div>
              <p className="text-xs text-text-secondary">Check-out al día siguiente</p>
            </button>
            <button type="button" onClick={() => setTipoEstancia('por_horas')}
              className={cn('p-3 rounded-md border text-left transition', tipoEstancia === 'por_horas' ? 'bg-accent/10 border-accent/50' : 'bg-bg-elevated border-border-color hover:border-accent/30')}>
              <div className="flex items-center gap-2 mb-1"><Clock className="size-4 text-accent" /><span className="text-sm font-medium text-text-primary">Por horas</span></div>
              <p className="text-xs text-text-secondary">Tarifa según franja horaria</p>
            </button>
          </div>

          {tipoEstancia === 'por_noche' && (
            <div className="flex items-center gap-3 mt-3">
              <Label htmlFor="noches" className="whitespace-nowrap">Cantidad de noches</Label>
              <Input id="noches" type="number" min={1} max={30} value={noches} onChange={(e) => setNoches(Math.max(1, Number(e.target.value)))} className="w-24" />
              <div className="flex items-center gap-2 ml-2 text-xs text-text-muted">
                <span>? Check-out:</span>
                <span className="text-accent font-medium">{(() => { const d = new Date(); d.setDate(d.getDate() + noches); d.setHours(11, 0, 0, 0); return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' }) + ' 11:00 am'; })()}</span>
              </div>
            </div>
          )}

          {tipoEstancia === 'por_horas' && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between p-3 bg-bg-elevated border border-border-color rounded-md">
                <div className="flex items-center gap-2"><Clock className="size-4 text-accent" /><span className="text-sm text-text-secondary">Hora actual</span></div>
                <span className="text-lg font-bold text-text-primary tabular-nums">
                  {horaActual.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {loadingTarifa ? (
                <div className="flex items-center gap-2 p-3 bg-bg-elevated border border-border-color rounded-md">
                  <Loader2 className="size-4 animate-spin text-accent" />
                  <span className="text-sm text-text-secondary">Calculando tarifa...</span>
                </div>
              ) : tarifaActual ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-accent/5 border border-accent/30 rounded-md">
                    <div>
                      <p className="text-xs text-text-muted">Franja activa</p>
                      <p className="text-sm font-medium text-text-primary">{FRANJA_LABEL[tarifaActual.franja]}</p>
                    </div>
                    {tarifaActual.disponible
                      ? <span className="text-xl font-bold text-accent tabular-nums">S/ {Number(tarifaActual.precio).toFixed(2)}</span>
                      : <span className="text-sm text-danger font-medium">No disponible</span>}
                  </div>
                  {tarifaActual.periodo !== 'normal' && tarifaActual.periodo_nombre && (
                    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-md border text-xs font-medium', PERIODO_COLOR[tarifaActual.periodo])}>
                      <span>🎉</span><span>Tarifa especial: {tarifaActual.periodo_nombre}</span>
                    </div>
                  )}
                  {!tarifaActual.disponible && (
                    <div className="flex items-start gap-2 p-3 bg-danger/5 border border-danger/30 rounded-md">
                      <AlertTriangle className="size-4 text-danger shrink-0 mt-0.5" />
                      <p className="text-xs text-danger">Esta habitación no tiene tarifa para la franja actual. Puedes ingresar el precio manualmente.</p>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>

        {/* 3. PRECIO */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">3. Precio total</h3>
          <div className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/30 rounded-md">
            <Label htmlFor="precio" className="whitespace-nowrap">Total S/</Label>
            <Input id="precio" type="number" min={0} step="0.01" value={precioTotal}
              onChange={(e) => setPrecioTotal(Number(e.target.value))}
              className="text-lg font-semibold text-accent tabular-nums" />
            <span className="text-xs text-text-muted whitespace-nowrap">
              {tipoEstancia === 'por_noche' ? `base: S/ ${Number(habitacion.precio_base_noche).toFixed(2)}/noche` : tarifaActual?.franja ? FRANJA_LABEL[tarifaActual.franja] : 'por horas'}
            </span>
          </div>
        </div>

        {/* 4. PAGO */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">4. Pago 100% al ingresar</h3>
          <MetodoPagoFields metodo={metodoPago} onMetodoChange={setMetodoPago}
            numeroOperacion={numeroOperacion} onNumeroOperacionChange={setNumeroOperacion}
            telefonoPago={telefonoPago} onTelefonoPagoChange={setTelefonoPago}
            montoTotal={precioTotal} onConfirmadoChange={setPagoConfirmado}
            incluirOnline={false} idPrefix="recep" />
        </div>

        {/* Artículos por defecto */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">5. Artículos entregados</h3>
          <div className="space-y-2">
            {[
              { key: 'papel', label: 'Papel higiénico' },
              { key: 'toalla', label: 'Toalla' },
              { key: 'jabon', label: 'Jabón' },
            ].map(item => (
              <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={articulos[item.key as keyof typeof articulos]}
                  onChange={e => setArticulos(prev => ({ ...prev, [item.key]: e.target.checked }))}
                  className="size-4 rounded border-border-color bg-bg-elevated text-accent" />
                <span className="text-sm text-text-primary">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div>
          <Label htmlFor="notas">Notas (opcional)</Label>
          <textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
            placeholder="Ej: Cliente pidió cama extra"
            className="w-full mt-1 px-3 py-2 rounded-md bg-bg-elevated border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none" />
        </div>

        {/* TOTAL */}
        <div className="bg-accent/5 border border-accent/40 rounded-md p-3 flex justify-between items-center">
          <div>
            <p className="text-xs text-text-secondary">Total a cobrar AHORA</p>
            <p className="text-[10px] text-text-muted">vía {metodoPago}{tipoEstancia === 'por_horas' && tarifaActual?.periodo !== 'normal' && tarifaActual?.periodo_nombre ? ` · ${tarifaActual.periodo_nombre}` : ''}</p>
          </div>
          <span className="text-2xl font-bold text-accent tabular-nums">S/ {precioTotal.toFixed(2)}</span>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" isLoading={busy}>
            <Receipt className="size-4" />Registrar y cobrar S/ {precioTotal.toFixed(2)}
          </Button>
        </div>
      </form>
    </Modal>
  );
}