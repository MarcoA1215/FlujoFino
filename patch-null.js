const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.service.ts', 'utf8');

code = code.replace(/if \(oldProduct\.isPreAssembled && dto\.isPreAssembled === false\)/g, "if (oldProduct && oldProduct.isPreAssembled && dto.isPreAssembled === false)");

fs.writeFileSync('apps/backend/src/products/products.service.ts', code, 'utf8');
