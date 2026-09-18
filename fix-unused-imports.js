const fs = require('fs');
let r = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');

r = r.replace(/IonCardHeader, IonCardTitle, /g, '');

fs.writeFileSync('apps/frontend/src/pages/RawMaterials.tsx', r);
console.log('Removed unused imports');
