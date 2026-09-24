import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonMenuButton, IonSegment, IonSegmentButton, IonLabel, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonTextarea, IonButton, useIonToast, IonIcon } from '@ionic/react';
import { sendOutline, chatbubbleOutline, headsetOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';

const FeedbackPage: React.FC = () => {
  const [tab, setTab] = useState<'clientes' | 'soporte'>('clientes');
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [supportMessage, setSupportMessage] = useState('');
  const [presentToast] = useIonToast();

  const fetchFeedbacks = async () => {
    try {
      const res = await apiClient.get('/feedback/business');
      setFeedbacks(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (tab === 'clientes') {
      fetchFeedbacks();
    }
  }, [tab]);

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
