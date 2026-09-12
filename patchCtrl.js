const fs = require('fs');
let ctrl = fs.readFileSync('apps/backend/src/raw-materials/raw-materials.controller.ts', 'utf8');

// Add archive endpoint
if (!ctrl.includes('@Patch(\':id/archive\')')) {
  const archiveEndpoint = `
  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.rawMaterialsService.archive(id);
  }
`;
  ctrl = ctrl.replace(/}\s*$/, archiveEndpoint + '}\n');
  
  // ensure Patch is imported
  if (!ctrl.includes('Patch')) {
    ctrl = ctrl.replace(/Get, Post, Body, Param/, 'Get, Post, Body, Param, Patch');
  }
}

fs.writeFileSync('apps/backend/src/raw-materials/raw-materials.controller.ts', ctrl, 'utf8');
