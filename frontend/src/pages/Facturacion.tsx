import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Receipt,
  Search,
  Download,
  Loader2,
  Building2,
  User,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api, ApiError } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Modal } from '../components/dialogs/Modal';
import { cn } from '../lib/cn';
import type { Reserva } from '../types';
import { TIPO_HABITACION_LABEL } from '../types';

type TipoComprobante = 'boleta' | 'factura';

interface ConfigHotel {
  hotel_nombre: string;
  hotel_ruc: string;
  hotel_direccion: string;
  hotel_ciudad: string;
  hotel_telefono: string;
  hotel_email: string;
  factura_serie_boleta: string;
  factura_serie_factura: string;
}

interface DatosFactura {
  tipo: TipoComprobante;
  // Para boleta
  dni?: string;
  nombre_cliente?: string;
  // Para factura
  ruc?: string;
  razon_social?: string;
  direccion_fiscal?: string;
}

export default function FacturacionPage() {
  const [config, setConfig] = useState<ConfigHotel | null>(null);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');

  // Modal
  const [reservaSeleccionada, setReservaSeleccionada] = useState<Reserva | null>(null);
  const [datos, setDatos] = useState<DatosFactura>({ tipo: 'boleta' });
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    cargar();
  }, []);

  async function cargar() {
    setLoading(true);
    try {
      const [cfg, res] = await Promise.all([
        api.get<ConfigHotel>('/configuracion/facturacion'),
        api.get<Reserva[]>('/reservas?estado=check_out'),
      ]);
      setConfig(cfg);
      // También cargar activas pagadas
      const activas = await api.get<Reserva[]>('/reservas?estado=activa');
      const pagas = activas.filter(r => r.estado_pago === 'pagado');
      setReservas([...res, ...pagas].sort((a, b) =>
        new Date(b.fecha_check_in).getTime() - new Date(a.fecha_check_in).getTime()
      ));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al cargar');
    } finally {
      setLoading(false);
    }
  }

  function abrirModal(reserva: Reserva) {
    setReservaSeleccionada(reserva);
    setDatos({
      tipo: 'boleta',
      dni: reserva.cliente_documento?.replace(/^DNI:\s*/, '').replace(/^CI:\s*/, '') ?? '',
      nombre_cliente: reserva.cliente_nombre ?? '',
    });
  }

  async function generarPDF() {
    if (!reservaSeleccionada || !config) return;

    if (datos.tipo === 'boleta' && !datos.nombre_cliente?.trim()) {
      toast.error('Ingresa el nombre del cliente'); return;
    }
    if (datos.tipo === 'factura' && (!datos.ruc?.trim() || !datos.razon_social?.trim())) {
      toast.error('Ingresa RUC y razón social'); return;
    }

    setGenerando(true);
    try {
      // Obtener número correlativo
      const { numero } = await api.post<{ numero: string }>('/configuracion/facturacion/siguiente-numero', {
        tipo: datos.tipo,
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const r = reservaSeleccionada;
      const ahora = new Date();
      const fechaEmision = ahora.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const esBoleta = datos.tipo === 'boleta';
      const igv = Number(r.precio_total) * 0.18 / 1.18;
      const subtotal = Number(r.precio_total) - igv;

      // ── Colores ──
      const colorPrimario: [number, number, number] = [20, 30, 50];
      const colorDorado: [number, number, number] = [180, 130, 60];
      const colorGris: [number, number, number] = [100, 100, 110];

      // ── Encabezado ──
      doc.setFillColor(...colorPrimario);
      doc.rect(0, 0, 210, 45, 'F');

      // Nombre hotel
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(config.hotel_nombre.toUpperCase(), 14, 18);

      // Subtítulo hotel
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 200, 210);
      doc.text(`RUC: ${config.hotel_ruc}`, 14, 25);
      doc.text(`${config.hotel_direccion} - ${config.hotel_ciudad}`, 14, 30);
      doc.text(`Tel: ${config.hotel_telefono}  |  ${config.hotel_email}`, 14, 35);

      // Box tipo comprobante (derecha)
      doc.setFillColor(...colorDorado);
      doc.roundedRect(140, 8, 58, 28, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(esBoleta ? 'BOLETA DE VENTA' : 'FACTURA', 169, 20, { align: 'center' });
      doc.setFontSize(11);
      doc.text(numero, 169, 30, { align: 'center' });

      // ── Datos del comprobante ──
      doc.setTextColor(...colorPrimario);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      // Fecha
      doc.setFillColor(245, 245, 250);
      doc.rect(14, 50, 182, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha de emisión:', 16, 56);
      doc.setFont('helvetica', 'normal');
      doc.text(fechaEmision, 55, 56);
      doc.setFont('helvetica', 'bold');
      doc.text('Fecha de vencimiento:', 100, 56);
      doc.setFont('helvetica', 'normal');
      doc.text(fechaEmision, 148, 56);

      // ── Datos cliente ──
      doc.setFillColor(...colorPrimario);
      doc.rect(14, 62, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(esBoleta ? 'DATOS DEL CLIENTE' : 'DATOS DEL ADQUIRENTE', 16, 67.5);

      doc.setTextColor(...colorPrimario);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      if (esBoleta) {
        doc.text(`Apellidos y Nombres: ${datos.nombre_cliente ?? r.cliente_nombre}`, 16, 76);
        doc.text(`DNI: ${datos.dni ?? ''}`, 16, 82);
      } else {
        doc.text(`Razón Social: ${datos.razon_social ?? ''}`, 16, 76);
        doc.text(`RUC: ${datos.ruc ?? ''}`, 16, 82);
        doc.text(`Dirección: ${datos.direccion_fiscal ?? ''}`, 16, 88);
      }

      const yDetalle = esBoleta ? 90 : 96;

      // ── Detalle del servicio ──
      doc.setFillColor(...colorPrimario);
      doc.rect(14, yDetalle, 182, 7, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIPCIÓN DEL SERVICIO', 16, yDetalle + 5.5);

      const descripcion = r.tipo_estancia === 'por_noche'
        ? `Servicio de hospedaje - ${r.noches} noche(s)`
        : `Servicio de hospedaje - por horas`;

      const habitacionInfo = `Habitación ${r.habitacion_numero} - Piso ${r.habitacion_piso} - ${TIPO_HABITACION_LABEL[r.habitacion_tipo]}`;
      const fechaIn = new Date(r.fecha_check_in).toLocaleDateString('es-PE');
      const fechaOut = r.fecha_check_out ? new Date(r.fecha_check_out).toLocaleDateString('es-PE') : fechaIn;

      autoTable(doc, {
        startY: yDetalle + 8,
        head: [['Cant.', 'Descripción', 'V. Unitario', 'V. Total']],
        body: [
          [
            '1',
            `${descripcion}\n${habitacionInfo}\nCheck-in: ${fechaIn}  Check-out: ${fechaOut}`,
            `S/ ${subtotal.toFixed(2)}`,
            `S/ ${subtotal.toFixed(2)}`,
          ],
        ],
        theme: 'plain',
        headStyles: {
          fillColor: [240, 240, 245],
          textColor: colorPrimario,
          fontStyle: 'bold',
          fontSize: 9,
          cellPadding: 3,
        },
        bodyStyles: { fontSize: 9, textColor: colorPrimario, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 110 },
          2: { cellWidth: 28, halign: 'right' },
          3: { cellWidth: 28, halign: 'right' },
        },
        margin: { left: 14, right: 14 },
      });

      const yTotales = (doc as any).lastAutoTable.finalY + 5;

      // ── Totales ──
      doc.setFillColor(245, 245, 250);
      doc.rect(120, yTotales, 76, 28, 'F');
      doc.setTextColor(...colorGris);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Op. Gravadas:', 124, yTotales + 7);
      doc.text('IGV (18%):', 124, yTotales + 14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colorPrimario);
      doc.text('IMPORTE TOTAL:', 124, yTotales + 22);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colorGris);
      doc.text(`S/ ${subtotal.toFixed(2)}`, 193, yTotales + 7, { align: 'right' });
      doc.text(`S/ ${igv.toFixed(2)}`, 193, yTotales + 14, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...colorDorado);
      doc.text(`S/ ${Number(r.precio_total).toFixed(2)}`, 193, yTotales + 22, { align: 'right' });

      // Método de pago
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colorGris);
      doc.text(`Forma de pago: ${r.metodo_pago ?? 'Efectivo'}`, 16, yTotales + 10);

      // ── Pie de página ──
      const yPie = yTotales + 38;
      doc.setDrawColor(...colorPrimario);
      doc.setLineWidth(0.3);
      doc.line(14, yPie, 196, yPie);
      doc.setFontSize(8);
      doc.setTextColor(...colorGris);
      doc.text('Representación impresa del comprobante de pago electrónico.', 105, yPie + 6, { align: 'center' });
      doc.text(`${config.hotel_nombre} - RUC: ${config.hotel_ruc} - ${config.hotel_ciudad}`, 105, yPie + 11, { align: 'center' });

      const nombreArchivo = `${esBoleta ? 'boleta' : 'factura'}_${numero.replace('-', '_')}.pdf`;
      doc.save(nombreArchivo);
      toast.success(`${esBoleta ? 'Boleta' : 'Factura'} ${numero} generada`);
      setReservaSeleccionada(null);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Error al generar');
    } finally {
      setGenerando(false);
    }
  }

  const reservasFiltradas = reservas.filter(r => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      r.codigo?.toLowerCase().includes(q) ||
      r.cliente_nombre?.toLowerCase().includes(q) ||
      r.habitacion_numero?.toString().includes(q)
    );
  });

  return (
    <>
      <Header
        title="Facturación"
        description="Genera boletas y facturas para las reservas"
      />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Búsqueda */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="size-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                placeholder="Buscar por código, cliente o habitación..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 text-accent animate-spin" />
          </div>
        )}

        {!loading && reservasFiltradas.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="size-12 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary">No hay reservas disponibles para facturar</p>
              <p className="text-xs text-text-muted mt-1">Solo aparecen reservas pagadas o con check-out</p>
            </CardContent>
          </Card>
        )}

        {!loading && reservasFiltradas.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-color text-xs text-text-muted uppercase">
                    <th className="text-left py-3 px-4">Reserva</th>
                    <th className="text-left py-3 px-4">Cliente</th>
                    <th className="text-left py-3 px-4">Habitación</th>
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-center py-3 px-4">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {reservasFiltradas.map(r => (
                    <tr key={r.id} className="border-b border-border-color/30 hover:bg-bg-elevated/40">
                      <td className="py-3 px-4">
                        <p className="text-sm font-mono text-text-primary">{r.codigo}</p>
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          r.estado === 'check_out' ? 'bg-success/15 text-success' : 'bg-info/15 text-info'
                        )}>
                          {r.estado === 'check_out' ? 'Check-out' : 'Activa'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-text-primary">{r.cliente_nombre}</td>
                      <td className="py-3 px-4 text-sm text-text-secondary">
                        Hab. {r.habitacion_numero} · Piso {r.habitacion_piso}
                      </td>
                      <td className="py-3 px-4 text-xs text-text-secondary">
                        {new Date(r.fecha_check_in).toLocaleDateString('es-PE')}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-accent tabular-nums">
                        S/ {Number(r.precio_total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button size="sm" variant="outline" onClick={() => abrirModal(r)}>
                          <Receipt className="size-3.5" />
                          Emitir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal emisión */}
      <Modal
        open={!!reservaSeleccionada}
        onClose={() => setReservaSeleccionada(null)}
        title="Emitir comprobante"
        description={reservaSeleccionada ? `Reserva ${reservaSeleccionada.codigo} · S/ ${Number(reservaSeleccionada.precio_total).toFixed(2)}` : ''}
        size="md"
      >
        {reservaSeleccionada && (
          <div className="space-y-4">
            {/* Selector tipo */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDatos(d => ({ ...d, tipo: 'boleta' }))}
                className={cn(
                  'p-4 rounded-md border text-left transition',
                  datos.tipo === 'boleta' ? 'bg-accent/10 border-accent/50' : 'bg-bg-elevated border-border-color hover:border-accent/30'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="size-4 text-accent" />
                  <span className="text-sm font-semibold text-text-primary">Boleta</span>
                </div>
                <p className="text-xs text-text-secondary">Persona natural · DNI</p>
              </button>
              <button
                type="button"
                onClick={() => setDatos(d => ({ ...d, tipo: 'factura' }))}
                className={cn(
                  'p-4 rounded-md border text-left transition',
                  datos.tipo === 'factura' ? 'bg-accent/10 border-accent/50' : 'bg-bg-elevated border-border-color hover:border-accent/30'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="size-4 text-accent" />
                  <span className="text-sm font-semibold text-text-primary">Factura</span>
                </div>
                <p className="text-xs text-text-secondary">Empresa · RUC</p>
              </button>
            </div>

            {/* Campos boleta */}
            {datos.tipo === 'boleta' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="nombre-cliente">Apellidos y Nombres *</Label>
                  <Input
                    id="nombre-cliente"
                    value={datos.nombre_cliente ?? ''}
                    onChange={e => setDatos(d => ({ ...d, nombre_cliente: e.target.value }))}
                    placeholder="Nombres completos del cliente"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="dni-cliente">DNI</Label>
                  <Input
                    id="dni-cliente"
                    value={datos.dni ?? ''}
                    onChange={e => setDatos(d => ({ ...d, dni: e.target.value }))}
                    placeholder="00000000"
                    maxLength={8}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Campos factura */}
            {datos.tipo === 'factura' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="ruc">RUC *</Label>
                  <Input
                    id="ruc"
                    value={datos.ruc ?? ''}
                    onChange={e => setDatos(d => ({ ...d, ruc: e.target.value }))}
                    placeholder="20000000000"
                    maxLength={11}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="razon-social">Razón Social *</Label>
                  <Input
                    id="razon-social"
                    value={datos.razon_social ?? ''}
                    onChange={e => setDatos(d => ({ ...d, razon_social: e.target.value }))}
                    placeholder="Empresa SAC"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="direccion-fiscal">Dirección Fiscal</Label>
                  <Input
                    id="direccion-fiscal"
                    value={datos.direccion_fiscal ?? ''}
                    onChange={e => setDatos(d => ({ ...d, direccion_fiscal: e.target.value }))}
                    placeholder="Av. ejemplo 123, ciudad"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Resumen */}
            <div className="bg-bg-elevated rounded-md p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Servicio</span>
                <span className="text-text-primary">
                  {reservaSeleccionada.tipo_estancia === 'por_noche'
                    ? `${reservaSeleccionada.noches} noche(s)`
                    : 'Por horas'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Subtotal (sin IGV)</span>
                <span className="text-text-primary tabular-nums">
                  S/ {(Number(reservaSeleccionada.precio_total) / 1.18).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">IGV (18%)</span>
                <span className="text-text-primary tabular-nums">
                  S/ {(Number(reservaSeleccionada.precio_total) * 0.18 / 1.18).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border-color pt-1">
                <span className="text-text-primary">Total</span>
                <span className="text-accent tabular-nums">
                  S/ {Number(reservaSeleccionada.precio_total).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setReservaSeleccionada(null)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={generarPDF} isLoading={generando} className="flex-1">
                <Download className="size-4" />
                Generar {datos.tipo === 'boleta' ? 'Boleta' : 'Factura'} PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
