const fs = require('fs');
let f = 'apps/frontend/src/components/products/ProductCard.tsx';
let c = fs.readFileSync(f, 'utf8');
c = c.replace(/\{p\.categor.*?\}/g, "{p.category || 'Sin categoría'} - {p.isCombo ? 'Combo' : 'Base'}");
fs.writeFileSync(f, c, 'utf8');
