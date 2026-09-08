import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User,
  Calendar,
  DollarSign,
  Receipt,
  LogOut,
  Loader2,
  Phone,
  Globe,
  FileText,
  AlertCircle,
  XCircle,
  Clock,
  Plus,
  Moon,
  Sparkles,
} from 'lucide-react';
import { Modal } from '../dialogs/Modal';
import { Button } from '../ui/Button';
import { Label } from '../ui/Label';
import { Input } from '../ui/Input';
import { api, ApiError } from '../../services/api';
import { TIPO_HABITACION_LABEL, ESTADO_PAGO_LABEL } from '../../types';
import type { Habitacion, EstadoPago } from '../../types';
import {
  MetodoPagoFields,
  validarMetodoPago,
  type MetodoPagoExt,
} from '../cobros/MetodoPagoFields';
import { cn } from '../../lib/cn';

interface OcupanteInfo {
  reserva_id: number;
  codigo: string;
  fecha_check_in: string;
  fecha_check_out: string | null;
  precio_total: string;
  monto_pagado: string;
  estado_pago: EstadoPago;
  tipo_estancia: string;
  metodo_pago: string | null;
  cliente_id: number;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  telefono: string | null;
  nacionalidad: string;
  recepcionista_nombre: string | null;
  horas?: number;
  noches?: number;
  precio_base_noche?: number;
}

interface TarifaExtra {
  horas_extra: number;
  precio: number;
}

interface HabOcupadaModalProps {
  open: boolean;
  habitacion: Habitacion | null;
  onClose: () => void;
  onCheckedOut?: () => void;
  onCobroRapido?: (h: Habitacion, ocupante: OcupanteInfo) => void;
}

type PanelAbierto = 'cobro' | 'cancelar' | 'ext_horas' | 'ext_noches' | 'limpieza' | null;

export function HabOcupadaModal({
  open,
  habitacion,
  onClose,
  onCheckedOut,
  onCobroRapido,
}: HabOcupadaModalProps) {
  const navigate = useNavigate();
  const [ocupante, setOcupante] = useState<OcupanteInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyCheckout, setBusyCheckout] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState<PanelAbierto>(null);

  // Cobro saldo
  const [metodoPago, setMetodoPago] = useState<MetodoPagoExt>('efectivo');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [telefonoPago, setTelefonoPago] = useState('');
  const [pagoConfirmado, setPagoConfirmado] = useState(false);
  const [busyCobro, setBusyCobro] = useState(false);

  // Cancelar
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [busyCancelar, setBusyCancelar] = useState(false);

  // Extensión de horas
  const [tarifasExtra, setTarifasExtra] = useState<TarifaExtra[]>([]);
  const [horasExtra, setHorasExtra] = useState<1 | 2 | 3>(1);
  const [montoExtHoras, setMontoExtHoras] = useState<number>(0);
  const [metodoPagoExtH, setMetodoPagoExtH] = useState<MetodoPagoExt>('efectivo');
  const [numOpExtH, setNumOpExtH] = useState('');
  const [telExtH, setTelExtH] = useState('');
  const [confirmadoExtH, setConfirmadoExtH] = useState(false);
  const [busyExtH, setBusyExtH] = useState(false);

  // Extensión de noches
  const [nochesExtra, setNochesExtra] = useState(1);
  const [montoExtNoches, setMontoExtNoches] = useState<number>(0);
  const [metodoPagoExtN, setMetodoPagoExtN] = useState<MetodoPagoExt>('efectivo');
  const [numOpExtN, setNumOpExtN] = useState('');
  const [telExtN, setTelExtN] = useState('');
  const [confirmadoExtN, setConfirmadoExtN] = useState(false);
  const [busyExtN, setBusyExtN] = useState(false);

  // Solicitud limpieza
  const [notasLimpieza, setNotasLimpieza] = useState('');
  const [busyLimpieza, setBusyLimpieza] = useState(false);

  useEffect(() => {
    if (!open || !habitacion) {
      setOcupante(null);
      setPanelAbierto(null);
      return;
    }
    setLoading(true);
    api.get<OcupanteInfo | null>(`/habitaciones/${habitacion.id}/ocupante`)
      .then(data => {
        setOcupante(data);
        if (data?.precio_base_noche) setMontoExtNoches(Number(data.precio_base_noche));
      })
      .catch(err => toast.error(err instanceof ApiError ? err.message : 'Error'))
      .finally(() => setLoading(false));
  }, [open, habitacion]);

  useEffect(() => {
    if (panelAbierto === 'ext_horas' && ocupante) {
      api.get<{ tarifas: TarifaExtra[] }>(`/reservas/${ocupante.reserva_id}/tarifas-extra`)
        .then(data => {
          setTarifasExtra(data.tarifas);
          if (data.tarifas.length > 0) setMontoExtHoras(data.tarifas[0].precio);
        })
        .catch(() => setTarifasExtra([]));
    }
  }, [panelAbierto, ocupante]);

  useEffect(() => {
    if (panelAbierto === 'ext_noches' && ocupante && esPorHoras) {
      api.get<{ franja: string; precio_sugerido: number; precio_base_noche: number }>(
        `/reservas/${ocupante.reserva_id}/tarifa-franja-actual`
      ).then(data => {
        setMontoExtNoches(data.precio_sugerido);
      }).catch(() => {});
    }
  }, [panelAbierto, ocupante]);

  useEffect(() => {
    const tarifa = tarifasExtra.find(t => t.horas_extra === horasExtra);
    if (tarifa) setMontoExtHoras(tarifa.precio);
  }, [horasExtra, tarifasExtra]);

  useEffect(() => {
    if (ocupante?.precio_base_noche) {
      setMontoExtNoches(Number(ocupante.precio_base_noche) * nochesExtra);
    }
  }, [nochesExtra, ocupante]);

  const togglePanel = (panel: PanelAbierto) => {
    setPanelAbierto(prev => prev === panel ? null : panel);
  };

  if (!habitacion) return null;

  const saldoPendiente = ocupante ? Number(ocupante.precio_total) - Number(ocupante.monto_pagado) : 0;
  const esPorHoras = ocupante?.tipo_estancia === 'por_horas';
  const esPorNoche = ocupante?.tipo_estancia === 'por_noche' || ocupante?.tipo_estancia === 'fecha_abierta';

  const handleCheckout = async () => {
    if (!ocupante) return;
    if (!confirm(`¿Hacer check-out de ${ocupante.nombres} ${ocupante.apellidos}?\nLa habitación quedará como "pendiente de limpieza".`)) return;
    setBusyCheckout(true);
    try {
      await api.post(`/reservas/${ocupante.reserva_id}/check-out`);
      toast.success(`Check-out completado · Hab. ${habitacion.numero}`);
      onCheckedOut?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusyCheckout(false);
    }
  };

  const handleCobrarSaldo = async () => {
    if (!ocupante || saldoPendiente <= 0) return;
    const errorMP = validarMetodoPago(metodoPago, numeroOperacion, { confirmado: pagoConfirmado, montoTotal: saldoPendiente });
    if (errorMP) { toast.error(errorMP); return; }
    setBusyCobro(true);
    try {
      await api.post(`/reservas/${ocupante.reserva_id}/cobrar-saldo`, {
        monto: saldoPendiente, metodo_pago: metodoPago,
        numero_operacion: numeroOperacion.trim() || null,
        telefono_pago: telefonoPago.trim() || null,
      });
      toast.success(`✓ S/ ${saldoPendiente.toFixed(2)} cobrado`);
      const data = await api.get<OcupanteInfo | null>(`/habitaciones/${habitacion.id}/ocupante`);
      setOcupante(data);
      setPanelAbierto(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusyCobro(false);
    }
  };

  const handleCancelar = async () => {
    if (!ocupante) return;
    if (motivoCancelacion.trim().length < 3) { toast.error('El motivo debe tener al menos 3 caracteres'); return; }
    setBusyCancelar(true);
    try {
      await api.post(`/reservas/${ocupante.reserva_id}/cancelar`, { motivo: motivoCancelacion.trim() });
      toast.success(`Reserva ${ocupante.codigo} cancelada`);
      onCheckedOut?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusyCancelar(false);
    }
  };

  const handleExtHoras = async () => {
    if (!ocupante) return;
    if (montoExtHoras <= 0) { toast.error('El monto debe ser mayor a 0'); return; }
    const errorMP = validarMetodoPago(metodoPagoExtH, numOpExtH, { confirmado: confirmadoExtH, montoTotal: montoExtHoras });
    if (errorMP) { toast.error(errorMP); return; }
    setBusyExtH(true);
    try {
      await api.post(`/reservas/${ocupante.reserva_id}/extension-horas`, {
        horas_extra: horasExtra, monto: montoExtHoras, metodo_pago: metodoPagoExtH,
        numero_operacion: numOpExtH.trim() || null, telefono_pago: telExtH.trim() || null,
      });
      toast.success(`✓ +${horasExtra}h registrada(s) · S/ ${montoExtHoras.toFixed(2)}`);
      const data = await api.get<OcupanteInfo | null>(`/habitaciones/${habitacion.id}/ocupante`);
      setOcupante(data);
      setPanelAbierto(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusyExtH(false);
    }
  };

  const handleExtNoches = async () => {
    if (!ocupante) return;
    if (montoExtNoches <= 0) { toast.error('El monto debe ser mayor a 0'); return; }
    const errorMP = validarMetodoPago(metodoPagoExtN, numOpExtN, { confirmado: confirmadoExtN, montoTotal: montoExtNoches });
    if (errorMP) { toast.error(errorMP); return; }
    setBusyExtN(true);
    try {
      await api.post(`/reservas/${ocupante.reserva_id}/extension-noches`, {
        noches_extra: nochesExtra, monto: montoExtNoches, metodo_pago: metodoPagoExtN,
        numero_operacion: numOpExtN.trim() || null, telefono_pago: telExtN.trim() || null,
      });
      toast.success(`✓ +${nochesExtra} noche(s) registrada(s) · S/ ${montoExtNoches.toFixed(2)}`);
      const data = await api.get<OcupanteInfo | null>(`/habitaciones/${habitacion.id}/ocupante`);
      setOcupante(data);
      setPanelAbierto(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusyExtN(false);
    }
  };

  const handleConvertirANoche = async () => {
    if (!ocupante) return;
    if (montoExtNoches <= 0) { toast.error('El monto debe ser mayor a 0'); return; }
    const errorMP = validarMetodoPago(metodoPagoExtN, numOpExtN, { confirmado: confirmadoExtN, montoTotal: montoExtNoches });
    if (errorMP) { toast.error(errorMP); return; }
    setBusyExtN(true);
    try {
      await api.post(`/reservas/${ocupante.reserva_id}/convertir-a-noche`, {
        monto: montoExtNoches, metodo_pago: metodoPagoExtN,
        numero_operacion: numOpExtN.trim() || null, telefono_pago: telExtN.trim() || null,
      });
      toast.success(`✓ Convertido a noche completa · S/ ${montoExtNoches.toFixed(2)}`);
      const data = await api.get<OcupanteInfo | null>(`/habitaciones/${habitacion.id}/ocupante`);
      setOcupante(data);
      setPanelAbierto(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusyExtN(false);
    }
  };

  const handleSolicitarLimpieza = async () => {
    setBusyLimpieza(true);
    try {
      await api.post('/limpieza/solicitud-cliente', {
        habitacion_id: habitacion.id,
        notas: notasLimpieza.trim() || null,
      });
      toast.success(`✓ Solicitud de limpieza registrada · Hab. ${habitacion.numero}`);
      setNotasLimpieza('');
      setPanelAbierto(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusyLimpieza(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}
      title={`Habitación ${habitacion.numero} ocupada`}
      description={`Piso ${habitacion.piso} · ${TIPO_HABITACION_LABEL[habitacion.tipo]}`}
      size="md"
    >
      <div className="space-y-4">
        {loading && <div className="flex justify-center py-12"><Loader2 className="size-6 text-accent animate-spin" /></div>}

        {!loading && !ocupante && (
          <div className="bg-warning/10 border border-warning/40 rounded-md p-4 text-warning text-sm">
            La habitación está marcada como ocupada pero no se encontró reserva activa.
          </div>
        )}

        {!loading && ocupante && (
          <>
            {/* Cliente */}
            <div className="bg-bg-elevated rounded-md p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="size-5 text-accent" />
                <p className="font-semibold text-text-primary">{ocupante.nombres} {ocupante.apellidos}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="size-3.5 text-text-muted" />
                  <span className="text-text-secondary">{ocupante.tipo_documento}: {ocupante.numero_documento}</span>
                </div>
                {ocupante.telefono && (
                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 text-text-muted" />
                    <span className="text-text-secondary">{ocupante.telefono}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Globe className="size-3.5 text-text-muted" />
                  <span className="text-text-secondary">{ocupante.nacionalidad}</span>
                </div>
              </div>
            </div>

            {/* Reserva */}
            <div className="bg-bg-elevated rounded-md p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-accent" />
                  <p className="text-sm font-medium text-text-primary">Reserva {ocupante.codigo}</p>
                </div>
                <span className="text-xs text-text-secondary">{ocupante.tipo_estancia?.replace(/_/g, ' ')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-text-muted">Check-in</p>
                  <p className="text-text-primary tabular-nums">{formatDate(ocupante.fecha_check_in)}</p>
                </div>
                {ocupante.fecha_check_out && (
                  <div>
                    <p className="text-text-muted">Check-out previsto</p>
                    <p className="text-text-primary tabular-nums">{formatDate(ocupante.fecha_check_out)}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-1">
                {esPorHoras && ocupante.horas && (
                  <span className="text-xs text-info flex items-center gap-1">
                    <Clock className="size-3" />{ocupante.horas}h contratada(s)
                  </span>
                )}
                {esPorNoche && ocupante.noches && (
                  <span className="text-xs text-accent flex items-center gap-1">
                    <Moon className="size-3" />{ocupante.noches} noche(s)
                  </span>
                )}
              </div>
              {ocupante.recepcionista_nombre && (
                <p className="text-xs text-text-muted pt-2 border-t border-border-color">
                  Registrada por: {ocupante.recepcionista_nombre}
                </p>
              )}
            </div>

            {/* Estado de pago */}
            <div className="bg-accent/5 border border-accent/30 rounded-md p-4 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="size-4 text-accent" />
                <p className="text-sm font-semibold text-text-primary">Estado de pago</p>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Total</span>
                  <span className="text-text-primary font-medium tabular-nums">S/ {Number(ocupante.precio_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Pagado</span>
                  <span className="text-success font-medium tabular-nums">S/ {Number(ocupante.monto_pagado).toFixed(2)}</span>
                </div>
                {saldoPendiente > 0 && (
                  <div className="flex justify-between pt-1 border-t border-accent/30">
                    <span className="text-text-secondary">Saldo pendiente</span>
                    <span className="text-warning font-semibold tabular-nums">S/ {saldoPendiente.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-text-secondary pt-1">
                {ESTADO_PAGO_LABEL[ocupante.estado_pago]}{ocupante.metodo_pago && ` · vía ${ocupante.metodo_pago}`}
              </p>
            </div>

            {/* Panel extensión horas */}
            {esPorHoras && (
              <PanelExpandible open={panelAbierto === 'ext_horas'} onToggle={() => togglePanel('ext_horas')}
                icon={<Clock className="size-4 text-info" />} titulo="Extender horas"
                subtitulo="Cobro por horas adicionales" color="info"
              >
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">Horas adicionales</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {([1, 2, 3] as const).map(h => {
                        const tarifa = tarifasExtra.find(t => t.horas_extra === h);
                        return (
                          <button key={h} type="button" onClick={() => setHorasExtra(h)}
                            className={cn('p-3 rounded-md border text-center transition',
                              horasExtra === h ? 'bg-info/15 border-info/50 text-info' : 'bg-bg-elevated border-border-color text-text-secondary hover:border-info/30'
                            )}
                          >
                            <p className="text-lg font-bold">+{h}h</p>
                            {tarifa ? <p className="text-xs mt-0.5">S/ {tarifa.precio.toFixed(2)}</p> : <p className="text-xs text-text-muted">-</p>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="monto-ext-h">Monto S/ *</Label>
                    <Input id="monto-ext-h" type="number" min={0.01} step="0.01" value={montoExtHoras} onChange={e => setMontoExtHoras(Number(e.target.value))} className="mt-1" />
                    <p className="text-xs text-text-muted mt-1">Precio sugerido según tipo de habitación. Puedes modificarlo.</p>
                  </div>
                  <MetodoPagoFields metodo={metodoPagoExtH} onMetodoChange={setMetodoPagoExtH} numeroOperacion={numOpExtH} onNumeroOperacionChange={setNumOpExtH} telefonoPago={telExtH} onTelefonoPagoChange={setTelExtH} montoTotal={montoExtHoras} onConfirmadoChange={setConfirmadoExtH} idPrefix="exth" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPanelAbierto(null)} disabled={busyExtH} className="flex-1">Cancelar</Button>
                    <Button size="sm" onClick={handleExtHoras} isLoading={busyExtH} className="flex-1">
                      <Clock className="size-4" />+{horasExtra}h · S/ {montoExtHoras.toFixed(2)}
                    </Button>
                  </div>
                </div>
              </PanelExpandible>
            )}

            {/* Panel extensión/conversión noches */}
            <PanelExpandible open={panelAbierto === 'ext_noches'} onToggle={() => togglePanel('ext_noches')}
              icon={<Moon className="size-4 text-accent" />}
              titulo={esPorHoras ? 'Convertir a noche / Agregar noches' : 'Agregar noches'}
              subtitulo={esPorHoras ? 'El cliente decide quedarse más tiempo' : 'El cliente extiende su estadía'}
              color="accent"
            >
              <div className="space-y-4">
                {esPorHoras && (
                  <div className="bg-accent/5 border border-accent/20 rounded-md p-3">
                    <p className="text-xs text-text-secondary mb-1">Si el cliente quiere quedarse esta noche, conviértelo a precio noche completa.</p>
                    <p className="text-xs text-text-muted">Check-out nuevo: mañana 11:00 am</p>
                  </div>
                )}
                <div>
                  <Label className="mb-2 block">{esPorHoras ? 'Número de noches' : 'Noches adicionales'}</Label>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setNochesExtra(Math.max(1, nochesExtra - 1))}
                      className="size-8 rounded-md border border-border-color bg-bg-elevated text-text-primary hover:border-accent/50 flex items-center justify-center text-lg">−</button>
                    <span className="text-2xl font-bold text-text-primary tabular-nums w-10 text-center">{nochesExtra}</span>
                    <button type="button" onClick={() => setNochesExtra(Math.min(30, nochesExtra + 1))}
                      className="size-8 rounded-md border border-border-color bg-bg-elevated text-text-primary hover:border-accent/50 flex items-center justify-center text-lg">+</button>
                    <span className="text-xs text-text-muted">noche{nochesExtra !== 1 ? 's' : ''}</span>
                  </div>
                  {ocupante.precio_base_noche && (
                    <p className="text-xs text-text-muted mt-1">Precio base: S/ {Number(ocupante.precio_base_noche).toFixed(2)}/noche</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="monto-ext-n">Monto S/ *</Label>
                  <Input id="monto-ext-n" type="number" min={0.01} step="0.01" value={montoExtNoches} onChange={e => setMontoExtNoches(Number(e.target.value))} className="mt-1" />
                  <p className="text-xs text-text-muted mt-1">Puedes modificar el monto según la tarifa que aplique.</p>
                </div>
                <MetodoPagoFields metodo={metodoPagoExtN} onMetodoChange={setMetodoPagoExtN} numeroOperacion={numOpExtN} onNumeroOperacionChange={setNumOpExtN} telefonoPago={telExtN} onTelefonoPagoChange={setTelExtN} montoTotal={montoExtNoches} onConfirmadoChange={setConfirmadoExtN} idPrefix="extn" />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPanelAbierto(null)} disabled={busyExtN} className="flex-1">Cancelar</Button>
                  {esPorHoras ? (
                    <Button size="sm" onClick={handleConvertirANoche} isLoading={busyExtN} className="flex-1">
                      <Moon className="size-4" />Convertir a noche · S/ {montoExtNoches.toFixed(2)}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={handleExtNoches} isLoading={busyExtN} className="flex-1">
                      <Moon className="size-4" />+{nochesExtra} noche(s) · S/ {montoExtNoches.toFixed(2)}
                    </Button>
                  )}
                </div>
              </div>
            </PanelExpandible>

            {/* Panel solicitar limpieza */}
            <PanelExpandible open={panelAbierto === 'limpieza'} onToggle={() => togglePanel('limpieza')}
              icon={<Sparkles className="size-4 text-success" />}
              titulo="Solicitar limpieza"
              subtitulo="El cliente solicita limpieza de su habitación"
              color="success"
            >
              <div className="space-y-3">
                <p className="text-xs text-text-secondary">Se notificará al personal de limpieza inmediatamente.</p>
                <div>
                  <Label htmlFor="notas-limpieza">Notas adicionales (opcional)</Label>
                  <textarea id="notas-limpieza" value={notasLimpieza} onChange={e => setNotasLimpieza(e.target.value)}
                    placeholder="Ej: Cambio de sábanas, toallas, etc."
                    rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-md bg-bg-elevated border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:border-success focus:ring-1 focus:ring-success resize-none text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPanelAbierto(null)} disabled={busyLimpieza} className="flex-1">Cancelar</Button>
                  <Button size="sm" onClick={handleSolicitarLimpieza} isLoading={busyLimpieza} className="flex-1">
                    <Sparkles className="size-4" />Solicitar limpieza
                  </Button>
                </div>
              </div>
            </PanelExpandible>

            {/* Panel cobrar saldo */}
            {saldoPendiente > 0 && (
              <PanelExpandible open={panelAbierto === 'cobro'} onToggle={() => togglePanel('cobro')}
                icon={<AlertCircle className="size-4 text-warning" />}
                titulo="Cobrar saldo pendiente" subtitulo={`S/ ${saldoPendiente.toFixed(2)}`} color="warning"
              >
                <div className="space-y-4">
                  <MetodoPagoFields metodo={metodoPago} onMetodoChange={setMetodoPago} numeroOperacion={numeroOperacion} onNumeroOperacionChange={setNumeroOperacion} telefonoPago={telefonoPago} onTelefonoPagoChange={setTelefonoPago} montoTotal={saldoPendiente} onConfirmadoChange={setPagoConfirmado} incluirOnline={false} idPrefix="saldo" />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPanelAbierto(null)} disabled={busyCobro} className="flex-1">Cancelar</Button>
                    <Button size="sm" onClick={handleCobrarSaldo} isLoading={busyCobro} className="flex-1">
                      <Receipt className="size-4" />Cobrar S/ {saldoPendiente.toFixed(2)}
                    </Button>
                  </div>
                </div>
              </PanelExpandible>
            )}

            {/* Panel cancelar */}
            <PanelExpandible open={panelAbierto === 'cancelar'} onToggle={() => togglePanel('cancelar')}
              icon={<XCircle className="size-4 text-danger" />}
              titulo="Cancelar reserva" subtitulo="No se puede deshacer" color="danger"
            >
              <div className="space-y-3">
                <div>
                  <Label htmlFor="motivo-cancelar">Motivo *</Label>
                  <textarea id="motivo-cancelar" value={motivoCancelacion} onChange={e => setMotivoCancelacion(e.target.value)}
                    placeholder="Ej: Cliente no se presentó, solicitó cancelación, etc."
                    rows={3}
                    className="w-full mt-1 px-3 py-2 rounded-md bg-bg-elevated border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:border-danger focus:ring-1 focus:ring-danger resize-none text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPanelAbierto(null)} disabled={busyCancelar} className="flex-1">Cancelar</Button>
                  <Button variant="danger" size="sm" onClick={handleCancelar} isLoading={busyCancelar} className="flex-1">
                    <XCircle className="size-4" />Confirmar cancelación
                  </Button>
                </div>
              </div>
            </PanelExpandible>

            {/* Acciones */}
            <div className="flex flex-col gap-2 pt-2 border-t border-border-color">
              {onCobroRapido && (
                <Button variant="outline" onClick={() => onCobroRapido(habitacion, ocupante)} className="w-full">
                  <Receipt className="size-4" />Registrar cobro extra
                </Button>
              )}
              <Button variant="outline" onClick={() => { onClose(); navigate(`/reservas?id=${ocupante.reserva_id}`); }} className="w-full">
                <FileText className="size-4" />Ver detalles en módulo Reservas
              </Button>
              <Button onClick={handleCheckout} isLoading={busyCheckout} className="w-full">
                <LogOut className="size-4" />Hacer check-out
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function PanelExpandible({ open, onToggle, icon, titulo, subtitulo, color, children }: {
  open: boolean; onToggle: () => void;
  icon: React.ReactNode; titulo: string; subtitulo: string;
  color: 'info' | 'accent' | 'warning' | 'danger' | 'success';
  children: React.ReactNode;
}) {
  const colors = {
    info: 'bg-info/10 hover:bg-info/15 border-info/40 text-info',
    accent: 'bg-accent/10 hover:bg-accent/15 border-accent/40 text-accent',
    warning: 'bg-warning/10 hover:bg-warning/15 border-warning/40 text-warning',
    danger: 'bg-danger/10 hover:bg-danger/15 border-danger/40 text-danger',
    success: 'bg-success/10 hover:bg-success/15 border-success/40 text-success',
  }[color];

  return (
    <div className="border rounded-md overflow-hidden border-border-color">
      <button type="button" onClick={onToggle}
        className={cn('w-full flex items-center justify-between px-4 py-3 transition text-left border', colors)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold">{titulo}</span>
        </div>
        <span className="text-xs">{subtitulo}</span>
      </button>
      {open && (
        <div className="p-4 bg-bg-elevated border-t border-border-color/30">
          {children}
        </div>
      )}
    </div>
  );
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('es-PE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}
