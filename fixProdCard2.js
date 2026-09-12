const fs = require('fs');
let f = 'apps/frontend/src/components/products/ProductCard.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(/import\s*\{\s*IonIcon\s*\}\s*from\s*'@ionic\/react';\r?\n?/g, '');
c = c.replace(/import\s*\{\s*pencilOutline\s*\}\s*from\s*'ionicons\/icons';\r?\n?/g, '');

c = `import { IonIcon } from '@ionic/react';
import { pencilOutline } from 'ionicons/icons';
` + c;

fs.writeFileSync(f, c, 'utf8');
