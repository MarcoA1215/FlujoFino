const fs = require('fs');

let f = 'apps/frontend/src/components/products/ProductCard.tsx';
let c = fs.readFileSync(f, 'utf8');

c = c.replace(/import\s*\{\s*pencilOutline\s*\}\s*from\s*'ionicons\/icons';\r?\n?/g, '');
c = "import { pencilOutline, trashOutline } from 'ionicons/icons';\n" + c;

c = c.replace(/Sin categor.*?a/g, 'Sin categoría');
c = c.replace(/categor.*?a'/g, "categoría'");
c = c.replace(/} .*? {p.isCombo/g, "} - {p.isCombo");
c = c.replace(/<IonButton fill="clear" size="small" color="danger" onClick=\{\(\) => onDelete\(p\)\}.*?<\/IonButton>/g, '<IonButton fill="clear" size="small" color="danger" onClick={() => onDelete(p)} style={{ margin: 0, width: "30px", height: "30px" }}><IonIcon icon={trashOutline} slot="icon-only" /></IonButton>');

fs.writeFileSync(f, c, 'utf8');

let p = 'apps/frontend/src/pages/Products.tsx';
let pc = fs.readFileSync(p, 'utf8');
pc = pc.replace(/Cat.*?logo/g, 'Catálogo');
pc = pc.replace(/Categor.*?a/g, 'Categoría');
pc = pc.replace(/Eliminaci.*?n/g, 'Eliminación');
pc = pc.replace(/Est.*?s seguro/g, '¿Estás seguro');
pc = pc.replace(/hist.*?ricos/g, 'históricos');
pc = pc.replace(/mantendr.*?n/g, 'mantendrán');
fs.writeFileSync(p, pc, 'utf8');

