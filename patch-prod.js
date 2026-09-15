const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/production/production.service.ts', 'utf8');

// In createBatch:
/*
      const product = await manager.findOne(Product, {
        where: { id: productId },
        relations: { recipe: { rawMaterial: true } },
      });

      if (!product) throw new BadRequestException('Producto no encontrado');
      if (!product.recipe || product.recipe.length === 0) {
        throw new BadRequestException('El producto no tiene receta configurada.');
      }
*/
const productionLogic = `
      const product = await manager.findOne(Product, {
        where: { id: productId },
        relations: { recipe: { rawMaterial: true }, comboItems: { component: true } },
      });

      if (!product) throw new BadRequestException('Producto no encontrado');
      
      let totalBatchCost = 0;
      
      if (product.isCombo) {
        if (!product.isPreAssembled) {
          throw new BadRequestException('No se puede producir un combo virtual. Marque el combo como Pre-ensamblado.');
        }
        if (!product.comboItems || product.comboItems.length === 0) {
          throw new BadRequestException('El combo no tiene componentes configurados.');
        }
        
        // 1. Validar stock de componentes
        const missing = [];
        for (const ci of product.comboItems) {
          const required = ci.quantity * quantityToProduce;
          if (!ci.component) continue;
          if (ci.component.physicalStock < required) {
            missing.push(\`\${ci.component.name} (Faltan \${required - ci.component.physicalStock})\`);
          }
        }
        if (missing.length > 0) {
          throw new BadRequestException('Stock físico insuficiente de componentes: ' + missing.join(', '));
        }
        
        // 2. Descontar componentes
        for (const ci of product.comboItems) {
          const required = ci.quantity * quantityToProduce;
          if (!ci.component) continue;
          
          ci.component.physicalStock -= required;
          ci.component.stockQuantity -= required;
          await manager.save(Product, ci.component);
          
          totalBatchCost += required * (ci.component.costPrice || 0);
        }
        
      } else {
        if (!product.recipe || product.recipe.length === 0) {
          throw new BadRequestException('El producto no tiene receta configurada.');
        }

        // 1. Validar stock de Materia Prima
`;

code = code.replace(/const product = await manager\.findOne\(Product, \{[\s\S]*?\/\/ 1\. Validar stock de Materia Prima/g, productionLogic);

// Wait, the else block needs to end. It ends before `// 2. Crear lote y actualizar stock`
const closeElse = `
        }
      } // fin else (no es combo)

      // 2. Crear lote y actualizar stock
`;

code = code.replace(/\s*await manager\.save\(StockMovement, mov\);\s*\}\s*\}\s*\/\/\ 2\. Crear lote/g, `
            await manager.save(StockMovement, mov);
          }
        }
      }

      // 2. Crear lote
`);

// Same for revertBatch
// Add restoring components
const revertLogic = `
      if (product.isCombo && product.isPreAssembled) {
        if (product.comboItems && product.comboItems.length > 0) {
          for (const ci of product.comboItems) {
            if (ci.component) {
              ci.component.physicalStock += ci.quantity * batch.quantity;
              ci.component.stockQuantity += ci.quantity * batch.quantity;
              await manager.save(Product, ci.component);
            }
          }
        }
      } else {
        if (product.recipe && product.recipe.length > 0) {
`;

code = code.replace(/if \(product\.recipe && product\.recipe\.length > 0\) \{/g, revertLogic);
code = code.replace(/await manager\.save\(StockMovement, mov\);\s*\}\s*\}\s*\}\s*await this\.ordersService/g, `await manager.save(StockMovement, mov); } } } } await this.ordersService`);

// Also change relations to include comboItems in revertBatch
code = code.replace(/relations: \{ recipe: \{ rawMaterial: true \} \}/g, "relations: { recipe: { rawMaterial: true }, comboItems: { component: true } }");

fs.writeFileSync('apps/backend/src/production/production.service.ts', code, 'utf8');
