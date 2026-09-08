import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Modal } from '../dialogs/Modal';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { api, ApiError } from '../../services/api';
import {
  MetodoPagoFields,
  validarMetodoPago,
  type MetodoPagoExt,
} from '../cobros/MetodoPagoFields';
import type { Producto, Habitacion } from '../../types';

interface VentaFormModalProps {
  open: boolean;
  productos: Producto[];
  habitaciones: Habitacion[];
  onClose: () => void;
  onSaved: () => void;
}

export function VentaFormModal({
  open,
  productos,
  habitaciones,
  onClose,
  onSaved,
}: VentaFormModalProps) {
  const [productoId, setProductoId] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState(1);
  const [habitacionId, setHabitacionId] = useState<number | ''>('');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoExt>('efectivo');
  const [numeroOperacion, setNumeroOperacion] = useState('');
  const [telefonoPago, setTelefonoPago] = useState('');
  const [notas, setNotas] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setProductoId('');
      setCantidad(1);
      setHabitacionId('');
      setMetodoPago('efectivo');
      setNumeroOperacion('');
      setTelefonoPago('');
      setNotas('');
    }
  }, [open]);

  const productoSel = productos.find((p) => p.id === productoId);
  const subtotal = productoSel ? Number(productoSel.precio) * cantidad : 0;
  const habsOcupadas = habitaciones.filter(
    (h) => h.estado_ocupacion === 'ocupada'
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!productoId) {
      toast.error('Selecciona un producto');
      return;
    }
    if (productoSel && productoSel.stock < cantidad) {
      toast.error(`Stock insuficiente. Disponible: ${productoSel.stock}`);
      return;
    }
    const errorMP = validarMetodoPago(metodoPago, numeroOperacion);
    if (errorMP) {
      toast.error(errorMP);
      return;
    }
    if (metodoPago === 'online') {
      toast.error('Método "online" no aplica para ventas. Usa otro método.');
      return;
    }

    setBusy(true);
    try {
      await api.post('/productos/ventas', {
        producto_id: Number(productoId),
        cantidad,
        habitacion_id: habitacionId === '' ? null : Number(habitacionId),
        metodo_pago: metodoPago,
        numero_operacion: numeroOperacion.trim() || null,
        telefono_pago: telefonoPago.trim() || null,
        notas: notas.trim() || null,
      });
      toast.success(
        `Venta registrada: ${cantidad}× ${productoSel?.nombre} = S/ ${subtotal.toFixed(2)}`
      );
      onSaved();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar venta"
      description="Cargar un producto a una habitación o venta directa"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="producto">Producto *</Label>
          <select
            id="producto"
            value={productoId}
            onChange={(e) =>
              setProductoId(e.target.value === '' ? '' : Number(e.target.value))
            }
            required
            className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
          >
            <option value="">— Seleccionar producto —</option>
            {productos
              .filter((p) => p.activo && p.stock > 0)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} · S/ {Number(p.precio).toFixed(2)} · stock: {p.stock}
                </option>
              ))}
          </select>
        </div>

        <div>
          <Label htmlFor="cantidad">Cantidad</Label>
          <Input
            id="cantidad"
            type="number"
            min={1}
            max={productoSel?.stock ?? 1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
            className="mt-1"
          />
          {productoSel && (
            <p className="text-xs text-text-muted mt-1">
              Stock disponible: {productoSel.stock} {productoSel.unidad_medida}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="habitacion">Habitación (opcional)</Label>
          <select
            id="habitacion"
            value={habitacionId}
            onChange={(e) =>
              setHabitacionId(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
          >
            <option value="">— Venta sin habitación asociada —</option>
            {habsOcupadas.map((h) => (
              <option key={h.id} value={h.id}>
                Hab. {h.numero} (Piso {h.piso})
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1">
            Solo se muestran habitaciones ocupadas
          </p>
        </div>

        {/* Método de pago con Yape/Plin */}
        <MetodoPagoFields
          metodo={metodoPago}
          onMetodoChange={setMetodoPago}
          numeroOperacion={numeroOperacion}
          onNumeroOperacionChange={setNumeroOperacion}
          telefonoPago={telefonoPago}
          onTelefonoPagoChange={setTelefonoPago}
          incluirOnline={false}
          idPrefix="venta"
        />

        <div>
          <Label htmlFor="notas">Notas (opcional)</Label>
          <textarea
            id="notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Ej: Cliente pidió 2 toallas extra"
            className="w-full mt-1 px-3 py-2 rounded-md bg-bg-elevated border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />
        </div>

        {productoSel && (
          <div className="bg-accent/5 border border-accent/30 rounded-md p-3 flex justify-between items-center">
            <span className="text-sm text-text-secondary">Total a cobrar</span>
            <span className="text-xl font-semibold text-accent tabular-nums">
              S/ {subtotal.toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={busy} disabled={!productoId}>
            Registrar venta
          </Button>
        </div>
      </form>
    </Modal>
  );
}
