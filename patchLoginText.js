const fs = require('fs');
let file = fs.readFileSync('apps/frontend/src/pages/Login.tsx', 'utf8');
file = file.replace(/localhost:3001/g, "https://nutrideli.onrender.com");
fs.writeFileSync('apps/frontend/src/pages/Login.tsx', file, 'utf8');
