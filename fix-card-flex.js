const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

p = p.replace(
  /<div style=\{\{ flex: 1, minWidth: 0 \}\}>/,
  `<div style={{ flex: '1 1 150px', minWidth: '150px' }}>`
);

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);
console.log('Fixed flex basis');
