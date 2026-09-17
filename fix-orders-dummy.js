const fs = require('fs');

let o = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

o = o.replace(/\/\/ Dummy condition to replace the old one\s*if \(false\) \{\s*order\.paymentStatus = PaymentStatus\.PAID;\s*\}/, "");
o = o.replace(/\/\/ Dummy condition\s*if \(false\) \{\s*order\.paymentStatus = PaymentStatus\.PENDING;\s*\}/, "");

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', o);
console.log('Cleaned up dummy conditions');
