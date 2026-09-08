import { useEffect, useState } from 'react';
import { Search, Plus, Star, User, Loader2 } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { api, ApiError } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ClienteFormModal } from '../components/clientes/ClienteFormModal';
import { ClienteDetailModal } from '../components/clientes/ClienteDetailModal';
import { cn } from '../lib/cn';
import type { Cliente } from '../types';

export default function ClientesPage() {
  const [busqueda, setBusqueda] = useState('');
  const [soloFrecuentes, setSoloFrecuentes] = useState(false);
  const debounced = useDebounce(busqueda, 300);

  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [creando, setCreando] = useState(false);

  // ── Cargar resultados ──
  useEffect(() => {
    setLoading(true);
    setError(null);

    const cargar = async () => {
      try {
        let lista: Cliente[];
        if (soloFrecuentes && !debounced.trim()) {
          lista = await api.get<Cliente[]>('/clientes/frecuentes');
        } else if (debounced.trim()) {
          lista = await api.get<Cliente[]>(
            `/clientes/buscar?q=${encodeURIComponent(debounced.trim())}`
          );
          if (soloFrecuentes) {
            lista = lista.filter((c) => c.tipo_cliente === 'frecuente');
          }
        } else {
          // Sin búsqueda y sin filtro → traemos los frecuentes como "destacados"
          lista = await api.get<Cliente[]>('/clientes/frecuentes');
        }
        setResultados(lista);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Error');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [debounced, soloFrecuentes]);

  // ── Handlers ──
  const handleClienteSaved = (cliente: Cliente) => {
    setCreando(false);
    setEditando(null);
    setSeleccionado(cliente);
    // Refrescar lista
    setBusqueda((b) => b); // dispara el effect
    setResultados((prev) => {
      const exists = prev.find((c) => c.id === cliente.id);
      if (exists) return prev.map((c) => (c.id === cliente.id ? cliente : c));
      return [cliente, ...prev];
    });
  };

  return (
    <>
      <Header
        title="Clientes"
        description="Búsqueda y gestión de huéspedes"
        actions={
          <Button onClick={() => setCreando(true)}>
            <Plus className="size-4" />
            Nuevo cliente
          </Button>
        }
      />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Buscador + filtro */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="size-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o número de documento..."
              className="pl-9"
            />
          </div>
          <Button
            variant={soloFrecuentes ? 'primary' : 'outline'}
            onClick={() => setSoloFrecuentes((v) => !v)}
          >
            <Star className={cn('size-4', soloFrecuentes && 'fill-current')} />
            Solo frecuentes
          </Button>
        </div>

        {/* Mensaje guía */}
        {!busqueda.trim() && !soloFrecuentes && (
          <p className="text-sm text-text-muted">
            Mostrando clientes frecuentes. Escribe arriba para buscar por nombre
            o número de documento.
          </p>
        )}

        {/* Estado: loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 text-accent animate-spin" />
          </div>
        )}

        {/* Estado: error */}
        {error && (
          <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
            Error: {error}
          </div>
        )}

        {/* Estado: vacío */}
        {!loading && resultados.length === 0 && !error && (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="size-16 rounded-full bg-bg-elevated flex items-center justify-center mx-auto mb-3">
                <User className="size-8 text-text-muted" />
              </div>
              <p className="text-text-primary font-medium">
                {busqueda
                  ? 'No se encontraron clientes'
                  : 'No hay clientes registrados aún'}
              </p>
              <p className="text-sm text-text-secondary mt-1 mb-4">
                {busqueda
                  ? `No hay coincidencias para "${busqueda}". Prueba con otro término.`
                  : 'Crea tu primer cliente para empezar.'}
              </p>
              {!busqueda && (
                <Button onClick={() => setCreando(true)}>
                  <Plus className="size-4" />
                  Crear primer cliente
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lista de resultados */}
        {!loading && resultados.length > 0 && (
          <div className="space-y-2">
            {resultados.map((c) => (
              <ClienteListItem
                key={c.id}
                cliente={c}
                onClick={() => setSeleccionado(c)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modales */}
      <ClienteDetailModal
        cliente={seleccionado}
        onClose={() => setSeleccionado(null)}
        onEdit={() => {
          if (seleccionado) {
            setEditando(seleccionado);
            setSeleccionado(null);
          }
        }}
      />

      <ClienteFormModal
        open={creando || !!editando}
        cliente={editando}
        onClose={() => {
          setCreando(false);
          setEditando(null);
        }}
        onSaved={handleClienteSaved}
      />
    </>
  );
}

// ============================================================================
// ClienteListItem
// ============================================================================

function ClienteListItem({
  cliente,
  onClick,
}: {
  cliente: Cliente;
  onClick: () => void;
}) {
  const esFrecuente = cliente.tipo_cliente === 'frecuente';

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-bg-surface border border-border-color rounded-lg p-4 hover:border-accent/50 transition-all flex items-center gap-4"
    >
      {/* Avatar circular */}
      <div
        className={cn(
          'size-12 rounded-full flex items-center justify-center shrink-0',
          esFrecuente
            ? 'bg-accent/15 border-2 border-accent/40'
            : 'bg-bg-elevated border-2 border-border-color'
        )}
      >
        {esFrecuente ? (
          <Star className="size-5 text-accent fill-current" />
        ) : (
          <User className="size-5 text-text-secondary" />
        )}
      </div>

      {/* Info principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-text-primary truncate">
            {cliente.nombres} {cliente.apellidos}
          </p>
          {esFrecuente && (
            <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-medium">
              Frecuente
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary flex-wrap">
          <span>
            {cliente.tipo_documento}: {cliente.numero_documento}
          </span>
          {cliente.nacionalidad && <span>· {cliente.nacionalidad}</span>}
          {cliente.procedencia && <span>· {cliente.procedencia}</span>}
        </div>
      </div>

      {/* Stats a la derecha */}
      <div className="text-right shrink-0">
        <p className="text-sm font-medium text-text-primary tabular-nums">
          {cliente.total_estancias}{' '}
          <span className="font-normal text-text-secondary text-xs">
            estancia{cliente.total_estancias !== 1 ? 's' : ''}
          </span>
        </p>
        <p className="text-xs text-text-muted tabular-nums">
          S/ {Number(cliente.monto_total_gastado).toFixed(2)}
        </p>
      </div>
    </button>
  );
}
