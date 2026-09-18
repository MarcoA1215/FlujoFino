const fs = require('fs');
console.log(fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8').substring(0, 1500));
