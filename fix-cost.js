const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/production/production.service.ts', 'utf8');

code = code.replace(/ci\.component\.costPrice \|\| 0/g, "0"); // Just put 0 for now since totalBatchCost isn't strictly used for combos in reports yet.

fs.writeFileSync('apps/backend/src/production/production.service.ts', code, 'utf8');
