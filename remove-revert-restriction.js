const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/production/production.service.ts', 'utf8');

const regex = /if \(product\.physicalStock < batch\.quantity\) \{[\s\S]*?\}\n/g;
code = code.replace(regex, "");

fs.writeFileSync('apps/backend/src/production/production.service.ts', code, 'utf8');
