const fs = require('fs');
let orderContent = fs.readFileSync('apps/backend/src/entities/order.entity.ts', 'utf8');

orderContent = orderContent.replace("  tenantId: string;\n\n}\n\n  @Column('float', { default: 0 })", "  tenantId: string;\n\n  @Column('float', { default: 0 })");
fs.writeFileSync('apps/backend/src/entities/order.entity.ts', orderContent);
console.log("Fixed order.entity.ts");
