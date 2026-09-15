const fs = require('fs');
let code = fs.readFileSync('packages/shared-types/src/index.ts', 'utf8');

if (!code.includes("isPreAssembled?: boolean;")) {
  code = code.replace(
    "isCombo: boolean;",
    "isCombo: boolean;\n  isPreAssembled?: boolean;"
  );
  fs.writeFileSync('packages/shared-types/src/index.ts', code, 'utf8');
}
