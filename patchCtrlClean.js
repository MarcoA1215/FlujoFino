const fs = require('fs');
let ctrl = fs.readFileSync('apps/backend/src/raw-materials/raw-materials.controller.ts', 'utf8');

// replace the entire top import line
ctrl = ctrl.replace(/import\s*\{\s*Controller.*?\}\s*from\s*'@nestjs\/common';/, "import { Controller, Get, Post, Put, Body, Param, Patch } from '@nestjs/common';");

if (!ctrl.includes('@Patch(\':id/archive\')')) {
  const archiveEndpoint = `
  @Patch(':id/archive')
  archive(@Param('id') id: string) {
    return this.rawMaterialsService.archive(id);
  }
`;
  ctrl = ctrl.replace(/}\s*$/, archiveEndpoint + '}\n');
}

fs.writeFileSync('apps/backend/src/raw-materials/raw-materials.controller.ts', ctrl, 'utf8');
