const fs = require('fs');
const path = require('path');
const entitiesDir = path.join(__dirname, 'apps/backend/src/entities');

const entitiesToUpdate = [
  'product.entity.ts',
  'order.entity.ts',
  'raw-material.entity.ts',
  'production-batch.entity.ts',
  'stock-movement.entity.ts',
  'settings.entity.ts',
  'delivery-zone.entity.ts'
];

for (const file of entitiesToUpdate) {
  const filePath = path.join(entitiesDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Quick fix for imports
    if (!content.includes('import { ManyToOne')) {
      content = `import { ManyToOne, JoinColumn } from 'typeorm';\n` + content;
    }
    
    fs.writeFileSync(filePath, content);
  }
}
