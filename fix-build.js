const fs = require('fs');

// 1. Fix Production.tsx
let prodCode = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');
prodCode = prodCode.replace(
  "isCombo?: boolean;",
  "isCombo?: boolean;\n    isPreAssembled?: boolean;\n    comboItems?: any[];\n    recipe?: any[];\n    physicalStock?: number;"
);
fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prodCode, 'utf8');

// 2. Fix Orders.tsx
let ordersCode = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
ordersCode = ordersCode.replace("IonSelect, IonSelectOption, ", "");
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', ordersCode, 'utf8');
