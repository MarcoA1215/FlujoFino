const fs = require('fs');
let o = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

// In addAbono
o = o.replace(/if \(order\.abonosTotal >= order\.totalAmount && order\.paymentStatus === PaymentStatus\.PENDING\) \{/,
`if (order.abonosTotal >= order.totalAmount) {
      order.paymentStatus = PaymentStatus.PAID;
    } else if (order.abonosTotal > 0 && order.abonosTotal < order.totalAmount) {
      order.paymentStatus = PaymentStatus.PARTIAL;
    }
    // Dummy condition to replace the old one
    if (false) {`);

// In revertAbono
o = o.replace(/if \(order\.abonosTotal < order\.totalAmount && order\.paymentStatus === PaymentStatus\.PAID\) \{/,
`if (order.abonosTotal === 0) {
        order.paymentStatus = PaymentStatus.PENDING;
      } else if (order.abonosTotal > 0 && order.abonosTotal < order.totalAmount) {
        order.paymentStatus = PaymentStatus.PARTIAL;
      }
      // Dummy condition
      if (false) {`);

// In createOrder (end of transaction)
o = o.replace(/if \(savedOrder\.abonosTotal > 0 && savedOrder\.abonosTotal >= savedOrder\.totalAmount\) \{[\s\n]*savedOrder\.paymentStatus = PaymentStatus\.PAID;[\s\n]*\}/,
`if (savedOrder.abonosTotal >= savedOrder.totalAmount && savedOrder.totalAmount > 0) {
          savedOrder.paymentStatus = PaymentStatus.PAID;
        } else if (savedOrder.abonosTotal > 0 && savedOrder.abonosTotal < savedOrder.totalAmount) {
          savedOrder.paymentStatus = PaymentStatus.PARTIAL;
        }`);

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', o);
console.log('Fixed backend logic');
