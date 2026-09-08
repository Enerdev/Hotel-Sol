import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Modal } from '../dialogs/Modal';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { api, ApiError } from '../../services/api';
import type { Empleado, Rol, Turno } from '../../types';

interface EmpleadoFormModalProps {
  open: boolean;
  empleado?: Empleado | null;
  onClose: () => void;
  onSaved: (empleado: Empleado) => void;
}

interface FormState {
  username: string;
  password: string;
  nombres: string;
  apellidos: string;
  dni: string;
  email: string;
  telefono: string;
  rol: Rol;
  rol_secundario: 'recepcionista' | 'limpieza' | '';
  turno: Turno | '';
  hora_inicio_turno: string;
  hora_fin_turno: string;
  salario: string;
}

const empty: FormState = {
  username: '',
  password: '',
  nombres: '',
  apellidos: '',
  dni: '',
  email: '',
  telefono: '',
  rol: 'limpieza',
  rol_secundario: '',
  turno: '',
  hora_inicio_turno: '',
  hora_fin_turno: '',
  salario: '',
};

export function EmpleadoFormModal({
  open,
  empleado,
  onClose,
  onSaved,
}: EmpleadoFormModalProps) {
  const editando = !!empleado;
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && empleado) {
      setForm({
        username: empleado.username,
        password: '',
        nombres: empleado.nombres,
        apellidos: empleado.apellidos,
        dni: empleado.dni ?? '',
        email: empleado.email ?? '',
        telefono: empleado.telefono ?? '',
        rol: empleado.rol,
        rol_secundario: (empleado.rol_secundario ?? '') as 'recepcionista' | 'limpieza' | '',
        turno: (empleado.turno ?? '') as Turno | '',
        hora_inicio_turno: empleado.hora_inicio_turno?.slice(0, 5) ?? '',
        hora_fin_turno: empleado.hora_fin_turno?.slice(0, 5) ?? '',
        salario: empleado.salario ?? '',
      });
    } else if (open) {
      setForm(empty);
    }
  }, [open, empleado]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Opciones de rol secundario disponibles según rol principal
  function rolesSecundariosDisponibles(): { value: string; label: string }[] {
    if (form.rol === 'recepcionista') return [{ value: 'limpieza', label: 'Limpieza' }];
    if (form.rol === 'limpieza') return [{ value: 'recepcionista', label: 'Recepcionista' }];
    return [];
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!editando && form.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!form.nombres || !form.apellidos) {
      toast.error('Nombres y apellidos son obligatorios');
      return;
    }

    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        nombres: form.nombres,
        apellidos: form.apellidos,
        dni: form.dni || null,
        email: form.email || null,
        telefono: form.telefono || null,
        rol: form.rol,
        rol_secundario: form.rol_secundario || null,
        turno: form.turno || null,
        hora_inicio_turno: form.hora_inicio_turno ? `${form.hora_inicio_turno}:00` : null,
        hora_fin_turno: form.hora_fin_turno ? `${form.hora_fin_turno}:00` : null,
        salario: form.salario ? Number(form.salario) : null,
      };

      if (!editando) {
        payload.username = form.username;
        payload.password = form.password;
      } else if (form.password) {
        payload.password = form.password;
      }

      const saved = editando
        ? await api.put<Empleado>(`/personal/${empleado!.id}`, payload)
        : await api.post<Empleado>('/personal', payload);

      toast.success(editando ? `Empleado ${saved.nombres} actualizado` : `Empleado ${saved.nombres} creado`);
      onSaved(saved);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  const rolesSecundarios = rolesSecundariosDisponibles();

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? `Editar empleado: ${empleado?.nombres}` : 'Nuevo empleado'}
      description={editando ? 'Modifica los datos del empleado' : 'Registra un nuevo empleado en el sistema'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CREDENCIALES */}
        <Section title="Acceso al sistema">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" value={form.username}
                onChange={(e) => update('username', e.target.value)}
                placeholder="ej: limpieza3" required disabled={editando} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="password">
                Contraseña {editando && '(dejar vacío para no cambiar)'}
              </Label>
              <Input id="password" type="password" value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder={editando ? '••••••' : 'Mínimo 6 caracteres'}
                required={!editando}
                minLength={editando && !form.password ? 0 : 6}
                className="mt-1" />
            </div>
          </div>
        </Section>

        {/* DATOS PERSONALES */}
        <Section title="Datos personales">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nombres">Nombres *</Label>
              <Input id="nombres" value={form.nombres}
                onChange={(e) => update('nombres', e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input id="apellidos" value={form.apellidos}
                onChange={(e) => update('apellidos', e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="dni">DNI</Label>
              <Input id="dni" value={form.dni}
                onChange={(e) => update('dni', e.target.value)} placeholder="12345678" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" value={form.telefono}
                onChange={(e) => update('telefono', e.target.value)} placeholder="+51 987 654 321" className="mt-1" />
            </div>
            <div className="col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email}
                onChange={(e) => update('email', e.target.value)} placeholder="empleado@hotel.local" className="mt-1" />
            </div>
          </div>
        </Section>

        {/* PUESTO Y TURNO */}
        <Section title="Puesto y turno">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rol">Rol principal *</Label>
              <select id="rol" value={form.rol}
                onChange={(e) => { update('rol', e.target.value as Rol); update('rol_secundario', ''); }}
                className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
              >
                <option value="limpieza">Limpieza</option>
                <option value="recepcionista">Recepcionista</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div>
              <Label htmlFor="rol_secundario">Rol secundario (acceso extra)</Label>
              <select id="rol_secundario" value={form.rol_secundario}
                onChange={(e) => update('rol_secundario', e.target.value as 'recepcionista' | 'limpieza' | '')}
                className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
                disabled={rolesSecundarios.length === 0}
              >
                <option value="">Sin rol secundario</option>
                {rolesSecundarios.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              {form.rol === 'admin' && (
                <p className="text-xs text-text-muted mt-1">El administrador ya tiene acceso completo.</p>
              )}
              {form.rol_secundario && (
                <p className="text-xs text-info mt-1">
                  Este empleado tendrá acceso a los módulos de {form.rol_secundario === 'limpieza' ? 'Limpieza' : 'Recepción'}.
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="turno">Turno</Label>
              <select id="turno" value={form.turno}
                onChange={(e) => update('turno', e.target.value as Turno | '')}
                className="w-full h-10 px-3 rounded-md bg-bg-elevated border border-border-color text-text-primary mt-1"
              >
                <option value="">Sin asignar</option>
                <option value="mañana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
                <option value="rotativo">Rotativo</option>
              </select>
            </div>
            <div>
              <Label htmlFor="salario">Salario base mensual (S/)</Label>
              <Input id="salario" type="number" min={0} step="0.01" value={form.salario}
                onChange={(e) => update('salario', e.target.value)}
                placeholder="ej: 1500.00" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="hora_inicio">Hora inicio turno</Label>
              <Input id="hora_inicio" type="time" value={form.hora_inicio_turno}
                onChange={(e) => update('hora_inicio_turno', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="hora_fin">Hora fin turno</Label>
              <Input id="hora_fin" type="time" value={form.hora_fin_turno}
                onChange={(e) => update('hora_fin_turno', e.target.value)} className="mt-1" />
            </div>
          </div>
        </Section>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border-color">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" isLoading={busy}>
            {editando ? 'Guardar cambios' : 'Crear empleado'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-accent mb-2">{title}</h3>
      {children}
    </div>
  );
}
