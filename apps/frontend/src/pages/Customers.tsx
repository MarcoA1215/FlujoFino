// @ts-nocheck
import React, { useState, useEffect, useMemo, useContext } from 'react';
import {
  IonPage,
  IonContent,
  IonIcon,
  IonSpinner,
  useIonToast,
  useIonAlert,
  IonModal,
  IonRefresher,
  IonRefresherContent
} from '@ionic/react';
import {
  addOutline,
  searchOutline,
  closeOutline,
  logoWhatsapp,
  pencilOutline,
  trashOutline,
  personOutline,
  idCardOutline,
  callOutline
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import type { CustomerDTO } from '@nutrideli/shared-types';
import { offlineDb } from '../services/offline-db';
import { AuthContext } from '../context/AuthContext';
import AppHeader from '../components/AppHeader';

const Customers: React.FC = () => {
  const { user } = useContext(AuthContext);
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

    try {
      const cached = await offlineDb.cachedCustomers.toArray();
      if (cached && cached.length > 0) {
        setCustomers(filterLocalCustomers(cached, q));
      }
    } catch (err) {}

    if (!navigator.onLine) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const url = q ? `/customers?search=${encodeURIComponent(q)}` : '/customers';
      const res = await apiClient.get<CustomerDTO[]>(url);
      setCustomers(res.data);

      if (!q && res.data && res.data.length > 0) {
        try {
          await offlineDb.cachedCustomers.clear();
          await offlineDb.cachedCustomers.bulkPut(res.data);
        } catch (dbErr) {}
      } else if (res.data && res.data.length > 0) {
        try {
          await offlineDb.cachedCustomers.bulkPut(res.data);
        } catch (dbErr) {}
      }
    } catch (e: any) {
      try {
        const cached = await offlineDb.cachedCustomers.toArray();
        if (cached && cached.length > 0) {
          setCustomers(filterLocalCustomers(cached, q));
          presentToast({
            message: '⚡ Modo Sin Conexión: Visualizando clientes guardados localmente.',
            duration: 3000,
            color: 'warning'
          });
        }
      } catch (err) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

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
        presentToast({ message: 'Cliente actualizado con éxito', duration: 2000, color: 'success' });
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
    const greeting = encodeURIComponent(`Hola ${customerNameStr}, te saludamos de ${user?.tenantName || 'Flujo Fino'}.`);
    return `https://wa.me/${clean}?text=${greeting}`;
  };

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <IonPage>
      <AppHeader title="Clientes" onRefresh={fetchCustomers} />

      <IonContent fullscreen className="ff-has-bottom-nav" style={{ '--background': '#F8FAFC' } as any}>
        <IonRefresher slot="fixed" onIonRefresh={e => { fetchCustomers().finally(() => e.detail.complete()); }}>
          <IonRefresherContent />
        </IonRefresher>

        <div style={{ maxWidth: '850px', margin: '0 auto', padding: '16px 16px 80px 16px' }}>

          {/* Search Pill */}
          <div className="ff-search-pill" style={{ marginBottom: '16px' }}>
            <IonIcon icon={searchOutline} style={{ fontSize: '18px', color: '#64748B' }} />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o cédula..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <IonIcon
                icon={closeOutline}
                style={{ fontSize: '18px', color: '#64748B', cursor: 'pointer' }}
                onClick={() => setSearch('')}
              />
            )}
          </div>

          {/* Results State */}
          {loading && customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <IonSpinner name="crescent" color="primary" />
              <p style={{ marginTop: '10px', color: '#64748B', fontSize: '13px' }}>Cargando directorio...</p>
            </div>
          ) : customers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', background: '#ffffff', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
              <IonIcon icon={personOutline} style={{ fontSize: '56px', color: '#CBD5E1', marginBottom: '8px' }} />
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '800', color: '#0F172A' }}>
                No hay clientes registrados
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', maxWidth: '380px', margin: '0 auto 16px auto' }}>
                Los clientes se sincronizan automáticamente con las citas de la agenda y pedidos de caja.
              </p>
              <button
                type="button"
                onClick={openNew}
                className="ff-btn-primary"
                style={{ padding: '10px 20px' }}
              >
                <IonIcon icon={addOutline} />
                Registrar Cliente
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {customers.map(c => (
                <div
                  key={c.id}
                  className="ff-card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: '#ffffff'
                  }}
                >
                  <div>
                    {/* Header: Avatar, Name & Visits */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: '#ECFDF5',
                          color: '#047857',
                          border: '1px solid #A7F3D0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '15px'
                        }}
                      >
                        {getInitials(c.name)}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '15px',
                            fontWeight: '800',
                            color: '#0F172A',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {c.name}
                        </div>
                        {c.identification && (
                          <div style={{ fontSize: '11px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IonIcon icon={idCardOutline} />
                            {c.identification}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          background: '#ECFDF5',
                          color: '#047857',
                          borderRadius: '999px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}
                      >
                        ⭐ {c.totalVisits || 0} v.
                      </div>
                    </div>

                    {/* Phone & Notes */}
                    <div style={{ fontSize: '13px', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={callOutline} style={{ color: '#10B981', fontSize: '15px' }} />
                      <span style={{ fontWeight: '600' }}>{c.phone}</span>
                    </div>

                    {c.notes && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          background: '#F8FAFC',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          marginBottom: '10px'
                        }}
                      >
                        📝 {c.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '10px',
                      borderTop: '1px solid #F1F5F9'
                    }}
                  >
                    <a
                      href={getCleanWhatsappUrl(c.phone, c.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#065F46',
                        borderRadius: '8px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none'
                      }}
                    >
                      <IonIcon icon={logoWhatsapp} style={{ fontSize: '15px' }} />
                      WhatsApp
                    </a>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #E2E8F0',
                          borderRadius: '8px',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#0F172A'
                        }}
                        title="Editar cliente"
                      >
                        <IonIcon icon={pencilOutline} style={{ fontSize: '15px' }} />
                      </button>

                      <button
                        type="button"
                        onClick={() => confirmDelete(c)}
                        style={{
                          background: '#FEF2F2',
                          border: '1px solid #FCA5A5',
                          borderRadius: '8px',
                          width: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#EF4444'
                        }}
                        title="Eliminar cliente"
                      >
                        <IonIcon icon={trashOutline} style={{ fontSize: '15px' }} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAB [+] Button */}
        <div
          onClick={openNew}
          style={{
            position: 'fixed',
            bottom: '78px',
            right: '20px',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: '#10B981',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
            cursor: 'pointer',
            zIndex: 900
          }}
          title="Nuevo cliente"
        >
          <IonIcon icon={addOutline} style={{ fontSize: '28px', strokeWidth: '32' }} />
        </div>

        {/* Create / Edit Modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)} style={{ '--border-radius': '20px' } as any}>
          <div style={{ background: '#ffffff', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0F172A' }}>
                {editingCustomer ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <IonIcon icon={closeOutline} style={{ color: '#64748B' }} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px' }}>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                    Teléfono (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="0414-1234567"
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                      Cédula / ID
                    </label>
                    <input
                      type="text"
                      value={identification}
                      onChange={e => setIdentification(e.target.value)}
                      placeholder="V-12345678"
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                      Visitas Previas
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={totalVisits}
                      onChange={e => setTotalVisits(Number(e.target.value) || 0)}
                      style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '4px' }}>
                    Notas Internas / Preferencias
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Ej. Prefiere degradado alto, café sin azúcar..."
                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '14px', fontFamily: 'inherit' }}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  className="ff-btn-primary"
                  style={{ width: '100%', padding: '14px', fontSize: '15px', borderRadius: '14px' }}
                >
                  {editingCustomer ? 'Guardar Cambios' : 'Registrar Cliente ✓'}
                </button>
            </div>
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Customers;
