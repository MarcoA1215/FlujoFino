const fs = require('fs');
let login = fs.readFileSync('apps/frontend/src/pages/Login.tsx', 'utf8');
login = login.replace(/router\.push\('\/', 'root', 'replace'\);/, "router.push('/dashboard', 'root', 'replace');");
fs.writeFileSync('apps/frontend/src/pages/Login.tsx', login, 'utf8');
