const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/production/production.service.ts', 'utf8');

// In createBatch: product.stockQuantity += quantity;
code = code.replace("product.stockQuantity += quantity;", "product.stockQuantity += quantity;\n        product.physicalStock += quantity;");

// In revertBatch: product.stockQuantity -= batch.quantity;
code = code.replace("product.stockQuantity -= batch.quantity;", "product.stockQuantity -= batch.quantity;\n          product.physicalStock -= batch.quantity;");

fs.writeFileSync('apps/backend/src/production/production.service.ts', code, 'utf8');
