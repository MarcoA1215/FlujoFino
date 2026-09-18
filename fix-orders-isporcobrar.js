const fs = require('fs');
let f = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

f = f.replace(/const isPorCobrar = o\.paymentStatus === PaymentStatus\.PENDING && o\.status !== OrderStatus\.CANCELED;/,
`const isPorCobrar = [PaymentStatus.PENDING, PaymentStatus.PARTIAL].includes(o.paymentStatus) && o.status !== OrderStatus.CANCELED;`);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', f);
console.log('Fixed isPorCobrar in Orders.tsx');
