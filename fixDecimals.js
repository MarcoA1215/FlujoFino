const fs = require('fs');

let file = 'apps/frontend/src/components/products/RecipeModal.tsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/Composici\uFFFDn/g, 'Composición');
text = text.replace(/type="number"/g, 'type="number" step="any"');
fs.writeFileSync(file, text, 'utf8');

let file2 = 'apps/frontend/src/components/raw-materials/StockOperationModal.tsx';
let text2 = fs.readFileSync(file2, 'utf8');
text2 = text2.replace(/type="number"/g, 'type="number" step="any"');
fs.writeFileSync(file2, text2, 'utf8');
