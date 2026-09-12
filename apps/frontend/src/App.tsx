import { IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Navigate } from 'react-router-dom';
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
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Theme variables */
import './theme.css';

setupIonicReact();

const ProtectedRoute: React.FC<{ component: React.FC<any>; path: string }> = ({ component: Component, ...rest }) => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  return (
    <Route {...rest} element={isAuthenticated ? <Component /> : <Navigate to="/login" replace />} />
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <IonApp>
        <IonReactRouter>
          <IonSplitPane contentId="main">
            <Menu />
            <IonRouterOutlet id="main">
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<Login />} />
              
              <ProtectedRoute path="/dashboard" component={Dashboard} />
              <ProtectedRoute path="/raw-materials" component={RawMaterials} />
              <ProtectedRoute path="/products" component={Products} />
              <ProtectedRoute path="/production" component={Production} />
              <ProtectedRoute path="/calculator" component={Calculator} />
              <ProtectedRoute path="/pos" component={Pos} />
              <ProtectedRoute path="/orders" component={Orders} />
              <ProtectedRoute path="/delivery-zones" component={DeliveryZones} />
            </IonRouterOutlet>
          </IonSplitPane>
        </IonReactRouter>
      </IonApp>
    </AuthProvider>
  );
};

export default App;
