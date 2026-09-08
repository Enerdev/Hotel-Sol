import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  DollarSign,
  Loader2,
  Users,
  Star,
  CreditCard,
  FileText,
  Download,
  Clock,
  User,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { api, ApiError } from '../services/api';
import { Header } from '../components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Button } from '../components/ui/Button';
import { METODO_PAGO_LABEL } from '../types';
import type { OcupacionDia, ReporteIngresos, ClienteTop, MetodoPago } from '../types';
import { cn } from '../lib/cn';

type Periodo = 'hoy' | 'semana' | 'mes' | 'todo' | 'custom';
type Tab = 'resumen' | 'detallado' | 'global' | 'turnos';

interface TurnoData {
  turno: string;
  horario: string;
  num_reservas: number;
  ingresos: number;
  ingresos_noches: number;
  ingresos_horas: number;
  ingresos_cobros: number;
  total: number;
  personal: { nombre: string; reservas_atendidas: number; monto_gestionado: number }[];
}

interface ReservaDetalle {
  id: number;
  codigo: string;
  cliente_nombre: string;
  habitacion_numero: string;
  tipo_estancia: string;
  fecha_check_in: string;
  fecha_check_out: string | null;
  precio_total: number;
  monto_pagado: number;
  estado_pago: string;
  metodo_pago: string | null;
  estado: string;
}

const TURNOS_HORARIOS = [
  { nombre: 'Mañana', horario: '7:00 - 13:00', color: 'text-info' },
  { nombre: 'Tarde', horario: '13:00 - 18:00', color: 'text-accent' },
  { nombre: 'Noche', horario: '18:00 - 23:00', color: 'text-warning' },
  { nombre: 'Nochero', horario: '23:00 - 7:00', color: 'text-purple-400' },
];

export default function ReportesPage() {
  const [tab, setTab] = useState<Tab>('resumen');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const [ocupacion, setOcupacion] = useState<OcupacionDia[]>([]);
  const [ingresos, setIngresos] = useState<ReporteIngresos | null>(null);
  const [topClientes, setTopClientes] = useState<ClienteTop[]>([]);
  const [reservasDetalle, setReservasDetalle] = useState<ReservaDetalle[]>([]);
  const [turnos, setTurnos] = useState<TurnoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (periodo === 'hoy') { setDesde(fmt(today)); setHasta(fmt(today)); }
    else if (periodo === 'semana') { const s = new Date(today); s.setDate(today.getDate() - 7); setDesde(fmt(s)); setHasta(fmt(today)); }
    else if (periodo === 'mes') { const s = new Date(today); s.setDate(today.getDate() - 30); setDesde(fmt(s)); setHasta(fmt(today)); }
    else if (periodo === 'todo') { setDesde(''); setHasta(''); }
  }, [periodo]);

  useEffect(() => { cargar(); }, [desde, hasta]);

  async function cargar() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const q = params.toString() ? '?' + params.toString() : '';

      const [ocup, ing, top, res, trn] = await Promise.all([
        api.get<OcupacionDia[]>('/reportes/ocupacion' + q),
        api.get<ReporteIngresos>('/reportes/ingresos' + q),
        api.get<ClienteTop[]>('/reportes/clientes-top'),
        api.get<ReservaDetalle[]>('/reservas' + q),
        api.get<TurnoData[]>('/reportes/turnos' + q),
      ]);
      setOcupacion(ocup);
      setIngresos(ing);
      setTopClientes(top);
      setReservasDetalle(res);
      setTurnos(trn);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  const promedioOcupacion = ocupacion.length > 0
    ? Math.round(ocupacion.reduce((sum, d) => sum + d.tasa_ocupacion, 0) / ocupacion.length) : 0;

  const periodoLabel = desde && hasta ? `${desde} al ${hasta}` : 'Todo el período';

  // ── PDF Detallado ──
  function exportarPDFDetallado() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const ahora = new Date().toLocaleString('es-PE');
    doc.setFillColor(20, 30, 50);
    doc.rect(0, 0, 297, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE RESERVAS', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodoLabel}`, 14, 22);
    doc.text(`Generado: ${ahora}`, 200, 22);

    autoTable(doc, {
      startY: 32,
      head: [['Código', 'Cliente', 'Hab.', 'Tipo', 'Check-in', 'Total', 'Pagado', 'Estado']],
      body: reservasDetalle.map(r => [
        r.codigo,
        r.cliente_nombre,
        r.habitacion_numero,
        r.tipo_estancia?.replace(/_/g, ' '),
        r.fecha_check_in?.slice(0, 16),
        `S/ ${Number(r.precio_total).toFixed(2)}`,
        `S/ ${Number(r.monto_pagado).toFixed(2)}`,
        r.estado,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [20, 30, 50], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    });

    doc.save(`detalle_reservas_${desde || 'todo'}.pdf`);
  }

  // ── Excel Detallado ──
  function exportarExcelDetallado() {
    const wb = XLSX.utils.book_new();
    const data = [
      ['DETALLE DE RESERVAS', '', '', '', '', '', '', ''],
      [`Período: ${periodoLabel}`, '', '', '', '', '', '', ''],
      [''],
      ['Código', 'Cliente', 'Habitación', 'Tipo', 'Check-in', 'Total', 'Pagado', 'Estado'],
      ...reservasDetalle.map(r => [
        r.codigo, r.cliente_nombre, r.habitacion_numero,
        r.tipo_estancia?.replace(/_/g, ' '),
        r.fecha_check_in?.slice(0, 16),
        Number(r.precio_total), Number(r.monto_pagado), r.estado,
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Reservas');
    XLSX.writeFile(wb, `detalle_reservas_${desde || 'todo'}.xlsx`);
  }

  // ── PDF Turnos ──
  function exportarPDFTurnos() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const ahora = new Date().toLocaleString('es-PE');

    doc.setFillColor(20, 30, 50);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE POR TURNOS', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodoLabel}`, 14, 22);
    doc.text(`Generado: ${ahora}`, 140, 22);

    let y = 38;
    turnos.forEach(t => {
      doc.setFillColor(240, 240, 245);
      doc.rect(14, y - 5, 182, 8, 'F');
      doc.setTextColor(20, 30, 50);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`Turno ${t.turno} (${t.horario})`, 16, y);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 110);
      doc.text(`Total: S/ ${t.total.toFixed(2)}  |  Reservas: ${t.num_reservas}`, 130, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [['Concepto', 'Monto']],
        body: [
          ['Ingresos por noches', `S/ ${t.ingresos_noches.toFixed(2)}`],
          ['Ingresos por horas', `S/ ${t.ingresos_horas.toFixed(2)}`],
          ['Cobros directos', `S/ ${t.ingresos_cobros.toFixed(2)}`],
          ['TOTAL TURNO', `S/ ${t.total.toFixed(2)}`],
        ],
        theme: 'plain',
        headStyles: { fillColor: [20, 30, 50], textColor: [255, 255, 255], fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 1: { halign: 'right' } },
        margin: { left: 14, right: 14 },
        tableWidth: 90,
      });

      if (t.personal.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Personal', 'Reservas', 'Monto gestionado']],
          body: t.personal.map(p => [p.nombre, p.reservas_atendidas, `S/ ${p.monto_gestionado.toFixed(2)}`]),
          theme: 'plain',
          headStyles: { fillColor: [20, 30, 50], textColor: [255, 255, 255], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          columnStyles: { 2: { halign: 'right' } },
          margin: { left: 110, right: 14 },
          tableWidth: 86,
        });
      }

      y = (doc as any).lastAutoTable.finalY + 10;
      if (y > 260) { doc.addPage(); y = 20; }
    });

    doc.save(`reporte_turnos_${desde || 'todo'}.pdf`);
  }

  // ── Excel Turnos ──
  function exportarExcelTurnos() {
    const wb = XLSX.utils.book_new();

    const resumenData = [
      ['REPORTE POR TURNOS', '', '', '', '', '', ''],
      [`Período: ${periodoLabel}`, '', '', '', '', '', ''],
      [''],
      ['Turno', 'Horario', 'Reservas', 'Ing. Noches', 'Ing. Horas', 'Ing. Cobros', 'TOTAL'],
      ...turnos.map(t => [t.turno, t.horario, t.num_reservas, t.ingresos_noches, t.ingresos_horas, t.ingresos_cobros, t.total]),
      [''],
      ['TOTAL GENERAL', '', turnos.reduce((s, t) => s + t.num_reservas, 0), '', '', '', turnos.reduce((s, t) => s + t.total, 0)],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen Turnos');

    const personalData: any[][] = [
      ['PRODUCTIVIDAD POR TURNO', '', '', ''],
      ['Turno', 'Personal', 'Reservas atendidas', 'Monto gestionado'],
    ];
    turnos.forEach(t => t.personal.forEach(p => personalData.push([t.turno, p.nombre, p.reservas_atendidas, p.monto_gestionado])));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(personalData), 'Personal por Turno');

    if (reservasDetalle.length > 0) {
      const detData = [
        ['DETALLE DE RESERVAS', '', '', '', '', '', '', ''],
        [`Período: ${periodoLabel}`, '', '', '', '', '', '', ''],
        [''],
        ['Código', 'Cliente', 'Habitación', 'Tipo', 'Check-in', 'Total', 'Pagado', 'Estado'],
        ...reservasDetalle.map(r => [r.codigo, r.cliente_nombre, r.habitacion_numero, r.tipo_estancia, r.fecha_check_in?.slice(0,16), r.precio_total, r.monto_pagado, r.estado]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detData), 'Detalle Reservas');
    }

    XLSX.writeFile(wb, `reporte_turnos_${desde || 'todo'}.xlsx`);
  }

  // ── PDF Global ──
  function exportarPDFGlobal() {
    if (!ingresos) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFillColor(20, 30, 50);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE GLOBAL DE INGRESOS', 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodoLabel}`, 14, 22);

    autoTable(doc, {
      startY: 38,
      head: [['Categoría', 'Cantidad', 'Monto']],
      body: [
        ['Reservas (hospedaje)', ingresos.reservas.num_reservas, `S/ ${Number(ingresos.reservas.ingresos_reservas).toFixed(2)}`],
        ['Ventas de productos', ingresos.ventas.num_ventas, `S/ ${Number(ingresos.ventas.ingresos_ventas).toFixed(2)}`],
        ['TOTAL GENERAL', '', `S/ ${Number(ingresos.total_general).toFixed(2)}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [20, 30, 50] },
      margin: { left: 14, right: 14 },
    });

    doc.save(`reporte_global_${desde || 'todo'}.pdf`);
  }

  return (
    <>
      <Header title="Reportes" description="Métricas de operación, ingresos y rendimiento" />

      <div className="flex-1 p-4 md:p-8 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-border-color overflow-x-auto">
          {([
            { value: 'resumen', label: 'Resumen', icon: BarChart3 },
            { value: 'detallado', label: 'Detallado', icon: FileText },
            { value: 'global', label: 'Global', icon: DollarSign },
            { value: 'turnos', label: 'Por Turnos', icon: Clock },
          ] as { value: Tab; label: string; icon: typeof BarChart3 }[]).map(t => (
            <button key={t.value} type="button" onClick={() => setTab(t.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition whitespace-nowrap',
                tab === t.value ? 'border-accent text-accent' : 'border-transparent text-text-secondary hover:text-text-primary'
              )}
            >
              <t.icon className="size-4" />{t.label}
            </button>
          ))}
        </div>

        {/* Selector de período */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <Label>Período</Label>
            <div className="flex gap-2 flex-wrap">
              {(['hoy', 'semana', 'mes', 'todo', 'custom'] as Periodo[]).map(p => (
                <button key={p} type="button" onClick={() => setPeriodo(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium border transition',
                    periodo === p ? 'bg-accent/15 text-accent border-accent/50' : 'bg-bg-elevated text-text-secondary border-border-color hover:text-text-primary'
                  )}
                >
                  {p === 'hoy' && 'Hoy'}{p === 'semana' && 'Última semana'}{p === 'mes' && 'Último mes'}{p === 'todo' && 'Todo'}{p === 'custom' && 'Personalizado'}
                </button>
              ))}
            </div>
            {periodo === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div><Label htmlFor="desde">Desde</Label><Input id="desde" type="date" value={desde} onChange={e => setDesde(e.target.value)} className="mt-1" /></div>
                <div><Label htmlFor="hasta">Hasta</Label><Input id="hasta" type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="mt-1" /></div>
              </div>
            )}
          </CardContent>
        </Card>

        {loading && <div className="flex justify-center py-12"><Loader2 className="size-6 text-accent animate-spin" /></div>}
        {error && <div className="p-4 rounded-md bg-danger/10 border border-danger/30 text-danger text-sm">Error: {error}</div>}

        {!loading && !error && (
          <>
            {/* ── TAB RESUMEN ── */}
            {tab === 'resumen' && ingresos && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <ResumenCard label="Ingresos totales" value={`S/ ${Number(ingresos.total_general).toFixed(2)}`} icon={DollarSign} tone="accent" />
                  <ResumenCard label="Reservas" value={ingresos.reservas.num_reservas} icon={Calendar} tone="info" />
                  <ResumenCard label="Ventas productos" value={ingresos.ventas.num_ventas} icon={TrendingUp} tone="success" />
                  <ResumenCard label="Tasa ocupación" value={`${promedioOcupacion}%`} icon={BarChart3} tone="default" hint="Promedio del período" />
                </div>

                {ingresos.por_metodo.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="size-5 text-accent" />Ingresos por método de pago</CardTitle></CardHeader>
                    <CardContent>
                      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {ingresos.por_metodo.filter(m => m.metodo_pago).map(m => (
                          <div key={m.metodo_pago} className="bg-bg-elevated rounded-md p-3">
                            <p className="text-xs text-text-muted">{METODO_PAGO_LABEL[m.metodo_pago as MetodoPago] ?? m.metodo_pago}</p>
                            <p className="text-lg font-semibold text-text-primary tabular-nums mt-1">S/ {Number(m.total).toFixed(2)}</p>
                            <p className="text-xs text-text-secondary">{m.num} cobro{m.num !== 1 ? 's' : ''}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {ocupacion.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="size-5 text-accent" />Ocupación por día</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {ocupacion.slice(0, 15).map(d => (
                          <div key={d.fecha} className="flex items-center gap-3">
                            <span className="text-xs text-text-secondary w-24 shrink-0 tabular-nums">{formatDate(d.fecha)}</span>
                            <div className="flex-1 h-6 bg-bg-elevated rounded overflow-hidden">
                              <div className="h-full bg-accent/60 flex items-center px-2" style={{ width: `${d.tasa_ocupacion}%` }}>
                                <span className="text-xs text-text-primary font-medium">{d.tasa_ocupacion}%</span>
                              </div>
                            </div>
                            <span className="text-xs text-text-secondary w-32 text-right tabular-nums shrink-0">
                              {d.habs_ocupadas}/{d.total_habs} hab. · S/ {Number(d.ingresos).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {topClientes.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5 text-accent" />Top clientes</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border-color text-xs text-text-muted uppercase">
                              <th className="text-left py-2 px-4">#</th>
                              <th className="text-left py-2 px-4">Cliente</th>
                              <th className="text-right py-2 px-4">Estancias</th>
                              <th className="text-right py-2 px-4">Total gastado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {topClientes.slice(0, 10).map((c, idx) => (
                              <tr key={c.id} className="border-b border-border-color/40 text-sm">
                                <td className="py-2 px-4 text-text-muted tabular-nums">{idx + 1}</td>
                                <td className="py-2 px-4">
                                  <div className="flex items-center gap-2">
                                    {c.tipo_cliente === 'frecuente' && <Star className="size-3 text-accent fill-current" />}
                                    <span className="text-text-primary">{c.nombres} {c.apellidos}</span>
                                  </div>
                                </td>
                                <td className="py-2 px-4 text-right tabular-nums">{c.total_estancias}</td>
                                <td className="py-2 px-4 text-right text-accent font-medium tabular-nums">S/ {Number(c.monto_total_gastado).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ── TAB DETALLADO ── */}
            {tab === 'detallado' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="size-5 text-accent" />
                      Detalle de reservas · {periodoLabel}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button onClick={exportarExcelDetallado} variant="outline" size="sm" disabled={reservasDetalle.length === 0}>
                        <Download className="size-4" />Excel
                      </Button>
                      <Button onClick={exportarPDFDetallado} size="sm" disabled={reservasDetalle.length === 0}>
                        <Download className="size-4" />PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {reservasDetalle.length === 0 ? (
                    <div className="p-12 text-center text-text-secondary">No hay reservas en este período</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border-color text-xs text-text-muted uppercase">
                            <th className="text-left py-2 px-3">Código</th>
                            <th className="text-left py-2 px-3">Cliente</th>
                            <th className="text-left py-2 px-3">Hab.</th>
                            <th className="text-left py-2 px-3">Tipo</th>
                            <th className="text-left py-2 px-3">Check-in</th>
                            <th className="text-right py-2 px-3">Total</th>
                            <th className="text-right py-2 px-3">Pagado</th>
                            <th className="text-left py-2 px-3">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reservasDetalle.map(r => (
                            <tr key={r.id} className="border-b border-border-color/40 text-sm">
                              <td className="py-2 px-3 font-mono text-xs text-text-secondary">{r.codigo}</td>
                              <td className="py-2 px-3 text-text-primary">{r.cliente_nombre}</td>
                              <td className="py-2 px-3 text-text-secondary">{r.habitacion_numero}</td>
                              <td className="py-2 px-3 text-xs text-text-secondary">{r.tipo_estancia?.replace(/_/g, ' ')}</td>
                              <td className="py-2 px-3 text-xs text-text-secondary tabular-nums">{r.fecha_check_in?.slice(0, 16)}</td>
                              <td className="py-2 px-3 text-right text-accent tabular-nums">S/ {Number(r.precio_total).toFixed(2)}</td>
                              <td className="py-2 px-3 text-right text-success tabular-nums">S/ {Number(r.monto_pagado).toFixed(2)}</td>
                              <td className="py-2 px-3">
                                <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                                  r.estado === 'activa' && 'bg-info/10 border-info/40 text-info',
                                  r.estado === 'check_out' && 'bg-success/10 border-success/40 text-success',
                                  r.estado === 'cancelada' && 'bg-danger/10 border-danger/40 text-danger',
                                )}>
                                  {r.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── TAB GLOBAL ── */}
            {tab === 'global' && ingresos && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={exportarPDFGlobal} variant="outline" size="sm">
                    <Download className="size-4" />Exportar PDF
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="size-10 rounded-lg bg-accent/10 flex items-center justify-center"><DollarSign className="size-5 text-accent" /></div>
                        <div>
                          <p className="text-xs text-text-muted">Total General</p>
                          <p className="text-2xl font-bold text-accent tabular-nums">S/ {Number(ingresos.total_general).toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-xs text-text-muted mb-1">Ingresos por Hospedaje</p>
                      <p className="text-xl font-bold text-text-primary tabular-nums">S/ {Number(ingresos.reservas.ingresos_reservas).toFixed(2)}</p>
                      <p className="text-xs text-text-secondary mt-1">{ingresos.reservas.num_reservas} reservas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-5">
                      <p className="text-xs text-text-muted mb-1">Ingresos por Productos</p>
                      <p className="text-xl font-bold text-text-primary tabular-nums">S/ {Number(ingresos.ventas.ingresos_ventas).toFixed(2)}</p>
                      <p className="text-xs text-text-secondary mt-1">{ingresos.ventas.num_ventas} ventas</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle>Desglose por método de pago</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ingresos.por_metodo.filter(m => m.metodo_pago).map(m => {
                        const pct = Number(ingresos.total_general) > 0 ? (Number(m.total) / Number(ingresos.total_general)) * 100 : 0;
                        return (
                          <div key={m.metodo_pago} className="flex items-center gap-3">
                            <span className="text-sm text-text-secondary w-32">{METODO_PAGO_LABEL[m.metodo_pago as MetodoPago] ?? m.metodo_pago}</span>
                            <div className="flex-1 h-5 bg-bg-elevated rounded overflow-hidden">
                              <div className="h-full bg-accent/50" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm font-medium text-text-primary tabular-nums w-28 text-right">S/ {Number(m.total).toFixed(2)}</span>
                            <span className="text-xs text-text-muted w-10 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── TAB TURNOS ── */}
            {tab === 'turnos' && (
              <div className="space-y-4">
                <div className="flex justify-end gap-2">
                  <Button onClick={exportarExcelTurnos} variant="outline" size="sm">
                    <Download className="size-4" />Excel
                  </Button>
                  <Button onClick={exportarPDFTurnos} size="sm">
                    <Download className="size-4" />PDF
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {turnos.map((t, i) => (
                    <Card key={t.turno}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className={cn('size-4', TURNOS_HORARIOS[i]?.color ?? 'text-accent')} />
                          <p className="text-sm font-semibold text-text-primary">{t.turno}</p>
                        </div>
                        <p className="text-xs text-text-muted">{t.horario}</p>
                        <p className="text-xl font-bold text-accent tabular-nums mt-2">S/ {t.total.toFixed(2)}</p>
                        <p className="text-xs text-text-secondary mt-1">{t.num_reservas} reservas</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {turnos.map((t, i) => (
                  <Card key={t.turno}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className={cn('size-4', TURNOS_HORARIOS[i]?.color ?? 'text-accent')} />
                        Turno {t.turno} · {t.horario}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-text-muted uppercase mb-2">Ingresos</p>
                          <div className="space-y-1.5">
                            {[
                              { label: 'Por noches', value: t.ingresos_noches },
                              { label: 'Por horas', value: t.ingresos_horas },
                              { label: 'Cobros directos', value: t.ingresos_cobros },
                            ].map(item => (
                              <div key={item.label} className="flex justify-between text-sm">
                                <span className="text-text-secondary">{item.label}</span>
                                <span className="text-text-primary tabular-nums">S/ {item.value.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-sm font-semibold border-t border-border-color pt-1.5 mt-1.5">
                              <span className="text-text-primary">Total turno</span>
                              <span className="text-accent tabular-nums">S/ {t.total.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-text-muted uppercase mb-2">Personal</p>
                          {t.personal.length === 0 ? (
                            <p className="text-xs text-text-muted">Sin registros de personal</p>
                          ) : (
                            <div className="space-y-1.5">
                              {t.personal.map(p => (
                                <div key={p.nombre} className="flex items-center justify-between text-sm bg-bg-elevated rounded px-3 py-1.5">
                                  <div className="flex items-center gap-2">
                                    <User className="size-3.5 text-text-muted" />
                                    <span className="text-text-primary">{p.nombre}</span>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-accent tabular-nums">S/ {p.monto_gestionado.toFixed(2)}</p>
                                    <p className="text-xs text-text-muted">{p.reservas_atendidas} res.</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {turnos.length === 0 && (
                  <div className="text-center py-12 text-text-secondary">No hay datos para este período</div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={cargar} variant="outline">Refrescar reportes</Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ResumenCard({ label, value, icon: Icon, tone, hint }: {
  label: string; value: string | number; icon: typeof BarChart3;
  tone: 'default' | 'success' | 'info' | 'accent'; hint?: string;
}) {
  const colors = { default: 'bg-bg-elevated text-text-primary', success: 'bg-success/10 text-success', info: 'bg-info/10 text-info', accent: 'bg-accent/10 text-accent' }[tone];
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-text-secondary">{label}</p>
            <p className="text-2xl font-semibold text-text-primary tabular-nums mt-1">{value}</p>
            {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
          </div>
          <div className={cn('size-9 rounded-lg flex items-center justify-center', colors)}>
            <Icon className="size-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(s: string): string {
  return new Date(s + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}