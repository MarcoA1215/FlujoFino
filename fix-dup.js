const fs = require('fs');
let prodCode = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');

prodCode = prodCode.replace(
  "isPreAssembled?: boolean;\n    comboItems?: any[];\n    recipe?: any[];\n    physicalStock?: number;",
  "isPreAssembled?: boolean;\n    comboItems?: any[];\n    recipe?: any[];"
);

// fix Orders.tsx
let prodProductsCode = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');
prodProductsCode = prodProductsCode.replace(
  "isPreAssembled?: boolean;\n    comboItems?: any[];\n    recipe?: any[];\n    physicalStock?: number;",
  ""
);

fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prodCode, 'utf8');
