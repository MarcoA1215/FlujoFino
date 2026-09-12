const fs = require('fs');
let svc = fs.readFileSync('apps/backend/src/raw-materials/raw-materials.service.ts', 'utf8');

// Update findAll to only return active
if (!svc.includes('{ where: { isActive: true } }')) {
  svc = svc.replace(/findAll\(\) \{[\s\S]*?return this\.rawMaterialRepo\.find\(\);[\s\S]*?\}/, `findAll() {
    return this.rawMaterialRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }`);
}

// Add archive method
if (!svc.includes('archive(')) {
  const archiveMethod = `
  async archive(id: string) {
    await this.rawMaterialRepo.update(id, { isActive: false });
  }
`;
  svc = svc.replace(/}\s*$/, archiveMethod + '}\n');
}

fs.writeFileSync('apps/backend/src/raw-materials/raw-materials.service.ts', svc, 'utf8');
