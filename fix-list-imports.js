const fs = require('fs');

let p = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');

p = p.replace(/import \{ IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonButton, IonIcon, IonSearchbar, useIonToast, useIonAlert, IonToggle \} from '@ionic\/react';/,
"import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonButton, IonIcon, IonSearchbar, useIonToast, useIonAlert, IonToggle, IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';");

p = p.replace(/openRegisterLossAlert/g, "openLossAlert");

fs.writeFileSync('apps/frontend/src/pages/Products.tsx', p);
console.log('Fixed imports and typos');
