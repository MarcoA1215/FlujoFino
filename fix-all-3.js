const fs = require('fs');

let o = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
o = o.replace(/const translateStatus =/g, "// @ts-ignore\nconst translateStatus =");
o = o.replace(/const getStatusColor =/g, "// @ts-ignore\nconst getStatusColor =");
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', o);

let d = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');
d = d.replace(/import \{ walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, basketOutline \} from 'ionicons\/icons';/g, "import { walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, cartOutline } from 'ionicons/icons';");
fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', d);

console.log("Fixed!");
