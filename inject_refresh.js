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

  // Fix my previous broken replace on Orders.tsx
  content = content.replace(/import \{ refreshOutline,  /g, 'import { ');

  if (content.includes('ionicons/icons') && !content.includes('refreshOutline')) {
    content = content.replace(/} from 'ionicons\/icons';/, ', refreshOutline } from \'ionicons/icons\';');
  } else if (!content.includes('ionicons/icons') && !content.includes('refreshOutline')) {
    content = `import { refreshOutline } from 'ionicons/icons';\n` + content;
  }

  const titleRegex = /(<IonTitle>.*?<\/IonTitle>)/;
  if (titleRegex.test(content) && !content.includes('refreshOutline} />')) {
    content = content.replace(titleRegex, `$1\n          <IonButtons slot="end"><IonButton onClick={${p.fetchCall}}><IonIcon icon={refreshOutline} /></IonButton></IonButtons>`);
  }

  if (p.file === 'Orders.tsx' && !content.includes('setInterval')) {
    content = content.replace(/useEffect\(\(\) => \{([\s\S]*?)\}, \[\]\);/, `useEffect(() => {$1\n    const interval = setInterval(() => { fetchOrders(); }, 15000);\n    return () => clearInterval(interval);\n  }, []);`);
  }

  fs.writeFileSync(filepath, content, 'utf8');
  console.log('Patched', p.file);
});
