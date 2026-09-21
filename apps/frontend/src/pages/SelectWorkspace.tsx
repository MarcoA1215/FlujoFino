import React, { useContext } from 'react';
import { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonButton, IonIcon, IonList, IonListHeader, useIonToast } from '@ionic/react';
import { useIonRouter } from '@ionic/react';
import { businessOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';

const SelectWorkspace: React.FC = () => {
  const { user, login, logout } = useContext(AuthContext);
  const router = useIonRouter();
  const [presentToast] = useIonToast();

  const handleSelect = async (tenantId: string) => {
    try {
      const res = await apiClient.post('/auth/select-workspace', { tenantId });
      if (res.data.requiresApproval) {
        const info = {
          requestId: res.data.requestId,
          username: res.data.user?.username || user?.username,
          attemptTime: res.data.attemptTime,
          message: res.data.message,
        };
        localStorage.setItem('pendingAccessRequestId', res.data.requestId);
        localStorage.setItem('pendingAccessRequestInfo', JSON.stringify(info));
        await logout();
        return;
      }
      login(res.data.access_token, res.data.user, res.data.workspaces);
      router.push('/', 'root', 'replace');
    } catch (e: any) {
      presentToast({ message: 'Error: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
    }
  };

  const handleAccept = async (tenantId: string) => {
    try {
      await apiClient.post(`/auth/invitations/${tenantId}/accept`);
      presentToast({ message: 'Invitación aceptada. Entrando...', duration: 2000, color: 'success' });
      handleSelect(tenantId);
    } catch (e: any) {
      presentToast({ message: 'Error al aceptar: ' + (e.response?.data?.message || e.message), duration: 3000, color: 'danger' });
    }
  };

  const handleReject = async (tenantId: string) => {
    try {
      await apiClient.post(`/auth/invitations/${tenantId}/reject`);
      presentToast({ message: 'Invitación rechazada', duration: 2000, color: 'medium' });
      // Remove from UI
      const token = localStorage.getItem('token') || '';
      login(token, { ...user!, workspaces: workspaces.filter((w: any) => w.tenantId !== tenantId) }, undefined);
    } catch (e: any) {
      presentToast({ message: 'Error al rechazar invitación', duration: 3000, color: 'danger' });
    }
  };

  const workspaces = user?.workspaces || [];
  const pending = workspaces.filter((w: any) => w.status === 'PENDING');
  const active = workspaces.filter((w: any) => w.status === 'ACCEPTED');

  return (
    <IonPage>
      <IonContent className="ion-padding" style={{ '--background': '#f4f5f8' } as any}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <IonCard style={{ width: '100%', maxWidth: '400px' }}>
            <IonCardHeader className="ion-text-center">
              <div style={{ width: '60px', height: '60px', background: 'var(--ion-color-primary)', color: 'white', borderRadius: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '36px', fontWeight: '900', margin: '0 auto 15px auto', boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}>
                F
              </div>
              <IonCardTitle style={{ fontWeight: 'bold' }}>Elige tu espacio</IonCardTitle>
              <p style={{ margin: '5px 0 0 0', color: 'gray' }}>¿A dónde quieres entrar?</p>
            </IonCardHeader>
            <IonCardContent>
              {pending.length > 0 && (
                <IonList>
                  <IonListHeader>Invitaciones Pendientes</IonListHeader>
                  {pending.map((w: any) => (
                    <IonItem key={w.tenantId}>
                      <IonLabel>
                        <h2>{w.name}</h2>
                        <p>Rol: {w.role}</p>
                      </IonLabel>
                      <div slot="end">
                        <IonButton color="success" onClick={() => handleAccept(w.tenantId)}>Aceptar</IonButton>
                        <IonButton color="danger" fill="clear" onClick={() => handleReject(w.tenantId)}>Rechazar</IonButton>
                      </div>
                    </IonItem>
                  ))}
                </IonList>
              )}

              {active.length > 0 && (
                <IonList>
                  <IonListHeader>Mis Sucursales</IonListHeader>
                  {active.map((w: any) => (
                    <IonItem button key={w.tenantId} onClick={() => handleSelect(w.tenantId)}>
                      <IonIcon icon={businessOutline} slot="start" />
                      <IonLabel>
                        <h2><strong>{w.name}</strong></h2>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '2px 0 0 0' }}>
                          Rol: <strong>{w.role}</strong>
                        </p>
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              )}

              {workspaces.length === 0 && (
                <div className="ion-text-center ion-padding">
                  <p>No tienes acceso a ninguna sucursal.</p>
                  <IonButton fill="clear" onClick={() => router.push('/login', 'root', 'replace')}>Volver</IonButton>
                </div>
              )}
            </IonCardContent>
          </IonCard>
        </div>
      </IonContent>
    </IonPage>
  );
};
export default SelectWorkspace;
