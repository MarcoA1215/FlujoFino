import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonIcon,
  IonSpinner,
  IonModal,
  useIonToast
} from '@ionic/react';
import {
  trendingUpOutline,
  trendingDownOutline,
  walletOutline,
  cartOutline,
  pieChartOutline,
  alertCircleOutline,
  calendarOutline,
  peopleOutline,
  cardOutline,
  swapHorizontalOutline,
  settingsOutline,
  downloadOutline,
  closeOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import type { DashboardSummary, MonthlySummary } from '../types';
import AppHeader from '../components/AppHeader';
import InvestmentModal from '../components/InvestmentModal';
import { BuyUsdModal } from '../components/BuyUsdModal';
import { InitialTreasuryModal } from '../components/InitialTreasuryModal';
import DashboardMetricInfoModal, { MetricInfoButton, type MetricKey } from '../components/DashboardMetricInfoModal';
import { FinoDatePicker } from '../components/ui';
import { LibroVentasModal } from '../components/LibroVentasModal';

const Dashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySummary | null>(null);
  const [activeInfoMetric, setActiveInfoMetric] = useState<MetricKey | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loadingMonth, setLoadingMonth] = useState<boolean>(false);
  const [settings, setSettings] = useState<any>({});
  const [showInvestmentModal, setShowInvestmentModal] = useState(false);
  const [showBuyUsdModal, setShowBuyUsdModal] = useState(false);
  const [showInitialTreasuryModal, setShowInitialTreasuryModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [showLibroVentasModal, setShowLibroVentasModal] = useState(false);
  const [excelFromDate, setExcelFromDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [excelToDate, setExcelToDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [ledgerPreview, setLedgerPreview] = useState<any>(null);
  const [presentToast] = useIonToast();

  const fetchSummary = async () => {
    try {
      const res = await apiClient.get<DashboardSummary>('/dashboard/summary');
      setSummary(res.data);
      if (res.data?.monthlySummary) {
        setMonthlyData(res.data.monthlySummary);
      }
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando el resumen', duration: 3000, color: 'danger' });
    }
  };

  const fetchMonthDetail = async (monthStr: string) => {
    setLoadingMonth(true);
    try {
      const res = await apiClient.get<MonthlySummary>(`/dashboard/monthly-summary?month=${monthStr}`);
      setMonthlyData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMonth(false);
    }
  };

  const handlePreviewLedger = async (fromStr: string, toStr: string) => {
    try {
      const res = await apiClient.get(`/dashboard/ledger?from=${fromStr}&to=${toStr}`);
      setLedgerPreview(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportExcel = async () => {
    if (!excelFromDate || !excelToDate) {
      presentToast({ message: 'Selecciona el rango Desde y Hasta', duration: 2500, color: 'warning' });
      return;
    }
    setExportingExcel(true);
    try {
      const res = await apiClient.get(`/dashboard/ledger?from=${excelFromDate}&to=${excelToDate}`);
      const data = res.data;
      setLedgerPreview(data);
      const rows = Array.isArray(data?.rows) ? data.rows : (Array.isArray(data?.entries) ? data.entries : []);
      const sales = Array.isArray(data?.salesDetails) ? data.salesDetails : [];
      const sSum = data?.salesSummary || {
        totalInvoiced: sales.reduce((acc: number, s: any) => acc + (Number(s.totalAmount) || 0), 0),
        totalCollected: sales.reduce((acc: number, s: any) => acc + (Number(s.collectedUsd) || 0), 0),
        totalPending: sales.reduce((acc: number, s: any) => acc + (Number(s.pendingUsd) || 0), 0),
        totalCostOfSales: sales.reduce((acc: number, s: any) => acc + (Number(s.totalCost) || 0), 0),
        totalSalesProfit: sales.reduce((acc: number, s: any) => acc + (Number(s.netProfit) || 0), 0),
        ordersCount: sales.length,
      };

      const escapeHtml = (str: any) =>
        String(str ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      const tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; font-size: 11px; color: #1E293B; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
            th { background-color: #0F172A; color: #FFFFFF; font-weight: bold; padding: 7px 10px; border: 1px solid #CBD5E1; text-align: left; font-size: 11px; }
            td { padding: 6px 9px; border: 1px solid #E2E8F0; font-size: 11px; }
            .section-title { font-size: 14px; font-weight: 800; color: #0F172A; margin: 16px 0 8px 0; padding: 4px 0; border-bottom: 2px solid #10B981; }
            .kpi-th { background-color: #065F46; color: #FFFFFF; }
            .kpi-val { font-size: 13px; font-weight: bold; text-align: right; }
            .num { text-align: right; }
            .debe { color: #047857; text-align: right; font-weight: bold; }
            .haber { color: #DC2626; text-align: right; font-weight: bold; }
            .profit { color: #059669; text-align: right; font-weight: bold; }
            .cost { color: #D97706; text-align: right; }
            .saldo { color: #0F172A; text-align: right; font-weight: bold; background-color: #F8FAFC; }
            .tot { background-color: #ECFDF5; font-weight: bold; border-top: 2px solid #10B981; }
            .tot-text { font-weight: bold; text-align: right; }
          </style>
        </head>
        <body>
          <h2 style="margin: 0 0 4px 0; color: #0F172A;">FinoWork - Reporte Integral de Operaciones y Ventas</h2>
          <p style="margin: 0 0 16px 0; color: #64748B;">
            <b>Negocio:</b> ${escapeHtml(user?.tenantName || 'FinoWork')} | 
            <b>Rango:</b> ${escapeHtml(excelFromDate)} al ${escapeHtml(excelToDate)} | 
            <b>Fecha Emisión:</b> ${new Date().toLocaleString('es-ES')}
          </p>

          <!-- SECCIÓN 1: RESUMEN EJECUTIVO (KPIs) -->
          <div class="section-title">📊 1. RESUMEN EJECUTIVO COMERCIAL Y CONTABLE</div>
          <table style="max-width: 800px;">
            <thead>
              <tr>
                <th class="kpi-th">Concepto Clave</th>
                <th class="kpi-th" style="text-align: right;">Total Período</th>
                <th class="kpi-th">Descripción Operativa</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>Órdenes / Pedidos Atendidos</b></td>
                <td class="kpi-val">${sSum.ordersCount || sales.length}</td>
                <td>Ventas y pedidos registrados en el período</td>
              </tr>
              <tr>
                <td><b>Total Facturado Comercial</b></td>
                <td class="kpi-val debe">$${Number(sSum.totalInvoiced || 0).toFixed(2)}</td>
                <td>Monto total de ventas brutas realizadas</td>
              </tr>
              <tr>
                <td><b>Total Cobrado Efectivo en Caja</b></td>
                <td class="kpi-val debe">$${Number(sSum.totalCollected || 0).toFixed(2)}</td>
                <td>Dinero realmente ingresado en caja/bancos</td>
              </tr>
              <tr>
                <td><b>Cuentas por Cobrar (Pendiente)</b></td>
                <td class="kpi-val" style="color: #D97706;">$${Number(sSum.totalPending || 0).toFixed(2)}</td>
                <td>Saldos abiertos y créditos por cobrar</td>
              </tr>
              <tr>
                <td><b>Costo de Mercancía Vendida (COGS)</b></td>
                <td class="kpi-val cost">$${Number(sSum.totalCostOfSales || 0).toFixed(2)}</td>
                <td>Costo base de los productos y materiales vendidos</td>
              </tr>
              <tr style="background-color: #ECFDF5;">
                <td><b>Margen / Utilidad Bruta en Ventas</b></td>
                <td class="kpi-val profit">$${Number(sSum.totalSalesProfit || 0).toFixed(2)}</td>
                <td>Ganancia directa generada por las ventas</td>
              </tr>
              <tr>
                <td><b>Total Movimientos de Tesorería (Debe +)</b></td>
                <td class="kpi-val debe">$${Number(data?.totalDebe || 0).toFixed(2)}</td>
                <td>Ingresos totales computados en tesorería</td>
              </tr>
              <tr>
                <td><b>Total Salidas de Tesorería (Haber -)</b></td>
                <td class="kpi-val haber">$${Number(data?.totalHaber || 0).toFixed(2)}</td>
                <td>Gastos, nóminas y pagos salidos de caja</td>
              </tr>
              <tr style="background-color: #F1F5F9;">
                <td><b>Saldo Neto Final de Caja / Tesorería</b></td>
                <td class="kpi-val" style="color: ${Number(data?.finalSaldo || 0) >= 0 ? '#047857' : '#DC2626'};">$${Number(data?.finalSaldo || 0).toFixed(2)}</td>
                <td>Liquidez neta disponible acumulada en el período</td>
              </tr>
            </tbody>
          </table>

          <!-- SECCIÓN 2: RESUMEN DE VENTAS POR PEDIDO / FACTURA -->
          <div class="section-title">🛍️ 2. RESUMEN DE VENTAS POR PEDIDO / COMPROBANTE (${sales.length} registros)</div>
          <table>
            <thead>
              <tr style="background-color: #10B981;">
                <th>Fecha y Hora</th>
                <th># Orden</th>
                <th>Cliente</th>
                <th>C.I. / RIF</th>
                <th>Teléfono</th>
                <th>Método Pago</th>
                <th style="text-align: right;">Base Gravada (USD)</th>
                <th style="text-align: right;">Exento (USD)</th>
                <th style="text-align: right;">IVA 16% (USD)</th>
                <th style="text-align: right;">Total Facturado (USD)</th>
                <th style="text-align: right;">Cobrado (USD)</th>
                <th style="text-align: right;">Por Cobrar (USD)</th>
                <th style="text-align: right;">Monto Bs.</th>
                <th style="text-align: right;">Costo (USD)</th>
                <th style="text-align: right;">Utilidad (USD)</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${sales.length === 0 ? `<tr><td colspan="16" style="text-align: center; padding: 14px; color: #64748B;">No se registraron ventas en este rango de fechas.</td></tr>` : sales.map((s: any) => {
                const sDate = s.date ? new Date(s.date).toLocaleString('es-ES') : '';
                return `
                  <tr>
                    <td>${escapeHtml(sDate)}</td>
                    <td><b>${escapeHtml(s.orderCode || s.orderId)}</b></td>
                    <td>${escapeHtml(s.customerName)}</td>
                    <td>${escapeHtml(s.customerIdentification || '-')}</td>
                    <td>${escapeHtml(s.customerPhone || '-')}</td>
                    <td>${escapeHtml(s.paymentMethod)}</td>
                    <td class="num">$${Number(s.taxableBase || 0).toFixed(2)}</td>
                    <td class="num">$${Number(s.subtotalExempt || 0).toFixed(2)}</td>
                    <td class="num" style="color: #047857;">$${Number(s.taxAmount || 0).toFixed(2)}</td>
                    <td class="debe">$${Number(s.totalAmount || 0).toFixed(2)}</td>
                    <td class="num">$${Number(s.collectedUsd || 0).toFixed(2)}</td>
                    <td class="num" style="color: ${Number(s.pendingUsd || 0) > 0 ? '#D97706' : '#64748B'};">$${Number(s.pendingUsd || 0).toFixed(2)}</td>
                    <td class="num">${Number(s.amountBs || 0) > 0 ? `Bs. ${Number(s.amountBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : '-'}</td>
                    <td class="cost">$${Number(s.totalCost || 0).toFixed(2)}</td>
                    <td class="profit">$${Number(s.netProfit || 0).toFixed(2)}</td>
                    <td>${escapeHtml(s.paymentStatus || s.status)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="tot">
                <td colspan="6" class="tot-text">TOTALES VENTAS (${sales.length} órdenes)</td>
                <td class="num">$${Number(sales.reduce((acc: number, s: any) => acc + (Number(s.taxableBase) || 0), 0)).toFixed(2)}</td>
                <td class="num">$${Number(sales.reduce((acc: number, s: any) => acc + (Number(s.subtotalExempt) || 0), 0)).toFixed(2)}</td>
                <td class="num" style="color: #047857;">$${Number(sales.reduce((acc: number, s: any) => acc + (Number(s.taxAmount) || 0), 0)).toFixed(2)}</td>
                <td class="debe">$${Number(sSum.totalInvoiced || 0).toFixed(2)}</td>
                <td class="num">$${Number(sSum.totalCollected || 0).toFixed(2)}</td>
                <td class="num" style="color: #D97706;">$${Number(sSum.totalPending || 0).toFixed(2)}</td>
                <td></td>
                <td class="cost">$${Number(sSum.totalCostOfSales || 0).toFixed(2)}</td>
                <td class="profit">$${Number(sSum.totalSalesProfit || 0).toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <!-- SECCIÓN 3: DESGLOSE INDIVIDUAL DE PRODUCTOS Y SERVICIOS VENDIDOS (ÍTEM POR ÍTEM) -->
          ${(() => {
            const allItems: any[] = [];
            sales.forEach((s: any) => {
              if (Array.isArray(s.items) && s.items.length > 0) {
                s.items.forEach((it: any) => {
                  allItems.push({ ...it, sale: s });
                });
              } else {
                allItems.push({
                  productName: s.itemsSummary || 'Venta de mostrador',
                  quantity: 1,
                  unitPrice: s.totalAmount,
                  unitCost: s.totalCost,
                  subtotal: s.totalAmount,
                  isTaxExempt: Number(s.taxAmount || 0) === 0,
                  taxRate: Number(s.taxAmount || 0) > 0 ? 16 : 0,
                  taxAmount: s.taxAmount || 0,
                  lineTotal: s.totalAmount,
                  lineCost: s.totalCost,
                  lineProfit: s.netProfit,
                  sale: s,
                });
              }
            });

            const totalQty = allItems.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
            const totalSub = allItems.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
            const totalTax = allItems.reduce((acc, it) => acc + (Number(it.taxAmount) || 0), 0);
            const totalLines = allItems.reduce((acc, it) => acc + (Number(it.lineTotal) || 0), 0);
            const totalCosts = allItems.reduce((acc, it) => acc + (Number(it.lineCost) || 0), 0);
            const totalProfits = allItems.reduce((acc, it) => acc + (Number(it.lineProfit) || 0), 0);

            return `
              <div class="section-title">📦 3. DESGLOSE INDIVIDUAL DE PRODUCTOS VENDIDOS (${allItems.length} líneas / ${totalQty} unidades)</div>
              <table>
                <thead>
                  <tr style="background-color: #0369A1; color: #FFFFFF;">
                    <th>Fecha</th>
                    <th># Orden</th>
                    <th>Cliente</th>
                    <th>C.I. / RIF</th>
                    <th>Producto / Ítem Vendido</th>
                    <th style="text-align: right;">Cant.</th>
                    <th style="text-align: right;">P. Unit ($)</th>
                    <th style="text-align: right;">Subtotal ($)</th>
                    <th style="text-align: center;">Condición Fiscal</th>
                    <th style="text-align: right;">Base Gravada ($)</th>
                    <th style="text-align: center;">% IVA</th>
                    <th style="text-align: right;">IVA ($)</th>
                    <th style="text-align: right;">Total Línea ($)</th>
                    <th style="text-align: right;">Costo ($)</th>
                    <th style="text-align: right;">Utilidad ($)</th>
                    <th>Método Pago</th>
                  </tr>
                </thead>
                <tbody>
                  ${allItems.length === 0 ? `<tr><td colspan="16" style="text-align: center; padding: 14px; color: #64748B;">No hay ítems registrados en este período.</td></tr>` : allItems.map((it: any) => {
                    const s = it.sale || {};
                    const sDate = s.date ? new Date(s.date).toLocaleDateString('es-ES') : '';
                    const isEx = Boolean(it.isTaxExempt);
                    const baseGrav = isEx ? 0 : Number(it.subtotal || 0);

                    return `
                      <tr>
                        <td>${escapeHtml(sDate)}</td>
                        <td><b>${escapeHtml(s.orderCode || s.orderId)}</b></td>
                        <td>${escapeHtml(s.customerName)}</td>
                        <td>${escapeHtml(s.customerIdentification || '-')}</td>
                        <td><b>${escapeHtml(it.productName)}</b></td>
                        <td class="num" style="font-weight: bold;">${it.quantity}</td>
                        <td class="num">$${Number(it.unitPrice || 0).toFixed(2)}</td>
                        <td class="num">$${Number(it.subtotal || 0).toFixed(2)}</td>
                        <td style="text-align: center; font-weight: bold; color: ${isEx ? '#475569' : '#065F46'}; background-color: ${isEx ? '#F1F5F9' : '#ECFDF5'};">
                          ${isEx ? 'EXENTO' : 'GRAVADO (16%)'}
                        </td>
                        <td class="num">${baseGrav > 0 ? `$${baseGrav.toFixed(2)}` : '-'}</td>
                        <td style="text-align: center;">${it.taxRate}%</td>
                        <td class="num" style="color: #047857;">${Number(it.taxAmount || 0) > 0 ? `$${Number(it.taxAmount).toFixed(2)}` : '-'}</td>
                        <td class="debe">$${Number(it.lineTotal || 0).toFixed(2)}</td>
                        <td class="cost">$${Number(it.lineCost || 0).toFixed(2)}</td>
                        <td class="profit">$${Number(it.lineProfit || 0).toFixed(2)}</td>
                        <td>${escapeHtml(s.paymentMethod)}</td>
                      </tr>
                    `;
                  }).join('')}
                  <tr class="tot">
                    <td colspan="5" class="tot-text">TOTALES POR PRODUCTOS (${allItems.length} líneas)</td>
                    <td class="num">${totalQty}</td>
                    <td></td>
                    <td class="num">$${totalSub.toFixed(2)}</td>
                    <td></td>
                    <td class="num">$${Number(allItems.reduce((acc, it) => acc + (it.isTaxExempt ? 0 : Number(it.subtotal || 0)), 0)).toFixed(2)}</td>
                    <td></td>
                    <td class="num" style="color: #047857;">$${totalTax.toFixed(2)}</td>
                    <td class="debe">$${totalLines.toFixed(2)}</td>
                    <td class="cost">$${totalCosts.toFixed(2)}</td>
                    <td class="profit">$${totalProfits.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            `;
          })()}

          <!-- SECCIÓN 4: LIBRO MAYOR CONTABLE DE MOVIMIENTOS -->
          <div class="section-title">🏛️ 4. LIBRO MAYOR CONTABLE DE MOVIMIENTOS DE CAJA (${rows.length} movimientos)</div>
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Tipo Movimiento</th>
                <th>Concepto / Detalle</th>
                <th>Tercero / Cliente</th>
                <th>Método</th>
                <th>Referencia</th>
                <th style="text-align: right;">Debe (Ingreso USD)</th>
                <th style="text-align: right;">Haber (Egreso USD)</th>
                <th style="text-align: right;">Saldo Acumulado (USD)</th>
              </tr>
            </thead>
            <tbody>
              ${rows.length === 0 ? `<tr><td colspan="9" style="text-align: center; padding: 14px; color: #64748B;">No hay movimientos contables registrados en este período.</td></tr>` : rows.map((r: any) => {
                const dStr = r.date ? new Date(`${r.date}T${r.time || '12:00'}:00`).toLocaleString('es-ES') : '';
                return `
                  <tr>
                    <td>${escapeHtml(dStr || r.date)}</td>
                    <td><b>${escapeHtml(r.type)}</b></td>
                    <td>${escapeHtml(r.concept)}</td>
                    <td>${escapeHtml(r.party || '-')}</td>
                    <td>${escapeHtml(r.method)}</td>
                    <td>${escapeHtml(r.reference)}</td>
                    <td class="debe">${Number(r.debe || 0) > 0 ? `$${Number(r.debe).toFixed(2)}` : '0.00'}</td>
                    <td class="haber">${Number(r.haber || 0) > 0 ? `$${Number(r.haber).toFixed(2)}` : '0.00'}</td>
                    <td class="saldo">$${Number(r.saldo || 0).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="tot">
                <td colspan="6" class="tot-text">TOTALES DE MOVIMIENTOS (${rows.length} registros)</td>
                <td class="debe">$${Number(data?.totalDebe || 0).toFixed(2)}</td>
                <td class="haber">$${Number(data?.totalHaber || 0).toFixed(2)}</td>
                <td class="saldo">$${Number(data?.finalSaldo || 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </body>
        </html>
      `;

      const blob = new Blob(['\ufeff', tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FinoWork_Reporte_Ventas_y_Contabilidad_${excelFromDate}_a_${excelToDate}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      presentToast({ message: '📊 Reporte Excel Completo (Resumen, Ventas y Movimientos) descargado con éxito', duration: 3000, color: 'success' });
    } catch (e: any) {
      console.error(e);
      presentToast({ message: 'Error exportando reporte a Excel', duration: 3000, color: 'danger' });
    } finally {
      setExportingExcel(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    apiClient.get('/settings').then(res => setSettings(res.data)).catch(() => {});
  }, []);

  return (
    <IonPage>
      <AppHeader title="Inicio" subtitle={user?.tenantName} onRefresh={fetchSummary} />

      <IonContent fullscreen className="ff-has-bottom-nav" style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ maxWidth: '1050px', margin: '0 auto', padding: '16px 16px 80px 16px' }}>

          {/* Quick Actions Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => navigate('/pos')}
              className="ff-btn-primary bg-theme-primary"
              style={{ padding: '12px 14px', borderRadius: '14px', fontSize: '13px', backgroundColor: 'var(--theme-primary)', color: 'var(--theme-primary-contrast, #ffffff)' }}
            >
              <IonIcon icon={cardOutline} style={{ fontSize: '18px' }} />
              Nueva Venta
            </button>

            <button
              type="button"
              onClick={() => navigate('/reservations')}
              style={{
                background: '#ffffff',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: 'var(--ff-shadow-sm)'
              }}
            >
              <IonIcon icon={calendarOutline} style={{ fontSize: '18px', color: '#10B981' }} />
              Agenda / Citas
            </button>

            <button
              type="button"
              onClick={() => navigate('/customers')}
              style={{
                background: '#ffffff',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: 'var(--ff-shadow-sm)'
              }}
            >
              <IonIcon icon={peopleOutline} style={{ fontSize: '18px', color: '#3B82F6' }} />
              Clientes
            </button>

            <button
              type="button"
              onClick={() => setShowInvestmentModal(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #E2E8F0',
                color: '#0F172A',
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: 'var(--ff-shadow-sm)'
              }}
            >
              <IonIcon icon={trendingUpOutline} style={{ fontSize: '18px', color: '#8B5CF6' }} />
              Inversión / Capital
            </button>

            <button
              type="button"
              onClick={() => {
                setShowExcelModal(true);
                handlePreviewLedger(excelFromDate, excelToDate);
              }}
              style={{
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '13px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                boxShadow: 'var(--ff-shadow-sm)'
              }}
            >
              <IonIcon icon={downloadOutline} style={{ fontSize: '18px', color: '#059669' }} />
              Exportar Excel
            </button>

            {settings?.featureFiscalSupport && (
              <button
                type="button"
                onClick={() => setShowLibroVentasModal(true)}
                style={{
                  background: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  color: '#1E40AF',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: 'var(--ff-shadow-sm)'
                }}
              >
                <IonIcon icon={documentTextOutline} style={{ fontSize: '18px', color: '#2563EB' }} />
                Libro de Ventas (IVA)
              </button>
            )}
          </div>

          {!summary ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <IonSpinner name="crescent" color="primary" />
              <p style={{ marginTop: '12px', color: '#64748B', fontWeight: '500' }}>Cargando métricas...</p>
            </div>
          ) : (
            <div>
              {/* Sección de Tesorería y Fondos Reales */}
              {summary.treasury && (
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    padding: '16px 18px',
                    marginBottom: '20px',
                    boxShadow: 'var(--ff-shadow-sm)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>🏛️</span> Tesorería y Fondos Reales
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        Dinero exacto disponible en cada cuenta sin distorsión por la tasa
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setShowInitialTreasuryModal(true)}
                        style={{
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          border: '1px solid #CBD5E1',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <IonIcon icon={settingsOutline} style={{ fontSize: '15px' }} />
                        <span>Saldo Inicial</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowBuyUsdModal(true)}
                        style={{
                          backgroundColor: '#10B981',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                        }}
                      >
                        <IonIcon icon={swapHorizontalOutline} style={{ fontSize: '16px' }} />
                        <span>Comprar USD / Proteger Bs</span>
                      </button>
                    </div>
                  </div>

                  {/* Resumen Global Consolidado (Patrimonio Líquido Total) */}
                  {(() => {
                    const hasCopActive = Boolean(
                      summary.treasury.enableCopCurrency ||
                      (Number(summary.treasury.cashCop || 0) > 0) ||
                      (Number(summary.treasury.bankCop || 0) > 0) ||
                      (Number(summary.treasury.initialCashCop || 0) > 0) ||
                      (Number(summary.treasury.initialBankCop || 0) > 0)
                    );

                    return (
                      <div
                        style={{
                          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                          borderRadius: '14px',
                          padding: '14px 18px',
                          marginBottom: '18px',
                          color: '#ffffff',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Patrimonio Líquido Total en Caja y Bancos
                          </span>
                          <div style={{ fontSize: '26px', fontWeight: '900', color: '#34D399', marginTop: '2px' }}>
                            ${summary.treasury.totalRealUSD.toFixed(2)} USD
                          </div>
                          <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '2px' }}>
                            Valor consolidado de todo tu dinero físico y digital convertido a tasa de mercado
                          </div>
                        </div>

                        {/* Chips de Aporte por Moneda */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                          <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>💵 DÓLARES</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC' }}>
                              ${((summary.treasury.cashUSD || 0) + (summary.treasury.digitalUSD || 0)).toFixed(2)}
                            </div>
                          </div>

                          <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.12)' }}>
                            <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>🇻🇪 BOLÍVARES</div>
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC' }}>
                              {summary.treasury.currencySymbol || 'Bs.'} {Number((summary.treasury.bankBs || 0) + (summary.treasury.cashBs || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '10px', color: '#34D399' }}>
                              ≈ ${((summary.treasury.bankBsEquivalentUSD || 0) + (summary.treasury.cashBsEquivalentUSD || 0)).toFixed(2)}
                            </div>
                          </div>

                          {hasCopActive ? (
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '10px', padding: '6px 12px', border: '1px solid rgba(255,255,255,0.12)' }}>
                              <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: '700' }}>🇨🇴 PESOS (COP)</div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: '#F8FAFC' }}>
                                $ {Number((summary.treasury.cashCop || 0) + (summary.treasury.bankCop || 0)).toLocaleString('es-CO')}
                              </div>
                              <div style={{ fontSize: '10px', color: '#FBBF24' }}>
                                ≈ ${((summary.treasury.copEquivalentUSD || 0) + (summary.treasury.bankCopEquivalentUSD || 0)).toFixed(2)}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })()}

                  {/* DIVISIÓN 1: 💵 LIQUIDEZ EN DÓLARES (USD) */}
                  <div
                    style={{
                      backgroundColor: '#FAFAF9',
                      borderRadius: '14px',
                      border: '1px solid #E7E5E4',
                      padding: '14px 16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>💵</span>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#1C1917', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            División Dólares (USD)
                          </span>
                          <span style={{ fontSize: '11px', color: '#78716C', marginLeft: '8px' }}>
                            Efectivo físico en gaveta y cuentas digitales USD
                          </span>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: '#ECFDF5', color: '#047857', padding: '3px 10px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                        Total USD: ${((summary.treasury.cashUSD || 0) + (summary.treasury.digitalUSD || 0)).toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                      {/* Gaveta Efectivo USD */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              💵 Gaveta Física (Efectivo USD)
                            </span>
                            <MetricInfoButton metricKey="treasury_cash" onOpen={setActiveInfoMetric} size="sm" />
                          </div>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: (summary.treasury.cashUSD || 0) < 0 ? '#DC2626' : '#047857', marginTop: '2px' }}>
                            ${(summary.treasury.cashUSD || 0).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '11px', color: (summary.treasury.cashUSD || 0) < 0 ? '#DC2626' : '#64748B', marginTop: '2px', fontWeight: (summary.treasury.cashUSD || 0) < 0 ? '700' : 'normal' }}>
                            {(summary.treasury.cashUSD || 0) < 0 ? '⚠️ Gaveta en negativo (ajusta Saldo Inicial)' : 'Billetes reales en caja para vuelto'}
                          </div>
                        </div>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            backgroundColor: (summary.treasury.cashUSD || 0) < 0 ? '#FEE2E2' : '#ECFDF5',
                            color: (summary.treasury.cashUSD || 0) < 0 ? '#DC2626' : '#10B981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                          }}
                        >
                          💵
                        </div>
                      </div>

                      {/* Billetera Digital USDT / Binance */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              🟡 Digital (Binance Pay / USDT / Zelle)
                            </span>
                            <MetricInfoButton metricKey="treasury_digital" onOpen={setActiveInfoMetric} size="sm" />
                          </div>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: '#D97706', marginTop: '2px' }}>
                            ${(summary.treasury.digitalUSD || 0).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            En cuentas digitales / cripto estables
                          </div>
                        </div>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            backgroundColor: '#FEF3C7',
                            color: '#D97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                          }}
                        >
                          🟡
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DIVISIÓN 2: 🇻🇪 LIQUIDEZ EN BOLÍVARES (Bs.) */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      padding: '14px 16px',
                      marginBottom: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>🇻🇪</span>
                        <div>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            División Bolívares (Bs.)
                          </span>
                          <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '8px' }}>
                            Gaveta física en Bs. y cuentas bancarias nacionales
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '3px 10px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                          Total Bs: {summary.treasury.currencySymbol || 'Bs.'} {Number((summary.treasury.bankBs || 0) + (summary.treasury.cashBs || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#ECFDF5', color: '#065F46', padding: '3px 8px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                          ≈ ${((summary.treasury.bankBsEquivalentUSD || 0) + (summary.treasury.cashBsEquivalentUSD || 0)).toFixed(2)} USD (Tasa {Number(summary.treasury.exchangeRate || 0).toFixed(2)})
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                      {/* Gaveta Física Bolívares */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              💵 Gaveta Física (Efectivo Bs.)
                            </span>
                            <MetricInfoButton metricKey="treasury_cash_bs" onOpen={setActiveInfoMetric} size="sm" />
                          </div>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: (summary.treasury.cashBs || 0) < 0 ? '#DC2626' : '#047857', marginTop: '2px' }}>
                            {summary.treasury.currencySymbol || 'Bs.'} {Number(summary.treasury.cashBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '11px', color: (summary.treasury.cashBs || 0) < 0 ? '#DC2626' : '#64748B', marginTop: '2px' }}>
                            Equiv. al cambio: <b>${(summary.treasury.cashBsEquivalentUSD || 0).toFixed(2)}</b> (Billetes reales para vuelto)
                          </div>
                        </div>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            backgroundColor: (summary.treasury.cashBs || 0) < 0 ? '#FEE2E2' : '#ECFDF5',
                            color: (summary.treasury.cashBs || 0) < 0 ? '#DC2626' : '#059669',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '22px',
                          }}
                        >
                          💵
                        </div>
                      </div>

                      {/* Bancos Venezuela (Punto + Pago Móvil + Transferencias) */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                🏦 Bancos Venezuela (Cuentas Nacionales)
                              </span>
                              <MetricInfoButton metricKey="treasury_banks" onOpen={setActiveInfoMetric} size="sm" />
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', marginTop: '2px' }}>
                              {summary.treasury.currencySymbol || 'Bs.'} {Number(summary.treasury.bankBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                              Equiv. al cambio: <b>${(summary.treasury.bankBsEquivalentUSD || 0).toFixed(2)} USD</b>
                            </div>
                          </div>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              backgroundColor: '#EFF6FF',
                              color: '#3B82F6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '22px',
                              flexShrink: 0,
                            }}
                          >
                            🏦
                          </div>
                        </div>

                        {/* Desglose de canales bancarios */}
                        <div
                          style={{
                            marginTop: '10px',
                            paddingTop: '8px',
                            borderTop: '1px dashed #E2E8F0',
                            display: 'flex',
                            gap: '10px',
                            flexWrap: 'wrap',
                            fontSize: '11px',
                          }}
                        >
                          <span style={{ color: '#1E293B' }}>
                            💳 Punto: <b>{Number(summary.treasury.puntoBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</b>
                          </span>
                          <span style={{ color: '#6D28D9' }}>
                            📱 Pago Móvil: <b>{Number(summary.treasury.pagoMovilBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</b>
                          </span>
                          <span style={{ color: '#0F172A' }}>
                            🏛️ Transf: <b>{Number(summary.treasury.transferBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</b>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DIVISIÓN 3: 🇨🇴 LIQUIDEZ EN PESOS COLOMBIANOS (COP) */}
                  {Boolean(
                    summary.treasury.enableCopCurrency ||
                    (Number(summary.treasury.cashCop || 0) > 0) ||
                    (Number(summary.treasury.bankCop || 0) > 0) ||
                    (Number(summary.treasury.initialCashCop || 0) > 0) ||
                    (Number(summary.treasury.initialBankCop || 0) > 0)
                  ) ? (
                    <div
                      style={{
                        backgroundColor: '#FFFBEB',
                        borderRadius: '14px',
                        border: '1px solid #FDE68A',
                        padding: '14px 16px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '18px' }}>🇨🇴</span>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              División Pesos Colombianos (COP)
                            </span>
                            <span style={{ fontSize: '11px', color: '#B45309', marginLeft: '8px' }}>
                              Efectivo físico y cuentas bancarias en Colombia
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: '#FEF3C7', color: '#92400E', padding: '3px 10px', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                            Total COP: $ {Number((summary.treasury.cashCop || 0) + (summary.treasury.bankCop || 0)).toLocaleString('es-CO')}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: '700', backgroundColor: '#ECFDF5', color: '#065F46', padding: '3px 8px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                            ≈ ${((summary.treasury.copEquivalentUSD || 0) + (summary.treasury.bankCopEquivalentUSD || 0)).toFixed(2)} USD (Tasa {Number(summary.treasury.exchangeRateCop || 4000).toLocaleString('es-CO')})
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                        {/* Gaveta Pesos COP */}
                        <div
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #FDE68A',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                💵 Gaveta Pesos (Efectivo COP)
                              </span>
                              <MetricInfoButton metricKey="treasury_cop" onOpen={setActiveInfoMetric} size="sm" />
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: '900', color: (summary.treasury.cashCop || 0) < 0 ? '#DC2626' : '#B45309', marginTop: '2px' }}>
                              $ {Number(summary.treasury.cashCop || 0).toLocaleString('es-CO')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
                              Equiv. al cambio: <b>${(summary.treasury.copEquivalentUSD || 0).toFixed(2)} USD</b> (Billetes reales para vuelto)
                            </div>
                          </div>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '22px',
                            }}
                          >
                            🇨🇴
                          </div>
                        </div>

                        {/* Bancos Colombia (Nequi / Bancolombia / Daviplata) */}
                        <div
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #FDE68A',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                📲 Bancos Colombia (Nequi / Daviplata / COP)
                              </span>
                              <MetricInfoButton metricKey="treasury_bank_cop" onOpen={setActiveInfoMetric} size="sm" />
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: '900', color: (summary.treasury.bankCop || 0) < 0 ? '#DC2626' : '#B45309', marginTop: '2px' }}>
                              $ {Number(summary.treasury.bankCop || 0).toLocaleString('es-CO')}
                            </div>
                            <div style={{ fontSize: '11px', color: '#78716C', marginTop: '2px' }}>
                              Equiv. al cambio: <b>${(summary.treasury.bankCopEquivalentUSD || 0).toFixed(2)} USD</b> en cuentas digitales
                            </div>
                          </div>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              backgroundColor: '#FEF3C7',
                              color: '#B45309',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '22px',
                            }}
                          >
                            📲
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Arqueo Mensual Detallado (Antes del Acumulativo Total) */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  padding: '18px',
                  marginBottom: '20px',
                  boxShadow: 'var(--ff-shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📅</span> Arqueo Mensual Detallado
                      {monthlyData?.monthLabel && (
                        <span style={{ fontSize: '12px', fontWeight: '800', backgroundColor: '#ECFDF5', color: '#065F46', padding: '2px 8px', borderRadius: '999px', border: '1px solid #A7F3D0', textTransform: 'capitalize' }}>
                          {monthlyData.monthLabel}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                      Desglose contable del mes seleccionado antes del acumulado histórico general
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedMonth(val);
                        if (val) fetchMonthDetail(val);
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#F8FAFC',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#0F172A',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const [y, m] = selectedMonth.split('-').map(Number);
                        if (y && m) {
                          const lastDay = new Date(y, m, 0).getDate();
                          const fromStr = `${y}-${String(m).padStart(2, '0')}-01`;
                          const toStr = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                          setExcelFromDate(fromStr);
                          setExcelToDate(toStr);
                          setShowExcelModal(true);
                          handlePreviewLedger(fromStr, toStr);
                        }
                      }}
                      style={{
                        backgroundColor: '#ECFDF5',
                        color: '#065F46',
                        border: '1px solid #A7F3D0',
                        borderRadius: '10px',
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <IonIcon icon={downloadOutline} style={{ fontSize: '15px' }} />
                      <span>Excel del Mes</span>
                    </button>
                  </div>
                </div>

                {loadingMonth ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <IonSpinner name="crescent" color="primary" />
                  </div>
                ) : monthlyData ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                      {/* Facturado del Mes */}
                      <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                            🧾 Facturado del Mes
                          </span>
                          <MetricInfoButton metricKey="monthly_invoiced" onOpen={setActiveInfoMetric} size="sm" />
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', marginTop: '4px' }}>
                          ${Number(monthlyData.invoicedRevenue || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {monthlyData.ordersCount || 0} órdenes registradas
                        </div>
                      </div>

                      {/* Cobrado Real (Debe) */}
                      <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#065F46', textTransform: 'uppercase' }}>
                            💵 Cobrado Real (Debe)
                          </span>
                          <MetricInfoButton metricKey="monthly_collected" onOpen={setActiveInfoMetric} size="sm" />
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#047857', marginTop: '4px' }}>
                          ${Number(monthlyData.collectedRevenue || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#065F46', marginTop: '2px', fontWeight: '600' }}>
                          Ingresos efectivos en caja
                        </div>
                      </div>

                      {/* Cuentas por Cobrar del Mes */}
                      <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#92400E', textTransform: 'uppercase' }}>
                            ⏳ Por Cobrar del Mes
                          </span>
                          <MetricInfoButton metricKey="monthly_pending" onOpen={setActiveInfoMetric} size="sm" />
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#D97706', marginTop: '4px' }}>
                          ${Number(monthlyData.pendingReceivable || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#92400E', marginTop: '2px' }}>
                          Cuentas abiertas / abonos
                        </div>
                      </div>

                      {/* Egresos y Costos (Haber) */}
                      <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#991B1B', textTransform: 'uppercase' }}>
                            📉 Gastos + Costos (Haber)
                          </span>
                          <MetricInfoButton metricKey="monthly_expenses" onOpen={setActiveInfoMetric} size="sm" />
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#DC2626', marginTop: '4px' }}>
                          ${(Number(monthlyData.cogs ?? monthlyData.costOfGoodsSold ?? 0) + Number(monthlyData.expenses ?? monthlyData.operatingExpenses ?? 0) + Number(monthlyData.payroll || 0) + Number(monthlyData.losses || 0)).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10px', color: '#7F1D1D', marginTop: '2px' }}>
                          Costo: ${Number(monthlyData.cogs ?? monthlyData.costOfGoodsSold ?? 0).toFixed(2)} | Oper: ${(Number(monthlyData.expenses ?? monthlyData.operatingExpenses ?? 0) + Number(monthlyData.payroll || 0)).toFixed(2)}
                        </div>
                      </div>

                      {/* Ganancia Neta del Mes */}
                      <div style={{ backgroundColor: '#F0FDF4', border: '1.5px solid #10B981', borderRadius: '12px', padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#065F46', textTransform: 'uppercase' }}>
                            ✨ Ganancia Neta del Mes
                          </span>
                          <MetricInfoButton metricKey="monthly_profit" onOpen={setActiveInfoMetric} size="sm" />
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: Number(monthlyData.netProfit || 0) >= 0 ? '#10B981' : '#DC2626', marginTop: '4px' }}>
                          ${Number(monthlyData.netProfit || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px', fontWeight: '700' }}>
                          Utilidad libre del mes
                        </div>
                      </div>
                    </div>

                    {/* Citas o Pedidos por Confirmar / Sin Pagar */}
                    {Boolean(monthlyData.unpaidBookingsCount && monthlyData.unpaidBookingsCount > 0) && (
                      <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '10px 14px', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '12px', marginBottom: monthlyData.byMethod ? '10px' : '0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
                          <span style={{ fontSize: '15px' }}>🗓️</span>
                          <span>
                            <strong style={{ color: '#1E293B' }}>{monthlyData.unpaidBookingsCount} citas o pedidos por confirmar/cobrar este mes:</strong>{' '}
                            <span style={{ color: '#64748B' }}>Totalizan</span> <strong style={{ color: '#0F172A' }}>${Number(monthlyData.unpaidBookingsAmount || 0).toFixed(2)}</strong>
                          </span>
                          <MetricInfoButton metricKey="monthly_unpaid_bookings" onOpen={setActiveInfoMetric} size="sm" />
                        </div>
                        <span style={{ fontSize: '11px', color: '#64748B', fontStyle: 'italic' }}>
                          ℹ️ No computados en facturación ni arqueo hasta confirmarse su pago real
                        </span>
                      </div>
                    )}

                    {/* Desglose por Método de Pago del Mes */}
                    {monthlyData.byMethod && (
                      <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontWeight: '800', color: '#334155' }}>💳 Arqueo por Método (Mes):</span>
                          <MetricInfoButton metricKey="monthly_by_method" onOpen={setActiveInfoMetric} size="sm" />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#047857', fontWeight: '700' }}>💵 Efectivo USD: <b>${Number(monthlyData.byMethod.USD || 0).toFixed(2)}</b></span>
                          {Number(monthlyData.byMethod.CASH_BS || 0) > 0 && (
                            <span style={{ color: '#059669', fontWeight: '700' }}>💵 Efectivo Bs: <b>${Number(monthlyData.byMethod.CASH_BS || 0).toFixed(2)}</b></span>
                          )}
                          <span style={{ color: '#6D28D9', fontWeight: '700' }}>📱 Pago Móvil: <b>${Number(monthlyData.byMethod.PAGO_MOVIL || 0).toFixed(2)}</b></span>
                          <span style={{ color: '#1D4ED8', fontWeight: '700' }}>💳 Punto: <b>${Number(monthlyData.byMethod.PUNTO || 0).toFixed(2)}</b></span>
                          <span style={{ color: '#0F172A', fontWeight: '700' }}>🏦 Transf: <b>${Number(monthlyData.byMethod.TRANSFER || 0).toFixed(2)}</b></span>
                          {Number(monthlyData.byMethod.BINANCE || 0) > 0 && (
                            <span style={{ color: '#D97706', fontWeight: '700' }}>🟡 Binance: <b>${Number(monthlyData.byMethod.BINANCE || 0).toFixed(2)}</b></span>
                          )}
                          {Number(monthlyData.byMethod.CASH_COP || 0) > 0 && (
                            <span style={{ color: '#B45309', fontWeight: '700' }}>🇨🇴 Efectivo COP: <b>${Number(monthlyData.byMethod.CASH_COP || 0).toFixed(2)}</b></span>
                          )}
                          {Number(monthlyData.byMethod.BANK_COP || 0) > 0 && (
                            <span style={{ color: '#92400E', fontWeight: '700' }}>📲 Bancos COP: <b>${Number(monthlyData.byMethod.BANK_COP || 0).toFixed(2)}</b></span>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
              </div>

              {/* Título de Acumulado Histórico Total */}
              <div style={{ fontSize: '14px', fontWeight: '800', color: '#475569', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📊</span> Acumulativo Total Histórico
              </div>

              {/* Main KPIs (Cards) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                
                {/* Ingresos Históricos */}
                <div className="ff-card" style={{ padding: '16px', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Ingresos Totales</span>
                      <MetricInfoButton metricKey="historical_revenue" onOpen={setActiveInfoMetric} size="sm" />
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IonIcon icon={walletOutline} style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A' }}>
                    ${(summary.historicalRevenue || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10B981', fontWeight: '700', marginTop: '4px' }}>
                    Ventas facturadas (Acumulado)
                  </div>
                </div>

                {/* Ganancia Neta Real */}
                <div className="ff-card" style={{ padding: '16px', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Ganancia Neta Real</span>
                      <MetricInfoButton metricKey="historical_profit" onOpen={setActiveInfoMetric} size="sm" />
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IonIcon icon={trendingUpOutline} style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#10B981' }}>
                    ${(summary.historicalProfit || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', marginTop: '4px' }}>
                    Margen histórico después de costos
                  </div>
                </div>

                {/* Inversión / Reinversión */}
                <div
                  className="ff-card"
                  onClick={() => setShowInvestmentModal(true)}
                  style={{
                    padding: '16px',
                    background: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid #E2E8F0',
                  }}
                  title="Click para ver desglose y registrar inversión/reinversión"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Inversión / Reinversión</span>
                      <MetricInfoButton metricKey="historical_investment" onOpen={setActiveInfoMetric} size="sm" />
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFBEB', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IonIcon icon={cartOutline} style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A' }}>
                    ${((summary.totalConsolidatedInvestment !== undefined ? summary.totalConsolidatedInvestment : (summary.reinvestmentExpense || 0) + (summary.totalExternalInvestment || 0))).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px', display: 'flex', justifyContent: 'space-between', gap: '4px' }}>
                    <span>Ext: ${(summary.totalExternalInvestment || 0).toFixed(2)}</span>
                    <span>Reinv: ${(summary.totalConsolidatedReinvestment !== undefined ? summary.totalConsolidatedReinvestment : summary.reinvestmentExpense || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#0284C7', fontWeight: 700, marginTop: '6px' }}>
                    👆 Clic para ver / registrar
                  </div>
                </div>

                {/* Nómina y Mermas */}
                <div className="ff-card" style={{ padding: '16px', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Mermas & Pérdidas</span>
                      <MetricInfoButton metricKey="historical_losses" onOpen={setActiveInfoMetric} size="sm" />
                    </div>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IonIcon icon={trendingDownOutline} style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#DC2626' }}>
                    ${(summary.totalLosses || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    Nómina: ${(summary.payrollExpenses || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Chart & Top Products Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                
                {/* Sales Chart */}
                <div className="ff-card" style={{ padding: '20px', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                      📈 Ventas de los Últimos 7 Días
                    </h3>
                    <MetricInfoButton metricKey="sales_chart" onOpen={setActiveInfoMetric} size="sm" />
                  </div>
                  <div style={{ height: '240px', width: '100%', minHeight: '240px' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
                      <BarChart data={summary.salesChart || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="date" fontSize={11} stroke="#64748B" tickLine={false} />
                        <YAxis fontSize={11} stroke="#64748B" tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: '#0F172A', borderRadius: '10px', color: '#fff', border: 'none', fontSize: '12px' }}
                          formatter={(value: any) => ['$' + Number(value).toFixed(2), 'Ventas']}
                        />
                        <Bar dataKey="total" fill="#10B981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Products */}
                <div className="ff-card" style={{ padding: '20px', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IonIcon icon={pieChartOutline} style={{ color: '#10B981' }} />
                      Productos Más Vendidos
                    </h3>
                    <MetricInfoButton metricKey="top_products" onOpen={setActiveInfoMetric} size="sm" />
                  </div>

                  {(!Array.isArray(summary.topProducts) || summary.topProducts.length === 0) ? (
                    <p style={{ color: '#64748B', fontSize: '13px' }}>Aún no se han registrado ventas.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {(summary.topProducts || []).map((p, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            background: '#F8FAFC',
                            borderRadius: '10px',
                            border: '1px solid #E2E8F0'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>
                              {parseFloat(Number(p.quantity).toFixed(2))} unidades vendidas
                            </div>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#10B981' }}>
                            ${Number(p.revenue).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Inventory Alerts */}
              {settings?.featureRecipes && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                  
                  {/* Insumos por comprar */}
                  <div className="ff-card" style={{ padding: '20px', background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IonIcon icon={alertCircleOutline} style={{ color: '#EF4444' }} />
                        Insumos por Reabastecer
                      </h3>
                      <MetricInfoButton metricKey="inventory_low_materials" onOpen={setActiveInfoMetric} size="sm" />
                    </div>
                    {(!Array.isArray(summary.lowStockMaterials) || summary.lowStockMaterials.length === 0) ? (
                      <p style={{ color: '#64748B', fontSize: '13px' }}>Todos los insumos están en niveles óptimos.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(summary.lowStockMaterials || []).map(alert => (
                          <div
                            key={'mat-' + alert.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              background: '#FEF2F2',
                              border: '1px solid #FECACA'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: '#991B1B' }}>
                                {alert.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#7F1D1D' }}>
                                Stock: {parseFloat(Number(alert.realStock).toFixed(2))} {alert.unit}
                              </div>
                            </div>
                            <div style={{ background: '#EF4444', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                              Efectivo: {parseFloat(Number(alert.effectiveStock).toFixed(2))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Productos por Fabricar */}
                  <div className="ff-card" style={{ padding: '20px', background: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IonIcon icon={alertCircleOutline} style={{ color: '#F59E0B' }} />
                        Pedidos por Fabricar
                      </h3>
                      <MetricInfoButton metricKey="inventory_low_products" onOpen={setActiveInfoMetric} size="sm" />
                    </div>
                    {(!Array.isArray(summary.lowStockProducts) || summary.lowStockProducts.length === 0) ? (
                      <p style={{ color: '#64748B', fontSize: '13px' }}>No hay pedidos pendientes por fabricar.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(summary.lowStockProducts || []).map(prod => (
                          <div
                            key={'prod-' + prod.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '10px 12px',
                              borderRadius: '10px',
                              background: '#FFFBEB',
                              border: '1px solid #FDE68A'
                            }}
                          >
                            <div style={{ fontSize: '13px', fontWeight: '800', color: '#92400E' }}>
                              {prod.name}
                            </div>
                            <div style={{ background: '#F59E0B', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>
                              Fabricar: {parseFloat(Number(prod.toProduce).toFixed(2))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </IonContent>

      {/* Modal Exportador a Excel (Debe, Haber y Saldo) */}
      <IonModal isOpen={showExcelModal} onDidDismiss={() => setShowExcelModal(false)} style={{ '--border-radius': '20px' } as any}>
        <div style={{ background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={documentTextOutline} style={{ fontSize: '20px', color: '#10B981' }} />
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                Exportar Libro Contable a Excel
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowExcelModal(false)}
              style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#475569' }}>
              Selecciona el rango de fechas (<b>Desde</b> / <b>Hasta</b>) para exportar el detalle contable con columnas de <b>Debe (Ingresos)</b>, <b>Haber (Egresos)</b> y <b>Saldo Acumulado</b>.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <FinoDatePicker
                  label="Fecha Desde"
                  value={excelFromDate}
                  onChange={dateStr => {
                    setExcelFromDate(dateStr);
                    if (dateStr && excelToDate) handlePreviewLedger(dateStr, excelToDate);
                  }}
                />
              </div>
              <div>
                <FinoDatePicker
                  label="Fecha Hasta"
                  value={excelToDate}
                  onChange={dateStr => {
                    setExcelToDate(dateStr);
                    if (excelFromDate && dateStr) handlePreviewLedger(excelFromDate, dateStr);
                  }}
                />
              </div>
            </div>

            {/* Resumen Previo antes de Descargar */}
            {ledgerPreview && (
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', marginBottom: '10px' }}>
                  Vista Previa del Período ({Array.isArray(ledgerPreview.rows) ? ledgerPreview.rows.length : (Array.isArray(ledgerPreview.entries) ? ledgerPreview.entries.length : 0)} movimientos {Array.isArray(ledgerPreview.salesDetails) ? `• ${ledgerPreview.salesDetails.length} ventas` : ''})
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '10px 8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#065F46' }}>TOTAL DEBE (+)</div>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#047857', marginTop: '2px' }}>
                      ${Number(ledgerPreview.totalDebe || 0).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#991B1B' }}>TOTAL HABER (-)</div>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#DC2626', marginTop: '2px' }}>
                      ${Number(ledgerPreview.totalHaber || 0).toFixed(2)}
                    </div>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #CBD5E1', borderRadius: '10px', padding: '10px 8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#334155' }}>SALDO FINAL</div>
                    <div style={{ fontSize: '15px', fontWeight: '900', color: Number(ledgerPreview.finalSaldo || 0) >= 0 ? '#10B981' : '#DC2626', marginTop: '2px' }}>
                      ${Number(ledgerPreview.finalSaldo || 0).toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="ff-btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <IonIcon icon={downloadOutline} style={{ fontSize: '18px' }} />
              <span>{exportingExcel ? 'Generando archivo Excel...' : 'Descargar Excel (.xls)'}</span>
            </button>
          </div>
        </div>
      </IonModal>

      <InvestmentModal
        isOpen={showInvestmentModal}
        onClose={() => setShowInvestmentModal(false)}
        onSuccess={() => fetchSummary()}
        defaultExchangeRate={settings?.exchangeRateBs}
      />

      <BuyUsdModal
        isOpen={showBuyUsdModal}
        onClose={() => setShowBuyUsdModal(false)}
        treasury={summary?.treasury || null}
        onSuccess={() => fetchSummary()}
      />

      <InitialTreasuryModal
        isOpen={showInitialTreasuryModal}
        onClose={() => setShowInitialTreasuryModal(false)}
        treasury={summary?.treasury || null}
        onSuccess={() => fetchSummary()}
      />

      <DashboardMetricInfoModal
        isOpen={activeInfoMetric !== null}
        metricKey={activeInfoMetric}
        onClose={() => setActiveInfoMetric(null)}
        summary={summary}
        monthlyData={monthlyData}
      />

      <LibroVentasModal
        isOpen={showLibroVentasModal}
        onClose={() => setShowLibroVentasModal(false)}
        settings={settings}
      />
    </IonPage>
  );
};

export default Dashboard;
