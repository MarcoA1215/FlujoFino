const fs = require('fs');

const fixColor = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/<IonButton size="small" fill="solid" color="light" onClick=\{openOptions\}>/g,
                            '<IonButton size="small" fill="solid" color="primary" onClick={openOptions}>');
  fs.writeFileSync(filePath, content);
};

fixColor('apps/frontend/src/components/products/ProductCard.tsx');
fixColor('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx');

console.log('Button color changed to primary');
