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
import { UserRole, APP_NAME, DEFAULT_TENANT_NAME, DEFAULT_SUPERADMIN_EMAIL } from '@finowork/shared-types';
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
  shieldCheckmarkOutline,
  medalOutline,
} from 'ionicons/icons';
import { useSettings } from '../context/SettingsContext';
import { apiClient } from '../api/client';

interface WorkModeOption {
  role: UserRole;
  name: string;
  badgeLabel: string;
  icon: string;
  description: string;
}

const WORK_MODE_OPTIONS: WorkModeOption[] = [
  {
    role: UserRole.POS,
    name: 'Modo Caja (POS)',
    badgeLabel: '💻 Modo Caja / POS',
    icon: '💻',
    description: 'Punto de venta, pedidos y clientes.',
  },
  {
    role: UserRole.INVENTORY,
    name: 'Modo Inventario',
    badgeLabel: '📦 Modo Inventario',
    icon: '📦',
    description: 'Materias primas, insumos y producción.',
  },
  {
    role: UserRole.DELIVERY,
    name: 'Modo Repartidor',
    badgeLabel: '🛵 Modo Repartidor',
    icon: '🛵',
    description: 'Panel de delivery, rutas y pedidos asignados.',
  },
  {
    role: UserRole.KITCHEN,
    name: 'Modo Especialista / Preparación',
    badgeLabel: '✂️ Modo Especialista / Preparación',
    icon: '✂️',
    description: 'Comandas, citas y preparación de órdenes.',
  },
  {
    role: UserRole.ADMIN,
    name: 'Modo Administrador',
    badgeLabel: '⚙️ Modo Administrador',
    icon: '⚙️',
    description: 'Panel general y configuración.',
  },
];

const Menu: React.FC = () => {
  const location = useLocation();
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();
  const { user, logout, switchWorkspace, switchMode, isAuthenticated } = useContext(AuthContext);
  const { settings } = useSettings();
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>(user?.workspaces || []);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isSwitchingMode, setIsSwitchingMode] = useState(false);

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
    }
  }, [isAuthenticated, user?.tenantId]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('ff-menu-open');
    };
  }, []);

  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'SUPERADMIN' || user?.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();

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

  const handleSwitchMode = async (targetRole: UserRole) => {
    if (targetRole === user?.role) {
      setShowModeModal(false);
      return;
    }
    try {
      setIsSwitchingMode(true);
      setShowModeModal(false);
      presentToast({ message: `Cambiando a ${targetRole}...`, duration: 1500, color: 'primary' });
      await switchMode(targetRole);
    } catch (e: any) {
      setIsSwitchingMode(false);
      presentToast({
        message: 'Error al cambiar de modo: ' + (e.response?.data?.message || e.message),
        duration: 3000,
        color: 'danger',
      });
    }
  };
  
  interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: string;
    isVisible: boolean;
  }

  const isProductionEnabled = settings.enableProduction !== undefined ? Boolean(settings.enableProduction) : (settings.featureProduction !== false);
  const isReservationsEnabled = settings.enableReservations !== undefined ? Boolean(settings.enableReservations) : Boolean(settings.featureCustomerSchedules);
  const isRetailEnabled = settings.enableRetail !== undefined ? Boolean(settings.enableRetail) : (settings.featureBuySell !== false);
  const isRecipesEnabled = settings.enableFormulas !== undefined ? Boolean(settings.enableFormulas) : Boolean(settings.featureRecipes);
  const isDeliveryEnabled = settings.enableDelivery !== undefined 
    ? Boolean(settings.enableDelivery) 
    : Boolean(settings.featureBuySell || settings.featureProduction || isProductionEnabled || user?.role === UserRole.DELIVERY);

  const hasProducts = isRetailEnabled || isRecipesEnabled || isProductionEnabled;
  const productsMenuLabel = (isReservationsEnabled && hasProducts)
    ? 'Servicios / Productos'
    : isReservationsEnabled
      ? 'Servicios'
      : 'Productos';

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Tablero Principal', path: '/dashboard', icon: pieChartOutline, isVisible: true },
    { id: 'raw-materials', label: 'Inventario (Insumos)', path: '/raw-materials', icon: cubeOutline, isVisible: isRecipesEnabled },
    { id: 'products', label: productsMenuLabel, path: '/products', icon: listOutline, isVisible: true },
    { id: 'production', label: 'Fórmulas / Ensamblaje', path: '/production', icon: constructOutline, isVisible: isProductionEnabled },
    { id: 'calculator', label: 'Calculadora de Costos', path: '/calculator', icon: calculatorOutline, isVisible: isRecipesEnabled },
    { id: 'pos', label: 'Caja', path: '/pos', icon: cashOutline, isVisible: true },
    { id: 'orders', label: 'Pedidos / Tickets', path: '/orders', icon: cartOutline, isVisible: true },
    { id: 'delivery-panel', label: 'Panel Repartidor', path: '/delivery-panel', icon: mapOutline, isVisible: isDeliveryEnabled || user?.role === UserRole.DELIVERY },
    { id: 'reservations', label: 'Reservaciones', path: '/reservations', icon: calendarOutline, isVisible: isReservationsEnabled },
    { id: 'customers', label: 'Clientes', path: '/customers', icon: personCircleOutline, isVisible: true },
    { id: 'delivery-zones', label: 'Zonas Delivery', path: '/delivery-zones', icon: mapOutline, isVisible: isDeliveryEnabled },
    { id: 'users', label: 'Usuarios', path: '/users', icon: peopleOutline, isVisible: user?.role === UserRole.ADMIN },
    { id: 'feedback', label: 'Ayuda y Comentarios', path: '/feedback', icon: chatbubbleOutline, isVisible: true },
    { id: 'settings', label: 'Configuración', path: '/settings', icon: settingsOutline, isVisible: user?.role === UserRole.ADMIN }
  ];

  let visibleItems: NavItem[] = navItems.filter(i => i.isVisible);

  const isPromotor = user?.role === UserRole.PROMOTOR || (user?.role as string) === 'PROMOTOR';

  if (!user?.tenantId && !isSuperAdmin && !isPromotor) {
    visibleItems = [];
  } else if (user?.role === UserRole.POS) {
    visibleItems = visibleItems.filter(i => ['/pos', '/orders', '/customers', '/calculator', '/reservations'].includes(i.path));
  } else if (user?.role === UserRole.INVENTORY) {
    visibleItems = visibleItems.filter(i => ['/raw-materials', '/products', '/production', '/calculator'].includes(i.path));
  } else if (user?.role === UserRole.DELIVERY) {
    visibleItems = visibleItems.filter(i => ['/delivery-panel', '/delivery-zones', '/orders'].includes(i.path));
  } else if (user?.role === UserRole.KITCHEN) {
    visibleItems = visibleItems.filter(i => isProductionEnabled ? ['/orders', '/production'].includes(i.path) : ['/orders'].includes(i.path));
  }

  if (isPromotor) {
    visibleItems = [
      { id: 'promoter-panel', label: 'Mi Panel de Promotor', path: '/promoter', icon: medalOutline, isVisible: true },
    ];
  }

  if (isSuperAdmin) {
    visibleItems = [
      { id: 'platform-admin', label: 'Plataforma SaaS', path: '/platform-admin', icon: shieldCheckmarkOutline, isVisible: true },
      { id: 'feedback-admin', label: 'Mensajes de Soporte', path: '/feedback', icon: chatbubbleOutline, isVisible: true },
    ];
  }

  const acceptedWorkspaces = workspaces.filter(w => (!w.status || w.status === 'ACCEPTED') && w.tenantId !== 'platform-admin');
  const displayWorkspaces = acceptedWorkspaces.length > 0 
    ? acceptedWorkspaces 
    : (isSuperAdmin 
        ? [] 
        : [{ tenantId: user?.tenantId || '', name: user?.tenantName || DEFAULT_TENANT_NAME, role: user?.role || '' }]);

  const userRoles: UserRole[] = (user?.roles && user.roles.length > 0)
    ? user.roles
    : (user?.role ? [user.role] : []);

  const isAdminUser = user?.role === UserRole.ADMIN || userRoles.includes(UserRole.ADMIN) || isSuperAdmin;

  const availableModes = WORK_MODE_OPTIONS.filter(opt => {
    if (isSuperAdmin) return true;
    if (userRoles.includes(opt.role)) return true;
    if (isAdminUser && opt.role !== UserRole.SUPERADMIN) return true;
    return false;
  });

  const currentModeInfo = WORK_MODE_OPTIONS.find(m => m.role === user?.role);
  const currentBadgeLabel = currentModeInfo ? currentModeInfo.badgeLabel : `Modo ${user?.role || 'Personal'}`;

  return (
    <IonMenu
      contentId="main"
      type="overlay"
      onIonWillOpen={() => document.body.classList.add('ff-menu-open')}
      onIonDidClose={() => document.body.classList.remove('ff-menu-open')}
    >
      <IonContent>
        <div style={{ padding: '20px 16px 16px 16px', textAlign: 'center', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img 
            src="/assets/logo.png" 
            alt={APP_NAME} 
            style={{ width: '48px', height: '48px', borderRadius: '16px', objectFit: 'cover', marginBottom: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.12)' }}
          />
          
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
              {isSuperAdmin ? ('Plataforma ' + APP_NAME) : (user?.tenantName || DEFAULT_TENANT_NAME)}
            </span>
            <IonIcon icon={chevronDownOutline} style={{ fontSize: '13px', color: '#64748b' }} />
          </button>

          {/* Selector de Modo de Trabajo (Sombreros Dinámicos) */}
          {user?.tenantId && !isSuperAdmin && !isPromotor && availableModes.length > 1 && (
            <button
              type="button"
              onClick={() => setShowModeModal(true)}
              style={{
                marginTop: '8px',
                background: '#ffffff',
                border: '1px solid #94a3b8',
                borderRadius: '20px',
                padding: '4px 12px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                maxWidth: '92%',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
              title="Cambiar Modo de Trabajo Activo"
            >
              <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0f172a' }}>
                [ {currentBadgeLabel} ▾ ]
              </span>
            </button>
          )}

          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b' }}>
            @{user?.username} {user?.tenantId && user?.role ? <span style={{ opacity: 0.8 }}>({user.role === 'KITCHEN' ? 'Servicio' : user.role})</span> : ''}
          </p>
        </div>

        <IonList id="inbox-list" style={{ paddingTop: 0 }}>
          {visibleItems.map((item) => (
            <IonMenuToggle key={item.id} autoHide={false}>
              <IonItem
                className={location.pathname === item.path ? 'selected' : ''}
                style={location.pathname === item.path ? {
                  '--background': 'var(--theme-primary)',
                  '--color': 'var(--theme-primary-contrast, #ffffff)',
                  color: 'var(--theme-primary-contrast, #ffffff)',
                  fontWeight: '800',
                  borderRadius: '12px',
                } as any : {}}
                routerLink={item.path}
                routerDirection="none"
                lines="none"
                detail={false}
              >
                <IonIcon aria-hidden="true" slot="start" icon={item.icon} style={location.pathname === item.path ? { color: 'var(--theme-primary-contrast, #ffffff)' } : {}} />
                <IonLabel>{item.label}</IonLabel>
              </IonItem>
            </IonMenuToggle>
          ))}
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

      {/* Modal de Modos de Trabajo */}
      <IonModal isOpen={showModeModal} onDidDismiss={() => setShowModeModal(false)}>
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>Modos de Trabajo</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowModeModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <p style={{ margin: '0 0 16px 0', color: '#64748b', fontSize: '14px', lineHeight: '1.4' }}>
              Alterna instantáneamente entre los roles autorizados en este negocio. La interfaz y navegación se adaptarán a la función seleccionada:
            </p>

            <IonList style={{ background: 'transparent' }}>
              {availableModes.map((opt) => {
                const isActive = user?.role === opt.role;
                return (
                  <IonItem
                    key={opt.role}
                    button
                    detail={false}
                    disabled={isSwitchingMode}
                    onClick={() => handleSwitchMode(opt.role)}
                    style={{
                      '--background': isActive ? '#ecfdf5' : '#ffffff',
                      marginBottom: '10px',
                      borderRadius: '12px',
                      border: isActive ? '2px solid #10b981' : '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    } as any}
                  >
                    <span style={{ fontSize: '22px', marginRight: '14px' }}>{opt.icon}</span>
                    <IonLabel>
                      <h2 style={{ fontWeight: 800, fontSize: '15px', color: isActive ? '#065f46' : '#1e293b' }}>
                        {opt.name}
                      </h2>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>
                        {opt.description}
                      </p>
                    </IonLabel>
                    {isActive && (
                      <IonIcon
                        slot="end"
                        icon={checkmarkCircleOutline}
                        style={{ color: '#10b981', fontSize: '24px' }}
                      />
                    )}
                  </IonItem>
                );
              })}
            </IonList>
          </div>
        </IonContent>
      </IonModal>

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
