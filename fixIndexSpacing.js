const fs = require('fs');
const fix = (file) => {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/@Index\(\)@Column/g, "@Index()\n  @Column");
  c = c.replace(/@Index\(\)@CreateDateColumn/g, "@Index()\n  @CreateDateColumn");
  fs.writeFileSync(file, c, 'utf8');
}
fix('apps/backend/src/entities/order.entity.ts');
fix('apps/backend/src/entities/product.entity.ts');
fix('apps/backend/src/entities/raw-material.entity.ts');
fix('apps/backend/src/entities/stock-movement.entity.ts');
