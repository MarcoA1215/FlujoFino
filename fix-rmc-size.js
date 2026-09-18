const fs = require('fs');
let r = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');

r = r.replace(/<IonCol size="12" sizeSm="6" sizeLg="6">/, `<IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3" style={{ display: 'flex' }}>`);

fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', r);
console.log('Fixed RawMaterialCard column size');
