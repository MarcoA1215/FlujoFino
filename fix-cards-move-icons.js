const fs = require('fs');

// 1. RawMaterialCard.tsx
let r = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');

// Insert Editar to options
r = r.replace(/buttons: \[\s*\{ text: 'Comprar'/,
`buttons: [
        { text: 'Editar Nombre/Alerta', icon: pencilOutline, handler: () => onEditName(m) },
        { text: 'Comprar'`);

// Remove pencil button from DOM
r = r.replace(/<div style=\{\{ display: 'flex', gap: '5px' \}\}>\s*<IonButton fill="clear" size="small" onClick=\{\(\) => onEditName\(m\)\}.*?<\/IonButton>\s*<\/div>/, '');

fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', r);

// 2. ProductCard.tsx
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

p = p.replace(/const buttons: any\[\] = \[\s*\{ text: p\.isCombo/,
`const buttons: any[] = [
      { text: 'Editar Info / Precio', icon: pencilOutline, handler: () => onEdit(p) },
      { text: p.isCombo`);

p = p.replace(/buttons\.push\(\{ text: 'Registrar P\u00e9rdida', icon: warningOutline, handler: \(\) => onRegisterLoss\(p\) \}\);/,
`buttons.push({ text: 'Registrar P\u00e9rdida', icon: warningOutline, handler: () => onRegisterLoss(p) });
    buttons.push({ text: 'Eliminar Producto', icon: trashOutline, role: 'destructive', handler: () => onDelete(p) });`);

// Remove pencil and trash buttons from DOM
p = p.replace(/<div style=\{\{ display: 'flex', gap: '5px' \}\}>\s*<IonButton fill="clear" size="small" onClick=\{\(\) => onEdit\(p\)\}.*?<\/IonButton>\s*<IonButton fill="clear" size="small" color="danger" onClick=\{\(\) => onDelete\(p\)\}.*?<\/IonButton>\s*<\/div>/, '');

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);

console.log('Moved edit and delete to options menu');
