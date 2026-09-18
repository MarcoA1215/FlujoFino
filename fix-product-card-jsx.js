const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

p = p.replace(/\$\{p\.name\}/g, '{p.name}');
p = p.replace(/\$\{p\.category \|\| 'Sin categor\\u00eda'\}/g, "{p.category || 'Sin categor\\u00eda'}");
p = p.replace(/\$\{p\.isCombo \? 'Combo' : 'Base'\}/g, "{p.isCombo ? 'Combo' : 'Base'}");
p = p.replace(/\$\$\{p\.salePrice\.toFixed\(2\)\}/g, "${p.salePrice.toFixed(2)}");
p = p.replace(/\$\{p\.stockQuantity\}/g, "{p.stockQuantity}");
p = p.replace(/\$\{p\.physicalStock\}/g, "{p.physicalStock}");

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);
console.log('Fixed JSX syntax');
