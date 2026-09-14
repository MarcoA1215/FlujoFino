const fs = require('fs');

let prod = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');

const targetStr = `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                    <h2 style={{ flex: 1, fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 10px 0' }}>{p.name}</h2>
                                    <IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{ padding: '8px', fontSize: '0.95rem', flexShrink: 0, whiteSpace: 'nowrap', marginRight: '5px' }}>
                                      Físico: {p.physicalStock}
                                    </IonBadge>
                                    <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '8px', fontSize: '0.95rem', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                      Disp: {p.stockQuantity}
                                    </IonBadge>
                                  </div>`;

const replacement = `<div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
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

if (prod.includes("Físico: {p.physicalStock}")) {
  // Regex approach because the invisible chars and newlines can be tricky
  prod = prod.replace(/<div style=\{\{\s*display:\s*'flex',\s*justifyContent:\s*'space-between',\s*alignItems:\s*'flex-start',\s*gap:\s*'10px'\s*\}\}>[\s\S]*?Disp:\s*\{p\.stockQuantity\}[\s\S]*?<\/IonBadge>\s*<\/div>/g, replacement);
  fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prod, 'utf8');
}
