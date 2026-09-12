const fs = require('fs');

// Fix Pos.tsx
let pos = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
pos = pos.replace(
  "import { DeliveryMethod } from '../types';",
  "import { DeliveryMethod } from '@nutrideli/shared-types';"
);
fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', pos, 'utf8');

// Fix Orders.tsx
let orders = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
orders = orders.replace(
  "type Order = {\n  id: string;\n  customerName: string;\n  totalAmount: number;\n  status: OrderStatus;\n  paymentStatus: PaymentStatus;\n  notes?: string;\n  items: OrderItem[];\n  createdAt: string;\n};",
  "type Order = {\n  id: string;\n  customerName: string;\n  customerPhone?: string;\n  customerAddress?: string;\n  totalAmount: number;\n  status: OrderStatus;\n  paymentStatus: PaymentStatus;\n  notes?: string;\n  items: OrderItem[];\n  createdAt: string;\n  deliveryMethod?: DeliveryMethod;\n  deliveryZone?: DeliveryZone;\n  deliveryFee?: number;\n};"
);
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', orders, 'utf8');
