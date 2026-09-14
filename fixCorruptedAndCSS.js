const fs = require('fs');

// Fix MovementHistoryModal.tsx
let modalPath = 'apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx';
let modalContent = fs.readFileSync(modalPath, 'utf8');
modalContent = modalContent.replace(/Acci\uFFFDn/g, 'Acción');
fs.writeFileSync(modalPath, modalContent, 'utf8');

// Fix Products.tsx
let productsPath = 'apps/frontend/src/pages/Products.tsx';
let productsContent = fs.readFileSync(productsPath, 'utf8');
productsContent = productsContent.replace(/Categor\uFFFDa/g, 'Categoría');
productsContent = productsContent.replace(/A\uFFFDadir Stock/g, 'Añadir Stock');
productsContent = productsContent.replace(/Eliminaci\uFFFDn/g, 'Eliminación');
productsContent = productsContent.replace(/\uFFFDEst\uFFFDs/g, '¿Estás');
productsContent = productsContent.replace(/hist\uFFFDr/g, 'histór');
productsContent = productsContent.replace(/mantendr\uFFFDn/g, 'mantendrán');
productsContent = productsContent.replace(/Cat\uFFFDlogo/g, 'Catálogo');
fs.writeFileSync(productsPath, productsContent, 'utf8');

// Add global CSS fix for vertical text
let cssPath = 'apps/frontend/src/theme/variables.css';
let cssContent = fs.readFileSync(cssPath, 'utf8');
const cssFix = `
/* Prevenir que las palabras se rompan verticalmente letra por letra en pantallas angostas */
ion-badge, ion-button, th, td, ion-card-title, h1, h2, h3, p {
  word-break: normal !important;
  overflow-wrap: break-word !important;
}
.ion-text-wrap {
  word-break: normal !important;
}
`;
if (!cssContent.includes('word-break: normal')) {
  fs.writeFileSync(cssPath, cssContent + '\n' + cssFix, 'utf8');
}
