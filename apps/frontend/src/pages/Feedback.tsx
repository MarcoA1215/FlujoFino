import React, { useState, useEffect, useContext } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonMenuButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonTextarea,
  IonButton,
  useIonToast,
  IonIcon,
  IonBadge,
  IonSpinner,
} from '@ionic/react';
import {
  sendOutline,
  chatbubbleOutline,
  headsetOutline,
  refreshOutline,
  businessOutline,
  timeOutline,
  mailOutline,
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';

const FeedbackPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || user?.email === 'superadmin@flujofino.com';

  const [tab, setTab] = useState<'clientes' | 'soporte'>('clientes');
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [platformFeedbacks, setPlatformFeedbacks] = useState<any[]>([]);
  const [supportMessage, setSupportMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [presentToast] = useIonToast();

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/feedback/business');
      setFeedbacks(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformFeedbacks = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/feedback/platform');
      setPlatformFeedbacks(res.data || []);
    } catch (e: any) {
      presentToast({
        message: 'Error al cargar mensajes: ' + (e.response?.data?.message || e.message),
        duration: 3000,
        color: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPlatformFeedbacks();
    } else if (tab === 'clientes') {
      fetchFeedbacks();
    }
  }, [tab, isSuperAdmin]);

  const handleSendSupport = async () => {
    if (!supportMessage.trim()) return;
    try {
      await apiClient.post('/feedback/platform', { content: supportMessage });
      presentToast({ message: 'Mensaje enviado. Nuestro equipo lo revisará pronto.', duration: 3000, color: 'success' });
      setSupportMessage('');
    } catch (e) {
      presentToast({ message: 'Error al enviar el mensaje', duration: 3000, color: 'danger' });
    }
  };

  // --- VISTA SUPERADMIN: BANDEJA DE MENSAJES DE NEGOCIOS ---
  if (isSuperAdmin) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="primary">
            <IonButtons slot="start">
              <IonMenuButton />
            </IonButtons>
            <IonTitle style={{ fontWeight: 700 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={mailOutline} />
                Mensajes y Soporte de Negocios
              </span>
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={fetchPlatformFeedbacks} disabled={loading} title="Actualizar mensajes">
                <IonIcon icon={refreshOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="ion-padding" style={{ backgroundColor: '#f1f5f9' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Bandeja de Entrada • Flujo Fino
                </h2>
                <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                  Comentarios, reportes y sugerencias que los negocios registrados te han enviado.
                </p>
              </div>
              <IonBadge color="primary" style={{ fontSize: '13px', padding: '6px 12px', borderRadius: '12px' }}>
                {platformFeedbacks.length} Mensajes
              </IonBadge>
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <IonSpinner name="crescent" color="primary" />
                <p style={{ color: '#64748b', marginTop: '8px' }}>Cargando mensajes...</p>
              </div>
            )}

            {!loading && platformFeedbacks.length === 0 && (
              <div style={{ background: '#fff', padding: '50px 20px', textAlign: 'center', borderRadius: '12px', color: '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <IonIcon icon={mailOutline} style={{ fontSize: '56px', color: '#cbd5e1', marginBottom: '12px' }} />
                <h3 style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a', margin: 0 }}>
                  Aún no has recibido mensajes
                </h3>
                <p style={{ fontSize: '14px', marginTop: '6px', maxWidth: '400px', margin: '6px auto 0 auto' }}>
                  Cuando algún negocio escriba una sugerencia o reporte desde su sección de Soporte en Flujo Fino, aparecerá en esta bandeja.
                </p>
              </div>
            )}

            {!loading && platformFeedbacks.map((f) => (
              <IonCard key={f.id} style={{ margin: '0 0 16px 0', borderRadius: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.06)', borderLeft: '4px solid #3b82f6' }}>
                <IonCardHeader style={{ paddingBottom: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <IonCardTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <IonIcon icon={businessOutline} style={{ color: '#3b82f6' }} />
                      {f.tenant?.name || 'Negocio Registrado'}
                    </IonCardTitle>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <IonIcon icon={timeOutline} />
                      {new Date(f.createdAt).toLocaleString('es-VE')}
                    </span>
                  </div>
                </IonCardHeader>
                <IonCardContent>
                  <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#1e293b', fontSize: '14px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {f.content}
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </div>
        </IonContent>
      </IonPage>
    );
  }

  // --- VISTA PARA DUEÑOS DE TIENDA REGULARES ---
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle>Ayuda y Comentarios</IonTitle>
        </IonToolbar>
        <IonToolbar color="primary">
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)}>
            <IonSegmentButton value="clientes">
              <IonLabel>De Mis Clientes</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="soporte">
              <IonLabel>Soporte FlujoFino</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ backgroundColor: '#f4f5f8' }}>
        {tab === 'clientes' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>Comentarios de tus clientes</h2>
            {feedbacks.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>Aún no has recibido comentarios de tus clientes.</p>
            ) : (
              feedbacks.map(f => (
                <IonCard key={f.id} style={{ margin: '0 0 15px 0', borderRadius: '8px' }}>
                  <IonCardHeader style={{ paddingBottom: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <IonCardTitle style={{ fontSize: '16px', fontWeight: 'bold' }}>
                        <IonIcon icon={chatbubbleOutline} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                        {f.clientName || 'Cliente Anónimo'}
                      </IonCardTitle>
                      <span style={{ fontSize: '12px', color: '#888' }}>
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </IonCardHeader>
                  <IonCardContent>
                    <p style={{ margin: 0, fontSize: '14px', color: '#333' }}>{f.content}</p>
                    {f.clientPhone && <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#666' }}>Telf: {f.clientPhone}</p>}
                  </IonCardContent>
                </IonCard>
              ))
            )}
          </div>
        )}

        {tab === 'soporte' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <IonCard style={{ margin: 0, borderRadius: '8px' }}>
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center' }}>
                  <IonIcon icon={headsetOutline} style={{ marginRight: '10px' }} />
                  ¿Necesitas ayuda o tienes una sugerencia?
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p style={{ marginBottom: '15px' }}>
                  Escríbenos directamente a la plataforma. Puedes dejar tus sugerencias de mejoras para el sistema, reportar errores o solicitar ayuda.
                </p>
                <IonTextarea
                  value={supportMessage}
                  onIonInput={e => setSupportMessage(e.detail.value!)}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={6}
                  style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '10px', marginBottom: '15px' }}
                />
                <IonButton expand="block" onClick={handleSendSupport} disabled={!supportMessage.trim()}>
                  <IonIcon slot="start" icon={sendOutline} />
                  Enviar a Soporte
                </IonButton>
              </IonCardContent>
            </IonCard>
            
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '10px' }}>Guías de Ayuda</h3>
              <p style={{ color: '#666', fontSize: '14px' }}>Próximamente agregaremos tutoriales y manuales para aprovechar al máximo FlujoFino.</p>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default FeedbackPage;
