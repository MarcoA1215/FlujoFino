const fs = require('fs');

const fixDuplicates = (p) => {
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/IonSearchbar,\s*IonSearchbar/g, "IonSearchbar");
  c = c.replace(/IonToolbar, IonSearchbar, IonGrid/g, "IonToolbar, IonGrid");
  fs.writeFileSync(p, c, 'utf8');
}
fixDuplicates('apps/frontend/src/pages/Calculator.tsx');
fixDuplicates('apps/frontend/src/pages/Production.tsx');
fixDuplicates('apps/frontend/src/pages/DeliveryZones.tsx');
fixDuplicates('apps/frontend/src/pages/Pos.tsx');
