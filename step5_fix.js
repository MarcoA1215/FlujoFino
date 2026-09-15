const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.service.ts', 'utf8');

const endOfClass = code.lastIndexOf('}');
const newMethod = `
  async migratePhysicalStock() {
    const reservedDirect = await this.dataSource.query(\`
      SELECT i."productId", SUM(i.quantity) as reserved
      FROM order_item i
      JOIN "order" o ON o.id = i."orderId"
      WHERE o.status IN ('PENDING', 'PREPARING')
      GROUP BY i."productId"
    \`);
    
    const reservedCombos = await this.dataSource.query(\`
      SELECT ci."componentId" as "productId", SUM(i.quantity * ci.quantity) as reserved
      FROM order_item i
      JOIN "order" o ON o.id = i."orderId"
      JOIN combo_item ci ON ci."comboId" = i."productId"
      WHERE o.status IN ('PENDING', 'PREPARING')
      GROUP BY ci."componentId"
    \`);

    const reservedMap: Record<string, number> = {};
    for (const row of reservedDirect) {
      reservedMap[row.productId] = (reservedMap[row.productId] || 0) + Number(row.reserved);
    }
    for (const row of reservedCombos) {
      reservedMap[row.productId] = (reservedMap[row.productId] || 0) + Number(row.reserved);
    }

    const products = await this.productRepo.find();
    for (const p of products) {
      const reserved = reservedMap[p.id] || 0;
      p.physicalStock = p.stockQuantity + reserved;
      await this.productRepo.save(p);
    }
    return { success: true, migratedCount: products.length };
  }
`;

code = code.substring(0, endOfClass) + newMethod + '\n}';
fs.writeFileSync('apps/backend/src/products/products.service.ts', code, 'utf8');
