const fs = require('fs');
let ent = fs.readFileSync('apps/backend/src/entities/raw-material.entity.ts', 'utf8');
if (!ent.includes('isActive')) {
  ent = ent.replace(/createdAt:\s*Date;/, "@Column({ default: true })\n  isActive: boolean;\n\n  @CreateDateColumn()\n  createdAt: Date;");
  fs.writeFileSync('apps/backend/src/entities/raw-material.entity.ts', ent, 'utf8');
}

let ctrl = fs.readFileSync('apps/backend/src/raw-materials/raw-materials.controller.ts', 'utf8');
if (!ctrl.includes('Patch, ')) {
  ctrl = ctrl.replace(/@nestjs\/common';/, "Patch, } from '@nestjs/common';");
  ctrl = ctrl.replace(/}\s*from '@nestjs\/common';/, " } from '@nestjs/common';");
  fs.writeFileSync('apps/backend/src/raw-materials/raw-materials.controller.ts', ctrl, 'utf8');
}
