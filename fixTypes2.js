const fs = require('fs');

// Fix Orders.tsx
let orders = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
orders = orders.replace(
  /order\.deliveryFee/g,
  '(order.deliveryFee || 0)'
);
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', orders, 'utf8');

// Fix Pos.tsx
let pos = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
// Let's see why setDeliveryZones is unused. Did I actually use it?
if (!pos.includes('setDeliveryZones(')) {
    // If replace failed, apply it
    pos = pos.replace(
      "        const [productsRes, settingsRes] = await Promise.all([\n          apiClient.get<Product[]>('/products'),\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate')\n        ]);",
      "        const [productsRes, settingsRes, zonesRes] = await Promise.all([\n          apiClient.get<Product[]>('/products'),\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate'),\n          apiClient.get<DeliveryZone[]>('/delivery-zones')\n        ]);\n        setDeliveryZones(zonesRes.data);"
    );
    fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', pos, 'utf8');
}
