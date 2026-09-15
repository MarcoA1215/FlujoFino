const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/entities/product.entity.ts', 'utf8');

if (!code.includes("isPreAssembled")) {
  code = code.replace(
    "@Column({ default: false })\n  isCombo: boolean;",
    "@Column({ default: false })\n  isCombo: boolean;\n\n  @Column({ default: false })\n  isPreAssembled: boolean;"
  );
  fs.writeFileSync('apps/backend/src/entities/product.entity.ts', code, 'utf8');
}
