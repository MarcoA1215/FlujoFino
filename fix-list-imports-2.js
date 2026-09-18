const fs = require('fs');

let p = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');

p = p.replace(/import \{ IonIcon \} from '@ionic\/react';/g, ""); // Clean up any duplicate if it exists

p = p.replace(/import \{ refreshOutline \} from 'ionicons\/icons';/, 
"import { refreshOutline } from 'ionicons/icons';\nimport { IonList, IonItem, IonLabel, IonBadge } from '@ionic/react';");

fs.writeFileSync('apps/frontend/src/pages/Products.tsx', p);
console.log('Appended list imports');
