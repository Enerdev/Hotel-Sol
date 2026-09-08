import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Settings, Loader2, Save } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Button } from '../components/ui/Button';
import type { ConfiguracionItem } from '../types';

interface CampoConfig {
  clave: string;
  label: string;
  descripcion: string;
  placeholder?: string;
  type?: string;
}

const CAMPOS: CampoConfig[] = [
  { clave: 'nombre_hotel', label: 'Nombre del hotel', descripcion: 'Nombre comercial', placeholder: 'Hotel Boutique' },
  { clave: 'direccion', label: 'Dirección', descripcion: 'Dirección física' },
  { clave: 'telefono', label: 'Teléfono', descripcion: 'Teléfono de contacto' },
  { clave: 'email', label: 'Email', descripcion: 'Email del hotel' },
  { clave: 'ruc', label: 'RUC', descripcion: 'RUC del hotel' },
  { clave: 'horario_check_in', label: 'Hora check-in', descripcion: 'Hora estándar de ingreso', placeholder: '12:00' },
  { clave: 'horario_check_out', label: 'Hora check-out', descripcion: 'Hora estándar de salida', placeholder: '11:00' },
  { clave: 'igv_porcentaje', label: 'IGV (%)', descripcion: 'Porcentaje de IGV', type: 'number', placeholder: '18' },
  { clave: 'moneda', label: 'Moneda', descripcion: 'Moneda principal', placeholder: 'PEN' },
];

export default function ConfiguracionPage() {
  const [items, setItems] = useState<Record<string, string>>({});
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    try {
      const data = await api.get<ConfiguracionItem[]>('/configuracion');
      const map: Record<string, string> = {};
      for (const it of data) map[it.clave] = it.valor;
      setItems(map);
      setOriginal(map);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  function update(clave: string, valor: string) {
    setItems((prev) => ({ ...prev, [clave]: valor }));
  }

  async function guardar() {
    setSaving(true);
    try {
      // Solo guardar los que cambiaron
      const cambios = Object.entries(items).filter(
        ([k, v]) => v !== (original[k] ?? '')
      );
      if (cambios.length === 0) {
        toast.info('No hay cambios para guardar');
        setSaving(false);
        return;
      }
      await Promise.all(
        cambios.map(([clave, valor]) =>
          api.put(`/configuracion/${clave}`, { valor })
        )
      );
      toast.success(`${cambios.length} valor(es) actualizado(s)`);
      setOriginal({ ...items });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  }

  const hayCambios = Object.entries(items).some(
    ([k, v]) => v !== (original[k] ?? '')
  );

  return (
    <>
      <Header
        title="Configuración"
        description="Datos del hotel y parámetros del sistema"
        actions={
          <Button onClick={guardar} isLoading={saving} disabled={!hayCambios}>
            <Save className="size-4" />
            Guardar cambios
          </Button>
        }
      />

      <div className="flex-1 p-4 md:p-8 space-y-4 max-w-3xl">
        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 text-accent animate-spin" />
          </div>
        )}
        {error && (
          <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
            Error: {error}
          </div>
        )}
        {!loading && !error && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="size-5 text-accent" />
                Datos del hotel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {CAMPOS.map((campo) => (
                <div key={campo.clave}>
                  <Label htmlFor={campo.clave}>{campo.label}</Label>
                  <Input
                    id={campo.clave}
                    type={campo.type ?? 'text'}
                    value={items[campo.clave] ?? ''}
                    onChange={(e) => update(campo.clave, e.target.value)}
                    placeholder={campo.placeholder}
                    className="mt-1"
                  />
                  <p className="text-xs text-text-muted mt-1">
                    {campo.descripcion}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
