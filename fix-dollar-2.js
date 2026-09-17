const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');
p = p.replace("Precio: $$", "Precio: $");
fs.writeFileSync('apps/frontend/src/pages/Products.tsx', p);
