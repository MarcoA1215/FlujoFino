const fs = require('fs');
let c = fs.readFileSync('packages/shared-types/src/index.ts', 'utf8');

if (!c.includes('UserRole')) {
  c += `
export enum UserRole {
  ADMIN = 'ADMIN',
  KITCHEN = 'KITCHEN',
  POS = 'POS',
  DELIVERY = 'DELIVERY',
  INVENTORY = 'INVENTORY'
}
`;
  fs.writeFileSync('packages/shared-types/src/index.ts', c, 'utf8');
}
