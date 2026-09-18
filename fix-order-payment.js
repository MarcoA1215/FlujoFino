const fs = require('fs');

let o = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

// First, remove the bad check
o = o.replace(/if \(order\.abonosTotal >= totalAmount\) \{\s*order\.paymentStatus = PaymentStatus\.PAID;\s*\}/, "");

// Then, add it at the end where savedOrder.totalAmount is set
o = o.replace(/savedOrder\.totalAmount = totalAmount \+ deliveryFee;/,
`savedOrder.totalAmount = totalAmount + deliveryFee;
      if (savedOrder.abonosTotal > 0 && savedOrder.abonosTotal >= savedOrder.totalAmount) {
        savedOrder.paymentStatus = PaymentStatus.PAID;
      }`);

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', o);
console.log('Fixed abonos bug');
