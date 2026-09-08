import { useState, useEffect } from 'react';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Smartphone, AlertCircle, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';

export type MetodoPagoExt =
  | 'efectivo'
  | 'tarjeta'
  | 'yape'
  | 'plin'
  | 'transferencia'
  | 'online';

interface MetodoPagoFieldsProps {
  metodo: MetodoPagoExt;
  onMetodoChange: (m: MetodoPagoExt) => void;
  numeroOperacion: string;
  onNumeroOperacionChange: (s: string) => void;
  telefonoPago: string;
  onTelefonoPagoChange: (s: string) => void;
  /** Monto total a cobrar (para calcular vuelto en efectivo) */
  montoTotal?: number;
  /** Incluir 'online' en las opciones (por defecto sí) */
  incluirOnline?: boolean;
  idPrefix?: string;
  /** Callback para notificar si el pago está confirmado (checkbox yape/plin) */
  onConfirmadoChange?: (confirmado: boolean) => void;
}

const METODO_LABEL: Record<MetodoPagoExt, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
  online: 'Online',
};

export const REQUIERE_OPERACION: MetodoPagoExt[] = [
  'yape',
  'plin',
  'transferencia',
];

export function MetodoPagoFields({
  metodo,
  onMetodoChange,
  numeroOperacion,
  onNumeroOperacionChange,
  telefonoPago,
  onTelefonoPagoChange,
  montoTotal = 0,
  incluirOnline = true,
  idPrefix = 'mp',
  onConfirmadoChange,
}: MetodoPagoFieldsProps) {
  const requiereOperacion = REQUIERE_OPERACION.includes(metodo);

  // Estado local para efectivo
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const vuelto =
    montoTotal > 0 && montoRecibido !== ''
      ? Math.max(0, Number(montoRecibido) - montoTotal)
      : null;
  const faltante =
    montoTotal > 0 && montoRecibido !== ''
      ? Math.max(0, montoTotal - Number(montoRecibido))
      : null;

  // Estado local para yape/plin confirmación
  const [comprobante, setComprobante] = useState(false);

  // Estado local para tarjeta voucher
  const [serieVoucher, setSerieVoucher] = useState('');

  // Resetear campos locales al cambiar método
  useEffect(() => {
    setMontoRecibido('');
    setComprobante(false);
    setSerieVoucher('');
    onNumeroOperacionChange('');
    onTelefonoPagoChange('');
    onConfirmadoChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metodo]);

  // Propagar confirmado al padre
  useEffect(() => {
    if (metodo === 'yape' || metodo === 'plin') {
      onConfirmadoChange?.(comprobante);
    } else {
      onConfirmadoChange?.(true); // otros métodos no requieren checkbox
    }
  }, [comprobante, metodo, onConfirmadoChange]);

  // Guardar serie voucher en numeroOperacion para tarjeta
  useEffect(() => {
    if (metodo === 'tarjeta') {
      onNumeroOperacionChange(serieVoucher);
    }
  }, [serieVoucher, metodo, onNumeroOperacionChange]);

  const opciones: MetodoPagoExt[] = [
    'efectivo',
    'tarjeta',
    'yape',
    'plin',
    'transferencia',
  ];
  if (incluirOnline) opciones.push('online');

  return (
    <div className="space-y-3">
      {/* Selector de método */}
      <div>
        <Label htmlFor={`${idPrefix}-metodo`}>Método de pago *</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {opciones.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMetodoChange(m)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition ${
                metodo === m
                  ? 'bg-accent/10 border-accent text-accent'
                  : 'bg-bg-elevated border-border-color text-text-secondary hover:border-accent/40'
              }`}
            >
              {m === 'efectivo' && <Banknote className="size-4 shrink-0" />}
              {(m === 'yape' || m === 'plin') && <Smartphone className="size-4 shrink-0" />}
              {m === 'tarjeta' && <CreditCard className="size-4 shrink-0" />}
              {(m === 'transferencia' || m === 'online') && <Banknote className="size-4 shrink-0" />}
              {METODO_LABEL[m]}
            </button>
          ))}
        </div>
      </div>

      {/* ── EFECTIVO ── */}
      {metodo === 'efectivo' && montoTotal > 0 && (
        <div className="bg-success/5 border border-success/30 rounded-md p-3 space-y-3">
          <div className="flex items-center gap-2 text-success text-xs font-medium">
            <Banknote className="size-4 shrink-0" />
            Pago en efectivo
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-recibido`}>Monto recibido S/ *</Label>
            <Input
              id={`${idPrefix}-recibido`}
              type="number"
              min={0}
              step="0.50"
              value={montoRecibido}
              onChange={(e) => setMontoRecibido(e.target.value)}
              placeholder={`Mín. S/ ${montoTotal.toFixed(2)}`}
              className="mt-1 text-lg font-semibold"
            />
          </div>
          {montoRecibido !== '' && (
            <div className={`flex justify-between items-center p-2 rounded-md ${
              faltante && faltante > 0
                ? 'bg-danger/10 border border-danger/30'
                : 'bg-success/10 border border-success/30'
            }`}>
              {faltante && faltante > 0 ? (
                <>
                  <span className="text-xs text-danger font-medium flex items-center gap-1">
                    <AlertCircle className="size-3" /> Falta por cobrar
                  </span>
                  <span className="text-sm font-bold text-danger">S/ {faltante.toFixed(2)}</span>
                </>
              ) : (
                <>
                  <span className="text-xs text-success font-medium flex items-center gap-1">
                    <CheckCircle2 className="size-3" /> Vuelto a entregar
                  </span>
                  <span className="text-sm font-bold text-success">S/ {vuelto!.toFixed(2)}</span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── YAPE / PLIN ── */}
      {(metodo === 'yape' || metodo === 'plin') && (
        <div className="bg-info/5 border border-info/30 rounded-md p-3 space-y-3">
          <div className="flex items-start gap-2 text-info text-xs">
            <Smartphone className="size-4 shrink-0 mt-0.5" />
            <p>
              Pide al cliente que muestre el comprobante en su celular.
              Verifica el monto y registra el código de operación.
            </p>
          </div>

          <div>
            <Label htmlFor={`${idPrefix}-op`}>
              Código de operación <span className="text-danger">*</span>
            </Label>
            <Input
              id={`${idPrefix}-op`}
              value={numeroOperacion}
              onChange={(e) => onNumeroOperacionChange(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 12345678"
              maxLength={12}
              className="mt-1 font-mono tracking-widest"
            />
          </div>

          <div>
            <Label htmlFor={`${idPrefix}-tel`}>
              Últimos 3 dígitos del teléfono que pagó{' '}
              <span className="text-text-muted text-xs">(opcional)</span>
            </Label>
            <Input
              id={`${idPrefix}-tel`}
              value={telefonoPago}
              onChange={(e) => onTelefonoPagoChange(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 567"
              maxLength={3}
              className="mt-1"
            />
            <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
              <AlertCircle className="size-3" />
              Sirve para verificar luego en tu app de {METODO_LABEL[metodo]}
            </p>
          </div>

          {/* Checkbox confirmación manual */}
          <label
            htmlFor={`${idPrefix}-confirmado`}
            className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition ${
              comprobante
                ? 'bg-success/10 border-success/50'
                : 'bg-bg-elevated border-border-color hover:border-accent/40'
            }`}
          >
            <input
              id={`${idPrefix}-confirmado`}
              type="checkbox"
              checked={comprobante}
              onChange={(e) => setComprobante(e.target.checked)}
              className="mt-0.5 accent-[var(--color-success)]"
            />
            <div>
              <p className={`text-sm font-medium ${comprobante ? 'text-success' : 'text-text-primary'}`}>
                {comprobante ? '✓ Comprobante verificado' : 'Verificar comprobante'}
              </p>
              <p className="text-xs text-text-muted">
                Confirmo que vi el comprobante del cliente en su celular y el monto es correcto
              </p>
            </div>
          </label>

          {!comprobante && (
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertCircle className="size-3 shrink-0" />
              Debes verificar el comprobante antes de confirmar el cobro
            </p>
          )}
        </div>
      )}

      {/* ── TARJETA ── */}
      {metodo === 'tarjeta' && (
        <div className="bg-bg-elevated border border-border-color rounded-md p-3 space-y-3">
          <div className="flex items-center gap-2 text-text-secondary text-xs font-medium">
            <CreditCard className="size-4 shrink-0" />
            Pago con tarjeta
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-voucher`}>
              N° de serie / voucher <span className="text-danger">*</span>
            </Label>
            <Input
              id={`${idPrefix}-voucher`}
              value={serieVoucher}
              onChange={(e) => setSerieVoucher(e.target.value)}
              placeholder="Ej: TKT-00123456"
              className="mt-1 font-mono"
            />
            <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
              <AlertCircle className="size-3" />
              Número que aparece impreso en el voucher del POS
            </p>
          </div>
        </div>
      )}

      {/* ── TRANSFERENCIA ── */}
      {metodo === 'transferencia' && (
        <div className="bg-bg-elevated border border-border-color rounded-md p-3 space-y-3">
          <div>
            <Label htmlFor={`${idPrefix}-op`}>
              N° de operación <span className="text-danger">*</span>
            </Label>
            <Input
              id={`${idPrefix}-op`}
              value={numeroOperacion}
              onChange={(e) => onNumeroOperacionChange(e.target.value)}
              placeholder="Ej: 000123456789"
              className="mt-1 font-mono"
            />
          </div>
          <div>
            <Label htmlFor={`${idPrefix}-tel`}>Banco / referencia (opcional)</Label>
            <Input
              id={`${idPrefix}-tel`}
              value={telefonoPago}
              onChange={(e) => onTelefonoPagoChange(e.target.value)}
              placeholder="Ej: BCP, Interbank..."
              className="mt-1"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function validarMetodoPago(
  metodo: MetodoPagoExt,
  numeroOperacion: string,
  extras?: {
    confirmado?: boolean;
    montoRecibido?: number;
    montoTotal?: number;
  }
): string | null {
  if (REQUIERE_OPERACION.includes(metodo) && !numeroOperacion.trim()) {
    return `Para ${METODO_LABEL[metodo]} es obligatorio el N° de operación`;
  }
  if ((metodo === 'yape' || metodo === 'plin') && extras?.confirmado === false) {
    return 'Debes verificar el comprobante del cliente antes de confirmar';
  }
  if (metodo === 'tarjeta' && !numeroOperacion.trim()) {
    return 'Para tarjeta es obligatorio el N° de serie/voucher';
  }
  if (
    metodo === 'efectivo' &&
    extras?.montoTotal !== undefined &&
    extras?.montoRecibido !== undefined &&
    extras.montoRecibido < extras.montoTotal
  ) {
    return `El monto recibido (S/ ${extras.montoRecibido.toFixed(2)}) es menor al total (S/ ${extras.montoTotal.toFixed(2)})`;
  }
  return null;
}
