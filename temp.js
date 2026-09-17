const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
let idx = c.indexOf('const showOrderInfo');
console.log(c.substring(idx, idx + 1200));
