const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// 1. Add translateStatus before getStatusColor
const translateStatusFn = `
  const translateStatus = (status: OrderStatus) => {
    switch(status) {
      case OrderStatus.PENDING: return "Pendiente";
      case OrderStatus.PREPARING: return "Preparando";
      case OrderStatus.DELIVERED: return "Entregado";
      case OrderStatus.CANCELED: return "Cancelado";
      default: return status;
    }
  };
`;
code = code.replace("const getStatusColor = (status: OrderStatus) => {", translateStatusFn + "\n  const getStatusColor = (status: OrderStatus) => {");

// 2. Replace {order.status} in badge with {translateStatus(order.status)}
code = code.replace("<IonBadge color={getStatusColor(order.status)}>{order.status}</IonBadge>", "<IonBadge color={getStatusColor(order.status)}>{translateStatus(order.status)}</IonBadge>");

// 3. Replace the IonSelect with Action Buttons
const selectBlockRegex = /\{order\.status !== OrderStatus\.CANCELED && \([\s\S]*?<IonSelect[\s\S]*?<\/IonSelect>[\s\S]*?<\/IonItem>\s*\)\}/;

const actionButtons = `{order.status !== OrderStatus.CANCELED && order.status !== OrderStatus.DELIVERED && (
                      <div className="ion-margin-top" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {order.status === OrderStatus.PENDING && (
                          <IonButton style={{ flex: 1 }} color="tertiary" onClick={() => updateStatus(order.id, OrderStatus.PREPARING)}>
                            Cocina (Preparar)
                          </IonButton>
                        )}
                        {order.status === OrderStatus.PREPARING && (
                          <IonButton style={{ flex: 1 }} color="warning" onClick={() => updateStatus(order.id, OrderStatus.PENDING)}>
                            Mover a Pendiente
                          </IonButton>
                        )}
                        <IonButton style={{ flex: 1 }} color="success" onClick={() => updateStatus(order.id, OrderStatus.DELIVERED)}>
                          Entregar Pedido
                        </IonButton>
                        <div style={{ width: '100%', textAlign: 'center', marginTop: '5px' }}>
                          <IonButton fill="clear" color="danger" size="small" onClick={() => updateStatus(order.id, OrderStatus.CANCELED)}>
                            Cancelar Pedido
                          </IonButton>
                        </div>
                      </div>
                    )}`;

code = code.replace(selectBlockRegex, actionButtons);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', code, 'utf8');
