const fs = require('fs');

function fixOrders() {
  const file = 'apps/frontend/src/pages/Orders.tsx';
  let text = fs.readFileSync(file, 'utf8');
  let lines = text.split('\n');
  lines[1] = "import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonButton, IonList, IonLabel, IonBadge, useIonToast, useIonAlert, IonText, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonSearchbar, IonIcon, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/react';";
  
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}
fixOrders();
