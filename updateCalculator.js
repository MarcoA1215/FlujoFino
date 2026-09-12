const fs = require('fs');
let calc = fs.readFileSync('apps/frontend/src/pages/Calculator.tsx', 'utf8');

// Imports
if (!calc.includes('DeliveryZone')) {
    calc = calc.replace(
        "import { addOutline, removeOutline, trashOutline, calculatorOutline } from 'ionicons/icons';",
        "import { addOutline, removeOutline, trashOutline, calculatorOutline } from 'ionicons/icons';\nimport type { DeliveryZone } from '../types';"
    );
}
if (!calc.includes('IonSelect')) {
    calc = calc.replace(
        "import { IonPage, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonInput, useIonToast } from '@ionic/react';",
        "import { IonPage, IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonIcon, IonInput, useIonToast, IonSelect, IonSelectOption } from '@ionic/react';"
    );
}

// States
if (!calc.includes('deliveryZones')) {
    calc = calc.replace(
        "  const [exchangeRate, setExchangeRate] = useState<number>(36.5);",
        "  const [exchangeRate, setExchangeRate] = useState<number>(36.5);\n  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);\n  const [selectedZoneId, setSelectedZoneId] = useState<string>('');"
    );
}

// Fetch logic
if (!calc.includes('/delivery-zones')) {
    calc = calc.replace(
        "        const [productsRes, rateRes] = await Promise.all([\n          apiClient.get<Product[]>('/products'),\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate')\n        ]);\n        setProducts(productsRes.data);\n        setExchangeRate(rateRes.data.exchangeRateBs);",
        "        const [productsRes, rateRes, zonesRes] = await Promise.all([\n          apiClient.get<Product[]>('/products'),\n          apiClient.get<{ exchangeRateBs: number }>('/settings/exchange-rate'),\n          apiClient.get<DeliveryZone[]>('/delivery-zones')\n        ]);\n        setProducts(productsRes.data);\n        setExchangeRate(rateRes.data.exchangeRateBs);\n        setDeliveryZones(zonesRes.data);"
    );
}

// Calculations
calc = calc.replace(
    "  const totalUSD = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);",
    "  const cartSubtotal = cart.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);\n  const deliveryFee = selectedZoneId ? (deliveryZones.find(z => z.id === selectedZoneId)?.feePrice || 0) : 0;\n  const totalUSD = cartSubtotal + deliveryFee;"
);

// clearCart
calc = calc.replace(
    "  const clearCart = () => setCart([]);",
    "  const clearCart = () => {\n    setCart([]);\n    setSelectedZoneId('');\n  };"
);

// Render ticket updates
const subtotalUI = `
                      <IonGrid className="ion-no-padding">
                        <IonRow>
                          <IonCol size="6"><h4 style={{ margin: 0, color: '#666' }}>Subtotal:</h4></IonCol>
                          <IonCol size="6" className="ion-text-right">
                            <h4 style={{ margin: 0, color: '#666' }}>$ {cartSubtotal.toFixed(2)}</h4>
                          </IonCol>
                        </IonRow>
                        {deliveryFee > 0 && (
                          <IonRow className="ion-margin-top">
                            <IonCol size="6"><h4 style={{ margin: 0, color: '#666' }}>Delivery:</h4></IonCol>
                            <IonCol size="6" className="ion-text-right">
                              <h4 style={{ margin: 0, color: '#666' }}>+ $ {deliveryFee.toFixed(2)}</h4>
                            </IonCol>
                          </IonRow>
                        )}
                        <IonRow className="ion-margin-top">
                          <IonCol size="6"><h3 style={{ margin: 0, fontWeight: 'bold' }}>TOTAL USD:</h3></IonCol>
                          <IonCol size="6" className="ion-text-right">
                            <h3 style={{ margin: 0, fontWeight: 'bold', color: '#2dd36f' }}>$ {totalUSD.toFixed(2)}</h3>
                          </IonCol>
                        </IonRow>
`;

calc = calc.replace(
    /                      <IonGrid className="ion-no-padding">\s*<IonRow>\s*<IonCol size="6"><h3 style=\{\{ margin: 0, fontWeight: 'bold' \}\}>TOTAL USD:<\/h3><\/IonCol>\s*<IonCol size="6" className="ion-text-right">\s*<h3 style=\{\{ margin: 0, fontWeight: 'bold', color: '#2dd36f' \}\}>\$ \{totalUSD\.toFixed\(2\)\}<\/h3>\s*<\/IonCol>\s*<\/IonRow>/s,
    subtotalUI
);

// Add dropdown for zones before the clear button
const zoneDropdown = `
                  <div className="ion-margin-top" style={{ padding: '0 20px' }}>
                    <IonItem lines="none" style={{ '--background': '#f9f9f9', borderRadius: '8px' }}>
                      <IonLabel position="stacked">Incluir Delivery (Opcional)</IonLabel>
                      <IonSelect 
                        value={selectedZoneId} 
                        onIonChange={e => setSelectedZoneId(e.detail.value)}
                        placeholder="Retiro en local (Sin costo)"
                      >
                        <IonSelectOption value="">Retiro en Local (Gratis)</IonSelectOption>
                        {deliveryZones.map(z => (
                          <IonSelectOption key={z.id} value={z.id}>{z.name} (+ $ {z.feePrice.toFixed(2)})</IonSelectOption>
                        ))}
                      </IonSelect>
                    </IonItem>
                  </div>
`;

calc = calc.replace(
    /                  <div className="ion-margin-top ion-text-center">\s*<IonButton color="medium" fill="outline" onClick=\{clearCart\} disabled=\{cart\.length === 0\}>/,
    zoneDropdown + "\n                  <div className=\"ion-margin-top ion-text-center\">\n                    <IonButton color=\"medium\" fill=\"outline\" onClick={clearCart} disabled={cart.length === 0}>"
);

fs.writeFileSync('apps/frontend/src/pages/Calculator.tsx', calc, 'utf8');
