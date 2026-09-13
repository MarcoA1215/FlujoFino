const fs = require('fs');

let file = 'apps/frontend/src/components/raw-materials/StockOperationModal.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/import { RawMaterial }/g, 'import type { RawMaterial }');
fs.writeFileSync(file, text, 'utf8');
