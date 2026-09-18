const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');
p = p.replace("<p>Precio: $$${p.salePrice.toFixed(2)}</p>", "<p>Precio: $${p.salePrice.toFixed(2)}</p>");
fs.writeFileSync('apps/frontend/src/pages/Products.tsx', p);
