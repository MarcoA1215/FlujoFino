const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.service.ts', 'utf8');

// In update(id, dto)
/*
  async update(id: string, dto: UpdateProductDto) {
    return this.dataSource.transaction(async (manager) => {
*/
if (!code.includes("const oldProduct = await manager.findOne")) {
  code = code.replace(
    "const product = await manager.findOne(Product, { where: { id } });",
    `const oldProduct = await manager.findOne(Product, { where: { id }, relations: { comboItems: { component: true } } });
      const product = await manager.findOne(Product, { where: { id } });`
  );
  
  // Unpacking logic before save
  const unpackLogic = `
      // Check if transitioning from PreAssembled to Virtual
      if (oldProduct && oldProduct.isPreAssembled && dto.isPreAssembled === false) {
        if (oldProduct.physicalStock > 0 || oldProduct.stockQuantity > 0) {
          // Unpack the inventory back to components
          if (oldProduct.comboItems && oldProduct.comboItems.length > 0) {
            for (const ci of oldProduct.comboItems) {
              if (ci.component) {
                ci.component.physicalStock += ci.quantity * Math.max(0, oldProduct.physicalStock);
                ci.component.stockQuantity += ci.quantity * Math.max(0, oldProduct.stockQuantity);
                await manager.save(Product, ci.component);
              }
            }
          }
          product.physicalStock = 0;
          product.stockQuantity = 0;
        }
      }
      
      product.name = dto.name;
      product.description = dto.description;
      product.costPrice = dto.costPrice;
      product.salePrice = dto.salePrice;
      product.categoryId = dto.categoryId;
      product.isCombo = dto.isCombo;
      product.isPreAssembled = dto.isPreAssembled ?? false;
      product.barcode = dto.barcode;
      
      await manager.save(Product, product);
  `;
  
  code = code.replace(
    /product\.name = dto\.name;[\s\S]*?await manager\.save\(Product, product\);/,
    unpackLogic
  );
  
  // Create logic
  code = code.replace(
    /isCombo: dto\.isCombo,/,
    "isCombo: dto.isCombo,\n        isPreAssembled: dto.isPreAssembled ?? false,"
  );
  
  fs.writeFileSync('apps/backend/src/products/products.service.ts', code, 'utf8');
}
