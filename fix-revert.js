const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/production/production.service.ts', 'utf8');

code = code.replace(
  "if (product.stockQuantity < batch.quantity) {",
  "if (product.physicalStock < batch.quantity) {"
);

code = code.replace(
  "El stock actual (${product.stockQuantity})",
  "El stock físico actual (${product.physicalStock})"
);

fs.writeFileSync('apps/backend/src/production/production.service.ts', code, 'utf8');
