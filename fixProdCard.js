const fs = require('fs');
let f = 'apps/frontend/src/components/products/ProductCard.tsx';
let c = fs.readFileSync(f, 'utf8');

if (!c.includes('IonIcon')) {
  c = c.replace("from '@ionic/react';", "from '@ionic/react';\nimport { IonIcon } from '@ionic/react';");
}
if (!c.includes('pencilOutline')) {
  c = "import { pencilOutline } from 'ionicons/icons';\n" + c;
}
fs.writeFileSync(f, c, 'utf8');
