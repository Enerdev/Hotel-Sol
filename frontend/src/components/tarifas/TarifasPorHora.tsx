import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Clock, Loader2 } from 'lucide-react';
import { api, ApiError } from '../../services/api';
import { Card, CardContent } from '../ui/Card';
import { PrecioEditable } from './PrecioEditable';
import { TIPO_HABITACION_LABEL } from '../../types';
import type { TipoHabitacion } from '../../types';

const TIPOS: TipoHabitacion[] = [
  'matrimonial_privada_ducha',
  'matrimonial_bano',
  'tv_cable',
  'simple',
  'doble_privada',
  'doble_tv_cable',
];

const FRANJA_LABEL: Record<string, string> = {
  hasta_12:  'Hasta 12 pm',
  hasta_19:  'Hasta 7 pm',
  hasta_22:  'Hasta 10 pm',
  madrugada: 'Madrugada',
};

const FRANJAS = ['hasta_12', 'hasta_19', 'hasta_22', 'madrugada'];

const COLUMNAS = [
  { key: 'precio_normal',  label: 'Normal' },
  { key: 'precio_semana',  label: 'Semana' },
  { key: 'precio_fiestas', label: 'Fiestas' },
  { key: 'precio_agosto',  label: 'Agosto' },
];

interface TarifaHora {
  id: number;
  tipo_habitacion: string;
  franja: string;
  precio_normal: string | null;
  precio_semana: string | null;
  precio_fiestas: string | null;
  precio_agosto: string | null;
}

export function TarifasPorHora() {
  const [tarifas, setTarifas] = useState<TarifaHora[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.get<TarifaHora[]>('/tarifas/horas');
      setTarifas(data);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error al cargar tarifas');
    } finally {
      setLoading(false);
    }
  }

  function getTarifa(tipo: string, franja: string): TarifaHora | undefined {
    return tarifas.find(t => t.tipo_habitacion === tipo && t.franja === franja);
  }

  async function handleSave(
    tarifa: TarifaHora,
    columna: string,
    nuevoPrecio: number | null
  ) {
    try {
      await api.put(`/tarifas/horas/${tarifa.id}`, { [columna]: nuevoPrecio });
      setTarifas(prev =>
        prev.map(t =>
          t.id === tarifa.id
            ? { ...t, [columna]: nuevoPrecio !== null ? String(nuevoPrecio) : null }
            : t
        )
      );
      toast.success(`Tarifa actualizada`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al guardar');
      throw e;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-text-secondary">
        <Clock className="size-4 text-accent" />
        <span>Click en cualquier precio para editarlo · Enter para guardar · Esc para cancelar</span>
      </div>

      {FRANJAS.map(franja => (
        <Card key={franja}>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
              <Clock className="size-4 text-accent" />
              {FRANJA_LABEL[franja]}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-color">
                    <th className="text-left text-xs font-medium text-text-muted uppercase py-2 px-3">
                      Tipo de habitación
                    </th>
                    {COLUMNAS.map(col => (
                      <th key={col.key} className="text-right text-xs font-medium text-text-muted uppercase py-2 px-3">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIPOS.map(tipo => {
                    const tarifa = getTarifa(tipo, franja);
                    return (
                      <tr key={tipo} className="border-b border-border-color/50 hover:bg-bg-elevated/30">
                        <td className="py-2 px-3 text-sm text-text-primary font-medium">
                          {TIPO_HABITACION_LABEL[tipo]}
                        </td>
                        {COLUMNAS.map(col => {
                          if (!tarifa) {
                            return (
                              <td key={col.key} className="py-2 px-3 text-right text-text-muted italic text-sm">—</td>
                            );
                          }
                          const val = tarifa[col.key as keyof TarifaHora];
                          return (
                            <td key={col.key} className="py-1 px-1 text-right">
                              <PrecioEditable
                                precio={val !== null && val !== undefined ? Number(val) : null}
                                onSave={(nuevo) => handleSave(tarifa, col.key, nuevo)}
                                allowNull
                                nullLabel="—"
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      <p className="text-xs text-text-muted">
        💡 "—" significa que ese tipo de habitación no se ofrece en esa franja o temporada.
        Las columnas Semana/Fiestas/Agosto se usan cuando hay un período especial activo.
      </p>
    </div>
  );
}
