const fs = require('fs');
let f = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// openPaymentAlert
f = f.replace(/const openPaymentAlert = \(order: Order\) => \{\s*if \(order\.status === OrderStatus\.CANCELED\) return;\s*const totalBs = \(order\.totalAmount \* exchangeRate\)\.toFixed\(2\);/,
`const openPaymentAlert = (order: Order) => {
    if (order.status === OrderStatus.CANCELED) return;
    const remaining = order.totalAmount - (order.abonosTotal || 0);
    const totalBs = (remaining * exchangeRate).toFixed(2);`);

f = f.replace(/amountBs: order.totalAmount \* exchangeRate/, `amountBs: remaining * exchangeRate`);


// openUSDPaymentAlert
f = f.replace(/const openUSDPaymentAlert = \(order: Order\) => \{\s*if \(order\.status === OrderStatus\.CANCELED\) return;\s*presentAlert\(\{[\s\n]*header: "Confirmar Pago Divisas",[\s\n]*subHeader: \`Total del pedido: \\\$\$\{order\.totalAmount\.toFixed\(2\)\}\`,[\s\n]*inputs: \[[\s\n]*\{ name: "usdReceived", type: "number", placeholder: "Monto entregado por el cliente \(\\\$\)", min: order\.totalAmount \}/,
`const openUSDPaymentAlert = (order: Order) => {
    if (order.status === OrderStatus.CANCELED) return;
    const remaining = order.totalAmount - (order.abonosTotal || 0);
    presentAlert({
      header: "Confirmar Pago Divisas",
      subHeader: \`Restante por cobrar: $\${remaining.toFixed(2)}\`,
      inputs: [
        { name: "usdReceived", type: "number", placeholder: "Monto entregado por el cliente ($)", min: remaining }`);

f = f.replace(/if \(!received \|\| received < order\.totalAmount\) \{/, `if (!received || received < remaining) {`);
f = f.replace(/const changeUsd = received - order\.totalAmount;/, `const changeUsd = received - remaining;`);
f = f.replace(/notes: \`M%TODO: Divisas \(USD\) \| Recibido: \\\$\$\{received\.toFixed\(2\)\} \| Vuelto: Bs\. \$\{changeBs\.toFixed\(2\)\}\`/,
`notes: (order.notes ? order.notes + '\\n' : '') + \`Pago USD (Restante): $\${remaining.toFixed(2)} | Recibido: $\${received.toFixed(2)} | Vuelto: Bs. \${changeBs.toFixed(2)}\``);

// Also render the badge "Abonado Parcial" on the card
f = f.replace(/\{order\.paymentStatus === PaymentStatus\.PAID \? \(/,
`{order.paymentStatus === PaymentStatus.PARTIAL ? (
                          <IonBadge color="warning">Abono Parcial</IonBadge>
                        ) : order.paymentStatus === PaymentStatus.PAID ? (`);


fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', f);
console.log('Fixed payments logic');
