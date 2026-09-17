const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

p = p.replace(/p\.physicalStock <= 0/g, 'p.physicalStock! <= 0');

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);
console.log('Fixed TS error');
