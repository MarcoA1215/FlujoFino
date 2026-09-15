const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');

code = code.replace(
  "if (p.isCombo) return false;",
  "if (p.isCombo && (!p.isPreAssembled || !p.comboItems || p.comboItems.length === 0)) return false;"
);

fs.writeFileSync('apps/frontend/src/pages/Production.tsx', code, 'utf8');
