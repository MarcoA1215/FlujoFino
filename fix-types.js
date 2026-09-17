const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/Users.tsx', 'utf8');
c = c.replace(/IonInput/g, "IonInput, IonToggle");
c = c.replace(/companyPhone\?: string;/, "companyPhone?: string;\n  allowPartialPayments?: boolean;");
fs.writeFileSync('apps/frontend/src/pages/Users.tsx', c);

c = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
c = c.replace(/deliveryFee\?: number;/, "deliveryFee?: number;\n  abonosTotal?: number;\n  abonosHistory?: any[];");
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', c);
