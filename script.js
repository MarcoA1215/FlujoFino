const fs = require('fs');
const path = require('path');

const dir = 'apps/backend/src/entities';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.entity.ts'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  if (content.includes("'float'")) {
    modified = true;
    
    // Add import if not exists
    if (!content.includes('ColumnNumericTransformer')) {
      content = "import { ColumnNumericTransformer } from '../common/transformers/column-numeric.transformer';\n" + content;
    }

    // Replace @Column('float')
    content = content.replace(/@Column\('float'\)/g, "@Column('decimal', { precision: 12, scale: 2, default: 0, transformer: new ColumnNumericTransformer() })");
    
    // Replace @Column('float', { ... })
    content = content.replace(/@Column\('float',\s*\{([^}]*)\}\)/g, (match, inner) => {
      let newInner = inner;
      if (!newInner.includes('precision')) newInner += ', precision: 12';
      if (!newInner.includes('scale')) newInner += ', scale: 4'; 
      if (!newInner.includes('transformer')) newInner += ', transformer: new ColumnNumericTransformer()';
      return "@Column('decimal', {" + newInner + "})";
    });

    // Replace @Column({ type: 'float', ... })
    content = content.replace(/@Column\(\{\s*type:\s*'float'([^}]*)\}\)/g, (match, inner) => {
      let newInner = inner;
      if (!newInner.includes('precision')) newInner += ', precision: 12';
      if (!newInner.includes('scale')) newInner += ', scale: 2';
      if (!newInner.includes('transformer')) newInner += ', transformer: new ColumnNumericTransformer()';
      return "@Column({ type: 'decimal'" + newInner + " })";
    });
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log('Modified', file);
  }
}
