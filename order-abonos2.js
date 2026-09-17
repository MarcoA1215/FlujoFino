const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

if (!c.includes('import { copyOutline, informationCircleOutline }')) {
  c = c.replace(/import \{ refreshOutline \} from 'ionicons\/icons';/, 
  "import { refreshOutline, copyOutline, informationCircleOutline, trashOutline } from 'ionicons/icons';\nimport { IonModal, IonInput } from '@ionic/react';");
}

if (!c.includes('selectedOrderForDetails')) {
  c = c.replace(/const \[presentAlert\] = useIonAlert\(\);/, 
`const [presentAlert] = useIonAlert();
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<any>(null);
  const [abonoAmount, setAbonoAmount] = useState<string>('');`);
}

if (!c.includes('const handleAddAbono')) {
  c = c.replace(/const fetchOrders = async \(\) => \{/, 
`const handleAddAbono = async () => {
    if (!selectedOrderForDetails || !abonoAmount || isNaN(Number(abonoAmount))) return;
    try {
      await apiClient.post('/orders/' + selectedOrderForDetails.id + '/abono', { amount: Number(abonoAmount) });
      presentToast({ message: 'Abono registrado', duration: 2000, color: 'success' });
      setAbonoAmount('');
      fetchOrders();
      setSelectedOrderForDetails(null);
    } catch (e) {
      presentToast({ message: 'Error registrando abono', duration: 2000, color: 'danger' });
    }
  };

  const handleRevertAbono = async (index: number) => {
    if (!selectedOrderForDetails) return;
    try {
      await apiClient.delete('/orders/' + selectedOrderForDetails.id + '/abono/' + index);
      presentToast({ message: 'Abono revertido', duration: 2000, color: 'success' });
      fetchOrders();
      setSelectedOrderForDetails(null);
    } catch (e) {
      presentToast({ message: 'Error revirtiendo abono', duration: 2000, color: 'danger' });
    }
  };

  const showOrderInfo = (order: any) => {
    setSelectedOrderForDetails(order);
  };

  const handleCopyOrder = (order: any) => {
    let text = '*NutriDeli - Pedido ' + order.customerName + '*\n';
    if (order.customerPhone) text += 'Tel: ' + order.customerPhone + '\n';
    text += 'Tipo: ' + (order.deliveryMethod === DeliveryMethod.DELIVERY ? 'Delivery' : (order.deliveryMethod === DeliveryMethod.PICKUP ? 'Pickup' : 'Local')) + '\n';
    if (order.deliveryMethod === DeliveryMethod.DELIVERY && order.deliveryZone) {
      text += 'Zona: ' + order.deliveryZone.name + '\n';
    }
    if (order.customerAddress) text += 'Dir: ' + order.customerAddress + '\n';
    text += '-----------------------\n';
    order.items.forEach((item: any) => {
      const price = item.subtotal ? ' ($' + item.subtotal.toFixed(2) + ')' : '';
      text += '- ' + parseFloat(Number(item.quantity).toFixed(4)) + 'x ' + (item.productName || item.product?.name) + price + '\n';
    });
    text += '-----------------------\n';
    if (order.deliveryFee && order.deliveryFee > 0) {
      text += '*Costo Delivery: $' + order.deliveryFee.toFixed(2) + '*\n';
    }
    const abonosTotal = order.abonosTotal || 0;
    text += '*TOTAL: $' + order.totalAmount.toFixed(2) + '*\n';
    if (abonosTotal > 0) {
      text += '*ABONOS: $' + abonosTotal.toFixed(2) + '*\n';
      text += '*RESTANTE: $' + (order.totalAmount - abonosTotal).toFixed(2) + '*\n';
    }
    if (order.notes) text += '\nNotas: ' + order.notes + '\n';
    
    navigator.clipboard.writeText(text);
    presentToast({ message: 'Pedido copiado al portapapeles', duration: 2000, color: 'success' });
  };

  const fetchOrders = async () => {`);
}

c = c.replace(/<IonCardHeader>[\s\S]*?<IonCardTitle>Pedido: \{order\.customerName\}<\/IonCardTitle>[\s\S]*?<\/IonCardHeader>/g, 
`<IonCardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
  <div>
    <IonCardTitle>Pedido: {order.customerName}</IonCardTitle>
    <IonCardSubtitle>{new Date(order.createdAt).toLocaleString()}</IonCardSubtitle>
  </div>
  <div style={{ display: 'flex', gap: '5px' }}>
    <IonButton fill="clear" size="small" onClick={() => handleCopyOrder(order)}>
      <IonIcon icon={copyOutline} slot="icon-only" />
    </IonButton>
    <IonButton fill="clear" size="small" onClick={() => showOrderInfo(order)}>
      <IonIcon icon={informationCircleOutline} slot="icon-only" />
    </IonButton>
  </div>
</IonCardHeader>`);

c = c.replace(/<IonCardContent>([\s\S]*?)<\/IonCardContent>/g, 
`<IonCardContent>$1
  {order.abonosTotal > 0 && (
    <div style={{ marginTop: '10px' }}>
      <IonBadge color="primary">Abonos: $ {order.abonosTotal.toFixed(2)}</IonBadge>
      <IonBadge color="warning" style={{ marginLeft: '5px' }}>Restante: $ {(order.totalAmount - order.abonosTotal).toFixed(2)}</IonBadge>
    </div>
  )}
</IonCardContent>`);

if (!c.includes('<IonModal isOpen={!!selectedOrderForDetails}')) {
  const modalHTML = `
      <IonModal isOpen={!!selectedOrderForDetails} onDidDismiss={() => setSelectedOrderForDetails(null)}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Detalles del Pedido</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setSelectedOrderForDetails(null)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {selectedOrderForDetails && (
            <>
              <h3>Cliente: {selectedOrderForDetails.customerName}</h3>
              <p>Total del Pedido: <strong>${"$"}{selectedOrderForDetails.totalAmount.toFixed(2)}</strong></p>
              
              <IonList>
                {selectedOrderForDetails.items.map((item: any) => (
                  <IonItem key={item.id}>
                    <IonLabel>
                      {parseFloat(Number(item.quantity).toFixed(4))}x {item.productName || item.product?.name}
                    </IonLabel>
                    <IonText color="primary">{item.subtotal ? "$"+item.subtotal.toFixed(2) : ''}</IonText>
                  </IonItem>
                ))}
              </IonList>

              <div style={{ marginTop: '20px' }}>
                <h4>Abonos Realizados:</h4>
                <IonList>
                  {(selectedOrderForDetails.abonosHistory || []).map((abono: any, idx: number) => (
                    <IonItem key={abono.id || idx}>
                      <IonLabel>
                        Abono de <strong>${"$"}{abono.amount.toFixed(2)}</strong>
                        <p>{new Date(abono.date).toLocaleString()}</p>
                      </IonLabel>
                      <IonButton color="danger" fill="clear" onClick={() => handleRevertAbono(idx)}>
                        <IonIcon icon={trashOutline} slot="icon-only" />
                      </IonButton>
                    </IonItem>
                  ))}
                  {(!selectedOrderForDetails.abonosHistory || selectedOrderForDetails.abonosHistory.length === 0) && (
                    <p style={{ color: 'gray' }}>No hay abonos registrados.</p>
                  )}
                </IonList>
              </div>

              {selectedOrderForDetails.paymentStatus === PaymentStatus.PENDING && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                  <h4>Registrar Nuevo Abono</h4>
                  <IonItem>
                    <IonLabel position="stacked">Monto ($)</IonLabel>
                    <IonInput type="number" value={abonoAmount} onIonInput={e => setAbonoAmount(e.detail.value!)} placeholder="Ej. 5.00" />
                  </IonItem>
                  <IonButton expand="block" onClick={handleAddAbono} disabled={!abonoAmount} className="ion-margin-top">
                    Agregar Abono
                  </IonButton>
                </div>
              )}
            </>
          )}
        </IonContent>
      </IonModal>
  `;
  c = c.replace(/<\/IonContent>\s*<\/IonPage>/, modalHTML + '\n      </IonContent>\n    </IonPage>');
}

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', c);
console.log('Orders.tsx patched for Abonos');
