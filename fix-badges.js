const fs = require('fs');

let prod = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');
prod = prod.replace(/<IonBadge color=\{p\.stockQuantity <= 0 \? 'medium' : 'success'\} style=\{\{ padding: '8px', fontSize: '0\.95rem', flexShrink: 0, whiteSpace: 'nowrap' \}\}>\s*Stock: \{p\.stockQuantity\}\s*<\/IonBadge>/g, `<IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{ padding: '8px', fontSize: '0.95rem', flexShrink: 0, whiteSpace: 'nowrap', marginRight: '5px' }}>
                                    Físico: {p.physicalStock}
                                  </IonBadge>
                                  <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '8px', fontSize: '0.95rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                    Disp: {p.stockQuantity}
                                  </IonBadge>`);
fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prod, 'utf8');

let products = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');
products = products.replace(/<IonBadge color=\{p\.stockQuantity <= 0 \? 'medium' : 'success'\}>Stock: \{p\.stockQuantity\}<\/IonBadge>/g, `<IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{marginRight: '5px'}}>Físico: {p.physicalStock}</IonBadge><IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'}>Disp: {p.stockQuantity}</IonBadge>`);
fs.writeFileSync('apps/frontend/src/pages/Products.tsx', products, 'utf8');
