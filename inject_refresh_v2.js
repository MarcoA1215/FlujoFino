const fs = require('fs');
const path = require('path');

const pages = [
  { file: 'Dashboard.tsx', fetchCall: 'fetchStats' },
  { file: 'RawMaterials.tsx', fetchCall: 'fetchMaterials' },
  { file: 'Products.tsx', fetchCall: 'fetchProducts' },
  { file: 'Production.tsx', fetchCall: 'fetchBatches' },
  { file: 'Pos.tsx', fetchCall: 'fetchProducts' },
  { file: 'Orders.tsx', fetchCall: 'fetchOrders' },
  { file: 'DeliveryZones.tsx', fetchCall: 'fetchZones' },
  { file: 'Users.tsx', fetchCall: 'fetchUsers' }
];

pages.forEach(p => {
  const filepath = path.join('apps/frontend/src/pages', p.file);
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');

  // Fix @ionic/react imports safely
  content = content.replace(/import\s+\{([\s\S]*?)\}\s+from\s+['"]@ionic\/react['"];/, (match, group) => {
    let imports = group.split(',').map(s => s.trim()).filter(Boolean);
    if (!imports.includes('IonIcon')) imports.push('IonIcon');
    if (!imports.includes('IonButtons')) imports.push('IonButtons');
    if (!imports.includes('IonButton')) imports.push('IonButton');
    return `import { ${imports.join(', ')} } from '@ionic/react';`;
  });

  // Add refreshOutline import safely
  if (!content.includes('refreshOutline')) {
    content = `import { refreshOutline } from 'ionicons/icons';\n` + content;
  }

  // Add the button next to IonTitle
  const titleRegex = /(<IonTitle>[\s\S]*?<\/IonTitle>)/;
  if (titleRegex.test(content) && !content.includes('refreshOutline} />')) {
    content = content.replace(titleRegex, `$1\n          <IonButtons slot="end"><IonButton onClick={${p.fetchCall}}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>`);
  }

  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Patched', p.file);
});
