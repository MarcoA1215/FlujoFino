const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');
const lines = c.split('\n');
for (let i=0; i<lines.length; i++) {
  if (lines[i].includes('const RawMaterialCard')) {
    console.log(lines.slice(i, i+50).join('\n'));
    break;
  }
}
