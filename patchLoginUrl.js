const fs = require('fs');
let file = fs.readFileSync('apps/frontend/src/pages/Login.tsx', 'utf8');
if (!file.includes('VITE_API_URL')) {
  file = file.replace(
    /<\/IonCardContent>/,
    "  <div style={{textAlign:'center', fontSize:'10px', color:'gray', marginTop:'10px'}}>API: {import.meta.env.VITE_API_URL || 'localhost:3001'}</div>\n        </IonCardContent>"
  );
  fs.writeFileSync('apps/frontend/src/pages/Login.tsx', file, 'utf8');
}
