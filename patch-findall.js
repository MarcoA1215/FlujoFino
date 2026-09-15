const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.service.ts', 'utf8');

code = code.replace(
  "if (p.comboItems && p.comboItems.length > 0) {",
  "if (p.comboItems && p.comboItems.length > 0 && !p.isPreAssembled) {"
);

fs.writeFileSync('apps/backend/src/products/products.service.ts', code, 'utf8');
