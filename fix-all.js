const fs = require('fs');

// Fix Calculator
let calc = fs.readFileSync('apps/frontend/src/pages/Calculator.tsx', 'utf8');
const copyFunc = `
  const handleCopyTicket = () => {
    if (cart.length === 0) {
      return presentToast({ message: 'El carrito está vacío', duration: 2000, color: 'warning' });
    }
    let text = '*NutriDeli - Resumen de Pedido*\\n--------------------------\\n';
    cart.forEach(item => { text += \`- \${item.quantity}x \${item.product.name} ($\${item.product.salePrice.toFixed(2)})\\n\`; });
    text += '--------------------------\\n';
    text += \`Subtotal: $\${cartSubtotal.toFixed(2)}\\n\`;
    const deliveryFee = selectedZoneId ? (deliveryZones.find(z => z.id === selectedZoneId)?.feePrice || 0) : 0;
    if (deliveryFee > 0) text += \`Delivery: $\${deliveryFee.toFixed(2)}\\n\`;
    const totalUSD = cartSubtotal + deliveryFee;
    const totalBs = totalUSD * exchangeRate;
    text += \`*TOTAL: $\${totalUSD.toFixed(2)}* (aprox Bs. \${totalBs.toFixed(2)})\\n\\n\`;
    if (settings && (settings.companyBank || settings.companyPhone || settings.companyCedula)) {
      text += '*Nuestros Datos de Pago (Pago Móvil):*\\n';
      if (settings.companyBank) text += \`Banco: \${settings.companyBank}\\n\`;
      if (settings.companyCedula) text += \`Cédula: \${settings.companyCedula}\\n\`;
      if (settings.companyPhone) text += \`Teléfono: \${settings.companyPhone}\\n\`;
    }
    navigator.clipboard.writeText(text).then(() => {
      presentToast({ message: 'Ticket copiado al portapapeles', duration: 2000, color: 'success' });
    });
  };
`;
calc = calc.replace("const cartSubtotal =", copyFunc + "\n  const cartSubtotal =");
fs.writeFileSync('apps/frontend/src/pages/Calculator.tsx', calc, 'utf8');

// Fix Orders
let orders = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
orders = orders.replace("const paginatedOrders = filteredOrders.slice(0, displayCount);", "");
orders = orders.replace("const loadMore = (e: any)", "const paginatedOrders = filteredOrders.slice(0, displayCount);\n  const loadMore = (e: any)");
if (!orders.includes("paginatedOrders =")) {
  orders = orders.replace("return matchesStatus && matchesSearch;\n  });", "return matchesStatus && matchesSearch;\n  });\n\n  const paginatedOrders = filteredOrders.slice(0, displayCount);\n\n  const loadMore = (e: any) => {\n    setTimeout(() => {\n      setDisplayCount(prev => prev + 10);\n      e.target.complete();\n    }, 500);\n  };\n");
}
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', orders, 'utf8');

// Fix Production
let prod = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');
if (!prod.includes("IonInfiniteScroll")) {
  prod = prod.replace("IonItem, IonText } from '@ionic/react';", "IonItem, IonText, IonInfiniteScroll, IonInfiniteScrollContent } from '@ionic/react';");
}
fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prod, 'utf8');

// Fix MovementHistoryModal
let mov = fs.readFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', 'utf8');
if (mov.includes("loadMore")) {
  mov = mov.replace(/<IonInfiniteScroll[^>]*>[\s\S]*?<\/IonInfiniteScroll>/, '<IonInfiniteScroll onIonInfinite={loadMore} disabled={displayCount >= movements.length}>\n          <IonInfiniteScrollContent loadingText="Cargando más..."></IonInfiniteScrollContent>\n        </IonInfiniteScroll>');
}
fs.writeFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', mov, 'utf8');
