const fs = require('fs');

// Fix Production.tsx
let prod = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');
prod = prod.replace(
  /<div style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' \}\}>([\s\S]*?)<\/div>/g,
  (match, inner) => {
    return `<div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                                  <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 10px 0', whiteSpace: 'normal', lineHeight: '1.4' }}>{p.name}</h2>
                                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{ padding: '8px', fontSize: '0.95rem' }}>
                                      Físico: {p.physicalStock}
                                    </IonBadge>
                                    <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '8px', fontSize: '0.95rem' }}>
                                      Disp: {p.stockQuantity}
                                    </IonBadge>
                                  </div>
                                </div>`;
  }
);
fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prod, 'utf8');

// Fix Products.tsx
let products = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');
products = products.replace(
  /<IonCardTitle style=\{\{ fontSize: '1\.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' \}\}>\s*<span style=\{\{flex: 1, paddingRight: '10px'\}\}>\{p\.name\}<\/span>\s*<IonBadge[^>]*>.*?<\/IonBadge><IonBadge[^>]*>.*?<\/IonBadge>\s*<\/IonCardTitle>/g,
  `<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <IonCardTitle style={{ fontSize: '1.1rem', whiteSpace: 'normal', lineHeight: '1.4' }}>{p.name}</IonCardTitle>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'}>Físico: {p.physicalStock}</IonBadge>
                            <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'}>Disp: {p.stockQuantity}</IonBadge>
                          </div>
                        </div>`
);
fs.writeFileSync('apps/frontend/src/pages/Products.tsx', products, 'utf8');

