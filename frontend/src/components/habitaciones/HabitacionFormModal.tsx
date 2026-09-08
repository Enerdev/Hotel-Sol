import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, BedDouble, Bath, Tv, Wifi, Flame, Wind } from 'lucide-react';
import { Modal } from '../dialogs/Modal';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { api, ApiError } from '../../services/api';
import { TIPO_HABITACION_LABEL } from '../../types';
import type { Habitacion, TipoHabitacion } from '../../types';

type TipoCama =
  | 'individual'
  | 'matrimonial'
  | 'queen'
  | 'king'
  | 'litera_individual'
  | 'litera_matrimonial'
  | 'sofa_cama';

const TIPO_CAMA_LABEL: Record<TipoCama, string> = {
  individual: 'Individual',
  matrimonial: 'Matrimonial',
  queen: 'Queen',
  king: 'King',
  litera_individual: 'Litera individual',
  litera_matrimonial: 'Litera matrimonial',
  sofa_cama: 'Sofá cama',
};

const TIPOS_HAB: TipoHabitacion[] = [
  'matrimonial_privada_ducha',
  'matrimonial_bano',
  'tv_cable',
  'simple',
  'doble_privada',
  'doble_tv_cable',
];

interface CamaForm {
  tipo_cama: TipoCama;
  cantidad: number;
}

interface HabitacionFormModalProps {
  open: boolean;
  habitacion?: Habitacion | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  numero: string;
  piso: number;
  tipo: TipoHabitacion;
  capacidad: number;
  bano_privado: boolean;
  tiene_ducha: boolean;
  bano_con_jacuzzi: boolean;
  tiene_tv: boolean;
  tiene_control_remoto: boolean;
  tiene_cable_tv: boolean;
  tiene_wifi: boolean;
  tiene_calefaccion: boolean;
  tiene_ventana: boolean;
  tiene_balcon: boolean;
  precio_base_noche: number;
  notas: string;
  estado_ocupacion: 'disponible' | 'fuera_de_servicio';
  camas: CamaForm[];
}

const emptyForm: FormState = {
  numero: '',
  piso: 2,
  tipo: 'matrimonial_privada_ducha',
  capacidad: 1,
  bano_privado: true,
  tiene_ducha: true,
  bano_con_jacuzzi: false,
  tiene_tv: false,
  tiene_control_remoto: false,
  tiene_cable_tv: false,
  tiene_wifi: true,
  tiene_calefaccion: false,
  tiene_ventana: true,
  tiene_balcon: false,
  precio_base_noche: 0,
  notas: '',
  estado_ocupacion: 'disponible',
  camas: [{ tipo_cama: 'matrimonial', cantidad: 1 }],
};

export function HabitacionFormModal({
  open,
  habitacion,
  onClose,
  onSaved,
}: HabitacionFormModalProps) {
  const editando = !!habitacion;
  const [form, setForm] = useState<FormState>(emptyForm);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (habitacion) {
      setForm({
        numero: habitacion.numero,
        piso: habitacion.piso,
        tipo: habitacion.tipo,
        capacidad: habitacion.capacidad,
        bano_privado: !!habitacion.bano_privado,
        tiene_ducha: !!habitacion.tiene_ducha,
        bano_con_jacuzzi: !!habitacion.bano_con_jacuzzi,
        tiene_tv: !!habitacion.tiene_tv,
        tiene_control_remoto: !!habitacion.tiene_control_remoto,
        tiene_cable_tv: !!habitacion.tiene_cable_tv,
        tiene_wifi: !!habitacion.tiene_wifi,
        tiene_calefaccion: !!habitacion.tiene_calefaccion,
        tiene_ventana: !!habitacion.tiene_ventana,
        tiene_balcon: !!habitacion.tiene_balcon,
        precio_base_noche: Number(habitacion.precio_base_noche) || 0,
        notas: habitacion.notas ?? '',
        estado_ocupacion:
          habitacion.estado_ocupacion === 'fuera_de_servicio'
            ? 'fuera_de_servicio'
            : 'disponible',
        camas:
          (habitacion.camas ?? []).map((c) => ({
            tipo_cama: c.tipo_cama as TipoCama,
            cantidad: c.cantidad,
          })) || [],
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, habitacion]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addCama() {
    setForm((f) => ({
      ...f,
      camas: [...f.camas, { tipo_cama: 'individual', cantidad: 1 }],
    }));
  }
  function removeCama(idx: number) {
    setForm((f) => ({
      ...f,
      camas: f.camas.filter((_, i) => i !== idx),
    }));
  }
  function updateCama(idx: number, key: keyof CamaForm, value: TipoCama | number) {
    setForm((f) => ({
      ...f,
      camas: f.camas.map((c, i) =>
        i === idx ? { ...c, [key]: value } : c
      ),
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.numero.trim()) {
      toast.error('El número de habitación es obligatorio');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        notas: form.notas.trim() || null,
      };
      if (editando) {
        await api.put(`/habitaciones/${habitacion!.id}`, payload);
        toast.success(`Habitación ${form.numero} actualizada`);
      } else {
        await api.post('/habitaciones', payload);
        toast.success(`Habitación ${form.numero} creada`);
      }
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
      title={editando ? `Editar habitación ${habitacion?.numero}` : 'Nueva habitación'}
      description="Configura todos los detalles de la habitación"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Datos básicos */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <BedDouble className="size-4 text-accent" />
            Datos básicos
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="numero">Número *</Label>
              <Input
                id="numero"
                value={form.numero}
                onChange={(e) => update('numero', e.target.value)}
                placeholder="Ej: 201"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="piso">Piso *</Label>
              <Input
                id="piso"
                type="number"
                min={1}
                max={20}
                value={form.piso}
                onChange={(e) => update('piso', Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="tipo">Tipo de habitación *</Label>
              <select
                id="tipo"
                value={form.tipo}
                onChange={(e) => update('tipo', e.target.value as TipoHabitacion)}
                className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
              >
                {TIPOS_HAB.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_HABITACION_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cap">Capacidad (personas)</Label>
              <Input
                id="cap"
                type="number"
                min={1}
                max={10}
                value={form.capacidad}
                onChange={(e) => update('capacidad', Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="precio">Precio base por noche (S/)</Label>
              <Input
                id="precio"
                type="number"
                min={0}
                step="0.01"
                value={form.precio_base_noche}
                onChange={(e) =>
                  update('precio_base_noche', Number(e.target.value))
                }
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="estado">Estado inicial</Label>
              <select
                id="estado"
                value={form.estado_ocupacion}
                onChange={(e) =>
                  update('estado_ocupacion', e.target.value as 'disponible' | 'fuera_de_servicio')
                }
                className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
              >
                <option value="disponible">Disponible (lista para usar)</option>
                <option value="fuera_de_servicio">
                  Fuera de servicio (en construcción/reparación)
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Baño */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Bath className="size-4 text-accent" />
            Baño
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Checkbox
              label="Baño privado"
              checked={form.bano_privado}
              onChange={(v) => update('bano_privado', v)}
            />
            <Checkbox
              label="Tiene ducha"
              checked={form.tiene_ducha}
              onChange={(v) => update('tiene_ducha', v)}
            />
            <Checkbox
              label="Con jacuzzi"
              checked={form.bano_con_jacuzzi}
              onChange={(v) => update('bano_con_jacuzzi', v)}
            />
          </div>
        </div>

        {/* TV */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Tv className="size-4 text-accent" />
            TV y entretenimiento
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <Checkbox
              label="Tiene TV"
              checked={form.tiene_tv}
              onChange={(v) => update('tiene_tv', v)}
            />
            <Checkbox
              label="Control remoto"
              checked={form.tiene_control_remoto}
              onChange={(v) => update('tiene_control_remoto', v)}
            />
            <Checkbox
              label="Cable TV"
              checked={form.tiene_cable_tv}
              onChange={(v) => update('tiene_cable_tv', v)}
            />
          </div>
        </div>

        {/* Comodidades */}
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Wifi className="size-4 text-accent" />
            Comodidades
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Checkbox
              label="WiFi"
              checked={form.tiene_wifi}
              onChange={(v) => update('tiene_wifi', v)}
            />
            <Checkbox
              label="Calefacción"
              checked={form.tiene_calefaccion}
              onChange={(v) => update('tiene_calefaccion', v)}
              icon={Flame}
            />
            <Checkbox
              label="Tiene ventana"
              checked={form.tiene_ventana}
              onChange={(v) => update('tiene_ventana', v)}
              icon={Wind}
            />
            <Checkbox
              label="Tiene balcón"
              checked={form.tiene_balcon}
              onChange={(v) => update('tiene_balcon', v)}
            />
          </div>
        </div>

        {/* Camas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <BedDouble className="size-4 text-accent" />
              Camas en la habitación
            </h3>
            <Button type="button" variant="outline" size="sm" onClick={addCama}>
              <Plus className="size-3.5" />
              Agregar cama
            </Button>
          </div>
          {form.camas.length === 0 ? (
            <p className="text-xs text-text-muted">Sin camas configuradas</p>
          ) : (
            <div className="space-y-2">
              {form.camas.map((cama, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={cama.tipo_cama}
                    onChange={(e) =>
                      updateCama(idx, 'tipo_cama', e.target.value as TipoCama)
                    }
                    className="flex-1 h-9 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary text-sm"
                  >
                    {(Object.keys(TIPO_CAMA_LABEL) as TipoCama[]).map((t) => (
                      <option key={t} value={t}>
                        {TIPO_CAMA_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    value={cama.cantidad}
                    onChange={(e) =>
                      updateCama(idx, 'cantidad', Number(e.target.value))
                    }
                    className="w-20 h-9"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCama(idx)}
                    className="text-danger hover:bg-danger/10"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notas */}
        <div>
          <Label htmlFor="notas">Notas (opcional)</Label>
          <textarea
            id="notas"
            value={form.notas}
            onChange={(e) => update('notas', e.target.value)}
            rows={2}
            placeholder="Ej: Habitación con vista al lago, recién pintada..."
            className="w-full mt-1 px-3 py-2 rounded-md bg-bg-elevated border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={busy}>
            {editando ? 'Guardar cambios' : 'Crear habitación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
  icon: Icon,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: typeof BedDouble;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 rounded border-border-color bg-bg-elevated text-accent focus:ring-1 focus:ring-accent"
      />
      <span className="text-sm text-text-secondary flex items-center gap-1">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
    </label>
  );
}
