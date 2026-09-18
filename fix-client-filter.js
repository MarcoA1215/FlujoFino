const fs = require('fs');

let p = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');

p = p.replace(/const filteredData = products\.filter\(item => \{/, 
`const filteredData = products.filter(item => {
    if (isClientMode && item.stockQuantity <= 0) return false;`);

p = p.replace(/Precio: \$\\\$\{p\.salePrice\.toFixed\(2\)\}/, "Precio: $\${p.salePrice.toFixed(2)}");

fs.writeFileSync('apps/frontend/src/pages/Products.tsx', p);
console.log('Fixed negatives and double dollar');
