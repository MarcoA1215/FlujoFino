const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('apps/backend/package.json', 'utf8'));
pkg.dependencies = pkg.dependencies || {};
pkg.dependencies['@nestjs/jwt'] = '^10.0.0';
pkg.dependencies['@nestjs/passport'] = '^10.0.0';
pkg.dependencies['passport-jwt'] = '^4.0.0';
pkg.dependencies['bcryptjs'] = '^2.4.3';

pkg.devDependencies = pkg.devDependencies || {};
pkg.devDependencies['@types/passport-jwt'] = '^3.0.0';
pkg.devDependencies['@types/bcryptjs'] = '^2.4.0';

fs.writeFileSync('apps/backend/package.json', JSON.stringify(pkg, null, 2), 'utf8');
