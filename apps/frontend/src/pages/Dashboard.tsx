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

const Dashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlySummary | null>(null);
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
      const rows = Array.isArray(data?.rows) ? data.rows : [];

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
            table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
            th { background-color: #10B981; color: #FFFFFF; font-weight: bold; padding: 8px 12px; border: 1px solid #CBD5E1; text-align: left; }
            td { padding: 6px 10px; border: 1px solid #E2E8F0; }
            .num { text-align: right; font-weight: bold; }
            .debe { color: #047857; text-align: right; font-weight: bold; }
            .haber { color: #DC2626; text-align: right; font-weight: bold; }
            .saldo { color: #0F172A; text-align: right; font-weight: bold; background-color: #F8FAFC; }
            .tot { background-color: #ECFDF5; font-weight: bold; border-top: 2px solid #10B981; }
          </style>
        </head>
        <body>
          <h2>FinoWork - Libro Mayor Contable (Debe / Haber / Saldo)</h2>
          <p><b>Negocio:</b> ${escapeHtml(user?.tenantName || 'FinoWork')} | <b>Desde:</b> ${escapeHtml(excelFromDate)} | <b>Hasta:</b> ${escapeHtml(excelToDate)}</p>
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Tipo</th>
                <th>Concepto / Descripción</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Debe (Ingreso USD)</th>
                <th>Haber (Egreso USD)</th>
                <th>Saldo Acumulado (USD)</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map((r: any) => {
                const dStr = r.date ? new Date(r.date).toLocaleString('es-ES') : '';
                return `
                  <tr>
                    <td>${escapeHtml(dStr)}</td>
                    <td>${escapeHtml(r.type)}</td>
                    <td>${escapeHtml(r.concept)}</td>
                    <td>${escapeHtml(r.method)}</td>
                    <td>${escapeHtml(r.reference)}</td>
                    <td class="debe">${Number(r.debe || 0) > 0 ? Number(r.debe).toFixed(2) : '0.00'}</td>
                    <td class="haber">${Number(r.haber || 0) > 0 ? Number(r.haber).toFixed(2) : '0.00'}</td>
                    <td class="saldo">${Number(r.saldo || 0).toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="tot">
                <td colspan="5"><b>TOTALES DEL PERÍODO (${rows.length} movimientos)</b></td>
                <td class="debe">${Number(data?.totalDebe || 0).toFixed(2)}</td>
                <td class="haber">${Number(data?.totalHaber || 0).toFixed(2)}</td>
                <td class="saldo">${Number(data?.finalSaldo || 0).toFixed(2)}</td>
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
      a.download = `FinoWork_Libro_Contable_${excelFromDate}_a_${excelToDate}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      presentToast({ message: '📊 Reporte Excel (Debe, Haber y Saldo) descargado con éxito', duration: 2500, color: 'success' });
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

                  {/* Las dos cajas reales: USD Efectivo vs Bancos Bolívares */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                    {/* Gaveta Efectivo USD */}
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          💵 Gaveta Física (Efectivo USD)
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: '900', color: (summary.treasury.cashUSD || 0) < 0 ? '#DC2626' : '#047857', marginTop: '2px' }}>
                          ${(summary.treasury.cashUSD || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: (summary.treasury.cashUSD || 0) < 0 ? '#DC2626' : '#64748B', marginTop: '2px', fontWeight: (summary.treasury.cashUSD || 0) < 0 ? '700' : 'normal' }}>
                          {(summary.treasury.cashUSD || 0) < 0 ? '⚠️ Gaveta en negativo (revisa Saldo Inicial)' : 'Billetes reales en caja'}
                        </div>
                      </div>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: (summary.treasury.cashUSD || 0) < 0 ? '#FEE2E2' : '#ECFDF5',
                          color: (summary.treasury.cashUSD || 0) < 0 ? '#DC2626' : '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                      >
                        💵
                      </div>
                    </div>

                    {/* Bancos Bolívares */}
                    <div
                      style={{
                        backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          🏦 Bancos (Punto + Pago Móvil)
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: '900', color: '#0F172A', marginTop: '2px' }}>
                          {summary.treasury.currencySymbol || 'Bs.'} {Number(summary.treasury.bankBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          Equiv. al cambio: <b>${(summary.treasury.bankBsEquivalentUSD || 0).toFixed(2)}</b> (Tasa {Number(summary.treasury.exchangeRate || 0).toFixed(2)})
                        </div>
                      </div>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          backgroundColor: '#EFF6FF',
                          color: '#3B82F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                        }}
                      >
                        🏦
                      </div>
                    </div>

                    {/* Billetera Digital USDT / Binance si tiene saldo */}
                    {(summary.treasury.digitalUSD || 0) > 0 && (
                      <div
                        style={{
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            🟡 Digital (Binance / USDT)
                          </div>
                          <div style={{ fontSize: '22px', fontWeight: '900', color: '#D97706', marginTop: '2px' }}>
                            ${(summary.treasury.digitalUSD || 0).toFixed(2)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            En cuentas digitales/cripto
                          </div>
                        </div>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            backgroundColor: '#FEF3C7',
                            color: '#D97706',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                          }}
                        >
                          🟡
                        </div>
                      </div>
                    )}
                  </div>
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
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#64748B', textTransform: 'uppercase' }}>
                          🧾 Facturado del Mes
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
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#065F46', textTransform: 'uppercase' }}>
                          💵 Cobrado Real (Debe)
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
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#92400E', textTransform: 'uppercase' }}>
                          ⏳ Por Cobrar del Mes
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
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#991B1B', textTransform: 'uppercase' }}>
                          📉 Gastos + Costos (Haber)
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
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#065F46', textTransform: 'uppercase' }}>
                          ✨ Ganancia Neta del Mes
                        </div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: Number(monthlyData.netProfit || 0) >= 0 ? '#10B981' : '#DC2626', marginTop: '4px' }}>
                          ${Number(monthlyData.netProfit || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px', fontWeight: '700' }}>
                          Utilidad libre del mes
                        </div>
                      </div>
                    </div>

                    {/* Desglose por Método de Pago del Mes */}
                    {monthlyData.byMethod && (
                      <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '10px 14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', fontSize: '12px' }}>
                        <span style={{ fontWeight: '800', color: '#334155' }}>💳 Arqueo por Método (Mes):</span>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#047857', fontWeight: '700' }}>💵 Efectivo USD: <b>${Number(monthlyData.byMethod.USD || 0).toFixed(2)}</b></span>
                          <span style={{ color: '#6D28D9', fontWeight: '700' }}>📱 Pago Móvil: <b>${Number(monthlyData.byMethod.PAGO_MOVIL || 0).toFixed(2)}</b></span>
                          <span style={{ color: '#1D4ED8', fontWeight: '700' }}>💳 Punto: <b>${Number(monthlyData.byMethod.PUNTO || 0).toFixed(2)}</b></span>
                          <span style={{ color: '#0F172A', fontWeight: '700' }}>🏦 Transf: <b>${Number(monthlyData.byMethod.TRANSFER || 0).toFixed(2)}</b></span>
                          {Number(monthlyData.byMethod.BINANCE || 0) > 0 && (
                            <span style={{ color: '#D97706', fontWeight: '700' }}>🟡 Binance: <b>${Number(monthlyData.byMethod.BINANCE || 0).toFixed(2)}</b></span>
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
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Ingresos Totales</span>
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
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Ganancia Neta Real</span>
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
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Inversión / Reinversión</span>
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
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Mermas & Pérdidas</span>
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
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                    📈 Ventas de los Últimos 7 Días
                  </h3>
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
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <IonIcon icon={pieChartOutline} style={{ color: '#10B981' }} />
                    Productos Más Vendidos
                  </h3>

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
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={alertCircleOutline} style={{ color: '#EF4444' }} />
                      Insumos por Reabastecer
                    </h3>
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
                    <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={alertCircleOutline} style={{ color: '#F59E0B' }} />
                      Pedidos por Fabricar
                    </h3>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
                  📅 Fecha Desde:
                </label>
                <input
                  type="date"
                  value={excelFromDate}
                  onChange={e => {
                    setExcelFromDate(e.target.value);
                    if (e.target.value && excelToDate) handlePreviewLedger(e.target.value, excelToDate);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '700', backgroundColor: '#F8FAFC', color: '#0F172A' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#0F172A', marginBottom: '4px' }}>
                  📅 Fecha Hasta:
                </label>
                <input
                  type="date"
                  value={excelToDate}
                  onChange={e => {
                    setExcelToDate(e.target.value);
                    if (excelFromDate && e.target.value) handlePreviewLedger(excelFromDate, e.target.value);
                  }}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #CBD5E1', fontSize: '14px', fontWeight: '700', backgroundColor: '#F8FAFC', color: '#0F172A' }}
                />
              </div>
            </div>

            {/* Resumen Previo antes de Descargar */}
            {ledgerPreview && (
              <div style={{ backgroundColor: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', marginBottom: '10px' }}>
                  Vista Previa del Período ({Array.isArray(ledgerPreview.rows) ? ledgerPreview.rows.length : 0} movimientos)
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
    </IonPage>
  );
};

export default Dashboard;
