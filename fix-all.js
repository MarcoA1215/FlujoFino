const fs = require('fs');

// Pos.tsx
let p = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
p = p.replace(/<IonButton expand="block" size="large" onClick=\{createOrder\}>\s*Confirmar Pedido\s*<\/IonButton>/g, 
`{allowPartialPayments && (
  <IonItem className="ion-margin-bottom">
    <IonLabel position="stacked">Abono Inicial (Opcional, en $)</IonLabel>
    <IonInput type="number" placeholder="Monto abonado al momento" value={initialAbono} onIonInput={e => setInitialAbono(e.detail.value!)} />
  </IonItem>
)}
<IonButton expand="block" size="large" onClick={createOrder}>
  Confirmar Pedido
</IonButton>`);
fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', p);

// Orders.tsx
let o = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
o = o.replace(/IonCardTitle, IonCardContent/g, "IonCardTitle, IonCardSubtitle, IonCardContent");
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', o);

// Dashboard.tsx
let d = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');
d = d.replace(/import \{ walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, basketOutline \} from 'ionicons\/icons';/g, "import { walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, cartOutline } from 'ionicons/icons';");
fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', d);

console.log("Fixed!");
