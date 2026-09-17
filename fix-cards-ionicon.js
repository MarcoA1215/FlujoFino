const fs = require('fs');

let r = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');
r = r.replace(/import \{ IonIcon \} from '@ionic\/react';\r?\n/, '');
fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', r);

let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');
p = p.replace(/import \{ IonIcon \} from '@ionic\/react';\r?\n/, '');
fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);

console.log('Removed unused IonIcon');
