const fs = require('fs');
let c = fs.readFileSync('src/app.module.ts', 'utf8');
c = c.replace(/\uFFFD/g, ''); // replace replacement character
c = c.replace(/^\uFEFF/, ''); // replace BOM
fs.writeFileSync('src/app.module.ts', c, 'utf8');
