const fs = require('fs');

// Pos.tsx
let p = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
p = p.replace(/\{\(allowPartialPayments \|\| false\) && \(/, 
`{allowPartialPayments && (
  <IonItem className="ion-margin-bottom">
    <IonLabel position="stacked">Abono Inicial (Opcional, en $)</IonLabel>
    <IonInput type="number" placeholder="Monto abonado al momento" value={initialAbono} onIonInput={e => setInitialAbono(e.detail.value!)} />
  </IonItem>
)}
{(allowPartialPayments || false) && (`);
fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', p);

// Dashboard.tsx
let d = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');
d = d.replace(/import \{ walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, basketOutline, cartOutline \} from 'ionicons\/icons';/g, "import { walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, cartOutline } from 'ionicons/icons';");
fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', d);

console.log("Fixed!");
