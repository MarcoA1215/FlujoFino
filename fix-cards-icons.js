const fs = require('fs');

// 1. RawMaterialCard.tsx
let r = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');

// Add icon imports
r = r.replace(/import \{ pencilOutline \} from 'ionicons\/icons';/, `import { pencilOutline, cartOutline, warningOutline, timeOutline, archiveOutline, closeOutline } from 'ionicons/icons';`);

r = r.replace(/\{ text: 'Comprar', handler:/, `{ text: 'Comprar', icon: cartOutline, handler:`);
r = r.replace(/\{ text: 'Registrar P\u00e9rdida', handler:/, `{ text: 'Registrar P\u00e9rdida', icon: warningOutline, handler:`);
r = r.replace(/\{ text: 'Historial', handler:/, `{ text: 'Historial', icon: timeOutline, handler:`);
r = r.replace(/\{ text: 'Archivar', role: 'destructive', handler:/, `{ text: 'Archivar', icon: archiveOutline, role: 'destructive', handler:`);
r = r.replace(/\{ text: 'Cancelar', role: 'cancel' \}/, `{ text: 'Cancelar', icon: closeOutline, role: 'cancel' }`);

fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', r);

// 2. ProductCard.tsx
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

p = p.replace(/import \{ pencilOutline, trashOutline \} from 'ionicons\/icons';/, `import { pencilOutline, trashOutline, buildOutline, cubeOutline, swapHorizontalOutline, cutOutline, warningOutline, closeOutline } from 'ionicons/icons';`);

p = p.replace(/text: p\.isCombo \? 'Configurar Combo' : 'Configurar Receta', handler:/, `text: p.isCombo ? 'Configurar Combo' : 'Configurar Receta', icon: buildOutline, handler:`);
p = p.replace(/text: 'Stock Inicial \/ Ajuste', handler:/, `text: 'Stock Inicial / Ajuste', icon: cubeOutline, handler:`);
p = p.replace(/text: \`Convertir a \$\{p\.isPreAssembled \? 'Virtual' : 'F\u00edsico \(Kitting\)'\}\`, handler:/, `text: \`Convertir a \${p.isPreAssembled ? 'Virtual' : 'F\u00edsico (Kitting)'}\`, icon: swapHorizontalOutline, handler:`);
p = p.replace(/text: 'Desarmar 1 Und', handler:/, `text: 'Desarmar 1 Und', icon: cutOutline, handler:`);
p = p.replace(/text: 'Registrar P\u00e9rdida', handler:/, `text: 'Registrar P\u00e9rdida', icon: warningOutline, handler:`);
p = p.replace(/text: 'Cancelar', role: 'cancel'/, `text: 'Cancelar', icon: closeOutline, role: 'cancel'`);

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);

console.log('Action sheets icons added');
