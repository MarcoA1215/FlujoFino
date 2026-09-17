const fs = require('fs');

let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

const returnStart = p.indexOf('return (');
const newReturn = `return (
    <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3" style={{ display: 'flex' }}>
      <IonCard style={{ margin: '5px', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <IonCardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px' }}>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 5px 0', lineHeight: '1.3' }}>\${p.name}</h2>
            
            {!isClientMode && (
              <p style={{ margin: '0 0 8px 0', color: 'gray', fontSize: '0.85rem' }}>
                \${p.category || 'Sin categor\\u00eda'} - \${p.isCombo ? 'Combo' : 'Base'}
              </p>
            )}
            
            <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--ion-color-dark)' }}>
              Precio: $\${p.salePrice.toFixed(2)}
            </p>

            {isClientMode && (
              <p style={{ margin: '0 0 12px 0', color: p.stockQuantity > 0 ? 'var(--ion-color-success)' : 'var(--ion-color-danger)', fontWeight: '500', fontSize: '0.9rem' }}>
                Disponible: \${p.stockQuantity}
              </p>
            )}

            {!isClientMode && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {(!p.isCombo || p.isPreAssembled) && (
                  <>
                    <IonBadge color={p.physicalStock <= 0 ? 'medium' : 'primary'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                      F\\u00edsico: \${p.physicalStock}
                    </IonBadge>
                    <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                      Disp: \${p.stockQuantity}
                    </IonBadge>
                  </>
                )}
                {(p.isCombo && !p.isPreAssembled) && (
                  <IonBadge color="tertiary" style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                    Combo (Virtual)
                  </IonBadge>
                )}
              </div>
            )}
          </div>
          
          {!isClientMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
              <IonButton size="small" fill="solid" color="primary" onClick={openOptions} style={{ margin: 0 }}>
                Opciones
              </IonButton>
            </div>
          )}
          
        </IonCardContent>
      </IonCard>
    </IonCol>
  );
};
`;

p = p.substring(0, returnStart) + newReturn;

// Fix missing { and } for the component if it got truncated
// wait, my newReturn has "};" at the end, which will close the component nicely.
fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);

console.log('ProductCard layout fixed');
