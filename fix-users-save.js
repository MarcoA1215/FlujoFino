const fs = require('fs');

let u = fs.readFileSync('apps/frontend/src/pages/Users.tsx', 'utf8');

u = u.replace(/await apiClient\.put\('\/settings', \{\s*companyBank: settings\.companyBank,\s*companyCedula: settings\.companyCedula,\s*companyPhone: settings\.companyPhone\s*\}\);/,
`await apiClient.put('/settings', { 
          companyBank: settings.companyBank, 
          companyCedula: settings.companyCedula, 
          companyPhone: settings.companyPhone,
          allowPartialPayments: settings.allowPartialPayments
        });`);

fs.writeFileSync('apps/frontend/src/pages/Users.tsx', u);
console.log('Fixed Users.tsx save settings');
