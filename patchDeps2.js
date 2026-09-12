const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('apps/backend/package.json', 'utf8'));
pkg.dependencies['passport'] = '^0.7.0';
fs.writeFileSync('apps/backend/package.json', JSON.stringify(pkg, null, 2), 'utf8');
