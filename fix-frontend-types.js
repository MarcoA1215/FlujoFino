const fs = require('fs');
let types = fs.readFileSync('apps/frontend/src/types.ts', 'utf8');
if (!types.includes("physicalStock?: number;")) {
  types = types.replace("isCombo?: boolean;", "isCombo?: boolean;\n  physicalStock?: number;\n  reservedQuantity?: number;");
  fs.writeFileSync('apps/frontend/src/types.ts', types, 'utf8');
}
