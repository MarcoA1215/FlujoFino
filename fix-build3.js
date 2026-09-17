const fs = require('fs');

let c = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');
c = c.replace(/import \{ walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, basketOutline \} from 'ionicons\/icons';/, 
"import { walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, cartOutline } from 'ionicons/icons';");
fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', c);

c = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
if (!c.includes('IonCardSubtitle')) {
  c = c.replace(/IonCardTitle, IonCardContent/, "IonCardTitle, IonCardSubtitle, IonCardContent");
  fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', c);
}

c = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
c = c.replace(/\{allowPartialPayments && \(/, "{(allowPartialPayments || false) && ("); // Just to make sure it's read
fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', c);

console.log('Fixed build errors 3');
