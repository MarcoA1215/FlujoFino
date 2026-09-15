const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

// Hide badges for combos
const badges = `
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                  {!p.isCombo && (
                    <>
                      <IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        Físico: {p.physicalStock}
                      </IonBadge>
                      <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        Disp: {p.stockQuantity}
                      </IonBadge>
                    </>
                  )}
                  {p.isCombo && (
                    <IonBadge color="tertiary" style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                      Combo (Virtual)
                    </IonBadge>
                  )}
                </div>
`;

const regex = /<div style=\{\{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' \}\}>[\s\S]*?<\/div>/;

code = code.replace(regex, badges.trim());
fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', code, 'utf8');
