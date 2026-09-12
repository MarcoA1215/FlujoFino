const fs = require('fs');
let menu = fs.readFileSync('apps/frontend/src/components/Menu.tsx', 'utf8');
menu = menu.replace(/alertCircleOutline/g, "pieChartOutline");
fs.writeFileSync('apps/frontend/src/components/Menu.tsx', menu, 'utf8');
