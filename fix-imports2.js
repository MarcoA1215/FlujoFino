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
    
    // Remove the explicit import I added at the top
    content = content.replace("import { ManyToOne, JoinColumn } from 'typeorm';\n", "");
    
    // Ensure the main import line has ManyToOne and JoinColumn without duplicates
    const importRegex = /import {([^}]+)} from 'typeorm';/;
    const match = content.match(importRegex);
    if (match) {
      let imports = match[1].split(',').map(s => s.trim());
      if (!imports.includes('ManyToOne')) imports.push('ManyToOne');
      if (!imports.includes('JoinColumn')) imports.push('JoinColumn');
      // Deduplicate
      imports = [...new Set(imports)];
      content = content.replace(importRegex, `import { ${imports.join(', ')} } from 'typeorm';`);
    }

    fs.writeFileSync(filePath, content);
  }
}
