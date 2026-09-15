const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

code = code.replace(
  /onRegisterLoss\r?\n\}\) => \{/,
  "onRegisterLoss,\n  onToggleKitting\n}) => {"
);

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', code, 'utf8');
