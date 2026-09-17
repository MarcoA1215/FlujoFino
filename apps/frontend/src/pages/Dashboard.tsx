// @ts-nocheck
﻿import { refreshOutline } from 'ionicons/icons';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';
import {
  IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonIcon, IonText, useIonToast, IonList, IonItem, IonLabel, IonBadge, IonButton } from '@ionic/react';
import { alertCircleOutline, trendingDownOutline, basketOutline, trendingUpOutline, pieChartOutline, walletOutline } from 'ionicons/icons';
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { DashboardSummary } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useContext(AuthContext);
  if (user?.role !== UserRole.ADMIN) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="primary">
            <IonButtons slot="start"><IonMenuButton /></IonButtons>
            <IonTitle>Bienvenido</IonTitle>
          <IonButtons slot="end"><IonButton onClick={() => window.location.reload()}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <br /><br />
          <h2>Hola, {user?.username}</h2>
          <p>Selecciona una opción del menú lateral para comenzar a trabajar.</p>
        </IonContent>
      </IonPage>
    );
  }

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [presentToast] = useIonToast();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await apiClient.get<DashboardSummary>('/dashboard/summary');
        setSummary(res.data);
      } catch (e) {
        console.error(e);
        presentToast({ message: 'Error cargando el resumen', duration: 3000, color: 'danger' });
      }
    };
    fetchSummary();
  }, [presentToast]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="success">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Tablero de Inventario y Alertas</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {!summary ? (
          <p>Cargando datos...</p>
        ) : (
          <IonGrid>
            {/* Main KPIs Row */}
            <IonRow>
            <IonCol size="12" sizeSm="6" sizeMd="3">
              <IonCard color="tertiary">
                <IonCardHeader>
                  <IonCardTitle className="ion-text-center">
                    <IonIcon icon={walletOutline} style={{ fontSize: '2rem' }} />
                    <br />
                    Ingresos Históricos
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="ion-text-center">
                  <h2>$ {(summary.historicalRevenue || 0).toFixed(2)}</h2>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="3">
              <IonCard color="warning">
                <IonCardHeader>
                  <IonCardTitle className="ion-text-center">
                    <IonIcon icon={cartOutline} style={{ fontSize: '2rem' }} />
                    <br />
                    Gastos de Reinversión
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="ion-text-center">
                  <h2 style={{ color: 'white' }}>$ {(summary.reinvestmentExpense || 0).toFixed(2)}</h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'white' }}>Inv: $ {(summary.historicalInvestment || 0).toFixed(2)} - Cap: $ {(summary.totalInventoryCapital || 0).toFixed(2)}</p>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="3">
              <IonCard color="success">
                <IonCardHeader>
                  <IonCardTitle className="ion-text-center">
                    <IonIcon icon={trendingUpOutline} style={{ fontSize: '2rem' }} />
                    <br />
                    Ganancia Neta Bruta
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="ion-text-center">
                  <h2>$ {(summary.historicalProfit || 0).toFixed(2)}</h2>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeSm="6" sizeMd="3">
              <IonCard color="danger">
                <IonCardHeader>
                  <IonCardTitle className="ion-text-center">
                    <IonIcon icon={trendingDownOutline} style={{ fontSize: '2rem' }} />
                    <br />
                    Mermas y Pérdidas
                  </IonCardTitle>
                </IonCardHeader>
                <IonCardContent className="ion-text-center">
                  <h2>$ {(summary.totalLosses || 0).toFixed(2)}</h2>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>

            {/* Charts and Lists Row */}
            <IonRow className="ion-margin-top">
              <IonCol size="12" sizeLg="8">
                <IonCard style={{ height: '100%' }}>
                  <IonCardHeader>
                    <IonCardTitle style={{ fontSize: '1.2rem' }}>Ventas de los últimos 7 días</IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.salesChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value: any) => [`$ ${Number(value).toFixed(2)}`, 'Ventas']} />
                        <Bar dataKey="total" fill="#2dd36f" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </IonCardContent>
                </IonCard>
              </IonCol>

              <IonCol size="12" sizeLg="4">
                <IonCard style={{ height: '100%' }}>
                  <IonCardHeader>
                    <IonCardTitle style={{ fontSize: '1.2rem' }}>
                      <IonIcon icon={pieChartOutline} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                      Productos más vendidos
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {summary.topProducts.length === 0 ? (
                      <p style={{ color: 'gray', fontStyle: 'italic' }}>No hay ventas registradas aún.</p>
                    ) : (
                      <IonList>
                        {summary.topProducts.map((p, i) => (
                          <IonItem key={i}>
                            <IonLabel>
                              <h2>{p.name}</h2>
                              <p>{parseFloat(Number(p.quantity).toFixed(4))} unidades vendidas</p>
                            </IonLabel>
                            <IonText slot="end" color="success">
                              <strong>$ {p.revenue.toFixed(2)}</strong>
                            </IonText>
                          </IonItem>
                        ))}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>

            <IonRow className="ion-margin-top">
              <IonCol size="12" sizeMd="6">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle style={{ fontSize: '1.2rem' }}>
                      <IonIcon icon={alertCircleOutline} color="warning" style={{ verticalAlign: 'middle', marginRight: '8px' }} /> 
                      Productos por Fabricar
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {summary.lowStockProducts.length === 0 ? (
                      <p style={{ color: 'gray', fontStyle: 'italic' }}>No hay pedidos pendientes por fabricar.</p>
                    ) : (
                      <IonList>
                        {summary.lowStockProducts.map(prod => (
                          <IonItem key={'prod-' + prod.id}>
                            <IonLabel>
                              <IonText color="warning">
                                <h2 style={{ fontWeight: 'bold' }}>{prod.name}</h2>
                              </IonText>
                            </IonLabel>
                            <div slot="end" style={{ textAlign: 'right' }}>
                              <IonBadge color="warning">Fabricar: {parseFloat(Number(prod.toProduce).toFixed(4))}</IonBadge>
                              <div style={{ fontSize: '0.8rem', color: 'gray', marginTop: '4px' }}>Pendientes</div>
                            </div>
                          </IonItem>
                        ))}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>

<IonCol size="12" sizeMd="6">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle style={{ fontSize: '1.2rem' }}>
                      <IonIcon icon={alertCircleOutline} color="danger" style={{ verticalAlign: 'middle', marginRight: '8px' }} /> 
                      Insumos por Comprar
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {summary.lowStockMaterials.length === 0 ? (
                      <p style={{ color: 'gray', fontStyle: 'italic' }}>Todos los insumos están en niveles óptimos.</p>
                    ) : (
                      <IonList>
                        {summary.lowStockMaterials.map(alert => (
                          <IonItem key={'mat-' + alert.id}>
                            <IonLabel>
                              <IonText color="danger">
                                <h2 style={{ fontWeight: 'bold' }}>{alert.name}</h2>
                              </IonText>
                              <p style={{ fontSize: '0.85rem' }}>Stock físico: {parseFloat(Number(alert.realStock).toFixed(4))} {alert.unit}</p>
                              {alert.debt > 0 && <p style={{ fontSize: '0.85rem', color: 'orange' }}>Reservado (Pedidos): -{parseFloat(Number(alert.debt).toFixed(4))} {alert.unit}</p>}
                            </IonLabel>
                            <div slot="end" style={{ textAlign: 'right' }}>
                              <IonBadge color="danger">Efectivo: {parseFloat(Number(alert.effectiveStock).toFixed(4))} {alert.unit}</IonBadge>
                              <div style={{ fontSize: '0.8rem', color: 'gray', marginTop: '4px' }}>¡Reabastecer!</div>
                            </div>
                          </IonItem>
                        ))}
                      </IonList>
                    )}
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>
          </IonGrid>
        )}
      </IonContent>
    </IonPage>
  );
};
export default Dashboard;




