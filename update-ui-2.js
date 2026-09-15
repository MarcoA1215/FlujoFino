const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// Remove the Cocina (Preparar) button
code = code.replace(
  `{order.status === OrderStatus.PENDING && (
                          <IonButton style={{ flex: 1 }} color="tertiary" onClick={() => updateStatus(order.id, OrderStatus.PREPARING)}>
                            Cocina (Preparar)
                          </IonButton>
                        )}`,
  ""
);

// We can also remove the 'Mover a Pendiente' button since they want it automated, OR leave it just in case.
// Actually, let's keep 'Mover a Pendiente' just in case manual override is needed, but we can hide it if they want.
// The user said: "ademas deberia ser capaz de ver que si hay suficiente stock disponible pasar automaticamente a pendiente solo"
// They want automation. I'll leave the manual Mover a Pendiente just in case the automation gets stuck or they want to force it.
// Actually, I'll remove it too to clean the UI, if it's automated they don't need it. But what if they DO need it? Let's leave it for now but maybe make it smaller.
// Wait, they explicitly complained about "el boton de cocna preparar me parece inecesario".

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', code, 'utf8');
