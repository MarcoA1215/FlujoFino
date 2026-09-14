const fs = require('fs');
let types = fs.readFileSync('packages/shared-types/src/index.ts', 'utf8');
if (!types.includes("physicalStock?: number;")) {
  types = types.replace("isCombo?: boolean;", "isCombo?: boolean;\n  physicalStock?: number;\n  reservedQuantity?: number;");
  fs.writeFileSync('packages/shared-types/src/index.ts', types, 'utf8');
}
