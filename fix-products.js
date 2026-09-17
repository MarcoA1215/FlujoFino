const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');
p = p.replace(/<IonRow className="ion-margin-bottom">[\s\S]*?\+ Crear Producto Base<\/IonButton><\/IonCol>[\s\S]*?\+ Crear Combo<\/IonButton><\/IonCol>\s*<\/IonRow>/,
`{!isClientMode && (
  <IonRow className="ion-margin-bottom">
    <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="primary" onClick={() => openCreateAlert(false)}>+ Crear Producto Base</IonButton></IonCol>
    <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="tertiary" onClick={() => openCreateAlert(true)}>+ Crear Combo</IonButton></IonCol>
  </IonRow>
)}`);
fs.writeFileSync('apps/frontend/src/pages/Products.tsx', p);
