const fs = require('fs');
let f = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// Find openUSDPaymentAlert
const start = f.indexOf('const openUSDPaymentAlert = (order: Order) => {');
const end = f.indexOf('};', start) + 2;

const body = `const openUSDPaymentAlert = (order: Order) => {
    if (order.status === OrderStatus.CANCELED) return;
    const remaining = order.totalAmount - (order.abonosTotal || 0);
    presentAlert({
      header: "Confirmar Pago Divisas",
      subHeader: \`Restante por cobrar: $\${remaining.toFixed(2)}\`,
      inputs: [
        { name: "usdReceived", type: "number", placeholder: "Monto entregado por el cliente ($)", min: remaining }
      ],
      buttons: [
        { text: "Cancelar", role: "cancel" },
        {
          text: "Calcular y Confirmar",
          handler: async (data: any) => {
            const received = parseFloat(data.usdReceived);
            if (!received || received < remaining) {
              presentToast({ message: "El monto recibido debe ser mayor o igual al total", duration: 3000, color: "warning" });
              return false;
            }
            const changeUsd = received - remaining;
            const changeBs = changeUsd * exchangeRate;
            try {
              await apiClient.patch(\`/orders/\${order.id}/payment\`, {
                status: PaymentStatus.PAID,
                notes: (order.notes ? order.notes + '\\n' : '') + \`Pago USD (Restante): $\${remaining.toFixed(2)} | Recibido: $\${received.toFixed(2)} | Vuelto: Bs. \${changeBs.toFixed(2)}\`
              });
              fetchOrders();
              presentToast({ message: "Pago en USD registrado", duration: 2000, color: "success" });
            } catch (e: any) {
              presentToast({ message: "Error al registrar el pago", duration: 3000, color: "danger" });
            }
          }
        }
      ]
    });
  };`;

f = f.substring(0, start) + body + f.substring(end);
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', f);
console.log('Fixed USD payment alert');
