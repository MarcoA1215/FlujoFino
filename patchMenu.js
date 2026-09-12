const fs = require('fs');
let m = fs.readFileSync('apps/frontend/src/components/Menu.tsx', 'utf8');

if (!m.includes('AuthContext')) {
  m = m.replace(/import { useLocation } from 'react-router-dom';/, "import { useLocation } from 'react-router-dom';\nimport { useContext } from 'react';\nimport { AuthContext } from '../context/AuthContext';\nimport { UserRole } from '@nutrideli/shared-types';");
  
  m = m.replace(/const location = useLocation\(\);/, "const location = useLocation();\n  const { user, logout } = useContext(AuthContext);");

  // Modify appPages to be dynamic
  m = m.replace(/const appPages = \[([\s\S]*?)\];/, "let appPages = [$1];\n  if (user?.role === UserRole.POS) {\n    appPages = appPages.filter(p => ['/pos', '/orders', '/calculator', '/products'].includes(p.url));\n  } else if (user?.role === UserRole.KITCHEN) {\n    appPages = appPages.filter(p => ['/orders', '/production'].includes(p.url));\n  } else if (user?.role === UserRole.DELIVERY) {\n    appPages = appPages.filter(p => ['/orders'].includes(p.url));\n  } else if (user?.role === UserRole.INVENTORY) {\n    appPages = appPages.filter(p => ['/raw-materials', '/products'].includes(p.url));\n  }");

  // Add logout button at the bottom of the list
  m = m.replace(/<\/IonList>/, `<IonItem button onClick={logout} lines="none" color="light" style={{ marginTop: '20px' }}>\n            <IonIcon aria-hidden="true" slot="start" icon={warningOutline} />\n            <IonLabel>Cerrar Sesión</IonLabel>\n          </IonItem>\n        </IonList>`);

  // ensure warningOutline is imported
  if (!m.includes('warningOutline')) {
    m = m.replace(/} from 'ionicons\/icons';/, ", warningOutline } from 'ionicons/icons';");
  }

  fs.writeFileSync('apps/frontend/src/components/Menu.tsx', m, 'utf8');
}
