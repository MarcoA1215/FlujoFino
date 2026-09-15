const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

// We need to replace } else { with } else if (!product.isCombo) { in 4 specific places.

// 1. In createOrder - requiresPreparation check
code = code.replace(
  /} else {\s*if \(product\.stockQuantity < itemDto\.quantity\) {\s*requiresPreparation = true;\s*}\s*}/g,
  `} else if (!product.isCombo) {
            if (product.stockQuantity < itemDto.quantity) {
              requiresPreparation = true;
            }
          }`
);

// 2. In createOrder - stockQuantity deduction
code = code.replace(
  /} else {\s*product\.stockQuantity -= itemDto\.quantity;\s*await manager\.save\(Product, product\);\s*}/g,
  `} else if (!product.isCombo) {
            product.stockQuantity -= itemDto.quantity;
            await manager.save(Product, product);
          }`
);

// 3. In updateOrderStatus - physicalStock deduction
code = code.replace(
  /} else {\s*if \(product\.physicalStock < item\.quantity\) {\s*throw new BadRequestException\('Falta stock f\u00edsico para entregar'\);\s*}\s*product\.physicalStock -= item\.quantity;\s*await manager\.save\(Product, product\);\s*}/g,
  `} else if (!product.isCombo) {
                if (product.physicalStock < item.quantity) {
                  throw new BadRequestException('Falta stock físico para entregar');
                }
                product.physicalStock -= item.quantity;
                await manager.save(Product, product);
              }`
);

// 4. In updateOrderStatus - restore stockQuantity
code = code.replace(
  /} else {\s*product\.stockQuantity \+= item\.quantity;/g,
  `} else if (!product.isCombo) {
                product.stockQuantity += item.quantity;`
);

// 5. In autoAllocatePhysicalStock
code = code.replace(
  /} else {\s*const currentPhysical = physicalStockMap\.get\(product\.id\) \|\| 0;\s*if \(currentPhysical < item\.quantity\) {/g,
  `} else if (!product.isCombo) {
              const currentPhysical = physicalStockMap.get(product.id) || 0;
              if (currentPhysical < item.quantity) {`
);

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', code, 'utf8');
