const fs = require('fs');

let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

p = p.replace(/text: \`Convertir a \$\{p\.isPreAssembled \? 'Virtual' : 'F\u00edsico \(Kitting\)'\}\`, icon: swapHorizontalOutline, handler/, `text: \`Convertir a \${p.isPreAssembled ? 'Virtual' : 'F\u00edsico (Kitting)'}\`, icon: swapHorizontalOutline, cssClass: 'action-sheet-cambiar', handler`);
p = p.replace(/text: 'Registrar P\u00e9rdida', icon: warningOutline, handler/, `text: 'Registrar P\u00e9rdida', icon: warningOutline, cssClass: 'action-sheet-eliminar', handler`);

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);

let r = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');
r = r.replace(/text: 'Registrar P\u00e9rdida', icon: warningOutline, handler/, `text: 'Registrar P\u00e9rdida', icon: warningOutline, cssClass: 'action-sheet-eliminar', handler`);
fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', r);

console.log('Action sheets colored 2');
