import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Navigate, Route, useLocation } from 'react-router-dom';
import Menu from './components/Menu';
import Dashboard from './pages/Dashboard';
import RawMaterials from './pages/RawMaterials';
import Products from './pages/Products';
import Production from './pages/Production';
import Calculator from './pages/Calculator';
import Pos from './pages/Pos';
import Orders from './pages/Orders';
import DeliveryZones from './pages/DeliveryZones';
import Login from './pages/Login';
import Register from './pages/Register';
import Users from './pages/Users';
import SettingsPage from './pages/Settings';
import SelectWorkspace from './pages/SelectWorkspace';
import Reservations from './pages/Reservations';
import Customers from './pages/Customers';
import PublicBooking from './pages/PublicBooking';
import PublicStore from './pages/PublicStore';
import PublicAppointmentManage from './pages/PublicAppointmentManage';
import FeedbackPage from './pages/Feedback';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ImageViewerProvider } from './context/ImageViewerContext';
import { UserRole } from '@nutrideli/shared-types';
import { useContext, useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';

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

setupIonicReact();

const HomeRedirector: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'SUPERADMIN' || user?.email === 'superadmin@flujofino.com';
  if (isSuperAdmin) {
    return <Navigate to="/platform-admin" replace />;
  }
  
  if (!user?.tenantId) return <Navigate to="/select-workspace" replace />;
  
  if (user?.role === UserRole.POS) return <Navigate to="/pos" replace />;
  if (user?.role === UserRole.KITCHEN) return <Navigate to="/orders" replace />;
  if (user?.role === UserRole.DELIVERY) return <Navigate to="/orders" replace />;
  if (user?.role === UserRole.INVENTORY) return <Navigate to="/raw-materials" replace />;
  return <Navigate to="/dashboard" replace />;
};

const LoginRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  const hasPending = !!localStorage.getItem('pendingAccessRequestId');
  if (isAuthenticated && !hasPending) return <HomeRedirector />;
  return <Login />;
};

const RegisterRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  if (isAuthenticated) return <HomeRedirector />;
  return <Register />;
};

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useContext(AuthContext);
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'SUPERADMIN' || user?.email === 'superadmin@flujofino.com';
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
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
      <ImageViewerProvider>
        <IonApp>
          <IonReactRouter>
            <MainLayout />
          </IonReactRouter>
        </IonApp>
      </ImageViewerProvider>
    </AuthProvider>
  );
};

const MainLayout: React.FC = () => {
  const { user } = useContext(AuthContext);
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
                        location.pathname.startsWith('/appointment');
  const isSuperAdmin = user?.role === UserRole.SUPERADMIN || (user?.role as string) === 'SUPERADMIN' || user?.email === 'superadmin@flujofino.com';

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
      <IonSplitPane contentId="main" when={!isPublicRoute && (user?.tenantId || isSuperAdmin) ? 'md' : false}>
        {!isPublicRoute && <Menu />}
        <IonRouterOutlet id="main">
        <Route path="/book/:tenantId" element={<PublicBooking />} />
        <Route path="/store/:tenantId" element={<PublicStore />} />
        <Route path="/tienda/:tenantId" element={<PublicStore />} />
        <Route path="/appointment/:id" element={<PublicAppointmentManage />} />
        <Route path="/" element={<HomeRedirector />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/select-workspace" element={<PrivateRoute><SelectWorkspace /></PrivateRoute>} />
        
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/raw-materials" element={<PrivateRoute><RawMaterials /></PrivateRoute>} />
        <Route path="/products" element={<PrivateRoute><Products /></PrivateRoute>} />
        <Route path="/production" element={<PrivateRoute><Production /></PrivateRoute>} />
        <Route path="/calculator" element={<PrivateRoute><Calculator /></PrivateRoute>} />
        <Route path="/pos" element={<PrivateRoute><Pos /></PrivateRoute>} />
        <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
        <Route path="/delivery-zones" element={<PrivateRoute><DeliveryZones /></PrivateRoute>} />
        <Route path="/users" element={<PrivateRoute><Users /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
        <Route path="/reservations" element={<PrivateRoute><Reservations /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><Customers /></PrivateRoute>} />
        <Route path="/feedback" element={<PrivateRoute><FeedbackPage /></PrivateRoute>} />
        <Route path="/platform-admin" element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
      </IonRouterOutlet>
      </IonSplitPane>
      <BottomNav />
    </>
  );
};

export default App;
