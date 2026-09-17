const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/Users.tsx', 'utf8');
c = c.replace(/onIonInput, IonToggle/g, "onIonInput");
fs.writeFileSync('apps/frontend/src/pages/Users.tsx', c);
