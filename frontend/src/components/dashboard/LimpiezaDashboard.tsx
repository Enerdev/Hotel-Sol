import { Link } from 'react-router-dom';
import { Sparkles, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { useApi } from '../../hooks/useApi';
import { api } from '../../services/api';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import type { LimpiezaRegistro } from '../../types';

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Por limpiar', color: 'text-warning' },
  en_progreso: { label: 'En progreso', color: 'text-info' },
  completada_por_limpieza: { label: 'Esperando validación', color: 'text-accent' },
};

export function LimpiezaDashboard() {
  const pendientes = useApi<LimpiezaRegistro[]>(() => api.get('/limpieza/pendientes'));

  const porLimpiar = pendientes.data?.filter((r) => r.estado === 'pendiente') ?? [];
  const enProgreso = pendientes.data?.filter((r) => r.estado === 'en_progreso') ?? [];
  const esperandoValidacion =
    pendientes.data?.filter((r) => r.estado === 'completada_por_limpieza') ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Resumen del turno */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryBox
          label="Por limpiar"
          value={porLimpiar.length}
          icon={Sparkles}
          tone="warning"
        />
        <SummaryBox
          label="En progreso"
          value={enProgreso.length}
          icon={Clock}
          tone="info"
        />
        <SummaryBox
          label="Validando"
          value={esperandoValidacion.length}
          icon={CheckCircle2}
          tone="accent"
        />
      </div>

      {/* Lista de habitaciones por limpiar */}
      <Card>
        <div className="p-5 border-b border-border-color">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="size-5 text-accent" />
            Habitaciones que necesitan atención
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Toca una habitación para empezar a limpiarla o ver más detalles
          </p>
        </div>

        <CardContent className="p-5">
          {pendientes.loading && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-lg bg-bg-elevated animate-pulse"
                />
              ))}
            </div>
          )}

          {pendientes.error && (
            <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
              Error: {pendientes.error}
            </div>
          )}

          {pendientes.data && pendientes.data.length === 0 && (
            <div className="text-center py-12">
              <div className="size-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="size-8 text-success" />
              </div>
              <p className="text-text-primary font-medium">¡Todo está limpio!</p>
              <p className="text-sm text-text-secondary mt-1">
                No hay habitaciones pendientes en este momento.
              </p>
            </div>
          )}

          {pendientes.data && pendientes.data.length > 0 && (
            <div className="space-y-2">
              {pendientes.data.map((registro) => {
                const meta = ESTADO_LABEL[registro.estado] ?? {
                  label: registro.estado,
                  color: 'text-text-secondary',
                };
                return (
                  <Link
                    key={registro.id}
                    to="/limpieza"
                    className="block p-4 rounded-lg bg-bg-elevated border border-border-color hover:border-accent/50 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-lg bg-accent/10 border border-accent/30 flex items-center justify-center">
                          <span className="text-lg font-bold text-accent">
                            {registro.habitacion_numero}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-text-primary">
                            Habitación {registro.habitacion_numero}
                          </p>
                          <p className="text-xs text-text-secondary">
                            Piso {registro.habitacion_piso}
                            {registro.empleado_nombre &&
                              ` · ${registro.empleado_nombre}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span className={`text-sm font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                        <ArrowRight className="size-4 text-text-muted" />
                      </div>
                    </div>
                  </Link>
                );
              })}

              <Link to="/limpieza" className="block mt-4">
                <Button variant="outline" className="w-full">
                  Ver todas las habitaciones
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryBoxProps {
  label: string;
  value: number;
  icon: typeof Sparkles;
  tone: 'warning' | 'info' | 'accent';
}

function SummaryBox({ label, value, icon: Icon, tone }: SummaryBoxProps) {
  const colors = {
    warning: { bg: 'bg-warning/10', border: 'border-warning/40', text: 'text-warning' },
    info: { bg: 'bg-info/10', border: 'border-info/40', text: 'text-info' },
    accent: { bg: 'bg-accent/10', border: 'border-accent/40', text: 'text-accent' },
  }[tone];

  return (
    <div className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border}`}>
      <Icon className={`size-5 ${colors.text}`} />
      <p className="text-2xl font-bold text-text-primary mt-2 tabular-nums">
        {value}
      </p>
      <p className="text-xs text-text-secondary">{label}</p>
    </div>
  );
}
