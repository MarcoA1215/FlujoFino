const fs = require('fs');
let dashboard = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');

// 1. Add imports
dashboard = "import { useContext } from 'react';\nimport { AuthContext } from '../context/AuthContext';\nimport { UserRole } from '@nutrideli/shared-types';\n" + dashboard;

// 2. Add logic inside component
const restrictedContent = `
  const { user } = useContext(AuthContext);
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
          <br /><br />
          <h2>Hola, {user?.username}</h2>
          <p>Selecciona una opción del menú lateral para comenzar a trabajar.</p>
        </IonContent>
      </IonPage>
    );
  }
`;

dashboard = dashboard.replace(/const Dashboard: React\.FC = \(\) => \{/, "const Dashboard: React.FC = () => {" + restrictedContent);
fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', dashboard, 'utf8');
