const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/production/production.service.ts', 'utf8');

// 1. Put restriction back
const revertStr = "async revertBatch(batchId: string) {";
const batchFindEnd = "if (!product) throw new BadRequestException('Producto asociado no encontrado');";

if (!code.includes("No se puede revertir este lote porque el stock")) {
  code = code.replace(
    batchFindEnd,
    batchFindEnd + `\n\n        if (product.physicalStock < batch.quantity) {
          throw new BadRequestException(\`No se puede revertir este lote porque el stock físico actual (\${product.physicalStock}) es menor a la cantidad del lote (\${batch.quantity}). Esto significa que los productos de este lote ya fueron entregados a clientes.\`);
        }`
  );
}

// 2. Add auto-allocate hook to revertBatch
if (!code.includes("this.ordersService.autoAllocatePhysicalStock();\n        return { success: true };")) {
  code = code.replace(
    "return { success: true };",
    "await this.ordersService.autoAllocatePhysicalStock();\n        return { success: true };"
  );
}

fs.writeFileSync('apps/backend/src/production/production.service.ts', code, 'utf8');
