import React from 'react';
import { IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonButton, IonIcon, IonRow, IonCol, IonGrid, IonToggle } from '@ionic/react';
import { addOutline, trashOutline } from 'ionicons/icons';

const DAYS_OF_WEEK = [
  { id: '1', name: 'Lunes' },
  { id: '2', name: 'Martes' },
  { id: '3', name: 'Miércoles' },
  { id: '4', name: 'Jueves' },
  { id: '5', name: 'Viernes' },
  { id: '6', name: 'Sábado' },
  { id: '0', name: 'Domingo' }
];

interface BookingSettingsProps {
  settings: any;
  setSettings: (s: any) => void;
}

export const BookingSettings: React.FC<BookingSettingsProps> = ({ settings, setSettings }) => {
  const businessHours = settings.businessHours || {};
  const services = settings.services || [];
  const slotInterval = settings.slotInterval || 30;

  const handleDayChange = (dayId: string, field: string, value: any) => {
    const newHours = { ...businessHours };
    if (!newHours[dayId]) {
      newHours[dayId] = { isOpen: false, startTime: '09:00', endTime: '18:00' };
    }
    newHours[dayId][field] = value;
    setSettings({ ...settings, businessHours: newHours });
  };

  const handleAddService = () => {
    const newService = { id: Date.now().toString(), name: 'Nuevo Servicio', durationMinutes: 60, price: 0 };
    setSettings({ ...settings, services: [...services, newService] });
  };

  const handleUpdateService = (id: string, field: string, value: any) => {
    const updated = services.map((s: any) => s.id === id ? { ...s, [field]: value } : s);
    setSettings({ ...settings, services: updated });
  };

  const handleDeleteService = (id: string) => {
    setSettings({ ...settings, services: services.filter((s: any) => s.id !== id) });
  };

  return (
    <>
      <IonRow>
        <IonCol size="12">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Configuración de Reservaciones</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonItem>
                <IonLabel>Intervalos de Horario (Minutos)</IonLabel>
                <IonSelect value={slotInterval} onIonChange={e => setSettings({...settings, slotInterval: e.detail.value})}>
                  <IonSelectOption value={15}>Cada 15 minutos</IonSelectOption>
                  <IonSelectOption value={30}>Cada 30 minutos</IonSelectOption>
                  <IonSelectOption value={60}>Cada 1 hora</IonSelectOption>
                  <IonSelectOption value={120}>Cada 2 horas</IonSelectOption>
                </IonSelect>
              </IonItem>
              <p style={{fontSize: '13px', color: '#666', marginLeft: '16px'}}>
                Esto define en qué bloques de tiempo se divide tu calendario (ej. si elijes 30 mins, las citas solo se pueden agendar a las 9:00, 9:30, 10:00, etc.)
              </p>
            </IonCardContent>
          </IonCard>
        </IonCol>
      </IonRow>

      <IonRow>
        <IonCol size="12" sizeMd="6">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Horario de Trabajo</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <IonGrid className="ion-no-padding">
                {DAYS_OF_WEEK.map(day => {
                  const dayData = businessHours[day.id] || { isOpen: false, startTime: '09:00', endTime: '18:00' };
                  return (
                    <IonRow key={day.id} className="ion-align-items-center" style={{ borderBottom: '1px solid #eee', padding: '10px 0' }}>
                      <IonCol size="4">
                        <IonToggle checked={dayData.isOpen} onIonChange={e => handleDayChange(day.id, 'isOpen', e.detail.checked)}>
                          <span style={{fontSize:'14px'}}>{day.name}</span>
                        </IonToggle>
                      </IonCol>
                      <IonCol size="8">
                        {dayData.isOpen && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <IonInput type="time" value={dayData.startTime} onIonInput={e => handleDayChange(day.id, 'startTime', e.detail.value)} style={{border: '1px solid #ccc', borderRadius: '4px', padding: '5px'}} />
                            <span>-</span>
                            <IonInput type="time" value={dayData.endTime} onIonInput={e => handleDayChange(day.id, 'endTime', e.detail.value)} style={{border: '1px solid #ccc', borderRadius: '4px', padding: '5px'}} />
                          </div>
                        )}
                      </IonCol>
                    </IonRow>
                  );
                })}
              </IonGrid>
            </IonCardContent>
          </IonCard>
        </IonCol>

        <IonCol size="12" sizeMd="6">
          <IonCard>
            <IonCardHeader>
              <IonCardTitle>Tipos de Trabajo (Servicios)</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p style={{marginBottom: '15px', fontSize: '14px', color: '#666'}}>Agrega los servicios que ofreces y su duración. Si no agregas ninguno, la reserva pública pedirá bloques simples.</p>
              
              {services.map((svc: any) => (
                <IonRow key={svc.id} className="ion-align-items-center" style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                  <IonCol size="12" sizeMd="5">
                    <IonLabel position="stacked" style={{fontSize: '12px'}}>Nombre</IonLabel>
                    <IonInput value={svc.name} onIonInput={e => handleUpdateService(svc.id, 'name', e.detail.value)} style={{backgroundColor: 'white', border: '1px solid #ddd'}} />
                  </IonCol>
                  <IonCol size="5" sizeMd="3">
                    <IonLabel position="stacked" style={{fontSize: '12px'}}>Duración (Mins)</IonLabel>
                    <IonInput type="number" value={svc.durationMinutes} onIonInput={e => handleUpdateService(svc.id, 'durationMinutes', parseInt(e.detail.value as string))} style={{backgroundColor: 'white', border: '1px solid #ddd'}} />
                  </IonCol>
                  <IonCol size="5" sizeMd="3">
                    <IonLabel position="stacked" style={{fontSize: '12px'}}>Precio (Opcional)</IonLabel>
                    <IonInput type="number" value={svc.price} onIonInput={e => handleUpdateService(svc.id, 'price', parseFloat(e.detail.value as string))} style={{backgroundColor: 'white', border: '1px solid #ddd'}} />
                  </IonCol>
                  <IonCol size="2" sizeMd="1" className="ion-text-right">
                    <IonButton fill="clear" color="danger" onClick={() => handleDeleteService(svc.id)} style={{marginTop: '15px'}}>
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </IonCol>
                </IonRow>
              ))}
              <IonButton expand="block" fill="outline" onClick={handleAddService}>
                <IonIcon slot="start" icon={addOutline} />
                Agregar Servicio
              </IonButton>
            </IonCardContent>
          </IonCard>
        </IonCol>
      </IonRow>
    </>
  );
};
