const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/types.ts', 'utf8');

code = code.replace(
  "isCombo?: boolean;",
  "isCombo?: boolean;\n  isPreAssembled?: boolean;\n  comboItems?: { id: string; componentId: string; quantity: number; component?: any }[];\n  recipe?: any[];"
);

fs.writeFileSync('apps/frontend/src/types.ts', code, 'utf8');
