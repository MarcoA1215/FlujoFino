const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

c = c.replace(/<IonCardHeader>[\s\S]*?<\/IonCardHeader>/g, 
`<IonCardHeader style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
  <div>
    <IonCardTitle>{order.customerName}</IonCardTitle>
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
                {selectedOrderForDetails.items.map((item: any, idxx: number) => (
                  <IonItem key={item.id || idxx}>
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
