import { useState } from 'react';
import { toast } from 'sonner';
import {
  Package,
  ShoppingCart,
  Receipt,
  Plus,
  Pencil,
  Loader2,
  AlertCircle,
  Smartphone,
  Ban,
} from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { api, ApiError } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProductoFormModal } from '../components/productos/ProductoFormModal';
import { VentaFormModal } from '../components/productos/VentaFormModal';
import { CobroRapidoModal } from '../components/cobros/CobroRapidoModal';
import { TIPO_COBRO_LABEL } from '../types';
import { cn } from '../lib/cn';
import type { Producto, Venta, Habitacion, Cobro } from '../types';

type Tab = 'ventas' | 'cobros' | 'productos';

export default function ProductosPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('ventas');

  const productos = useApi<Producto[]>(() => api.get('/productos'));
  const ventas = useApi<Venta[]>(() => api.get('/productos/ventas/lista'));
  const habitaciones = useApi<Habitacion[]>(() => api.get('/habitaciones'));
  const cobros = useApi<Cobro[]>(() => api.get('/cobros'));

  const [productoEditando, setProductoEditando] = useState<Producto | null>(null);
  const [creandoProducto, setCreandoProducto] = useState(false);
  const [registrandoVenta, setRegistrandoVenta] = useState(false);
  const [registrandoCobro, setRegistrandoCobro] = useState(false);

  const esAdmin = user?.rol === 'admin';

  const handleVentaCreada = () => {
    setRegistrandoVenta(false);
    ventas.refetch();
    productos.refetch();
  };

  const handleCobroCreado = () => {
    setRegistrandoCobro(false);
    cobros.refetch();
  };

  // Botón principal según tab activa
  const accionPrincipal =
    tab === 'ventas' ? (
      <Button onClick={() => setRegistrandoVenta(true)}>
        <Plus className="size-4" />
        Nueva venta
      </Button>
    ) : tab === 'cobros' ? (
      <Button onClick={() => setRegistrandoCobro(true)}>
        <Plus className="size-4" />
        Nuevo cobro
      </Button>
    ) : esAdmin ? (
      <Button onClick={() => setCreandoProducto(true)}>
        <Plus className="size-4" />
        Nuevo producto
      </Button>
    ) : undefined;

  return (
    <>
      <Header
        title="Productos, Ventas & Cobros"
        description="Gestión de productos, ventas con stock y cobros directos"
        actions={accionPrincipal}
      />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border-color overflow-x-auto">
          <TabButton
            active={tab === 'ventas'}
            onClick={() => setTab('ventas')}
            icon={ShoppingCart}
            label="Ventas (productos)"
          />
          <TabButton
            active={tab === 'cobros'}
            onClick={() => setTab('cobros')}
            icon={Receipt}
            label="Cobros directos"
          />
          <TabButton
            active={tab === 'productos'}
            onClick={() => setTab('productos')}
            icon={Package}
            label="Catálogo de productos"
          />
        </div>

        <div className="pt-2">
          {tab === 'ventas' && (
            <VentasTab
              ventas={ventas.data ?? []}
              loading={ventas.loading}
              error={ventas.error}
            />
          )}
          {tab === 'cobros' && (
            <CobrosTab
              cobros={cobros.data ?? []}
              loading={cobros.loading}
              error={cobros.error}
              onAnulado={() => cobros.refetch()}
            />
          )}
          {tab === 'productos' && (
            <ProductosTab
              productos={productos.data ?? []}
              loading={productos.loading}
              error={productos.error}
              esAdmin={esAdmin}
              onEdit={(p) => setProductoEditando(p)}
              onCrear={() => setCreandoProducto(true)}
            />
          )}
        </div>
      </div>

      {/* Modales */}
      <ProductoFormModal
        open={creandoProducto || !!productoEditando}
        producto={productoEditando}
        onClose={() => {
          setCreandoProducto(false);
          setProductoEditando(null);
        }}
        onSaved={() => {
          setCreandoProducto(false);
          setProductoEditando(null);
          productos.refetch();
        }}
      />
      <VentaFormModal
        open={registrandoVenta}
        productos={productos.data ?? []}
        habitaciones={habitaciones.data ?? []}
        onClose={() => setRegistrandoVenta(false)}
        onSaved={handleVentaCreada}
      />
      <CobroRapidoModal
        open={registrandoCobro}
        habitaciones={habitaciones.data ?? []}
        onClose={() => setRegistrandoCobro(false)}
        onSaved={handleCobroCreado}
      />
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Package;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap',
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-text-secondary hover:text-text-primary'
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

// ============================================================================
// Productos
// ============================================================================

function ProductosTab({
  productos,
  loading,
  error,
  esAdmin,
  onEdit,
  onCrear,
}: {
  productos: Producto[];
  loading: boolean;
  error: string | null;
  esAdmin: boolean;
  onEdit: (p: Producto) => void;
  onCrear: () => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 text-accent animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
        Error: {error}
      </div>
    );
  }
  if (productos.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package className="size-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-4">
            No hay productos registrados
          </p>
          {esAdmin && (
            <Button onClick={onCrear}>
              <Plus className="size-4" />
              Crear primer producto
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {esAdmin && (
        <p className="text-sm text-text-secondary mb-3">
          {productos.length} producto{productos.length !== 1 ? 's' : ''} en el
          catálogo · Click en lápiz para editar
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {productos.map((p) => {
          const stockBajo = p.stock < 5;
          const sinStock = p.stock === 0;
          return (
            <Card
              key={p.id}
              className={cn(
                'transition',
                !p.activo && 'opacity-60',
                sinStock && 'border-danger/40'
              )}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text-primary truncate">
                      {p.nombre}
                    </p>
                    {p.descripcion && (
                      <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">
                        {p.descripcion}
                      </p>
                    )}
                    <p className="text-xs text-text-muted mt-1">
                      Categoría: {p.categoria}
                    </p>
                  </div>
                  {esAdmin && (
                    <Button variant="ghost" size="sm" onClick={() => onEdit(p)}>
                      <Pencil className="size-3.5" />
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-semibold text-accent tabular-nums">
                    S/ {Number(p.precio).toFixed(2)}
                  </span>
                  <span className="text-xs text-text-muted">/ {p.unidad_medida}</span>
                </div>

                <div
                  className={cn(
                    'flex items-center justify-between pt-2 border-t border-border-color',
                    sinStock && 'text-danger',
                    stockBajo && !sinStock && 'text-warning'
                  )}
                >
                  <span className="text-xs uppercase">Stock</span>
                  <span className="text-sm font-medium tabular-nums">
                    {p.stock}
                    {(stockBajo || sinStock) && (
                      <AlertCircle className="size-3.5 inline ml-1" />
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}

// ============================================================================
// Ventas (lista de productos vendidos con stock)
// ============================================================================

function VentasTab({
  ventas,
  loading,
  error,
}: {
  ventas: Venta[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 text-accent animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
        Error: {error}
      </div>
    );
  }
  if (ventas.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <ShoppingCart className="size-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">
            No hay ventas de productos registradas
          </p>
        </CardContent>
      </Card>
    );
  }

  const porDia = ventas.reduce<Record<string, Venta[]>>((acc, v) => {
    const dia = v.fecha.slice(0, 10);
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(v);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(porDia).map(([fecha, items]) => {
        const totalDia = items.reduce((sum, v) => sum + Number(v.subtotal), 0);
        return (
          <div key={fecha}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-medium text-text-primary">
                {formatDate(fecha)}
              </h3>
              <p className="text-sm text-text-secondary">
                {items.length} venta{items.length !== 1 ? 's' : ''} · Total{' '}
                <span className="text-accent font-semibold tabular-nums">
                  S/ {totalDia.toFixed(2)}
                </span>
              </p>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-color text-xs text-text-muted uppercase">
                        <th className="text-left py-2 px-3">Hora</th>
                        <th className="text-left py-2 px-3">Producto</th>
                        <th className="text-right py-2 px-3">Cant.</th>
                        <th className="text-right py-2 px-3">Subtotal</th>
                        <th className="text-left py-2 px-3">Método</th>
                        <th className="text-left py-2 px-3">Hab.</th>
                        <th className="text-left py-2 px-3">Vendedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((v) => (
                        <tr
                          key={v.id}
                          className="border-b border-border-color/40 text-sm"
                        >
                          <td className="py-2 px-3 text-text-secondary tabular-nums">
                            {v.fecha.slice(11, 16)}
                          </td>
                          <td className="py-2 px-3 text-text-primary">
                            {v.producto_nombre}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            {v.cantidad}
                          </td>
                          <td className="py-2 px-3 text-right text-accent font-medium tabular-nums">
                            S/ {Number(v.subtotal).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-xs text-text-secondary">
                            <div className="flex items-center gap-1">
                              {(v.metodo_pago === 'yape' || v.metodo_pago === 'plin') && (
                                <Smartphone className="size-3 text-info" />
                              )}
                              {v.metodo_pago}
                              {v.numero_operacion && (
                                <span
                                  className="text-text-muted text-[10px] ml-1"
                                  title={`Op: ${v.numero_operacion}`}
                                >
                                  #{v.numero_operacion.slice(-6)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-text-secondary">
                            {v.habitacion_numero ?? '—'}
                          </td>
                          <td className="py-2 px-3 text-text-secondary text-xs">
                            {v.vendedor_nombre ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Cobros (cobros directos sin reserva ni stock)
// ============================================================================

function CobrosTab({
  cobros,
  loading,
  error,
  onAnulado,
}: {
  cobros: Cobro[];
  loading: boolean;
  error: string | null;
  onAnulado: () => void;
}) {
  const handleAnular = async (c: Cobro) => {
    const motivo = prompt(
      `Motivo de anulación del cobro ${c.codigo}:\n(${c.concepto} · S/ ${Number(c.monto).toFixed(2)})`
    );
    if (!motivo || motivo.trim().length < 3) return;

    try {
      await api.post(`/cobros/${c.id}/anular`, { motivo: motivo.trim() });
      toast.success(`Cobro ${c.codigo} anulado`);
      onAnulado();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 text-accent animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">
        Error: {error}
      </div>
    );
  }
  if (cobros.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Receipt className="size-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No hay cobros directos registrados</p>
        </CardContent>
      </Card>
    );
  }

  const porDia = cobros.reduce<Record<string, Cobro[]>>((acc, c) => {
    const dia = c.fecha.slice(0, 10);
    if (!acc[dia]) acc[dia] = [];
    acc[dia].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(porDia).map(([fecha, items]) => {
        const totalDia = items
          .filter((c) => !c.anulado)
          .reduce((sum, c) => sum + Number(c.monto), 0);
        return (
          <div key={fecha}>
            <div className="flex items-center justify-between mb-2 px-1">
              <h3 className="text-sm font-medium text-text-primary">
                {formatDate(fecha)}
              </h3>
              <p className="text-sm text-text-secondary">
                {items.length} cobro{items.length !== 1 ? 's' : ''} · Total{' '}
                <span className="text-accent font-semibold tabular-nums">
                  S/ {totalDia.toFixed(2)}
                </span>
              </p>
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border-color text-xs text-text-muted uppercase">
                        <th className="text-left py-2 px-3">Código</th>
                        <th className="text-left py-2 px-3">Hora</th>
                        <th className="text-left py-2 px-3">Concepto</th>
                        <th className="text-left py-2 px-3">Cliente</th>
                        <th className="text-right py-2 px-3">Monto</th>
                        <th className="text-left py-2 px-3">Método</th>
                        <th className="text-right py-2 px-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((c) => (
                        <tr
                          key={c.id}
                          className={cn(
                            'border-b border-border-color/40 text-sm',
                            c.anulado && 'opacity-50 line-through'
                          )}
                        >
                          <td className="py-2 px-3 text-xs font-mono text-text-secondary">
                            {c.codigo}
                          </td>
                          <td className="py-2 px-3 text-text-secondary tabular-nums">
                            {c.fecha.slice(11, 16)}
                          </td>
                          <td className="py-2 px-3">
                            <p className="text-text-primary">{c.concepto}</p>
                            <p className="text-xs text-text-muted">
                              {TIPO_COBRO_LABEL[c.tipo_cobro]}
                              {c.habitacion_numero && ` · Hab. ${c.habitacion_numero}`}
                            </p>
                          </td>
                          <td className="py-2 px-3 text-text-secondary text-xs">
                            {c.cliente_display ?? '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-accent font-medium tabular-nums">
                            S/ {Number(c.monto).toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-xs text-text-secondary">
                            <div className="flex items-center gap-1">
                              {(c.metodo_pago === 'yape' ||
                                c.metodo_pago === 'plin') && (
                                <Smartphone className="size-3 text-info" />
                              )}
                              {c.metodo_pago}
                              {c.numero_operacion && (
                                <span
                                  className="text-text-muted text-[10px] ml-1"
                                  title={`Op: ${c.numero_operacion}`}
                                >
                                  #{c.numero_operacion.slice(-6)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right">
                            {!c.anulado && (
                              <button
                                type="button"
                                onClick={() => handleAnular(c)}
                                className="text-danger hover:text-danger/80 text-xs"
                                title="Anular cobro"
                              >
                                <Ban className="size-3.5" />
                              </button>
                            )}
                            {c.anulado && (
                              <span
                                className="text-xs text-text-muted"
                                title={c.motivo_anulacion ?? ''}
                              >
                                Anulado
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}
