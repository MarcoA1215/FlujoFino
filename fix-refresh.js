const fs = require('fs');
let o = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// Combine fetchSettings into the refresh button
o = o.replace(/<IonButton onClick=\{fetchOrders\}>/, `<IonButton onClick={() => { fetchOrders(); fetchSettings(); }}>`);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', o);
console.log('Fixed refresh button');
