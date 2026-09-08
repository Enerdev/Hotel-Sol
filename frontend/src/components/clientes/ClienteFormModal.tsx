import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Modal } from '../dialogs/Modal';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { api, ApiError } from '../../services/api';
import type {
  Cliente,
  ClienteCreatePayload,
  TipoDocumento,
  TipoCliente,
  MotivoViaje,
} from '../../types';

interface ClienteFormModalProps {
  open: boolean;
  cliente?: Cliente | null;
  onClose: () => void;
  onSaved: (cliente: Cliente) => void;
}

const empty: ClienteCreatePayload = {
  tipo_documento: 'DNI',
  numero_documento: '',
  nombres: '',
  apellidos: '',
  nacionalidad: 'Peruana',
  procedencia: '',
  motivo_viaje: 'turismo',
  telefono: '',
  email: '',
  direccion: '',
  tipo_cliente: 'temporal',
  descuento_porcentaje: 0,
  fecha_nacimiento: '',
};

export function ClienteFormModal({
  open,
  cliente,
  onClose,
  onSaved,
}: ClienteFormModalProps) {
  const editando = !!cliente;
  const [form, setForm] = useState<ClienteCreatePayload>(empty);
  const [busy, setBusy] = useState(false);

  // Cargar datos al abrir si es edición
  useEffect(() => {
    if (open && cliente) {
      setForm({
        tipo_documento: cliente.tipo_documento,
        numero_documento: cliente.numero_documento,
        nombres: cliente.nombres,
        apellidos: cliente.apellidos,
        fecha_nacimiento: cliente.fecha_nacimiento ?? '',
        nacionalidad: cliente.nacionalidad,
        procedencia: cliente.procedencia ?? '',
        motivo_viaje: (cliente.motivo_viaje ?? 'turismo') as MotivoViaje,
        telefono: cliente.telefono ?? '',
        email: cliente.email ?? '',
        direccion: cliente.direccion ?? '',
        tipo_cliente: cliente.tipo_cliente,
        descuento_porcentaje: Number(cliente.descuento_porcentaje),
      });
    } else if (open) {
      setForm(empty);
    }
  }, [open, cliente]);

  function update<K extends keyof ClienteCreatePayload>(
    key: K,
    value: ClienteCreatePayload[K]
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      // Limpieza: convertir strings vacíos a null
      const payload: Record<string, unknown> = { ...form };
      for (const k of [
        'fecha_nacimiento',
        'procedencia',
        'telefono',
        'email',
        'direccion',
      ]) {
        if (payload[k] === '') payload[k] = null;
      }

      const saved = editando
        ? await api.put<Cliente>(`/clientes/${cliente!.id}`, payload)
        : await api.post<Cliente>('/clientes', payload);

      toast.success(
        editando
          ? `Cliente ${saved.nombres} actualizado`
          : `Cliente ${saved.nombres} creado`
      );
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Error al guardar el cliente');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar cliente' : 'Nuevo cliente'}
      description={
        editando
          ? 'Modifica los datos del cliente'
          : 'Registra un nuevo huésped en el sistema'
      }
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* DOCUMENTO */}
        <Section title="Documento de identidad">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="tipo_documento">Tipo</Label>
              <select
                id="tipo_documento"
                value={form.tipo_documento}
                onChange={(e) =>
                  update('tipo_documento', e.target.value as TipoDocumento)
                }
                className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
              >
                <option value="DNI">DNI</option>
                <option value="CI">CI</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="numero_documento">Número de documento</Label>
              <Input
                id="numero_documento"
                value={form.numero_documento}
                onChange={(e) => update('numero_documento', e.target.value)}
                placeholder="12345678"
                required
                className="mt-1"
              />
            </div>
          </div>
        </Section>

        {/* DATOS PERSONALES */}
        <Section title="Datos personales">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nombres">Nombres</Label>
              <Input
                id="nombres"
                value={form.nombres}
                onChange={(e) => update('nombres', e.target.value)}
                placeholder="Juan"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="apellidos">Apellidos</Label>
              <Input
                id="apellidos"
                value={form.apellidos}
                onChange={(e) => update('apellidos', e.target.value)}
                placeholder="Pérez García"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fecha_nacimiento">Fecha de nacimiento</Label>
              <Input
                id="fecha_nacimiento"
                type="date"
                value={form.fecha_nacimiento ?? ''}
                onChange={(e) => update('fecha_nacimiento', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="nacionalidad">Nacionalidad</Label>
              <Input
                id="nacionalidad"
                value={form.nacionalidad ?? ''}
                onChange={(e) => update('nacionalidad', e.target.value)}
                placeholder="Peruana"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="procedencia">Procedencia</Label>
              <Input
                id="procedencia"
                value={form.procedencia ?? ''}
                onChange={(e) => update('procedencia', e.target.value)}
                placeholder="Lima, Cusco, Arequipa..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="motivo_viaje">Motivo del viaje</Label>
              <select
                id="motivo_viaje"
                value={form.motivo_viaje ?? 'turismo'}
                onChange={(e) =>
                  update('motivo_viaje', e.target.value as MotivoViaje)
                }
                className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
              >
                <option value="turismo">Turismo</option>
                <option value="negocios">Negocios</option>
                <option value="salud">Salud</option>
                <option value="familia">Familia</option>
                <option value="transito">Tránsito</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
        </Section>

        {/* CONTACTO */}
        <Section title="Contacto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={form.telefono ?? ''}
                onChange={(e) => update('telefono', e.target.value)}
                placeholder="+51 987 654 321"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => update('email', e.target.value)}
                placeholder="cliente@ejemplo.com"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={form.direccion ?? ''}
                onChange={(e) => update('direccion', e.target.value)}
                placeholder="Av. Principal 123, Lima"
                className="mt-1"
              />
            </div>
          </div>
        </Section>

        {/* TIPO DE CLIENTE */}
        <Section title="Configuración">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="tipo_cliente">Tipo de cliente</Label>
              <select
                id="tipo_cliente"
                value={form.tipo_cliente ?? 'temporal'}
                onChange={(e) =>
                  update('tipo_cliente', e.target.value as TipoCliente)
                }
                className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
              >
                <option value="temporal">Temporal</option>
                <option value="frecuente">Frecuente</option>
              </select>
            </div>
            {form.tipo_cliente === 'frecuente' && (
              <div>
                <Label htmlFor="descuento">Descuento (%)</Label>
                <Input
                  id="descuento"
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={form.descuento_porcentaje ?? 0}
                  onChange={(e) =>
                    update('descuento_porcentaje', Number(e.target.value))
                  }
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </Section>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={busy}
          >
            Cancelar
          </Button>
          <Button type="submit" isLoading={busy}>
            {editando ? 'Guardar cambios' : 'Crear cliente'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-medium text-accent mb-2">{title}</h3>
      {children}
    </div>
  );
}
