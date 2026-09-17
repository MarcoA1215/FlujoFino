const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

p = p.replace(/F\\u00edsico:/g, 'Físico:');
p = p.replace(/Sin categor\\u00eda/g, 'Sin categoría');

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);
console.log('Fixed unicode literals in JSX');
