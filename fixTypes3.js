const fs = require('fs');
let pos = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');

pos = pos.replace(
  "        const [productsRes, settingsRes] = await Promise.all([\r\n          apiClient.get<Product[]>('/products'),\r\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate')\r\n        ]);",
  "        const [productsRes, settingsRes, zonesRes] = await Promise.all([\r\n          apiClient.get<Product[]>('/products'),\r\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate'),\r\n          apiClient.get<DeliveryZone[]>('/delivery-zones')\r\n        ]);\r\n        setDeliveryZones(zonesRes.data);"
);

pos = pos.replace(
  "        const [productsRes, settingsRes] = await Promise.all([\n          apiClient.get<Product[]>('/products'),\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate')\n        ]);",
  "        const [productsRes, settingsRes, zonesRes] = await Promise.all([\n          apiClient.get<Product[]>('/products'),\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate'),\n          apiClient.get<DeliveryZone[]>('/delivery-zones')\n        ]);\n        setDeliveryZones(zonesRes.data);"
);

fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', pos, 'utf8');
