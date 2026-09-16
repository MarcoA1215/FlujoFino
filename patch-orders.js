const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

code = code.replace(
  /if \(product\.comboItems && product\.comboItems\.length > 0\) \{/g,
  "if (product.isCombo && !product.isPreAssembled && product.comboItems && product.comboItems.length > 0) {"
);

code = code.replace(
  /\} else if \(\!product\.isCombo\) \{/g,
  "} else if (!product.isCombo || product.isPreAssembled) {"
);

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', code, 'utf8');
