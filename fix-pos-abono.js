const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');

c = c.replace(/<IonButton expand="block" size="large" onClick=\{createOrder\}>\s*Confirmar Pedido\s*<\/IonButton>/, 
`{allowPartialPayments && (
  <IonItem className="ion-margin-bottom">
    <IonLabel position="stacked">Abono Inicial (Opcional, en $)</IonLabel>
    <IonInput type="number" placeholder="Monto abonado al momento" value={initialAbono} onIonInput={e => setInitialAbono(e.detail.value!)} />
  </IonItem>
)}
<IonButton expand="block" size="large" onClick={createOrder}>
  Confirmar Pedido
</IonButton>`);

fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', c);
