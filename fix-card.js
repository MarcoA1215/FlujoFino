const fs = require('fs');

let card = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

const regex = /<IonBadge color=\{p\.stockQuantity <= 0 \? 'danger' : 'primary'\} style=\{\{ padding: '8px 10px', fontSize: '0\.9rem', whiteSpace: 'nowrap' \}\}>\s*Stock: \{p\.stockQuantity\}\s*<\/IonBadge>/g;

const replacement = `<div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                <IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                  Físico: {p.physicalStock}
                </IonBadge>
                <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                  Disp: {p.stockQuantity}
                </IonBadge>
              </div>`;

if (!card.includes("Físico:")) {
  card = card.replace(regex, replacement);
  fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', card, 'utf8');
}
