const fs = require('fs');

// 1. Dashboard.tsx - Restrict content to ADMIN only
let dashboard = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');
if (!dashboard.includes('AuthContext')) {
  dashboard = dashboard.replace(/import \{ IonPage, /, "import { useContext } from 'react';\nimport { AuthContext } from '../context/AuthContext';\nimport { UserRole } from '@nutrideli/shared-types';\nimport { IonPage, ");
  
  // Inject the check at the top of the component
  dashboard = dashboard.replace(/const Dashboard: React\.FC = \(\) => \{/, "const Dashboard: React.FC = () => {\n  const { user } = useContext(AuthContext);\n");
  
  const restrictedContent = `
  if (user?.role !== UserRole.ADMIN) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar color="primary">
            <IonButtons slot="start"><IonMenuButton /></IonButtons>
            <IonTitle>Bienvenido</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding ion-text-center">
          <h2>Hola, {user?.username}</h2>
          <p>Selecciona una opción del menú lateral para comenzar a trabajar.</p>
        </IonContent>
      </IonPage>
    );
  }
  `;
  dashboard = dashboard.replace(/const fetchSummary = async \(\) => \{/, restrictedContent + "\n  const fetchSummary = async () => {");
  
  fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', dashboard, 'utf8');
}

// 2. App.tsx - Home redirector and Login redirection
let app = fs.readFileSync('apps/frontend/src/App.tsx', 'utf8');
if (!app.includes('HomeRedirector')) {
  app = app.replace(/import \{ UserRole \} from '@nutrideli\/shared-types';/g, ""); // clean if exists
  app = app.replace(/import \{ AuthProvider, AuthContext \} from '.\/context\/AuthContext';/, "import { AuthProvider, AuthContext } from './context/AuthContext';\nimport { UserRole } from '@nutrideli/shared-types';");

  const homeRedirector = `
const HomeRedirector: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (user?.role === UserRole.POS) return <Navigate to="/pos" replace />;
  if (user?.role === UserRole.KITCHEN) return <Navigate to="/orders" replace />;
  if (user?.role === UserRole.DELIVERY) return <Navigate to="/orders" replace />;
  if (user?.role === UserRole.INVENTORY) return <Navigate to="/raw-materials" replace />;
  return <Navigate to="/dashboard" replace />;
};

const LoginRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return null;
  if (isAuthenticated) return <HomeRedirector />;
  return <Login />;
};
`;
  app = app.replace(/const PrivateRoute/, homeRedirector + "\nconst PrivateRoute");
  app = app.replace(/<Route path="\/" element=\{<Navigate to="\/dashboard" replace \/>\} \/>/, '<Route path="/" element={<HomeRedirector />} />');
  app = app.replace(/<Route path="\/login" element=\{<Login \/>\} \/>/, '<Route path="/login" element={<LoginRoute />} />');
  
  fs.writeFileSync('apps/frontend/src/App.tsx', app, 'utf8');
}

// 3. Login.tsx - Update redirection to '/' instead of '/dashboard' so it uses HomeRedirector
let login = fs.readFileSync('apps/frontend/src/pages/Login.tsx', 'utf8');
login = login.replace(/router\.push\('\/dashboard', 'root', 'replace'\);/, "router.push('/', 'root', 'replace');");
fs.writeFileSync('apps/frontend/src/pages/Login.tsx', login, 'utf8');

// 4. Menu.tsx - Add confirmation to logout
let menu = fs.readFileSync('apps/frontend/src/components/Menu.tsx', 'utf8');
if (!menu.includes('presentAlert')) {
  menu = menu.replace(/import \{ useLocation \} from 'react-router-dom';/, "import { useLocation } from 'react-router-dom';\nimport { useIonAlert } from '@ionic/react';");
  menu = menu.replace(/const location = useLocation\(\);/, "const location = useLocation();\n  const [presentAlert] = useIonAlert();");
  
  const confirmLogout = `
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
  `;
  menu = menu.replace(/const rawPages = \[/, confirmLogout + "\n  const rawPages = [");
  menu = menu.replace(/onClick=\{logout\}/, "onClick={confirmLogout}");
  
  fs.writeFileSync('apps/frontend/src/components/Menu.tsx', menu, 'utf8');
}

