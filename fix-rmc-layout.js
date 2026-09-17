const fs = require('fs');
let r = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');

const returnStart = r.indexOf('return (');
const newReturn = `return (
    <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3" style={{ display: 'flex' }}>
      <IonCard style={{ margin: '5px', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <IonCardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px' }}>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 5px 0', lineHeight: '1.3', wordBreak: 'break-word' }}>{m.name}</h2>
            
            <p style={{ margin: '0 0 12px 0', color: 'gray', fontSize: '0.9rem' }}>
              Costo prom: {m.costPerUnit.toFixed(2)} / {m.unit}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              <IonBadge color={m.stockQuantity <= m.minStockAlert ? 'danger' : 'success'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                Stock: {m.stockQuantity.toFixed(2)} {m.unit}
              </IonBadge>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
            <IonButton size="small" fill="solid" color="primary" onClick={openOptions} style={{ margin: 0 }}>
              Opciones
            </IonButton>
          </div>
          
        </IonCardContent>
      </IonCard>
    </IonCol>
  );
};
`;

r = r.substring(0, returnStart) + newReturn;

fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', r);
console.log('Fixed RawMaterialCard layout');
