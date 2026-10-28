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
  newspaperOutline,
  sparklesOutline,
  rocketOutline,
  buildOutline,
  trashOutline,
  checkmarkCircleOutline,
  calendarOutline,
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { UserRole, DEFAULT_SUPERADMIN_EMAIL, type AppUpdateDTO, type AppUpdateChangeType } from '@finowork/shared-types';

const FeedbackPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || user?.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();

  const [tab, setTab] = useState<'actualizaciones' | 'clientes' | 'soporte'>(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab');
    if (t === 'clientes' || t === 'soporte' || t === 'actualizaciones') return t;
    return 'actualizaciones';
  });

  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [platformFeedbacks, setPlatformFeedbacks] = useState<any[]>([]);
  const [appUpdates, setAppUpdates] = useState<AppUpdateDTO[]>([]);
  const [supportMessage, setSupportMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingUpdates, setLoadingUpdates] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | AppUpdateChangeType>('ALL');
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

  const fetchAppUpdates = async () => {
    try {
      setLoadingUpdates(true);
      const res = await apiClient.get('/app-updates/latest?limit=10');
      setAppUpdates(res.data || []);
    } catch (e: any) {
      console.error('Error al cargar actualizaciones:', e);
    } finally {
      setLoadingUpdates(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchPlatformFeedbacks();
    } else {
      if (tab === 'actualizaciones') {
        fetchAppUpdates();
      } else if (tab === 'clientes') {
        fetchFeedbacks();
      }
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

  const formatUpdateDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper para renderizar los cambios clasificados
  const renderCategorizedChanges = (changes: AppUpdateDTO['changes']) => {
    if (!Array.isArray(changes) || changes.length === 0) {
      return null;
    }

    const added = changes.filter((c) => c.type === 'ADDED');
    const implemented = changes.filter((c) => c.type === 'IMPLEMENTED');
    const fixed = changes.filter((c) => c.type === 'FIXED');
    const removed = changes.filter((c) => c.type === 'REMOVED');

    const sections = [
      {
        id: 'ADDED' as const,
        title: 'Agregado',
        icon: sparklesOutline,
        items: added,
        headerBg: '#ECFDF5',
        headerBorder: '#A7F3D0',
        textColor: '#065F46',
        badgeBg: '#10B981',
        itemBg: '#F0FDF4',
        itemBorder: '#DCFCE7',
      },
      {
        id: 'IMPLEMENTED' as const,
        title: 'Implementado',
        icon: rocketOutline,
        items: implemented,
        headerBg: '#E0F2FE',
        headerBorder: '#BAE6FD',
        textColor: '#0369A1',
        badgeBg: '#0284C7',
        itemBg: '#F0F9FF',
        itemBorder: '#E0F2FE',
      },
      {
        id: 'FIXED' as const,
        title: 'Corregido',
        icon: buildOutline,
        items: fixed,
        headerBg: '#FFFBEB',
        headerBorder: '#FDE68A',
        textColor: '#B45309',
        badgeBg: '#F59E0B',
        itemBg: '#FFFBEB',
        itemBorder: '#FEF3C7',
      },
      {
        id: 'REMOVED' as const,
        title: 'Eliminado',
        icon: trashOutline,
        items: removed,
        headerBg: '#FEF2F2',
        headerBorder: '#FECACA',
        textColor: '#B91C1C',
        badgeBg: '#EF4444',
        itemBg: '#FEF2F2',
        itemBorder: '#FEE2E2',
      },
    ];

    const activeSections = sections.filter((s) => {
      if (s.items.length === 0) return false;
      if (filterType !== 'ALL' && filterType !== s.id) return false;
      return true;
    });

    if (activeSections.length === 0) {
      return (
        <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
          No hay elementos registrados para el filtro seleccionado en esta actualización.
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
        {activeSections.map((sec) => (
          <div
            key={sec.id}
            style={{
              background: '#ffffff',
              borderRadius: '10px',
              border: `1px solid ${sec.headerBorder}`,
              overflow: 'hidden',
            }}
          >
            {/* Cabecera de Categoría */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: sec.headerBg,
                borderBottom: `1px solid ${sec.headerBorder}`,
              }}
            >
              <IonIcon icon={sec.icon} style={{ color: sec.textColor, fontSize: '16px' }} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: sec.textColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {sec.title}
              </span>
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '10px',
                  background: sec.badgeBg,
                  color: '#ffffff',
                }}
              >
                {sec.items.length} {sec.items.length === 1 ? 'cambio' : 'cambios'}
              </span>
            </div>

            {/* Lista de cambios */}
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sec.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '13px',
                    color: '#1E293B',
                    lineHeight: '1.5',
                  }}
                >
                  <span style={{ color: sec.textColor, fontWeight: 700, marginTop: '1px' }}>•</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
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

        <IonContent className="ion-padding ff-has-bottom-nav" style={{ backgroundColor: '#f1f5f9' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '90px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Bandeja de Entrada • FinoWork
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
                  Cuando algún negocio escriba una sugerencia o reporte desde su sección de Soporte en FinoWork, aparecerá en esta bandeja.
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

  // --- VISTA PARA DUEÑOS DE TIENDA REGULARES (CLIENTES) ---
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start"><IonMenuButton /></IonButtons>
          <IonTitle style={{ fontWeight: 700 }}>Ayuda y Comentarios</IonTitle>
        </IonToolbar>
        <IonToolbar color="primary">
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)} scrollable={true}>
            <IonSegmentButton value="actualizaciones">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={newspaperOutline} />
                Actualizaciones
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="clientes">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={chatbubbleOutline} />
                De Mis Clientes
              </IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="soporte">
              <IonLabel style={{ fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={headsetOutline} />
                Soporte FinoWork
              </IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding ff-has-bottom-nav" style={{ backgroundColor: '#f8fafc' }}>
        {/* PESTAÑA 1: NOVEDADES Y ACTUALIZACIONES DE LA APLICACIÓN */}
        {tab === 'actualizaciones' && (
          <div style={{ maxWidth: '750px', margin: '0 auto', paddingBottom: '90px' }}>
            {/* Header explicativo */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '18px 20px',
                border: '1px solid #e2e8f0',
                marginBottom: '16px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: 'var(--theme-primary-soft, #ecfdf5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <IonIcon
                    icon={newspaperOutline}
                    style={{ fontSize: '24px', color: 'var(--theme-primary-readable, #065f46)' }}
                  />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Últimas Actualizaciones de FinoWork
                  </h2>
                  <p style={{ color: '#64748B', fontSize: '13px', margin: '4px 0 0 0' }}>
                    Historial de mejoras, nuevas funciones y correcciones aplicadas para tu negocio.
                  </p>
                </div>
              </div>

              {/* Filtros rápidos de tipo de cambio */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexWrap: 'wrap',
                  marginTop: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                }}
              >
                {[
                  { id: 'ALL', label: 'Todos los cambios' },
                  { id: 'ADDED', label: '✨ Agregado', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
                  { id: 'IMPLEMENTED', label: '🚀 Implementado', bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd' },
                  { id: 'FIXED', label: '🛠️ Corregido', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
                  { id: 'REMOVED', label: '🗑️ Eliminado', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilterType(item.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border:
                        filterType === item.id
                          ? '2px solid var(--theme-primary, #10b981)'
                          : `1px solid ${item.border || '#cbd5e1'}`,
                      background:
                        filterType === item.id
                          ? 'var(--theme-primary-soft, #ecfdf5)'
                          : item.bg || '#ffffff',
                      color:
                        filterType === item.id
                          ? 'var(--theme-primary-readable, #065f46)'
                          : item.color || '#475569',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Spinner de carga */}
            {loadingUpdates && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <IonSpinner name="crescent" color="primary" />
                <p style={{ color: '#64748B', fontSize: '13px', marginTop: '10px' }}>
                  Cargando las últimas actualizaciones...
                </p>
              </div>
            )}

            {/* Estado vacío */}
            {!loadingUpdates && appUpdates.length === 0 && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '50px 20px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                  color: '#64748b',
                }}
              >
                <IonIcon
                  icon={checkmarkCircleOutline}
                  style={{ fontSize: '52px', color: '#10b981', marginBottom: '12px' }}
                />
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Estás al día con FinoWork
                </h3>
                <p style={{ fontSize: '14px', color: '#64748B', marginTop: '6px', maxWidth: '420px', margin: '6px auto 0 auto' }}>
                  Aún no se han registrado actualizaciones del sistema. Aquí aparecerán las novedades y mejoras continuas de la plataforma.
                </p>
              </div>
            )}

            {/* Lista de las últimas 10 actualizaciones */}
            {!loadingUpdates &&
              appUpdates.map((update) => (
                <IonCard
                  key={update.id}
                  style={{
                    margin: '0 0 16px 0',
                    borderRadius: '16px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                  }}
                >
                  <IonCardHeader style={{ paddingBottom: '8px' }}>
                    {/* Fila superior: Versión y Fecha */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {update.version && (
                          <span
                            style={{
                              background: 'var(--theme-primary, #10b981)',
                              color: 'var(--theme-primary-contrast, #ffffff)',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 800,
                              letterSpacing: '0.4px',
                            }}
                          >
                            {update.version}
                          </span>
                        )}
                        <span
                          style={{
                            background: '#F1F5F9',
                            color: '#475569',
                            padding: '3px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          Actualización del Sistema
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: '12px',
                          color: '#64748B',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <IonIcon icon={calendarOutline} />
                        {formatUpdateDate(update.publishedAt || update.createdAt)}
                      </span>
                    </div>

                    {/* Título de la actualización */}
                    <IonCardTitle
                      style={{
                        fontSize: '17px',
                        fontWeight: 800,
                        color: '#0F172A',
                        lineHeight: '1.4',
                      }}
                    >
                      {update.title}
                    </IonCardTitle>
                  </IonCardHeader>

                  <IonCardContent>
                    {/* Resumen explicativo */}
                    {update.summary && (
                      <p
                        style={{
                          margin: '0 0 12px 0',
                          fontSize: '14px',
                          color: '#475569',
                          lineHeight: '1.6',
                        }}
                      >
                        {update.summary}
                      </p>
                    )}

                    {/* Bloque de cambios clasificados (Agregado, Implementado, Corregido, Eliminado) */}
                    {renderCategorizedChanges(update.changes)}
                  </IonCardContent>
                </IonCard>
              ))}
          </div>
        )}

        {/* PESTAÑA 2: COMENTARIOS DE CLIENTES DEL NEGOCIO */}
        {tab === 'clientes' && (
          <div style={{ maxWidth: '650px', margin: '0 auto', paddingBottom: '90px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '15px' }}>
              Comentarios de tus clientes
            </h2>
            {feedbacks.length === 0 ? (
              <p style={{ color: '#666', textAlign: 'center', marginTop: '40px' }}>
                Aún no has recibido comentarios de tus clientes.
              </p>
            ) : (
              feedbacks.map((f) => (
                <IonCard key={f.id} style={{ margin: '0 0 15px 0', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <IonCardHeader style={{ paddingBottom: '5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <IonCardTitle style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                        <IonIcon icon={chatbubbleOutline} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#10B981' }} />
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

        {/* PESTAÑA 3: SOPORTE DIRECTO CON FINOWORK */}
        {tab === 'soporte' && (
          <div style={{ maxWidth: '650px', margin: '0 auto', paddingBottom: '90px' }}>
            <IonCard style={{ margin: 0, borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <IonCardHeader>
                <IonCardTitle style={{ display: 'flex', alignItems: 'center', fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                  <IonIcon icon={headsetOutline} style={{ marginRight: '10px', color: 'var(--theme-primary, #10b981)' }} />
                  ¿Necesitas ayuda o tienes una sugerencia?
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p style={{ marginBottom: '15px', fontSize: '14px', color: '#475569', lineHeight: '1.5' }}>
                  Escríbenos directamente a la plataforma. Puedes dejar tus sugerencias de mejoras para el sistema, reportar errores o solicitar ayuda personalizada.
                </p>
                <IonTextarea
                  value={supportMessage}
                  onIonInput={e => setSupportMessage(e.detail.value!)}
                  placeholder="Escribe tu mensaje aquí..."
                  rows={6}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '10px',
                    marginBottom: '15px',
                    background: '#ffffff',
                  }}
                />
                <IonButton
                  expand="block"
                  onClick={handleSendSupport}
                  disabled={!supportMessage.trim()}
                  style={{
                    '--background': 'var(--theme-primary, #10b981)',
                    '--color': 'var(--theme-primary-contrast, #ffffff)',
                    fontWeight: 700,
                  }}
                >
                  <IonIcon slot="start" icon={sendOutline} />
                  Enviar a Soporte
                </IonButton>
              </IonCardContent>
            </IonCard>

            <div style={{ marginTop: '24px', background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A', margin: '0 0 6px 0' }}>
                Guías y Preguntas Frecuentes
              </h3>
              <p style={{ color: '#64748B', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                Consulta la pestaña de <strong>Actualizaciones</strong> para enterarte de las funciones recién incorporadas a FinoWork y cómo sacarles el máximo provecho.
              </p>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default FeedbackPage;
