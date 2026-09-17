const fs = require('fs');

// 1. RawMaterialCard.tsx
let r = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');

r = r.replace(/text: 'Editar Nombre\/Alerta', icon: pencilOutline, handler/, `text: 'Editar Nombre/Alerta', icon: pencilOutline, cssClass: 'action-sheet-editar', handler`);
r = r.replace(/text: 'Comprar', icon: cartOutline, handler/, `text: 'Comprar', icon: cartOutline, cssClass: 'action-sheet-comprar', handler`);
// Historial: leave default or blue
r = r.replace(/text: 'Historial', icon: timeOutline, handler/, `text: 'Historial', icon: timeOutline, cssClass: 'action-sheet-editar', handler`);
// Archivar is already destructive

fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', r);

// 2. ProductCard.tsx
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

p = p.replace(/text: 'Editar Info \/ Precio', icon: pencilOutline, handler/, `text: 'Editar Info / Precio', icon: pencilOutline, cssClass: 'action-sheet-editar', handler`);
p = p.replace(/text: p\.isCombo \? 'Configurar Combo' : 'Configurar Receta', icon: buildOutline, handler/, `text: p.isCombo ? 'Configurar Combo' : 'Configurar Receta', icon: buildOutline, cssClass: 'action-sheet-editar', handler`);
p = p.replace(/text: 'Stock Inicial \/ Ajuste', icon: cubeOutline, handler/, `text: 'Stock Inicial / Ajuste', icon: cubeOutline, cssClass: 'action-sheet-editar', handler`);
p = p.replace(/text: \`Convertir a \$\{p\.isPreAssembled \? 'Virtual' : 'F\\u00edsico \\(Kitting\\)'\}\`, icon: swapHorizontalOutline, handler/, `text: \`Convertir a \${p.isPreAssembled ? 'Virtual' : 'F\\u00edsico (Kitting)'}\`, icon: swapHorizontalOutline, cssClass: 'action-sheet-cambiar', handler`);
p = p.replace(/text: 'Desarmar 1 Und', icon: cutOutline, handler/, `text: 'Desarmar 1 Und', icon: cutOutline, cssClass: 'action-sheet-desarmar', handler`);
p = p.replace(/text: 'Registrar P\\u00e9rdida', icon: warningOutline, handler/, `text: 'Registrar P\\u00e9rdida', icon: warningOutline, cssClass: 'action-sheet-eliminar', handler`);

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);

console.log('Action sheets colored');
