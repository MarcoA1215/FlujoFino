const fs = require('fs');
let d = fs.readFileSync('apps/frontend/src/pages/Dashboard.tsx', 'utf8');

d = d.replace(/import \{ refreshOutline \} from 'ionicons\/icons';\r?\n/, '');

fs.writeFileSync('apps/frontend/src/pages/Dashboard.tsx', d);
console.log('Removed duplicate import');
