import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Calendar, Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';

interface PeriodoEspecial {
  id: number;
  nombre: string;
  tipo: 'semana' | 'fiestas' | 'agosto' | 'personalizado';
  fecha_inicio: string;
  fecha_fin: string;
  activo: number;
  created_at: string;
}

const TIPO_COLOR: Record<string, string> = {
  semana:        'bg-blue-500/10 border-blue-500/40 text-blue-400',
  fiestas:       'bg-orange-500/10 border-orange-500/40 text-orange-400',
  agosto:        'bg-red-500/10 border-red-500/40 text-red-400',
  personalizado: 'bg-purple-500/10 border-purple-500/40 text-purple-400',
};

const TIPO_LABEL: Record<string, string> = {
  semana:        'Fin de semana / Semana especial',
  fiestas:       'Fiestas regionales',
  agosto:        'Agosto / Fiestas Patrias',
  personalizado: 'Personalizado',
};

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function TarifasPorTemporada() {
  const [periodos, setPeriodos] = useState<PeriodoEspecial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulario nuevo período
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formTipo, setFormTipo] = useState<PeriodoEspecial['tipo']>('fiestas');
  const [formInicio, setFormInicio] = useState('');
  const [formFin, setFormFin] = useState('');
  const [savingForm, setSavingForm] = useState(false);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.get<PeriodoEspecial[]>('/tarifas/periodos');
      setPeriodos(data);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar períodos');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(periodo: PeriodoEspecial) {
    const nuevoActivo = !periodo.activo;
    try {
      await api.put(`/tarifas/periodos/${periodo.id}`, { activo: nuevoActivo });
      setPeriodos(prev =>
        prev.map(p => p.id === periodo.id ? { ...p, activo: nuevoActivo ? 1 : 0 } : p)
      );
      toast.success(`Período "${periodo.nombre}" ${nuevoActivo ? 'activado' : 'desactivado'}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    }
  }

  async function handleEliminar(periodo: PeriodoEspecial) {
    if (!confirm(`¿Eliminar el período "${periodo.nombre}"?`)) return;
    try {
      await api.delete(`/tarifas/periodos/${periodo.id}`);
      setPeriodos(prev => prev.filter(p => p.id !== periodo.id));
      toast.success(`Período eliminado`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    }
  }

  async function handleCrear() {
    if (!formNombre.trim() || !formInicio || !formFin) {
      toast.error('Llena todos los campos');
      return;
    }
    if (formInicio > formFin) {
      toast.error('La fecha de inicio debe ser antes que la de fin');
      return;
    }
    setSavingForm(true);
    try {
      const nuevo = await api.post<PeriodoEspecial>('/tarifas/periodos', {
        nombre: formNombre.trim(),
        tipo: formTipo,
        fecha_inicio: formInicio,
        fecha_fin: formFin,
        activo: false,
      });
      setPeriodos(prev => [nuevo, ...prev]);
      setMostrarForm(false);
      setFormNombre('');
      setFormInicio('');
      setFormFin('');
      toast.success(`Período "${nuevo.nombre}" creado`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al crear');
    } finally {
      setSavingForm(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="size-6 text-accent animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
      Error: {error}
    </div>
  );

  const activos = periodos.filter(p => p.activo);
  const inactivos = periodos.filter(p => !p.activo);

  return (
    <div className="space-y-4">
      {/* Explicación */}
      <div className="p-3 bg-info/5 border border-info/20 rounded-md text-xs text-text-secondary space-y-1">
        <p>📅 Los <strong>períodos especiales activos</strong> cambian automáticamente el precio que se cobra en Recepción Express.</p>
        <p>🔴 Solo activa un período cuando corresponda — desactívalo cuando termine.</p>
        <p>💡 Las columnas <strong>Semana / Fiestas / Agosto</strong> en la tabla de tarifas por horas son los precios que se usan cuando el período del mismo nombre está activo.</p>
      </div>

      {/* Botón agregar */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setMostrarForm(!mostrarForm)}>
          <Plus className="size-4" />
          Nuevo período especial
        </Button>
      </div>

      {/* Formulario nuevo período */}
      {mostrarForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-text-primary">Nuevo período especial</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label htmlFor="p-nombre">Nombre *</Label>
                <Input
                  id="p-nombre"
                  value={formNombre}
                  onChange={e => setFormNombre(e.target.value)}
                  placeholder="Ej: Fiestas Patrias 2025"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="p-tipo">Tipo *</Label>
                <select
                  id="p-tipo"
                  value={formTipo}
                  onChange={e => setFormTipo(e.target.value as PeriodoEspecial['tipo'])}
                  className="w-full h-10 px-3 mt-1 rounded-md bg-bg-elevated border border-border-color text-text-primary text-sm"
                >
                  <option value="semana">Semana especial</option>
                  <option value="fiestas">Fiestas regionales</option>
                  <option value="agosto">Agosto / Fiestas Patrias</option>
                  <option value="personalizado">Personalizado</option>
                </select>
              </div>
              <div>
                <Label>Rango de fechas *</Label>
                <div className="flex gap-2 mt-1">
                  <Input type="date" value={formInicio} onChange={e => setFormInicio(e.target.value)} className="h-10" />
                  <Input type="date" value={formFin} onChange={e => setFormFin(e.target.value)} className="h-10" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setMostrarForm(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleCrear} isLoading={savingForm}>Crear período</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Períodos activos */}
      {activos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-success mb-2 flex items-center gap-2">
            🟢 Períodos activos ahora
          </h3>
          <div className="space-y-2">
            {activos.map(p => (
              <PeriodoCard key={p.id} periodo={p} onToggle={handleToggle} onEliminar={handleEliminar} />
            ))}
          </div>
        </div>
      )}

      {activos.length === 0 && (
        <div className="p-3 bg-bg-elevated border border-border-color rounded-md text-sm text-text-muted text-center">
          No hay períodos especiales activos — se cobra tarifa normal
        </div>
      )}

      {/* Períodos inactivos */}
      {inactivos.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary mb-2">Períodos inactivos</h3>
          <div className="space-y-2">
            {inactivos.map(p => (
              <PeriodoCard key={p.id} periodo={p} onToggle={handleToggle} onEliminar={handleEliminar} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PeriodoCard({
  periodo,
  onToggle,
  onEliminar,
}: {
  periodo: PeriodoEspecial;
  onToggle: (p: PeriodoEspecial) => void;
  onEliminar: (p: PeriodoEspecial) => void;
}) {
  const TIPO_COLOR: Record<string, string> = {
    semana:        'bg-blue-500/10 border-blue-500/40 text-blue-400',
    fiestas:       'bg-orange-500/10 border-orange-500/40 text-orange-400',
    agosto:        'bg-red-500/10 border-red-500/40 text-red-400',
    personalizado: 'bg-purple-500/10 border-purple-500/40 text-purple-400',
  };

  const TIPO_LABEL: Record<string, string> = {
    semana:        'Semana especial',
    fiestas:       'Fiestas regionales',
    agosto:        'Agosto / Fiestas Patrias',
    personalizado: 'Personalizado',
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-md border ${periodo.activo ? 'bg-success/5 border-success/30' : 'bg-bg-elevated border-border-color'}`}>
      <div className="flex items-center gap-3">
        <Calendar className={`size-4 ${periodo.activo ? 'text-success' : 'text-text-muted'}`} />
        <div>
          <p className="text-sm font-medium text-text-primary">{periodo.nombre}</p>
          <p className="text-xs text-text-secondary">
            {formatDate(periodo.fecha_inicio)} — {formatDate(periodo.fecha_fin)}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${TIPO_COLOR[periodo.tipo]}`}>
          {TIPO_LABEL[periodo.tipo]}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onToggle(periodo)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
            periodo.activo
              ? 'bg-success/10 text-success hover:bg-success/20'
              : 'bg-bg-surface text-text-secondary hover:bg-bg-elevated'
          }`}
        >
          {periodo.activo
            ? <><ToggleRight className="size-4" /> Activo</>
            : <><ToggleLeft className="size-4" /> Inactivo</>
          }
        </button>
        <button
          type="button"
          onClick={() => onEliminar(periodo)}
          className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

// formatDate movida arriba
function formatDate_unused(s: string): string {
  return new Date(s).toLocaleDateString('es-PE', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
