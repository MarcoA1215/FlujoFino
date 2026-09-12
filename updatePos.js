const fs = require('fs');
let content = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');

content = content.replace("import { useEffect, useState } from 'react';", "import { useEffect, useState } from 'react';\nimport type { DeliveryZone } from '../types';\nimport { DeliveryMethod } from '../types';");

content = content.replace("  const [usdReceived, setUsdReceived] = useState<number | ''>('');", "  const [usdReceived, setUsdReceived] = useState<number | ''>('');\n  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>(DeliveryMethod.IN_STORE);\n  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);\n  const [deliveryZoneId, setDeliveryZoneId] = useState<string>('');\n  const [customerAddress, setCustomerAddress] = useState<string>('');");

content = content.replace(
  "        const [productsRes, settingsRes] = await Promise.all([\n          apiClient.get<Product[]>('/products'),\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate')\n        ]);",
  "        const [productsRes, settingsRes, zonesRes] = await Promise.all([\n          apiClient.get<Product[]>('/products'),\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate'),\n          apiClient.get<DeliveryZone[]>('/delivery-zones')\n        ]);\n        setDeliveryZones(zonesRes.data);"
);

content = content.replace(
  "      const payload = {\n        customerName: customerName.trim() || 'Cliente Mostrador',\n        customerPhone,\n        paymentStatus: paymentMethod === 'PENDING' ? 'PENDING' : 'PAID',\n        pagoMovilRef: paymentMethod === 'PAGO_MOVIL' ? pagoMovilRef : undefined,",
  "      const payload = {\n        customerName: customerName.trim() || 'Cliente Mostrador',\n        customerPhone,\n        customerAddress: deliveryMethod !== DeliveryMethod.IN_STORE ? customerAddress : undefined,\n        deliveryMethod,\n        deliveryZoneId: deliveryMethod === DeliveryMethod.DELIVERY ? deliveryZoneId : undefined,\n        paymentStatus: paymentMethod === 'PENDING' ? 'PENDING' : 'PAID',\n        pagoMovilRef: paymentMethod === 'PAGO_MOVIL' ? pagoMovilRef : undefined,"
);

content = content.replace(
  "      setPagoMovilBank('');\n      setUsdReceived('');",
  "      setPagoMovilBank('');\n      setUsdReceived('');\n      setDeliveryMethod(DeliveryMethod.IN_STORE);\n      setDeliveryZoneId('');\n      setCustomerAddress('');"
);

content = content.replace(
  "  const totalCart = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);",
  "  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);\n  const deliveryFee = (deliveryMethod === DeliveryMethod.DELIVERY && deliveryZoneId) \n    ? (deliveryZones.find(z => z.id === deliveryZoneId)?.feePrice || 0) \n    : 0;\n  const totalCart = cartSubtotal + deliveryFee;"
);

const methodUI = `
                  <IonItem className="ion-margin-bottom">
                    <IonLabel position="stacked">Método de Entrega</IonLabel>
                    <IonSelect value={deliveryMethod} onIonChange={e => setDeliveryMethod(e.detail.value)}>
                      <IonSelectOption value={DeliveryMethod.IN_STORE}>Consumo en Local / Retiro Inmediato</IonSelectOption>
                      <IonSelectOption value={DeliveryMethod.PICKUP}>Pickup (Para LLevar / Encargo)</IonSelectOption>
                      <IonSelectOption value={DeliveryMethod.DELIVERY}>Delivery (Envío)</IonSelectOption>
                    </IonSelect>
                  </IonItem>

                  {deliveryMethod !== DeliveryMethod.IN_STORE && (
                    <IonItem className="ion-margin-bottom">
                      <IonLabel position="stacked">Dirección / Referencia Exacta</IonLabel>
                      <IonInput 
                        value={customerAddress} 
                        onIonChange={e => setCustomerAddress(e.detail.value!)} 
                        placeholder="Ej. Calle 1, Casa 2..." 
                      />
                    </IonItem>
                  )}

                  {deliveryMethod === DeliveryMethod.DELIVERY && (
                    <IonItem className="ion-margin-bottom">
                      <IonLabel position="stacked">Zona de Envío</IonLabel>
                      <IonSelect value={deliveryZoneId} onIonChange={e => setDeliveryZoneId(e.detail.value)}>
                        {deliveryZones.map(z => (
                          <IonSelectOption key={z.id} value={z.id}>{z.name} (+ $ {z.feePrice.toFixed(2)})</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  )}
`;

// replace "Método de Pago" block
content = content.replace(
  `<IonItem className="ion-margin-bottom">\n                    <IonLabel position="stacked">Mtodo de Pago</IonLabel>`,
  methodUI + `\n                  <IonItem className="ion-margin-bottom">\n                    <IonLabel position="stacked">Mtodo de Pago</IonLabel>`
);
// The previous text has 'Mtodo de Pago' (ISO-8859 or bad decoding of Método).
// Let's use a regex instead for safety
content = content.replace(/<IonItem className="ion-margin-bottom">\s*<IonLabel position="stacked">M.todo de Pago<\/IonLabel>/s, methodUI + "\n                  <IonItem className=\"ion-margin-bottom\">\n                    <IonLabel position=\"stacked\">Método de Pago</IonLabel>");

content = content.replace(
  `                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>\n                        <h2>Total:</h2>\n                        <h2 style={{ fontWeight: 'bold' }}>\${totalCart.toFixed(2)}</h2>\n                      </div>`,
  `                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4>Subtotal:</h4>
                        <h4>\${cartSubtotal.toFixed(2)}</h4>
                      </div>
                      {deliveryMethod === DeliveryMethod.DELIVERY && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'gray' }}>
                          <h4>Delivery:</h4>
                          <h4>+ \${deliveryFee.toFixed(2)}</h4>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                        <h2>Total a Pagar:</h2>
                        <h2 style={{ fontWeight: 'bold', color: '#2dd36f' }}>\${totalCart.toFixed(2)}</h2>
                      </div>`
);

fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', content, 'utf8');
