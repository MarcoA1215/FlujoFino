const fs = require('fs');
let content = fs.readFileSync('apps/frontend/src/pages/Login.tsx', 'utf8');
content = content.replace(/<div style=\{\{textAlign:'center', fontSize:'10px', color:'gray', marginTop:'10px'\}\}>API: \{import\.meta\.env\.VITE_API_URL \|\| 'https:\/\/nutrideli\.onrender\.com'\}<\/div>/g, '');
fs.writeFileSync('apps/frontend/src/pages/Login.tsx', content, 'utf8');
