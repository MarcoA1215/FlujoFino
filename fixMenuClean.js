const fs = require('fs');

let m = 'apps/frontend/src/components/Menu.tsx';
let c = fs.readFileSync(m, 'utf8');

c = c.replace(/Producci.*?n/g, 'Producción');
c = c.replace(/Configuraci.*?n/g, 'Configuración');
c = c.replace(/Gesti.*?n/g, 'Gestión');

fs.writeFileSync(m, c, 'utf8');

// For RawMaterials.tsx
let rm = 'apps/frontend/src/pages/RawMaterials.tsx';
let rmc = fs.readFileSync(rm, 'utf8');
rmc = rmc.replace(/Materia Prima\)/g, 'Materia Prima)'); // It's fine already
fs.writeFileSync(rm, rmc, 'utf8');
