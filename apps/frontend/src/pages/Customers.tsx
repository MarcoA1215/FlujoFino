import React, { useState, useEffect } from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonMenuButton,
  IonContent,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonCard,
  IonCardContent,
  IonBadge,
  IonModal,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSpinner,
  useIonToast,
  useIonAlert,
  IonFab,
  IonFabButton,
  IonRefresher,
  IonRefresherContent
} from '@ionic/react';
import {
  addOutline,
  refreshOutline,
  logoWhatsapp,
  pencilOutline,
  trashOutline,
  personOutline,
  idCardOutline,
  sparklesOutline
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import type { CustomerDTO } from '@nutrideli/shared-types';
import { offlineDb } from '../services/offline-db';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [presentToast] = useIonToast();
  const [presentAlert] = useIonAlert();

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerDTO | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [identification, setIdentification] = useState('');
  const [notes, setNotes] = useState('');
  const [totalVisits, setTotalVisits] = useState(0);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);

  const filterLocalCustomers = (all: any[], query: string) => {
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.identification && c.identification.toLowerCase().includes(q))
    );
  };

  const fetchCustomers = async () => {
    const q = search.trim();

    // 1. Stale: Leer de Dexie primero
    try {
      const cached = await offlineDb.cachedCustomers.toArray();
      if (cached && cached.length > 0) {
        setCustomers(filterLocalCustomers(cached, q));
      }
    } catch (err) {
      console.error('Error leyendo cachedCustomers:', err);
    }

    if (!navigator.onLine) {
      setIsOfflineMode(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const url = q ? `/customers?search=${encodeURIComponent(q)}` : '/customers';
      const res = await apiClient.get<CustomerDTO[]>(url);
      setCustomers(res.data);
      setIsOfflineMode(false);

      // Si es consulta general sin filtro, actualizar caché completo
      if (!q && res.data && res.data.length > 0) {
        try {
          await offlineDb.cachedCustomers.clear();
          await offlineDb.cachedCustomers.bulkPut(res.data);
        } catch (dbErr) {
          console.error('Error guardando en cachedCustomers:', dbErr);
        }
      } else if (res.data && res.data.length > 0) {
        try {
          await offlineDb.cachedCustomers.bulkPut(res.data);
        } catch (dbErr) {}
      }
    } catch (e: any) {
      console.warn('Error al conectar con servidor para clientes, fallback a Dexie', e);
      setIsOfflineMode(true);
      try {
        const cached = await offlineDb.cachedCustomers.toArray();
        if (cached && cached.length > 0) {
          setCustomers(filterLocalCustomers(cached, q));
          presentToast({
            message: '⚡ Modo Sin Conexión: Visualizando clientes guardados localmente.',
            duration: 3000,
            color: 'warning'
          });
        } else {
          presentToast({
            message: 'Error al cargar directorio de clientes',
            duration: 3000,
            color: 'danger'
          });
        }
      } catch (err) {
        presentToast({
          message: 'Error al cargar directorio de clientes',
          duration: 3000,
          color: 'danger'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      fetchCustomers();
    };
    const handleOffline = () => {
      setIsOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const openNew = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setIdentification('');
    setNotes('');
    setTotalVisits(0);
    setShowModal(true);
  };

  const openEdit = (c: CustomerDTO) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setIdentification(c.identification || '');
    setNotes(c.notes || '');
    setTotalVisits(c.totalVisits || 0);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !phone.trim()) {
      presentToast({ message: 'Nombre y teléfono son obligatorios', duration: 2500, color: 'warning' });
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      identification: identification.trim() || null,
      notes: notes.trim() || null,
      totalVisits: Number(totalVisits) || 0
    };

    try {
      if (editingCustomer && editingCustomer.id) {
        await apiClient.put(`/customers/${editingCustomer.id}`, payload);
        presentToast({ message: 'Cliente actualizado', duration: 2000, color: 'success' });
      } else {
        await apiClient.post('/customers', payload);
        presentToast({ message: 'Cliente agregado al directorio', duration: 2000, color: 'success' });
      }
      setShowModal(false);
      fetchCustomers();
    } catch (e: any) {
      presentToast({
        message: e.response?.data?.message || 'Error guardando cliente',
        duration: 3000,
        color: 'danger'
      });
    }
  };

  const confirmDelete = (c: CustomerDTO) => {
    presentAlert({
      header: 'Eliminar Cliente',
      message: `¿Estás seguro de que deseas eliminar a "${c.name}" del directorio?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.delete(`/customers/${c.id}`);
              presentToast({ message: 'Cliente eliminado', duration: 2000, color: 'success' });
              fetchCustomers();
            } catch (e) {
              presentToast({ message: 'Error eliminando cliente', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };

  const getCleanWhatsappUrl = (phoneStr: string, customerNameStr: string) => {
    const clean = phoneStr.replace(/[^\d]/g, '');
    const greeting = encodeURIComponent(`Hola ${customerNameStr}, te saludamos de Flujo Fino.`);
    return `https://wa.me/${clean}?text=${greeting}`;
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonMenuButton />
          </IonButtons>
          <IonTitle>Directorio de Clientes</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={fetchCustomers}>
              <IonIcon icon={refreshOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar color="light">
          <IonSearchbar
            value={search}
            onIonInput={e => setSearch(e.detail.value!)}
            placeholder="Buscar por Nombre, Teléfono o Cédula..."
            debounce={300}
          />
        </IonToolbar>
        {isOfflineMode && (
          <IonToolbar color="warning">
            <div style={{ textAlign: 'center', width: '100%', padding: '6px 12px', fontSize: '0.85rem', fontWeight: 'bold' }}>
              ⚡ Modo Sin Conexión: Visualizando agenda, clientes y catálogo guardados localmente.
            </div>
          </IonToolbar>
        )}
      </IonHeader>

      <IonContent className="ion-padding" style={{ backgroundColor: '#f4f5f8' }}>
        <IonRefresher slot="fixed" onIonRefresh={e => { fetchCustomers().finally(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          {loading && customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <IonSpinner name="crescent" />
            </div>
          ) : customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
              <IonIcon icon={personOutline} style={{ fontSize: '64px', color: '#cbd5e1' }} />
              <h3 style={{ fontWeight: 'bold', marginTop: '10px' }}>No hay clientes registrados</h3>
              <p style={{ fontSize: '14px', maxWidth: '400px', margin: '8px auto' }}>
                Los clientes se agregan y sincronizan automáticamente cuando agendan una cita o realizan una compra en caja.
              </p>
              <IonButton color="primary" onClick={openNew} style={{ marginTop: '16px' }}>
                <IonIcon icon={addOutline} slot="start" />
                Registrar Cliente Manualmente
              </IonButton>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {customers.map(c => (
                <IonCard key={c.id} style={{ margin: 0, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <IonCardContent style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h2 style={{ fontWeight: 'bold', fontSize: '17px', color: '#1e293b', margin: '0 0 4px 0' }}>
                          {c.name}
                        </h2>
                        {c.identification && (
                          <IonBadge color="light" style={{ border: '1px solid #cbd5e1', color: '#475569', fontSize: '11px' }}>
                            <IonIcon icon={idCardOutline} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            {c.identification}
                          </IonBadge>
                        )}
                      </div>
                      <IonBadge color="primary" style={{ padding: '6px 8px', fontSize: '12px', fontWeight: 'bold' }}>
                        ⭐ {c.totalVisits || 0} visitas
                      </IonBadge>
                    </div>

                    <div style={{ fontSize: '14px', color: '#334155', marginBottom: '12px' }}>
                      <b>Teléfono:</b> {c.phone}
                    </div>

                    {c.notes && (
                      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#92400e', marginBottom: '14px' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <IonIcon icon={sparklesOutline} />
                          Preferencias / Alergias:
                        </div>
                        {c.notes}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                      <IonButton 
                        size="small" 
                        color="success" 
                        fill="solid"
                        onClick={() => window.open(getCleanWhatsappUrl(c.phone, c.name), '_blank')}
                        style={{ height: '32px' }}
                      >
                        <IonIcon icon={logoWhatsapp} slot="start" />
                        WhatsApp
                      </IonButton>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <IonButton size="small" fill="clear" color="primary" onClick={() => openEdit(c)}>
                          <IonIcon icon={pencilOutline} slot="icon-only" />
                        </IonButton>
                        <IonButton size="small" fill="clear" color="danger" onClick={() => confirmDelete(c)}>
                          <IonIcon icon={trashOutline} slot="icon-only" />
                        </IonButton>
                      </div>
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openNew} color="primary">
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>

        {/* Modal Create / Edit */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar color="primary">
              <IonTitle>{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>Cerrar</IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            <div style={{ maxWidth: '500px', margin: '0 auto' }}>
              <IonItem lines="none" style={{ marginBottom: '14px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <IonLabel position="stacked">Nombre Completo *</IonLabel>
                <IonInput value={name} onIonInput={e => setName(e.detail.value!)} placeholder="Ej. Valentina Gómez" />
              </IonItem>

              <IonItem lines="none" style={{ marginBottom: '14px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <IonLabel position="stacked">Teléfono (WhatsApp) *</IonLabel>
                <IonInput value={phone} onIonInput={e => setPhone(e.detail.value!)} placeholder="Ej. 04141234567" />
              </IonItem>

              <IonItem lines="none" style={{ marginBottom: '14px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <IonLabel position="stacked">Cédula / RIF (Opcional)</IonLabel>
                <IonInput value={identification} onIonInput={e => setIdentification(e.detail.value!)} placeholder="Ej. V-28123456" />
              </IonItem>

              <IonItem lines="none" style={{ marginBottom: '14px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <IonLabel position="stacked">Total de Visitas Realizadas</IonLabel>
                <IonInput type="number" min="0" value={totalVisits} onIonInput={e => setTotalVisits(parseInt(e.detail.value!, 10) || 0)} />
              </IonItem>

              <IonItem lines="none" style={{ marginBottom: '20px', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                <IonLabel position="stacked">Notas Privadas (Preferencias, Alergias, Requerimientos)</IonLabel>
                <IonTextarea 
                  value={notes} 
                  rows={4} 
                  onIonInput={e => setNotes(e.detail.value!)} 
                  placeholder="Ej. Alérgica a ciertos esmaltes, prefiere atención puntual los sábados..." 
                />
              </IonItem>

              <IonButton expand="block" color="primary" onClick={handleSave} style={{ height: '48px', fontWeight: 'bold' }}>
                {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente'}
              </IonButton>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Customers;
