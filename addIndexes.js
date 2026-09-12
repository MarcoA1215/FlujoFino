const fs = require('fs');

const addIndexToEntity = (file, indexes) => {
  let c = fs.readFileSync(file, 'utf8');
  if (!c.includes('import { Index')) {
    c = c.replace("import { Entity,", "import { Entity, Index,");
  }
  
  indexes.forEach(idx => {
    // Look for the column definition and put @Index() above it if not already there
    const colRegex = new RegExp(`(@Column\\([^)]*\\)|@CreateDateColumn\\([^)]*\\))\\s*${idx.field}\\s*:`, 'g');
    if (!c.includes(`@Index('${idx.name}')`) && !c.includes(`@Index()\\s*@Column\\([\\s\\S]*?\\)\\s*${idx.field}`) && !c.includes(`@Index()\\r?\\n  @Column\\([\\s\\S]*?\\)\\r?\\n  ${idx.field}`)) {
      c = c.replace(new RegExp(`(@Column\\([^)]*\\)|@CreateDateColumn\\([^)]*\\))(\\s*${idx.field}\\s*:)`), `@Index()$1$2`);
    }
  });
  
  fs.writeFileSync(file, c, 'utf8');
};

addIndexToEntity('apps/backend/src/entities/order.entity.ts', [
  { field: 'createdAt' },
  { field: 'status' },
  { field: 'paymentStatus' }
]);

addIndexToEntity('apps/backend/src/entities/product.entity.ts', [
  { field: 'name' },
  { field: 'category' }
]);

addIndexToEntity('apps/backend/src/entities/raw-material.entity.ts', [
  { field: 'name' }
]);

addIndexToEntity('apps/backend/src/entities/stock-movement.entity.ts', [
  { field: 'createdAt' },
  { field: 'type' }
]);
