const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');

code = code.replace(
  /p => p\.recipe && p\.recipe\.length > 0/g,
  "p => (p.recipe && p.recipe.length > 0) || (p.isCombo && p.isPreAssembled && p.comboItems && p.comboItems.length > 0)"
);
fs.writeFileSync('apps/frontend/src/pages/Production.tsx', code, 'utf8');
