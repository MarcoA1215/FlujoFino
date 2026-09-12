const fs = require('fs');
const fixIonicImportsAndVars = (p) => {
  let c = fs.readFileSync(p, 'utf8');

  // Fix imports completely
  c = c.replace(/import\s*\{\s*([\s\S]*?)\s*\}\s*from\s*'@ionic\/react';/, (match, p1) => {
    let imports = p1.split(',').map(s => s.trim()).filter(s => s.length > 0);
    imports.push('IonToolbar', 'IonTitle', 'IonSearchbar'); // ensure these exist
    let uniqueImports = [...new Set(imports)];
    return "import { " + uniqueImports.join(', ') + " } from '@ionic/react';";
  });

  // Fix variables completely
  const regex = /const\s*\[searchText,\s*setSearchText\]\s*=\s*useState\(''\);\s*/g;
  let matches = [...c.matchAll(regex)];
  if (matches.length > 1) {
    // Keep first one, replace the rest
    let firstIndex = matches[0].index;
    c = c.substring(0, firstIndex + matches[0][0].length) + c.substring(firstIndex + matches[0][0].length).replace(regex, '');
  }

  fs.writeFileSync(p, c, 'utf8');
}

fixIonicImportsAndVars('apps/frontend/src/pages/Pos.tsx');
fixIonicImportsAndVars('apps/frontend/src/pages/Production.tsx');
fixIonicImportsAndVars('apps/frontend/src/pages/Calculator.tsx');
fixIonicImportsAndVars('apps/frontend/src/pages/DeliveryZones.tsx');

