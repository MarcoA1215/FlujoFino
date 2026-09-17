const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');
c = c.replace(/import \{ walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, basketOutline \} from 'ionicons\/icons';/, "import { walletOutline, trendingUpOutline, trendingDownOutline, alertCircleOutline, basketOutline, cartOutline } from 'ionicons/icons';");
fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', c);
