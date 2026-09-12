const fs = require('fs');

// 1. Update AuthModule to set 365d expiration
let authModule = fs.readFileSync('apps/backend/src/auth/auth.module.ts', 'utf8');
authModule = authModule.replace(/expiresIn: '7d'/, "expiresIn: '365d'");
fs.writeFileSync('apps/backend/src/auth/auth.module.ts', authModule, 'utf8');
