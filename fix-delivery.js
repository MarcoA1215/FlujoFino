const fs = require('fs');
let orders = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

const regex = /if \(status === OrderStatus\.DELIVERED\) \{[\s\S]*?if \(status === OrderStatus\.CANCELED\)/;
const replacement = `if (status === OrderStatus.CANCELED)`;

if (orders.includes("if (status === OrderStatus.DELIVERED)")) {
  orders = orders.replace(regex, replacement);
  fs.writeFileSync('apps/backend/src/orders/orders.service.ts', orders, 'utf8');
}
