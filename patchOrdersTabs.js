const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// Add "por_cobrar" to tab state
code = code.replace(
  "const [tab, setTab] = useState<'activos' | 'historial'>('activos');",
  "const [tab, setTab] = useState<'activos' | 'por_cobrar' | 'historial'>('activos');"
);

// Add the IonSegmentButton for "Por Cobrar"
const segmentsOld = `<IonSegmentButton value="activos">\r\n              <IonLabel>Activos</IonLabel>\r\n            </IonSegmentButton>\r\n            <IonSegmentButton value="historial">\r\n              <IonLabel>Historial</IonLabel>\r\n            </IonSegmentButton>`;
const segmentsOldUnix = `<IonSegmentButton value="activos">\n              <IonLabel>Activos</IonLabel>\n            </IonSegmentButton>\n            <IonSegmentButton value="historial">\n              <IonLabel>Historial</IonLabel>\n            </IonSegmentButton>`;
const segmentsNew = `<IonSegmentButton value="activos">\n              <IonLabel>Activos</IonLabel>\n            </IonSegmentButton>\n            <IonSegmentButton value="por_cobrar">\n              <IonLabel>Por Cobrar</IonLabel>\n            </IonSegmentButton>\n            <IonSegmentButton value="historial">\n              <IonLabel>Historial</IonLabel>\n            </IonSegmentButton>`;

if (code.includes('IonSegmentButton value="activos"')) {
  code = code.replace(segmentsOld, segmentsNew);
  code = code.replace(segmentsOldUnix, segmentsNew);
}

// Update filter logic
const filterOld = `    const isActivo = o.status === OrderStatus.PENDING || o.status === OrderStatus.PREPARING;
    if (tab === 'activos' && !isActivo) return false;
    if (tab === 'historial' && isActivo) return false;`;

const filterNew = `    const isActivo = o.status === OrderStatus.PENDING || o.status === OrderStatus.PREPARING;
    const isHistorial = o.status === OrderStatus.DELIVERED || o.status === OrderStatus.CANCELED;
    const isPorCobrar = o.paymentStatus === PaymentStatus.PENDING && o.status !== OrderStatus.CANCELED;

    if (tab === 'activos' && !isActivo) return false;
    if (tab === 'por_cobrar' && !isPorCobrar) return false;
    if (tab === 'historial' && !isHistorial) return false;`;

code = code.replace(filterOld, filterNew);
code = code.replace(filterOld.replace(/\r\n/g, '\n'), filterNew);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', code, 'utf8');
