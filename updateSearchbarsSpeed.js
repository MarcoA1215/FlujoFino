const fs = require('fs');
const files = [
  'apps/frontend/src/pages/Orders.tsx',
  'apps/frontend/src/pages/Products.tsx',
  'apps/frontend/src/pages/RawMaterials.tsx',
  'apps/frontend/src/pages/Calculator.tsx',
  'apps/frontend/src/pages/Production.tsx',
  'apps/frontend/src/pages/DeliveryZones.tsx',
  'apps/frontend/src/pages/Pos.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let code = fs.readFileSync(file, 'utf8');
    // Replace onIonChange with onIonInput and set debounce to 0 for maximum speed
    code = code.replace(/onIonChange=\{e\s*=>\s*setSearchText\(e\.detail\.value!\)\}/g, "debounce={0} onIonInput={(e: any) => setSearchText(e.target.value || '')}");
    // Fallback if some use a different spacing
    code = code.replace(/onIonChange=\{e=>setSearchText\(e\.detail\.value!\)\}/g, "debounce={0} onIonInput={(e: any) => setSearchText(e.target.value || '')}");
    fs.writeFileSync(file, code, 'utf8');
  }
});
