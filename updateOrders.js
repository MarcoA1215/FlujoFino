const fs = require('fs');
let content = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// Update imports if needed
if (!content.includes('DeliveryMethod')) {
  content = content.replace(
    "import { OrderStatus, PaymentStatus } from '@nutrideli/shared-types';",
    "import { OrderStatus, PaymentStatus, DeliveryMethod } from '@nutrideli/shared-types';\nimport type { DeliveryZone } from '../types';"
  );
}

// Inject delivery info below the date
const target = `<p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: 'gray' }}>\n                      Hora: {new Date(order.createdAt).toLocaleTimeString()}\n                    </p>`;

const deliveryUI = `
                    {order.deliveryMethod && (
                      <div style={{ marginTop: '10px' }}>
                        <IonBadge color={order.deliveryMethod === DeliveryMethod.DELIVERY ? 'tertiary' : 'medium'}>
                          {order.deliveryMethod === DeliveryMethod.DELIVERY ? 'Delivery' : (order.deliveryMethod === DeliveryMethod.PICKUP ? 'Pickup' : 'Local')}
                        </IonBadge>
                        {order.deliveryMethod === DeliveryMethod.DELIVERY && order.deliveryZone && (
                          <IonBadge color="primary" style={{ marginLeft: '5px' }}>{order.deliveryZone.name}</IonBadge>
                        )}
                      </div>
                    )}
                    {(order.deliveryMethod === DeliveryMethod.DELIVERY || order.deliveryMethod === DeliveryMethod.PICKUP) && order.customerAddress && (
                      <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem' }}><strong>Dir/Ref:</strong> {order.customerAddress}</p>
                    )}
`;

content = content.replace(target, target + "\n" + deliveryUI);

// Inject delivery fee info
const totalTarget = `<h3 style={{ margin: 0, fontWeight: 'bold' }}>Total: \${order.totalAmount.toFixed(2)}</h3>`;
const feeUI = `
                      <div>
                        {order.deliveryFee > 0 && <div style={{ fontSize: '0.8rem', color: 'gray' }}>+ $ {order.deliveryFee.toFixed(2)} Delivery</div>}
                        <h3 style={{ margin: 0, fontWeight: 'bold' }}>Total: \${order.totalAmount.toFixed(2)}</h3>
                      </div>
`;
content = content.replace(totalTarget, feeUI);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', content, 'utf8');
