import { IonApp, IonRouterOutlet, IonSplitPane, IonSpinner, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Navigate, Route, useLocation } from 'react-router-dom';
import { useContext, useEffect, useState, lazy, Suspense } from 'react';
import Menu from './components/Menu';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SubscriptionProvider, SubscriptionContext } from './context/SubscriptionContext';
import { ImageViewerProvider } from './context/ImageViewerContext';
import { LoadingProvider } from './context/LoadingContext';
import { SettingsProvider } from './context/SettingsContext';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { ReportPaymentModal } from './components/ReportPaymentModal';
import { UserRole, DEFAULT_SUPERADMIN_EMAIL } from '@finowork/shared-types';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from './hooks/usePushNotifications';
import { NotificationPermissionBanner } from './components/NotificationPermissionBanner';

// Code Splitting / Lazy Loading de páginas para optimización de bundle
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RawMaterials = lazy(() => import('./pages/RawMaterials'));
const Products = lazy(() => import('./pages/Products'));
const Production = lazy(() => import('./pages/Production'));
const Calculator = lazy(() => import('./pages/Calculator'));
const Pos = lazy(() => import('./pages/Pos'));
const Orders = lazy(() => import('./pages/Orders'));
const DeliveryZones = lazy(() => import('./pages/DeliveryZones'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Users = lazy(() => import('./pages/Users'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const SelectWorkspace = lazy(() => import('./pages/SelectWorkspace'));
const Reservations = lazy(() => import('./pages/Reservations'));
const Customers = lazy(() => import('./pages/Customers'));
const PublicBooking = lazy(() => import('./pages/PublicBooking'));
const PublicStore = lazy(() => import('./pages/PublicStore'));
const PublicAppointmentManage = lazy(() => import('./pages/PublicAppointmentManage'));
const FeedbackPage = lazy(() => import('./pages/Feedback'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const DeliveryPanel = lazy(() => import('./pages/DeliveryPanel'));
const SubscriptionExpired = lazy(() => import('./pages/SubscriptionExpired'));
const PromoterDashboard = lazy(() => import('./pages/PromoterDashboard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));

const PageFallback: React.FC = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    flexDirection: 'column',
    gap: '12px'
  }}>
    <IonSpinner name="crescent" color="primary" />
    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>Cargando módulo...</span>
  </div>
);

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme.css';

import BottomNav from './components/BottomNav';
import ErrorBoundary from './components/ErrorBoundary';

setupIonicReact();

const HomeRedirector: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useContext(AuthContext);
  const { isExpired, isLoading: isSubLoading } = useContext(SubscriptionContext);

  if (isLoading || isSubLoading) return null;
  if (!isAuthenticated) {
    if (Capacitor.isNativePlatform()) {
      return <Navigate to="/login" replace />;
    }
    return (
      <Suspense fallback={<PageFallback />}>
        <LandingPage />
      </Suspense>
    );
  }

  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'SUPERADMIN' || user?.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
  if (isSuperAdmin) {
    return <Navigate to="/platform-admin" replace />;
  }

  const isPromotor = user?.role === UserRole.PROMOTOR || (user?.role as string) === 'PROMOTOR';
  if (isPromotor) {
    return <Navigate to="/promoter" replace />;
  }
  
  if (!user?.tenantId) return <Navigate to="/select-workspace" replace />;

  if (isExpired) {
    return <Navigate to="/subscription-expired" replace />;
  }
  
  if (user?.role === UserRole.POS) return <Navigate to="/pos" replace />;
  if (user?.role === UserRole.KITCHEN) return <Navigate to="/orders" replace />;
  if (user?.role === UserRole.DELIVERY) return <Navigate to="/delivery-panel" replace />;
  if (user?.role === UserRole.INVENTORY) return <Navigate to="/raw-materials" replace />;
  return <Navigate to="/dashboard" replace />;
};

const LoginRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  const hasPending = !!localStorage.getItem('pendingAccessRequestId');
  if (isAuthenticated && !hasPending) return <HomeRedirector />;
  return (
    <Suspense fallback={<PageFallback />}>
      <Login />
    </Suspense>
  );
};

const RegisterRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  if (isAuthenticated) return <HomeRedirector />;
  return (
    <Suspense fallback={<PageFallback />}>
      <Register />
    </Suspense>
  );
};

export const getRoleDefaultPath = (role?: UserRole | string): string => {
  switch (role) {
    case UserRole.PROMOTOR:
      return '/promoter';
    case UserRole.POS:
      return '/pos';
    case UserRole.DELIVERY:
      return '/delivery-panel';
    case UserRole.KITCHEN:
      return '/orders';
    case UserRole.INVENTORY:
      return '/raw-materials';
    default:
      return '/dashboard';
  }
};

const PrivateRoute: React.FC<{ children: React.ReactNode; allowedRoles?: UserRole[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);
  const { isExpired, isLoading: isSubLoading } = useContext(SubscriptionContext);

  if (isLoading || isSubLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isSuperAdmin =
    user?.role === UserRole.SUPERADMIN ||
    (user?.role as string) === 'SUPERADMIN' ||
    user?.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();

  if (!isSuperAdmin && user?.tenantId && isExpired) {
    return <Navigate to="/subscription-expired" replace />;
  }

  if (allowedRoles && user?.role && !isSuperAdmin) {
    const hasRole = allowedRoles.includes(user.role as UserRole);
    if (!hasRole) {
      return <Navigate to={getRoleDefaultPath(user.role)} replace />;
    }
  }

  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
};

const ExpiredPaywallRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);
  const { isExpired, isLoading: isSubLoading } = useContext(SubscriptionContext);

  if (isLoading || isSubLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isSuperAdmin =
    user?.role === UserRole.SUPERADMIN ||
    (user?.role as string) === 'SUPERADMIN' ||
    user?.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();

  if (isSuperAdmin || !isExpired) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <SubscriptionExpired />
    </Suspense>
  );
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'SUPERADMIN' || user?.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
};

const PromoterRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'SUPERADMIN' || user?.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
  const isPromotor = user?.role === UserRole.PROMOTOR || (user?.role as string) === 'PROMOTOR';
  if (!isSuperAdmin && !isPromotor) {
    return <Navigate to="/dashboard" replace />;
  }
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
};

const App: React.FC = () => {
  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapacitorApp.exitApp();
      } else {
        window.history.back();
      }
    });
    return () => {
      backListener.then(l => l.remove());
    };
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <SubscriptionProvider>
          <ImageViewerProvider>
            <LoadingProvider>
              <IonApp>
                <LoadingOverlay />
                <IonReactRouter>
                  <ErrorBoundary>
                    <Suspense fallback={<PageFallback />}>
                      <MainLayout />
                    </Suspense>
                  </ErrorBoundary>
                </IonReactRouter>
              </IonApp>
            </LoadingProvider>
          </ImageViewerProvider>
        </SubscriptionProvider>
      </SettingsProvider>
    </AuthProvider>
  );
};

const MainLayout: React.FC = () => {
  const { user } = useContext(AuthContext);
  usePushNotifications(user);
  const { isReportModalOpen, setIsReportModalOpen } = useContext(SubscriptionContext);
  const location = useLocation();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isPublicRoute = location.pathname.startsWith('/book') || 
                        location.pathname.startsWith('/store') || 
                        location.pathname.startsWith('/tienda') || 
                        location.pathname.startsWith('/appointment') ||
                        location.pathname === '/landing' ||
                        location.pathname === '/terms' ||
                        location.pathname === '/privacy' ||
                        location.pathname === '/login' ||
                        location.pathname === '/register' ||
                        (location.pathname === '/' && !user);
  const isExpiredRoute = location.pathname === '/subscription-expired';
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'SUPERADMIN' || user?.email?.toLowerCase() === DEFAULT_SUPERADMIN_EMAIL.toLowerCase();
  const isPromotor = user?.role === UserRole.PROMOTOR || (user?.role as string) === 'PROMOTOR';

  return (
    <>
      {!isOnline && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#d97706',
          color: '#ffffff',
          textAlign: 'center',
          padding: '6px 12px',
          fontSize: '0.85rem',
          fontWeight: 'bold',
          zIndex: 99999,
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
        }}>
          ⚡ Modo Sin Conexión: Visualizando agenda, clientes y catálogo guardados localmente.
        </div>
      )}
      {!isPublicRoute && !isExpiredRoute && <NotificationPermissionBanner />}
      <IonSplitPane contentId="main" when={!isPublicRoute && !isExpiredRoute && (user?.tenantId || isSuperAdmin || isPromotor) ? 'md' : false}>
        {!isPublicRoute && !isExpiredRoute && <Menu />}
        <IonRouterOutlet id="main">
        <Route path="/book/:tenantId" element={<Suspense fallback={<PageFallback />}><PublicBooking /></Suspense>} />
        <Route path="/store/:tenantId" element={<Suspense fallback={<PageFallback />}><PublicStore /></Suspense>} />
        <Route path="/tienda/:tenantId" element={<Suspense fallback={<PageFallback />}><PublicStore /></Suspense>} />
        <Route path="/appointment/:id" element={<Suspense fallback={<PageFallback />}><PublicAppointmentManage /></Suspense>} />
        <Route path="/subscription-expired" element={<ExpiredPaywallRoute />} />
        <Route path="/landing" element={Capacitor.isNativePlatform() ? <Navigate to="/login" replace /> : <Suspense fallback={<PageFallback />}><LandingPage /></Suspense>} />
        <Route path="/terms" element={<Suspense fallback={<PageFallback />}><TermsAndConditions /></Suspense>} />
        <Route path="/privacy" element={<Suspense fallback={<PageFallback />}><PrivacyPolicy /></Suspense>} />
        <Route path="/" element={<HomeRedirector />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/select-workspace" element={<PrivateRoute><SelectWorkspace /></PrivateRoute>} />
        
        <Route path="/dashboard" element={<PrivateRoute allowedRoles={[UserRole.ADMIN]}><Dashboard /></PrivateRoute>} />
        <Route path="/raw-materials" element={<PrivateRoute><RawMaterials /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/production" element={<PrivateRoute><Production /></PrivateRoute>} />
        <Route path="/calculator" element={<PrivateRoute><Calculator /></PrivateRoute>} />
        <Route path="/pos" element={<PrivateRoute><Pos /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
        <Route path="/delivery-panel" element={<PrivateRoute><DeliveryPanel /></PrivateRoute>} />
        <Route path="/delivery-zones" element={<PrivateRoute><DeliveryZones /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute allowedRoles={[UserRole.ADMIN]}><Users /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute allowedRoles={[UserRole.ADMIN]}><SettingsPage /></PrivateRoute>} />
        <Route path="/reservations" element={<PrivateRoute><Reservations /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
        <Route path="/feedback" element={<PrivateRoute><FeedbackPage /></PrivateRoute>} />
        <Route path="/promoter" element={<PromoterRoute><PromoterDashboard /></PromoterRoute>} />
        <Route path="/platform-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
        <Route path="*" element={<HomeRedirector />} />
      </IonRouterOutlet>
      </IonSplitPane>
      <BottomNav />
      <ReportPaymentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </>
  );
};

export default App;
