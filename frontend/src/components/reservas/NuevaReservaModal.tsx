import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  User,
  Search,
  BedDouble,
  Calendar,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Star,
} from 'lucide-react';
import { Modal } from '../dialogs/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { useDebounce } from '../../hooks/useDebounce';
import { api, ApiError } from '../../services/api';
import { calcularPrecio } from '../../lib/calcularPrecio';
import { TIPO_HABITACION_LABEL } from '../../types';
import { cn } from '../../lib/cn';
import type {
  Cliente,
  Habitacion,
  TipoEstancia,
  TarifaFranja,
  TemporadaConTarifas,
  MetodoPago,
} from '../../types';

interface NuevaReservaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Paso = 1 | 2 | 3 | 4;

export function NuevaReservaModal({
  open,
  onClose,
  onCreated,
}: NuevaReservaModalProps) {
  const [paso, setPaso] = useState<Paso>(1);
  const [busy, setBusy] = useState(false);

  // Datos seleccionados
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [habitacion, setHabitacion] = useState<Habitacion | null>(null);
  const [tipoEstancia, setTipoEstancia] = useState<TipoEstancia>('por_noche');
  const [fechaCheckIn, setFechaCheckIn] = useState(getDefaultCheckIn());
  const [fechaCheckOut, setFechaCheckOut] = useState(getDefaultCheckOut());
  const [horas, setHoras] = useState(3);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoPagado, setMontoPagado] = useState(0);
  const [notas, setNotas] = useState('');

  // Datos cargados del backend
  const [tarifas, setTarifas] = useState<TarifaFranja[]>([]);
  const [temporadas, setTemporadas] = useState<TemporadaConTarifas[]>([]);

  useEffect(() => {
    if (!open) return;
    // Resetear todo al abrir
    setPaso(1);
    setCliente(null);
    setHabitacion(null);
    setTipoEstancia('por_noche');
    setFechaCheckIn(getDefaultCheckIn());
    setFechaCheckOut(getDefaultCheckOut());
    setHoras(3);
    setMetodoPago('efectivo');
    setMontoPagado(0);
    setNotas('');

    // Cargar tarifas y temporadas en background
    Promise.all([
      api.get<TarifaFranja[]>('/tarifas/franjas').catch(() => []),
      api.get<TemporadaConTarifas[]>('/tarifas/temporadas').catch(() => []),
    ]).then(([t, te]) => {
      setTarifas(t);
      setTemporadas(te);
    });
  }, [open]);

  const noches = useMemo(() => {
    if (!fechaCheckIn || !fechaCheckOut) return 0;
    const inicio = new Date(fechaCheckIn);
    const fin = new Date(fechaCheckOut);
    const diff = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diff));
  }, [fechaCheckIn, fechaCheckOut]);

  const precio = useMemo(() => {
    if (!habitacion) return null;
    return calcularPrecio({
      tipoHabitacion: habitacion.tipo,
      tipoEstancia,
      fechaCheckIn,
      fechaCheckOut,
      noches: tipoEstancia === 'por_noche' ? noches : null,
      horas: tipoEstancia === 'por_horas' ? horas : null,
      tarifas,
      temporadas,
      cliente,
      precioBase: Number(habitacion.precio_base_noche),
    });
  }, [habitacion, tipoEstancia, fechaCheckIn, fechaCheckOut, noches, horas, tarifas, temporadas, cliente]);

  // ── Submit final ──
  async function handleSubmit() {
    if (!cliente || !habitacion || !precio) return;
    setBusy(true);
    try {
      await api.post('/reservas', {
        cliente_id: cliente.id,
        habitacion_id: habitacion.id,
        fecha_check_in: fechaCheckIn,
        fecha_check_out: tipoEstancia === 'fecha_abierta' ? null : fechaCheckOut,
        noches: tipoEstancia === 'por_noche' ? noches : null,
        horas: tipoEstancia === 'por_horas' ? horas : null,
        tipo_estancia: tipoEstancia,
        precio_total: precio.total,
        monto_pagado: montoPagado,
        estado_pago:
          montoPagado >= precio.total ? 'pagado' : montoPagado > 0 ? 'parcial' : 'pendiente',
        metodo_pago: metodoPago,
        origen: 'presencial',
        notas: notas.trim() || null,
      });
      toast.success(`Reserva creada para ${cliente.nombres} ${cliente.apellidos}`);
      onCreated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  // ── Validación de pasos ──
  const puedeAvanzar = (() => {
    if (paso === 1) return !!cliente;
    if (paso === 2) return !!habitacion;
    if (paso === 3) return precio !== null && precio.total >= 0;
    return false;
  })();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nueva reserva"
      description={`Paso ${paso} de 4`}
      size="lg"
    >
      {/* Indicador de pasos */}
      <div className="flex items-center justify-between mb-6 px-2">
        <Step active={paso === 1} done={paso > 1} icon={User} label="Cliente" />
        <Connector done={paso > 1} />
        <Step active={paso === 2} done={paso > 2} icon={BedDouble} label="Habitación" />
        <Connector done={paso > 2} />
        <Step active={paso === 3} done={paso > 3} icon={Calendar} label="Estancia" />
        <Connector done={paso > 3} />
        <Step active={paso === 4} done={false} icon={CheckCircle} label="Resumen" />
      </div>

      {/* Contenido del paso */}
      <div className="min-h-[280px]">
        {paso === 1 && <PasoCliente cliente={cliente} onSelect={setCliente} />}
        {paso === 2 && (
          <PasoHabitacion habitacion={habitacion} onSelect={setHabitacion} />
        )}
        {paso === 3 && (
          <PasoEstancia
            tipoEstancia={tipoEstancia}
            setTipoEstancia={setTipoEstancia}
            fechaCheckIn={fechaCheckIn}
            setFechaCheckIn={setFechaCheckIn}
            fechaCheckOut={fechaCheckOut}
            setFechaCheckOut={setFechaCheckOut}
            horas={horas}
            setHoras={setHoras}
            noches={noches}
          />
        )}
        {paso === 4 && cliente && habitacion && precio && (
          <PasoResumen
            cliente={cliente}
            habitacion={habitacion}
            tipoEstancia={tipoEstancia}
            fechaCheckIn={fechaCheckIn}
            fechaCheckOut={fechaCheckOut}
            noches={noches}
            horas={horas}
            precio={precio}
            metodoPago={metodoPago}
            setMetodoPago={setMetodoPago}
            montoPagado={montoPagado}
            setMontoPagado={setMontoPagado}
            notas={notas}
            setNotas={setNotas}
          />
        )}
      </div>

      {/* Botones de navegación */}
      <div className="flex justify-between gap-2 pt-4 mt-4 border-t border-border-color">
        <Button
          variant="outline"
          onClick={() => (paso > 1 ? setPaso((paso - 1) as Paso) : onClose())}
          disabled={busy}
        >
          {paso === 1 ? 'Cancelar' : (
            <>
              <ArrowLeft className="size-4" />
              Anterior
            </>
          )}
        </Button>
        {paso < 4 ? (
          <Button
            onClick={() => setPaso((paso + 1) as Paso)}
            disabled={!puedeAvanzar}
          >
            Siguiente
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} isLoading={busy}>
            <CheckCircle className="size-4" />
            Confirmar reserva
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ============================================================================
// Indicador de pasos
// ============================================================================

function Step({
  active,
  done,
  icon: Icon,
  label,
}: {
  active: boolean;
  done: boolean;
  icon: typeof User;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          'size-9 rounded-full flex items-center justify-center transition',
          done
            ? 'bg-success/15 border-2 border-success/40 text-success'
            : active
            ? 'bg-accent/15 border-2 border-accent/40 text-accent'
            : 'bg-bg-elevated border-2 border-border-color text-text-muted'
        )}
      >
        {done ? <CheckCircle className="size-4" /> : <Icon className="size-4" />}
      </div>
      <span
        className={cn(
          'text-xs',
          active ? 'text-accent font-medium' : 'text-text-muted'
        )}
      >
        {label}
      </span>
    </div>
  );
}

function Connector({ done }: { done: boolean }) {
  return (
    <div className="flex-1 h-0.5 mx-1">
      <div
        className={cn(
          'h-full',
          done ? 'bg-success/40' : 'bg-border-color'
        )}
      />
    </div>
  );
}

// ============================================================================
// PASO 1: Cliente
// ============================================================================

function PasoCliente({
  cliente,
  onSelect,
}: {
  cliente: Cliente | null;
  onSelect: (c: Cliente) => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const debounced = useDebounce(busqueda, 300);
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debounced.trim()) {
      api
        .get<Cliente[]>('/clientes/frecuentes')
        .then(setResultados)
        .catch(() => {});
      return;
    }
    setLoading(true);
    api
      .get<Cliente[]>(`/clientes/buscar?q=${encodeURIComponent(debounced.trim())}`)
      .then(setResultados)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debounced]);

  return (
    <div>
      <h3 className="text-base font-medium text-text-primary mb-3">
        Selecciona el cliente
      </h3>
      <div className="relative mb-3">
        <Search className="size-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o DNI..."
          className="pl-9"
        />
      </div>

      <div className="space-y-1.5 max-h-72 overflow-y-auto">
        {!busqueda && (
          <p className="text-xs text-text-muted mb-2">Clientes frecuentes:</p>
        )}
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="size-5 text-accent animate-spin" />
          </div>
        )}
        {resultados.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c)}
            className={cn(
              'w-full text-left p-3 rounded-md border transition flex items-center gap-3',
              cliente?.id === c.id
                ? 'bg-accent/10 border-accent/50'
                : 'bg-bg-elevated border-border-color hover:border-border-hover'
            )}
          >
            <div
              className={cn(
                'size-9 rounded-full flex items-center justify-center shrink-0',
                c.tipo_cliente === 'frecuente'
                  ? 'bg-accent/15 text-accent'
                  : 'bg-bg-surface text-text-secondary'
              )}
            >
              {c.tipo_cliente === 'frecuente' ? (
                <Star className="size-4 fill-current" />
              ) : (
                <User className="size-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {c.nombres} {c.apellidos}
              </p>
              <p className="text-xs text-text-secondary">
                {c.tipo_documento}: {c.numero_documento}
                {c.tipo_cliente === 'frecuente' &&
                  Number(c.descuento_porcentaje) > 0 && (
                    <span className="text-accent ml-2">
                      · {Number(c.descuento_porcentaje).toFixed(0)}% desc.
                    </span>
                  )}
              </p>
            </div>
            {cliente?.id === c.id && (
              <CheckCircle className="size-5 text-accent shrink-0" />
            )}
          </button>
        ))}
        {!loading && resultados.length === 0 && busqueda && (
          <p className="text-sm text-text-muted text-center py-4">
            No se encontraron clientes. Crea uno desde la página de Clientes.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// PASO 2: Habitación
// ============================================================================

function PasoHabitacion({
  habitacion,
  onSelect,
}: {
  habitacion: Habitacion | null;
  onSelect: (h: Habitacion) => void;
}) {
  const [habs, setHabs] = useState<Habitacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Habitacion[]>('/habitaciones')
      .then((todas) => {
        // Solo disponibles + limpias
        const dispo = todas.filter(
          (h) =>
            h.estado_ocupacion === 'disponible' && h.estado_limpieza === 'limpia'
        );
        setHabs(dispo);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 text-accent animate-spin" />
      </div>
    );
  }

  if (habs.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-primary font-medium">
          No hay habitaciones disponibles
        </p>
        <p className="text-sm text-text-secondary mt-1">
          Todas están ocupadas, sucias o fuera de servicio.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-base font-medium text-text-primary mb-3">
        Selecciona una habitación disponible
      </h3>
      <p className="text-xs text-text-muted mb-3">
        {habs.length} habitaciones disponibles y limpias
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
        {habs.map((h) => (
          <button
            key={h.id}
            type="button"
            onClick={() => onSelect(h)}
            className={cn(
              'p-3 rounded-md border-2 text-left transition',
              habitacion?.id === h.id
                ? 'bg-accent/10 border-accent'
                : 'bg-bg-elevated border-border-color hover:border-border-hover'
            )}
          >
            <p className="text-lg font-bold text-text-primary">{h.numero}</p>
            <p className="text-xs text-text-secondary line-clamp-2 mt-1">
              {TIPO_HABITACION_LABEL[h.tipo]}
            </p>
            <p className="text-xs text-accent mt-1">
              S/ {Number(h.precio_base_noche).toFixed(2)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PASO 3: Estancia (fechas, tipo)
// ============================================================================

function PasoEstancia({
  tipoEstancia,
  setTipoEstancia,
  fechaCheckIn,
  setFechaCheckIn,
  fechaCheckOut,
  setFechaCheckOut,
  horas,
  setHoras,
  noches,
}: {
  tipoEstancia: TipoEstancia;
  setTipoEstancia: (t: TipoEstancia) => void;
  fechaCheckIn: string;
  setFechaCheckIn: (s: string) => void;
  fechaCheckOut: string;
  setFechaCheckOut: (s: string) => void;
  horas: number;
  setHoras: (n: number) => void;
  noches: number;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium text-text-primary">
        Detalles de la estancia
      </h3>

      {/* Tipo de estancia */}
      <div>
        <Label>Tipo de estancia</Label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {(['por_noche', 'por_horas', 'fecha_abierta'] as TipoEstancia[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipoEstancia(t)}
              className={cn(
                'p-3 rounded-md border text-sm font-medium transition',
                tipoEstancia === t
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-bg-elevated border-border-color text-text-secondary hover:border-border-hover'
              )}
            >
              {t === 'por_noche' && 'Por noche'}
              {t === 'por_horas' && 'Por horas'}
              {t === 'fecha_abierta' && 'Fecha abierta'}
            </button>
          ))}
        </div>
      </div>

      {/* Check-in */}
      <div>
        <Label htmlFor="checkin">Check-in</Label>
        <Input
          id="checkin"
          type="datetime-local"
          value={fechaCheckIn}
          onChange={(e) => setFechaCheckIn(e.target.value)}
          className="mt-1"
        />
      </div>

      {/* Por noche → check-out */}
      {tipoEstancia === 'por_noche' && (
        <div>
          <Label htmlFor="checkout">Check-out</Label>
          <Input
            id="checkout"
            type="datetime-local"
            value={fechaCheckOut}
            onChange={(e) => setFechaCheckOut(e.target.value)}
            className="mt-1"
          />
          <p className="text-xs text-text-muted mt-1">
            {noches} noche{noches !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Por horas → cantidad */}
      {tipoEstancia === 'por_horas' && (
        <div>
          <Label htmlFor="horas">Horas</Label>
          <Input
            id="horas"
            type="number"
            min={1}
            max={12}
            value={horas}
            onChange={(e) => setHoras(Number(e.target.value))}
            className="mt-1"
          />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PASO 4: Resumen
// ============================================================================

function PasoResumen({
  cliente,
  habitacion,
  tipoEstancia,
  fechaCheckIn,
  fechaCheckOut,
  noches,
  horas,
  precio,
  metodoPago,
  setMetodoPago,
  montoPagado,
  setMontoPagado,
  notas,
  setNotas,
}: {
  cliente: Cliente;
  habitacion: Habitacion;
  tipoEstancia: TipoEstancia;
  fechaCheckIn: string;
  fechaCheckOut: string;
  noches: number;
  horas: number;
  precio: ReturnType<typeof calcularPrecio>;
  metodoPago: MetodoPago;
  setMetodoPago: (m: MetodoPago) => void;
  montoPagado: number;
  setMontoPagado: (n: number) => void;
  notas: string;
  setNotas: (s: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-base font-medium text-text-primary">
        Confirma los datos de la reserva
      </h3>

      {/* Resumen */}
      <div className="bg-bg-elevated rounded-md p-4 space-y-2 border border-border-color">
        <SummaryRow
          label="Cliente"
          value={`${cliente.nombres} ${cliente.apellidos}`}
        />
        <SummaryRow
          label="Documento"
          value={`${cliente.tipo_documento}: ${cliente.numero_documento}`}
        />
        <SummaryRow
          label="Habitación"
          value={`${habitacion.numero} · ${TIPO_HABITACION_LABEL[habitacion.tipo]}`}
        />
        <SummaryRow
          label="Tipo"
          value={
            tipoEstancia === 'por_noche'
              ? `${noches} noche${noches !== 1 ? 's' : ''}`
              : tipoEstancia === 'por_horas'
              ? `${horas} hora${horas !== 1 ? 's' : ''}`
              : 'Fecha abierta'
          }
        />
        <SummaryRow label="Check-in" value={formatDateTime(fechaCheckIn)} />
        {tipoEstancia === 'por_noche' && (
          <SummaryRow label="Check-out" value={formatDateTime(fechaCheckOut)} />
        )}
      </div>

      {/* Cálculo de precio */}
      <div className="bg-accent/5 border border-accent/30 rounded-md p-4 space-y-1">
        <p className="text-xs text-text-muted">{precio.detalle}</p>
        <div className="flex justify-between text-sm pt-1">
          <span className="text-text-secondary">Subtotal</span>
          <span className="text-text-primary">S/ {precio.subtotal.toFixed(2)}</span>
        </div>
        {precio.descuento > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-text-secondary">
              Descuento {Number(cliente.descuento_porcentaje).toFixed(0)}%
            </span>
            <span className="text-success">- S/ {precio.descuento.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-semibold pt-2 border-t border-accent/20">
          <span className="text-text-primary">Total</span>
          <span className="text-accent">S/ {precio.total.toFixed(2)}</span>
        </div>
      </div>

      {/* Pago */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="metodo">Método de pago</Label>
          <select
            id="metodo"
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
            className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="yape">Yape</option>
            <option value="plin">Plin</option>
            <option value="transferencia">Transferencia</option>
            <option value="online">Online</option>
          </select>
        </div>
        <div>
          <Label htmlFor="pagado">Monto pagado ahora</Label>
          <Input
            id="pagado"
            type="number"
            min={0}
            step="0.01"
            value={montoPagado}
            onChange={(e) => setMontoPagado(Number(e.target.value))}
            className="mt-1"
          />
        </div>
      </div>

      {/* Notas */}
      <div>
        <Label htmlFor="notas">Notas (opcional)</Label>
        <textarea
          id="notas"
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          placeholder="Ej: Cliente pidió toallas extra, prefiere check-out tarde..."
          className="w-full mt-1 px-3 py-2 rounded-md bg-bg-elevated border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
        />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm gap-2">
      <span className="text-text-secondary shrink-0">{label}</span>
      <span className="text-text-primary text-right">{value}</span>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getDefaultCheckIn(): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0); // 12pm hoy
  return toLocalDateTimeString(d);
}

function getDefaultCheckOut(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0); // 11am mañana
  return toLocalDateTimeString(d);
}

function toLocalDateTimeString(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(s: string): string {
  if (!s) return '';
  return new Date(s).toLocaleString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
