const fs = require('fs');

// 1. Update Entity
let productEntity = fs.readFileSync('apps/backend/src/entities/product.entity.ts', 'utf8');
if (!productEntity.includes("physicalStock: number;")) {
  productEntity = productEntity.replace(
    "@Column('float', { default: 0 })\n  stockQuantity: number;",
    "@Column('float', { default: 0 })\n  stockQuantity: number;\n\n  @Column('float', { default: 0 })\n  physicalStock: number;"
  );
  fs.writeFileSync('apps/backend/src/entities/product.entity.ts', productEntity, 'utf8');
}
