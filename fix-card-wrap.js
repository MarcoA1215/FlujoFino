const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

p = p.replace(
  /<div style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' \}\}>/,
  `<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>`
);

p = p.replace(
  /<h2 style=\{\{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 5px 0', wordBreak: 'break-word' \}\}>/,
  `<h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>`
);

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);
console.log('Fixed ProductCard wrapping');
