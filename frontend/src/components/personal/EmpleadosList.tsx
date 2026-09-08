import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, User, Loader2, Pencil, Power, PowerOff, Star, Sparkles, BedDouble } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { EmpleadoFormModal } from './EmpleadoFormModal';
import { ROL_LABEL, TURNO_LABEL } from '../../types';
import { cn } from '../../lib/cn';
import type { Empleado, Rol } from '../../types';

const ROL_COLOR: Record<Rol, string> = {
  admin: 'bg-accent/15 text-accent border-accent/40',
  recepcionista: 'bg-info/15 text-info border-info/40',
  limpieza: 'bg-success/15 text-success border-success/40',
};

const ROL_ICON: Record<Rol, typeof User> = {
  admin: Star,
  recepcionista: BedDouble,
  limpieza: Sparkles,
};

export function EmpleadosList() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filtro, setFiltro] = useState<Rol | 'todos'>('todos');
  const [editando, setEditando] = useState<Empleado | null>(null);
  const [creando, setCreando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await api.get<Empleado[]>('/personal');
      setEmpleados(data);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleSaved = () => {
    setCreando(false);
    setEditando(null);
    cargar();
  };

  const toggleActivo = async (e: Empleado) => {
    const nuevoEstado = !e.activo;
    const accion = nuevoEstado ? 'activar' : 'desactivar';
    if (!confirm(`¿${accion === 'activar' ? 'Activar' : 'Desactivar'} a ${e.nombres} ${e.apellidos}?`)) {
      return;
    }
    try {
      await api.post(`/personal/${e.id}/${accion}`);
      toast.success(`Empleado ${accion === 'activar' ? 'activado' : 'desactivado'}`);
      cargar();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Error');
    }
  };

  const filtrados =
    filtro === 'todos' ? empleados : empleados.filter((e) => e.rol === filtro);

  return (
    <div className="space-y-4">
      {/* Filtros + botón crear */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(['todos', 'admin', 'recepcionista', 'limpieza'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium border transition',
                filtro === f
                  ? 'bg-accent/15 text-accent border-accent/50'
                  : 'bg-bg-elevated text-text-secondary border-border-color hover:text-text-primary'
              )}
            >
              {f === 'todos' ? 'Todos' : ROL_LABEL[f]}
              <span className="ml-2 text-xs text-text-muted">
                {f === 'todos'
                  ? empleados.length
                  : empleados.filter((e) => e.rol === f).length}
              </span>
            </button>
          ))}
        </div>
        <Button onClick={() => setCreando(true)}>
          <Plus className="size-4" />
          Nuevo empleado
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 text-accent animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
          Error: {error}
        </div>
      )}

      {/* Lista */}
      {!loading && filtrados.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-text-secondary">No hay empleados con ese rol</p>
          </CardContent>
        </Card>
      )}

      {!loading && filtrados.length > 0 && (
        <div className="space-y-2">
          {filtrados.map((e) => {
            const Icon = ROL_ICON[e.rol];
            return (
              <Card
                key={e.id}
                className={cn('transition', !e.activo && 'opacity-60')}
              >
                <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                  {/* Avatar */}
                  <div className="size-12 rounded-full bg-bg-elevated border border-border-color flex items-center justify-center shrink-0">
                    <User className="size-5 text-text-secondary" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-text-primary">
                        {e.nombres} {e.apellidos}
                      </p>
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium border inline-flex items-center gap-1',
                          ROL_COLOR[e.rol]
                        )}
                      >
                        <Icon className="size-3" />
                        {ROL_LABEL[e.rol]}
                      </span>
                      {!e.activo && (
                        <span className="px-2 py-0.5 rounded-full bg-danger/15 text-danger text-xs font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary mt-1 flex items-center gap-3 flex-wrap">
                      <span>@{e.username}</span>
                      {e.dni && <span>· DNI {e.dni}</span>}
                      {e.turno && <span>· Turno {TURNO_LABEL[e.turno]}</span>}
                      {e.hora_inicio_turno && e.hora_fin_turno && (
                        <span>
                          ({e.hora_inicio_turno.slice(0, 5)}–{e.hora_fin_turno.slice(0, 5)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditando(e)}
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant={e.activo ? 'outline' : 'primary'}
                      size="sm"
                      onClick={() => toggleActivo(e)}
                    >
                      {e.activo ? (
                        <>
                          <PowerOff className="size-3.5" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Power className="size-3.5" />
                          Activar
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EmpleadoFormModal
        open={creando || !!editando}
        empleado={editando}
        onClose={() => {
          setCreando(false);
          setEditando(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
