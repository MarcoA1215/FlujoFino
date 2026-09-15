const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.service.ts', 'utf8');
code = code.replace("async getAllProducts() {", "async findAll() {");
fs.writeFileSync('apps/backend/src/products/products.service.ts', code, 'utf8');
