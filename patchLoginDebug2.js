const fs = require('fs');
let login = fs.readFileSync('apps/frontend/src/pages/Login.tsx', 'utf8');
login = login.replace(/catch \(e\)/, "catch (e: any)");
fs.writeFileSync('apps/frontend/src/pages/Login.tsx', login, 'utf8');
