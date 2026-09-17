const fs = require('fs');

let c = fs.readFileSync('apps/backend/src/entities/order.entity.ts', 'utf8');
if (!c.includes('abonosTotal')) {
  c = c.replace(/items: OrderItem\[\];/, 
`items: OrderItem[];

  @Column('float', { default: 0 })
  abonosTotal: number;

  @Column('json', { nullable: true })
  abonosHistory: any;`);
  fs.writeFileSync('apps/backend/src/entities/order.entity.ts', c);
  console.log("Updated order entity");
}
