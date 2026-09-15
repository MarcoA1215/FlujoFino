const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.service.ts', 'utf8');

const replacement = `async update(id: string, dto: any) {
    return this.dataSource.transaction(async (manager) => {
      const oldProduct = await manager.findOne(Product, { where: { id }, relations: { comboItems: { component: true } } });
      const product = await manager.findOne(Product, { where: { id } });
      if (!product) throw new NotFoundException('Producto no encontrado');

      // Check if transitioning from PreAssembled to Virtual
      if (oldProduct.isPreAssembled && dto.isPreAssembled === false) {
        if (oldProduct.physicalStock > 0 || oldProduct.stockQuantity > 0) {
          // Unpack the inventory back to components
          if (oldProduct.comboItems && oldProduct.comboItems.length > 0) {
            for (const ci of oldProduct.comboItems) {
              if (ci.component) {
                if (oldProduct.physicalStock > 0) {
                  ci.component.physicalStock += ci.quantity * oldProduct.physicalStock;
                }
                if (oldProduct.stockQuantity > 0) {
                  ci.component.stockQuantity += ci.quantity * oldProduct.stockQuantity;
                }
                await manager.save(Product, ci.component);
              }
            }
          }
          product.physicalStock = 0;
          product.stockQuantity = 0;
        }
      }

      Object.assign(product, dto);
      return manager.save(Product, product);
    });
  }`;

code = code.replace(/async update\(id: string, dto: Partial<CreateProductDto>\) \{[\s\S]*?return this\.productRepo\.save\(product\);\s*\}/, replacement);

fs.writeFileSync('apps/backend/src/products/products.service.ts', code, 'utf8');
