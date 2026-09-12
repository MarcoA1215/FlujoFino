const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');
p = p.replace(/Registrar .*?rdida/g, 'Registrar Pérdida');
fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', p, 'utf8');

let m = fs.readFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', 'utf8');
m = m.replace(/P.*?rdida/g, 'Pérdida');
fs.writeFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', m, 'utf8');

let o = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
o = o.replace(/Pago M.*?vil/g, 'Pago Móvil');
o = o.replace(/Tel.*?fono/g, 'Teléfono');
o = o.replace(/C.*?dula/g, 'Cédula');
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', o, 'utf8');

let pos = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
pos = pos.replace(/Pago M.*?vil/g, 'Pago Móvil');
pos = pos.replace(/Tel.*?fono/g, 'Teléfono');
pos = pos.replace(/C.*?dula/g, 'Cédula');
pos = pos.replace(/M.*?todo/g, 'Método');
fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', pos, 'utf8');

