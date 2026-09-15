const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.service.ts', 'utf8');

if (!code.includes("async unpackKit")) {
  const unpackLogic = `
  async unpackKit(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, { 
        where: { id },
        relations: { comboItems: { component: true } }
      });
      
      if (!product) throw new NotFoundException('Producto no encontrado');
      if (!product.isCombo || !product.isPreAssembled) {
        throw new BadRequestException('Solo se pueden desarmar combos físicos (pre-ensamblados)');
      }
      if (product.physicalStock < 1 || product.stockQuantity < 1) {
        throw new BadRequestException('No hay stock físico de este kit para desarmar');
      }

      // Restar 1 al combo
      product.physicalStock -= 1;
      product.stockQuantity -= 1;
      await manager.save(Product, product);

      // Devolver componentes
      if (product.comboItems && product.comboItems.length > 0) {
        for (const ci of product.comboItems) {
          if (ci.component) {
            ci.component.physicalStock += ci.quantity;
            ci.component.stockQuantity += ci.quantity;
            await manager.save(Product, ci.component);
          }
        }
      }

      return { success: true, message: 'Kit desarmado correctamente' };
    });
  }
`;

  code = code.replace(
    /async getRecipeAndCost/,
    unpackLogic + "\n  async getRecipeAndCost"
  );
  
  // also need to import BadRequestException if not there, but it probably is.
  fs.writeFileSync('apps/backend/src/products/products.service.ts', code, 'utf8');
}
