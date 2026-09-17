const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/Users.tsx', 'utf8');
c = c.replace(/<IonInput, IonToggle/g, "<IonInput");
fs.writeFileSync('apps/frontend/src/pages/Users.tsx', c);
