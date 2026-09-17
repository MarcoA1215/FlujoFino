const fs = require('fs');

let c = fs.readFileSync('apps/backend/src/entities/settings.entity.ts', 'utf8');
if (!c.includes('allowPartialPayments')) {
  c = c.replace(/companyPhone: string;/, "companyPhone: string;\n\n  @Column('boolean', { default: false })\n  allowPartialPayments: boolean;");
  fs.writeFileSync('apps/backend/src/entities/settings.entity.ts', c);
  console.log("Updated settings entity");
}
