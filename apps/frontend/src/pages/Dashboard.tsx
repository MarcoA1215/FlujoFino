import {
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
  IonGrid,
  IonRow,
  IonCol,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonText,
  useIonToast,
  IonList,
  IonItem,
  IonLabel,
  IonBadge
} from '@ionic/react';
import { cashOutline, alertCircleOutline, trendingDownOutline, basketOutline } from 'ionicons/icons';
import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

type DashboardSummary = {
  totalRawMaterialCapital: number;
  expectedRevenue: number;
  totalLosses: number;
  lowStockAlerts: {
    id: string;
    name: string;
    stock: number;
    unit: string;
  }[];
};

const Dashboard: React.FC = () => {
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
            <IonRow>
              <IonCol size="12" sizeMd="4">
                <IonCard color="primary">
                  <IonCardHeader>
                    <IonCardTitle className="ion-text-center">
                      <IonIcon icon={basketOutline} style={{ fontSize: '2rem' }} />
                      <br />
                      Capital en Insumos
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent className="ion-text-center">
                    <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: 'white' }}>
                      ${summary.totalRawMaterialCapital.toFixed(2)}
                    </h1>
                  </IonCardContent>
                </IonCard>
              </IonCol>

              <IonCol size="12" sizeMd="4">
                <IonCard color="success">
                  <IonCardHeader>
                    <IonCardTitle className="ion-text-center">
                      <IonIcon icon={cashOutline} style={{ fontSize: '2rem' }} />
                      <br />
                      Valor Potencial (Productos)
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent className="ion-text-center">
                    <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: 'white' }}>
                      ${summary.expectedRevenue.toFixed(2)}
                    </h1>
                  </IonCardContent>
                </IonCard>
              </IonCol>

              <IonCol size="12" sizeMd="4">
                <IonCard color="danger">
                  <IonCardHeader>
                    <IonCardTitle className="ion-text-center">
                      <IonIcon icon={trendingDownOutline} style={{ fontSize: '2rem' }} />
                      <br />
                      Mermas (Dinero Perdido)
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent className="ion-text-center">
                    <h1 style={{ fontSize: '2.5rem', margin: 0, fontWeight: 'bold', color: 'white' }}>
                      ${summary.totalLosses.toFixed(2)}
                    </h1>
                  </IonCardContent>
                </IonCard>
              </IonCol>
            </IonRow>

            <IonRow className="ion-margin-top">
              <IonCol size="12">
                <IonCard>
                  <IonCardHeader>
                    <IonCardTitle>
                      <IonIcon icon={alertCircleOutline} color="warning" /> Alertas de Stock Bajo
                    </IonCardTitle>
                  </IonCardHeader>
                  <IonCardContent>
                    {summary.lowStockAlerts.length === 0 ? (
                      <p>Todos los insumos están en niveles óptimos.</p>
                    ) : (
                      <IonList>
                        {summary.lowStockAlerts.map(alert => (
                          <IonItem key={alert.id}>
                            <IonLabel>
                              <IonText color="danger">
                                <h2>{alert.name}</h2>
                              </IonText>
                              <p>Stock actual: {alert.stock} {alert.unit}</p>
                            </IonLabel>
                            <IonBadge color="danger" slot="end">Crítico</IonBadge>
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

