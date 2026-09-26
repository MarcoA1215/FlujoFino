import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuToggle,
  IonFooter,
  IonToolbar,
  IonModal,
  IonHeader,
  IonTitle,
  IonButtons,
  IonButton,
  IonBadge,
  useIonAlert,
  useIonToast
} from '@ionic/react';
import { useLocation } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '@nutrideli/shared-types';
import {
  calendarOutline,
  peopleOutline,
  settingsOutline,
  cubeOutline,
  cartOutline,
  constructOutline,
  cashOutline,
  listOutline,
  pieChartOutline,
  calculatorOutline,
  mapOutline,
  logOutOutline,
  businessOutline,
  chevronDownOutline,
  checkmarkCircleOutline,
  chatbubbleOutline,
  personCircleOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';
import { apiClient } from '../api/client';

const Menu: React.FC = () => {
  const location = useLocation();
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();
  const { user, logout, switchWorkspace, isAuthenticated } = useContext(AuthContext);
  const [settings, setSettings] = useState<any>({});
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>(user?.workspaces || []);
  const [isSwitching, setIsSwitching] = useState(false);

  const loadWorkspaces = async () => {
    try {
      const res = await apiClient.get<any[]>('/auth/workspaces');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setWorkspaces(res.data);
      }
    } catch (e) {
      if (user?.workspaces) {
        setWorkspaces(user.workspaces);
      }
    }
  };

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      loadWorkspaces();
      apiClient.get('/settings').then(res => {
        setSettings(res.data);
        if (res.data.themePrimaryColor) {
          document.documentElement.style.setProperty('--ion-color-primary', res.data.themePrimaryColor);
        }
        if (res.data.themeHeaderColor) {
          document.documentElement.style.setProperty('--ion-color-success', res.data.themeHeaderColor);
          document.documentElement.style.setProperty('--ion-color-tertiary', res.data.themeHeaderColor);
        }
      }).catch(e => console.log(e));
    }
  }, [isAuthenticated, user?.tenantId]);

  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'SUPERADMIN' || user?.email === 'superadmin@flujofino.com';

  if (!isAuthenticated || (!user?.tenantId && !isSuperAdmin) || location.pathname === '/select-workspace' || location.pathname.startsWith('/book') || location.pathname.startsWith('/appointment') || location.pathname.startsWith('/store')) {
    return null;
  }
  
  const confirmLogout = () => {
    presentAlert({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro de que quieres cerrar tu sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Salir', role: 'destructive', handler: logout }
      ]
    });
  };

  const handleSwitchTenant = async (tenantId: string) => {
    if (tenantId === user?.tenantId) {
      setShowBranchModal(false);
      return;
    }
    try {
      setIsSwitching(true);
      presentToast({ message: 'Cambiando de espacio...', duration: 1500, color: 'primary' });
      await switchWorkspace(tenantId);
    } catch (e: any) {
      setIsSwitching(false);
      presentToast({
        message: 'Error al cambiar de sucursal: ' + (e.response?.data?.message || e.message),
        duration: 3000,
        color: 'danger'
      });
    }
  };
  
  const rawPages = [
    { title: 'Tablero Principal', url: '/dashboard', iosIcon: pieChartOutline, mdIcon: pieChartOutline },
    { title: 'Inventario (Insumos)', url: '/raw-materials', iosIcon: cubeOutline, mdIcon: cubeOutline, conditional: 'featureRecipes' },
    { title: 'Servicios / Productos', url: '/products', iosIcon: listOutline, mdIcon: listOutline },
    { title: 'Fórmulas / Ensamblaje', url: '/production', iosIcon: constructOutline, mdIcon: constructOutline, conditional: 'featureProduction' },
    { title: 'Calculadora de Costos', url: '/calculator', iosIcon: calculatorOutline, mdIcon: calculatorOutline, conditional: 'featureRecipes' },
    { title: 'Caja', url: '/pos', iosIcon: cashOutline, mdIcon: cashOutline },
    { title: 'Pedidos / Tickets', url: '/orders', iosIcon: cartOutline, mdIcon: cartOutline },
    { title: 'Reservaciones', url: '/reservations', iosIcon: calendarOutline, mdIcon: calendarOutline, conditional: 'featureCustomerSchedules' },
    { title: 'Clientes', url: '/customers', iosIcon: personCircleOutline, mdIcon: personCircleOutline },
    { title: 'Zonas Delivery', url: '/delivery-zones', iosIcon: mapOutline, mdIcon: mapOutline, conditional: 'featureBuySell' },
    { title: 'Usuarios', url: '/users', iosIcon: peopleOutline, mdIcon: peopleOutline },
    { title: 'Ayuda y Comentarios', url: '/feedback', iosIcon: chatbubbleOutline, mdIcon: chatbubbleOutline },
    { title: 'Configuración', url: '/settings', iosIcon: settingsOutline, mdIcon: settingsOutline }
  ];

  let appPages = rawPages.filter(p => !p.conditional || (p.conditional === 'featureProduction' ? settings.featureProduction !== false : settings[p.conditional]));

  if (!user?.tenantId) {
    appPages = [];
  } else if (user?.role === UserRole.POS) {
    appPages = appPages.filter(p => ['/pos', '/orders', '/calculator', '/reservations', '/customers'].includes(p.url));
  } else if (user?.role === UserRole.KITCHEN) {
    appPages = appPages.filter(p => settings?.featureProduction === false ? ['/orders'].includes(p.url) : ['/orders', '/production'].includes(p.url));
  } else if (user?.role === UserRole.DELIVERY) {
    appPages = appPages.filter(p => ['/orders'].includes(p.url));
  } else if (user?.role === UserRole.INVENTORY) {
    appPages = appPages.filter(p => ['/raw-materials', '/products'].includes(p.url));
  }

  if (isSuperAdmin) {
    appPages = [
      { title: 'Plataforma SaaS', url: '/platform-admin', iosIcon: shieldCheckmarkOutline, mdIcon: shieldCheckmarkOutline },
      { title: 'Mensajes de Soporte', url: '/feedback', iosIcon: chatbubbleOutline, mdIcon: chatbubbleOutline },
    ];
  }

  const acceptedWorkspaces = workspaces.filter(w => !w.status || w.status === 'ACCEPTED');
  const displayWorkspaces = acceptedWorkspaces.length > 0 ? acceptedWorkspaces : [
    { tenantId: user?.tenantId || '', name: user?.tenantName || 'Flujo Fino', role: user?.role || '' }
  ];

  useEffect(() => {
    return () => {
      document.body.classList.remove('ff-menu-open');
    };
  }, []);

  return (
    <IonMenu
      contentId="main"
      type="overlay"
      onIonWillOpen={() => document.body.classList.add('ff-menu-open')}
      onIonDidClose={() => document.body.classList.remove('ff-menu-open')}
    >
      <IonContent>
        <div style={{ padding: '20px 16px 16px 16px', textAlign: 'center', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '46px', height: '46px', background: 'var(--ion-color-primary)', color: 'white', borderRadius: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '26px', fontWeight: '900', marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.12)' }}>
            F
          </div>
          
          <button 
            type="button"
            onClick={() => {
              loadWorkspaces();
              setShowBranchModal(true);
            }}
            style={{ 
              background: '#ffffff', 
              border: '1px solid #cbd5e1', 
              borderRadius: '24px', 
              padding: '6px 14px', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              gap: '6px', 
              cursor: 'pointer',
              maxWidth: '92%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              outline: 'none'
            }}
            title="Cambiar de sucursal / espacio"
          >
            <IonIcon icon={isSuperAdmin ? shieldCheckmarkOutline : businessOutline} style={{ fontSize: '15px', color: isSuperAdmin ? '#3b82f6' : 'var(--ion-color-primary)' }} />
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isSuperAdmin ? 'Plataforma Flujo Fino' : (user?.tenantName || 'Flujo Fino')}
            </span>
            <IonIcon icon={chevronDownOutline} style={{ fontSize: '13px', color: '#64748b' }} />
          </button>

          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            @{user?.username} {user?.tenantId && user?.role ? <span style={{ opacity: 0.8 }}>({user.role === 'KITCHEN' ? 'Servicio' : user.role})</span> : ''}
          </p>
        </div>

        <IonList id="inbox-list" style={{ paddingTop: 0 }}>
          {appPages.map((appPage, index) => {
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem className={location.pathname === appPage.url ? 'selected' : ''} routerLink={appPage.url} routerDirection="none" lines="none" detail={false}>
                  <IonIcon aria-hidden="true" slot="start" ios={appPage.iosIcon} md={appPage.mdIcon} />
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            );
          })}
        </IonList>
      </IonContent>

      <IonFooter className="ion-no-border" style={{ background: '#ffffff', borderTop: '1px solid #e2e8f0', paddingBottom: 'max(8px, env(safe-area-inset-bottom, 8px))' }}>
        <IonToolbar style={{ '--background': '#ffffff' } as any}>
          <IonItem button onClick={confirmLogout} lines="none" detail={false} style={{ '--background': 'transparent', cursor: 'pointer' } as any}>
            <IonIcon aria-hidden="true" slot="start" icon={logOutOutline} color="danger" style={{ fontSize: '22px' }} />
            <IonLabel color="danger" style={{ fontWeight: 700, fontSize: '15px' }}>Cerrar Sesión</IonLabel>
          </IonItem>
        </IonToolbar>
      </IonFooter>

      {/* Modal de Selección Rápida de Sucursal */}
      <IonModal isOpen={showBranchModal} onDidDismiss={() => setShowBranchModal(false)}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>Cambiar de Sucursal</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowBranchModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px', lineHeight: '1.4' }}>
              Selecciona el espacio de trabajo al que deseas ingresar. Tus datos y configuraciones se adaptarán automáticamente sin cerrar sesión.
            </p>

            <IonList style={{ background: 'transparent' }}>
              {isSuperAdmin && (
                <IonItem
                  button
                  detail={false}
                  disabled={isSwitching}
                  onClick={() => handleSwitchTenant('platform-admin')}
                  style={{
                    '--background': user?.tenantId === 'platform-admin' ? '#eff6ff' : '#ffffff',
                    marginBottom: '10px',
                    borderRadius: '12px',
                    border: user?.tenantId === 'platform-admin' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  } as any}
                >
                  <IonIcon 
                    icon={shieldCheckmarkOutline} 
                    slot="start" 
                    color={user?.tenantId === 'platform-admin' ? 'primary' : 'medium'} 
                    style={{ fontSize: '24px' }}
                  />
                  <IonLabel>
                    <h2 style={{ fontWeight: user?.tenantId === 'platform-admin' ? 'bold' : '600', color: '#1e293b' }}>
                      Plataforma Global (SaaS)
                    </h2>
                    <p style={{ color: '#64748b', fontSize: '13px' }}>
                      Panel administrativo de SuperAdmin
                    </p>
                  </IonLabel>
                  {user?.tenantId === 'platform-admin' ? (
                    <IonBadge slot="end" color="primary">Actual</IonBadge>
                  ) : (
                    <IonBadge slot="end" color="light">Ingresar</IonBadge>
                  )}
                </IonItem>
              )}
              {displayWorkspaces.map((w: any) => {
                const isCurrent = w.tenantId === user?.tenantId;
                return (
                  <IonItem
                    key={w.tenantId}
                    button
                    detail={false}
                    disabled={isSwitching}
                    onClick={() => handleSwitchTenant(w.tenantId)}
                    style={{
                      '--background': isCurrent ? '#eff6ff' : '#ffffff',
                      marginBottom: '10px',
                      borderRadius: '12px',
                      border: isCurrent ? '2px solid var(--ion-color-primary)' : '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    } as any}
                  >
                    <IonIcon 
                      icon={isCurrent ? checkmarkCircleOutline : businessOutline} 
                      slot="start" 
                      color={isCurrent ? 'primary' : 'medium'} 
                      style={{ fontSize: '24px' }}
                    />
                    <IonLabel>
                      <h2 style={{ fontWeight: isCurrent ? 'bold' : '600', color: '#1e293b' }}>
                        {w.name}
                      </h2>
                      <p style={{ color: '#64748b', fontSize: '13px' }}>
                        Rol asignado: <b>{w.role}</b>
                      </p>
                    </IonLabel>
                    {isCurrent ? (
                      <IonBadge slot="end" color="primary">Actual</IonBadge>
                    ) : (
                      <IonBadge slot="end" color="light">Ingresar</IonBadge>
                    )}
                  </IonItem>
                );
              })}
            </IonList>

            {displayWorkspaces.length <= 1 && (
              <div style={{ textAlign: 'center', marginTop: '20px', padding: '16px', color: '#94a3b8', fontSize: '13px' }}>
                Actualmente solo tienes acceso a esta sucursal. Cuando recibas una invitación o crees una nueva, podrás alternar entre ellas desde aquí.
              </div>
            )}
          </div>
        </IonContent>
      </IonModal>
    </IonMenu>
  );
};

export default Menu;
