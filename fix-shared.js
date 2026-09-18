const fs = require('fs');

let t = fs.readFileSync('packages/shared-types/src/index.ts', 'utf8');

t = t.replace(/export enum PaymentStatus \{/, `export enum PaymentStatus {\n  PARTIAL = 'PARTIAL',`);

fs.writeFileSync('packages/shared-types/src/index.ts', t);
console.log('Added PARTIAL to PaymentStatus');
