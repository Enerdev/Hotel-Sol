import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Modal } from '../dialogs/Modal';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { api, ApiError } from '../../services/api';
import type { Producto } from '../../types';

interface ProductoFormModalProps {
  open: boolean;
  producto?: Producto | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  unidad_medida: string;
  categoria: string;
}

const empty: FormState = {
  nombre: '',
  descripcion: '',
  precio: 0,
  stock: 0,
  unidad_medida: 'unidad',
  categoria: 'general',
};

const SUGERENCIAS_CATEGORIA = [
  'general',
  'aseo personal',
  'comida',
  'bebidas',
  'snacks',
  'ropa de cama',
  'amenities',
  'servicios',
];

export function ProductoFormModal({
  open,
  producto,
  onClose,
  onSaved,
}: ProductoFormModalProps) {
  const editando = !!producto;
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && producto) {
      setForm({
        nombre: producto.nombre,
        descripcion: producto.descripcion ?? '',
        precio: Number(producto.precio),
        stock: producto.stock,
        unidad_medida: producto.unidad_medida,
        categoria: producto.categoria,
      });
    } else if (open) {
      setForm(empty);
    }
  }, [open, producto]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        descripcion: form.descripcion.trim() || null,
      };
      if (editando) {
        await api.put(`/productos/${producto!.id}`, payload);
        toast.success(`Producto "${form.nombre}" actualizado`);
      } else {
        await api.post('/productos', payload);
        toast.success(`Producto "${form.nombre}" creado`);
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
      title={editando ? `Editar ${producto?.nombre}` : 'Nuevo producto'}
      description="Productos para venta directa o consumo del hotel"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="nombre">Nombre del producto *</Label>
          <Input
            id="nombre"
            value={form.nombre}
            onChange={(e) => update('nombre', e.target.value)}
            placeholder="Ej: Cepillo de dientes, Botella de agua, Toalla extra..."
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="descripcion">Descripción</Label>
          <textarea
            id="descripcion"
            value={form.descripcion}
            onChange={(e) => update('descripcion', e.target.value)}
            rows={2}
            placeholder="Detalles del producto..."
            className="w-full mt-1 px-3 py-2 rounded-md bg-bg-elevated border border-border-color text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="precio">Precio (S/) *</Label>
            <Input
              id="precio"
              type="number"
              min={0}
              step="0.01"
              value={form.precio}
              onChange={(e) => update('precio', Number(e.target.value))}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="stock">Stock inicial</Label>
            <Input
              id="stock"
              type="number"
              min={0}
              step={1}
              value={form.stock}
              onChange={(e) => update('stock', Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="unidad_medida">Unidad</Label>
            <Input
              id="unidad_medida"
              value={form.unidad_medida}
              onChange={(e) => update('unidad_medida', e.target.value)}
              placeholder="unidad, kg, litro..."
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="categoria">Categoría</Label>
            <Input
              id="categoria"
              value={form.categoria}
              onChange={(e) => update('categoria', e.target.value)}
              list="categorias-sugeridas"
              className="mt-1"
            />
            <datalist id="categorias-sugeridas">
              {SUGERENCIAS_CATEGORIA.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={busy}>
            {editando ? 'Guardar' : 'Crear producto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
