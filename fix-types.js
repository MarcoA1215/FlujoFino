const fs = require('fs');

let prod = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');
if (!prod.includes("physicalStock?: number;")) {
  prod = prod.replace("isCombo?: boolean;", "isCombo?: boolean;\n  physicalStock?: number;\n  reservedQuantity?: number;");
  fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prod, 'utf8');
}

let products = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');
if (!products.includes("physicalStock?: number;")) {
  products = products.replace("isCombo?: boolean;", "isCombo?: boolean;\n  physicalStock?: number;\n  reservedQuantity?: number;");
  fs.writeFileSync('apps/frontend/src/pages/Products.tsx', products, 'utf8');
}
