const fs = require('fs');

// 1. Fix Dashboard
let d = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');
d = d.replace(/import \{ alertCircleOutline, trendingDownOutline, basketOutline, trendingUpOutline, pieChartOutline, walletOutline \} from 'ionicons\/icons';/, 
"import { alertCircleOutline, trendingDownOutline, basketOutline, trendingUpOutline, pieChartOutline, walletOutline, cartOutline } from 'ionicons/icons';");
fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', d);

// 2. Fix Products
let p = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');
p = p.replace(/<IonRow className="ion-margin-bottom">\r?\n\s*<IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="primary" onClick=\{.*?\}\+ Crear Producto Base<\/IonButton><\/IonCol>\r?\n\s*<IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="tertiary" onClick=\{.*?\}>\+ Crear Combo<\/IonButton><\/IonCol>\r?\n\s*<\/IonRow>/,
`{!isClientMode && (
  <IonRow className="ion-margin-bottom">
    <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="primary" onClick={() => openCreateAlert(false)}>+ Crear Producto Base</IonButton></IonCol>
    <IonCol size="12" sizeSm="6" sizeMd="4"><IonButton expand="block" color="tertiary" onClick={() => openCreateAlert(true)}>+ Crear Combo</IonButton></IonCol>
  </IonRow>
)}`);
fs.writeFileSync('apps/frontend/src/pages/Products.tsx', p);

// 3. Fix ProductCard
let pc = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');
if (!pc.includes('Disponible:')) {
  pc = pc.replace(/<p style=\{\{ margin: '5px 0 0 0', fontWeight: 'bold' \}\}>Precio: \$\{p\.salePrice\.toFixed\(2\)\}<\/p>/,
  `<p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>Precio: $\{p.salePrice.toFixed(2)}</p>
  {isClientMode && (
    <p style={{ margin: '5px 0 0 0', color: p.stockQuantity > 0 ? 'green' : 'red', fontWeight: '500', fontSize: '0.9rem' }}>
      Disponible: {p.stockQuantity}
    </p>
  )}`);
  fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', pc);
}

console.log("Fixed!");
