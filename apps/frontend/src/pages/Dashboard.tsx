// @ts-nocheck
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonSpinner,
  useIonToast
} from '@ionic/react';
import {
  trendingUpOutline,
  trendingDownOutline,
  walletOutline,
  cartOutline,
  pieChartOutline,
  alertCircleOutline,
  addOutline,
  calendarOutline,
  peopleOutline,
  cardOutline
} from 'ionicons/icons';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';
import type { DashboardSummary } from '../types';
import AppHeader from '../components/AppHeader';

const Dashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [settings, setSettings] = useState<any>({});
  const [presentToast] = useIonToast();

  const fetchSummary = async () => {
    try {
      const res = await apiClient.get<DashboardSummary>('/dashboard/summary');
      setSummary(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error cargando el resumen', duration: 3000, color: 'danger' });
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
              className="ff-btn-primary"
              style={{ padding: '12px 14px', borderRadius: '14px', fontSize: '13px' }}
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
          </div>

          {!summary ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <IonSpinner name="crescent" color="primary" />
              <p style={{ marginTop: '12px', color: '#64748B', fontWeight: '500' }}>Cargando métricas...</p>
            </div>
          ) : (
            <div>
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
                    Ventas facturadas
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
                    Margen después de costos
                  </div>
                </div>

                {/* Gastos de Reinversión */}
                <div className="ff-card" style={{ padding: '16px', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748B' }}>Reinversión / Stock</span>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FFFBEB', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IonIcon icon={cartOutline} style={{ fontSize: '20px' }} />
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A' }}>
                    ${(summary.reinvestmentExpense || 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                    Cap. Insumos: ${(summary.totalInventoryCapital || 0).toFixed(2)}
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
                  <div style={{ height: '240px', width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
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

                  {summary.topProducts.length === 0 ? (
                    <p style={{ color: '#64748B', fontSize: '13px' }}>Aún no se han registrado ventas.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {summary.topProducts.map((p, i) => (
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
                    {summary.lowStockMaterials.length === 0 ? (
                      <p style={{ color: '#64748B', fontSize: '13px' }}>Todos los insumos están en niveles óptimos.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {summary.lowStockMaterials.map(alert => (
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
                    {summary.lowStockProducts.length === 0 ? (
                      <p style={{ color: '#64748B', fontSize: '13px' }}>No hay pedidos pendientes por fabricar.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {summary.lowStockProducts.map(prod => (
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
    </IonPage>
  );
};

export default Dashboard;
