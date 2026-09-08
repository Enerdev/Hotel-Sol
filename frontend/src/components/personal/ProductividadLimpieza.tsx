import { useEffect, useState } from 'react';
import { Sparkles, Loader2, TrendingUp, Clock, DollarSign, Calendar } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { Card, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import type { ProductividadLimpieza } from '../../types';

const STORAGE_TARIFA_KEY = 'hotel.tarifa_pago_por_hab';

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo' | 'custom';

export function ProductividadLimpieza() {
  const [data, setData] = useState<ProductividadLimpieza[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [periodo, setPeriodo] = useState<Periodo>('semana');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tarifaPorHab, setTarifaPorHab] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_TARIFA_KEY);
    return stored ? Number(stored) : 0;
  });

  // Calcular fechas según período
  useEffect(() => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    if (periodo === 'hoy') {
      setDesde(fmt(today));
      setHasta(fmt(today));
    } else if (periodo === 'semana') {
      const start = new Date(today);
      start.setDate(today.getDate() - 7);
      setDesde(fmt(start));
      setHasta(fmt(today));
    } else if (periodo === 'mes') {
      const start = new Date(today);
      start.setDate(today.getDate() - 30);
      setDesde(fmt(start));
      setHasta(fmt(today));
    } else if (periodo === 'todo') {
      setDesde('');
      setHasta('');
    }
    // custom: el usuario escoge
  }, [periodo]);

  // Cargar datos
  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desde, hasta, tarifaPorHab]);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      if (tarifaPorHab > 0) params.set('tarifa_por_hab', String(tarifaPorHab));
      const url = `/personal/productividad/limpieza${params.toString() ? '?' + params.toString() : ''}`;
      const result = await api.get<ProductividadLimpieza[]>(url);
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const guardarTarifa = () => {
    localStorage.setItem(STORAGE_TARIFA_KEY, String(tarifaPorHab));
  };

  // Totales
  const totalLimpiezas = data.reduce((sum, d) => sum + d.total_limpiezas, 0);
  const totalValidadas = data.reduce((sum, d) => sum + d.validadas, 0);
  const totalPago = data.reduce((sum, d) => sum + (d.pago_calculado ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Período */}
          <div>
            <Label className="mb-2 block">Período</Label>
            <div className="flex gap-2 flex-wrap">
              {(['hoy', 'semana', 'mes', 'todo', 'custom'] as Periodo[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border transition ${
                    periodo === p
                      ? 'bg-accent/15 text-accent border-accent/50'
                      : 'bg-bg-elevated text-text-secondary border-border-color hover:text-text-primary'
                  }`}
                >
                  {p === 'hoy' && 'Hoy'}
                  {p === 'semana' && 'Última semana'}
                  {p === 'mes' && 'Último mes'}
                  {p === 'todo' && 'Todo el tiempo'}
                  {p === 'custom' && 'Personalizado'}
                </button>
              ))}
            </div>
          </div>

          {periodo === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="desde">Desde</Label>
                <Input
                  id="desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="hasta">Hasta</Label>
                <Input
                  id="hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          {/* Tarifa por habitación */}
          <div className="pt-3 border-t border-border-color">
            <Label htmlFor="tarifa">
              💰 Pago por habitación limpiada (S/) — para cálculo automático
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="tarifa"
                type="number"
                min={0}
                step="0.50"
                value={tarifaPorHab}
                onChange={(e) => setTarifaPorHab(Number(e.target.value))}
                placeholder="Ej: 5.00"
                className="flex-1"
              />
              <Button onClick={guardarTarifa} variant="outline" size="md">
                Guardar tarifa
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Esta tarifa se guarda en tu navegador. Solo se cuentan las limpiezas
              validadas por recepción.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Resumen total */}
      {!loading && data.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <SummaryCard
            label="Total limpiezas"
            value={totalLimpiezas}
            icon={Sparkles}
          />
          <SummaryCard
            label="Validadas"
            value={totalValidadas}
            icon={TrendingUp}
            tone="success"
          />
          {tarifaPorHab > 0 && (
            <SummaryCard
              label="Total a pagar"
              value={`S/ ${totalPago.toFixed(2)}`}
              icon={DollarSign}
              tone="accent"
            />
          )}
        </div>
      )}

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

      {/* Tabla */}
      {!loading && data.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-color">
                    <th className="text-left text-xs font-medium text-text-muted uppercase py-3 px-4">
                      Empleada
                    </th>
                    <th className="text-right text-xs font-medium text-text-muted uppercase py-3 px-4">
                      Limpiezas
                    </th>
                    <th className="text-right text-xs font-medium text-text-muted uppercase py-3 px-4">
                      Validadas
                    </th>
                    <th className="text-right text-xs font-medium text-text-muted uppercase py-3 px-4">
                      Tiempo prom.
                    </th>
                    {tarifaPorHab > 0 && (
                      <th className="text-right text-xs font-medium text-accent uppercase py-3 px-4">
                        Pago calculado
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {data.map((d) => (
                    <tr
                      key={d.empleado_id}
                      className="border-b border-border-color/50 hover:bg-bg-elevated/30"
                    >
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-text-primary">
                          {d.empleado_nombre}
                        </p>
                        <p className="text-xs text-text-muted">@{d.username}</p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-text-primary tabular-nums font-medium">
                          {d.total_limpiezas}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-success tabular-nums font-medium">
                          {d.validadas}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {d.promedio_minutos !== null ? (
                          <span className="text-sm text-text-secondary tabular-nums">
                            <Clock className="size-3 inline mr-1" />
                            {Math.round(d.promedio_minutos)} min
                          </span>
                        ) : (
                          <span className="text-text-muted text-sm">—</span>
                        )}
                      </td>
                      {tarifaPorHab > 0 && (
                        <td className="py-3 px-4 text-right">
                          <span className="text-sm font-semibold text-accent tabular-nums">
                            S/ {(d.pago_calculado ?? 0).toFixed(2)}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && data.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="size-12 text-text-muted mx-auto mb-3" />
            <p className="text-text-primary font-medium">
              No hay datos de limpieza en este período
            </p>
            <p className="text-sm text-text-secondary mt-1">
              Prueba ampliando el rango de fechas o selecciona "Todo el tiempo".
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  icon: typeof Sparkles;
  tone?: 'default' | 'success' | 'accent';
}) {
  const colors = {
    default: 'text-text-primary',
    success: 'text-success',
    accent: 'text-accent',
  }[tone];

  return (
    <div className="bg-bg-surface border border-border-color rounded-lg p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-secondary">{label}</p>
        <Icon className={`size-4 ${colors}`} />
      </div>
      <p className={`text-2xl font-semibold mt-1 tabular-nums ${colors}`}>
        {value}
      </p>
    </div>
  );
}
