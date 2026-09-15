const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

// The block in createOrder (stockQuantity deduction):
/*
            if (product.recipe && product.recipe.length > 0) {
              // ...
            }
          } else {
            product.stockQuantity -= itemDto.quantity;
            await manager.save(Product, product);
          }
*/
code = code.replace(
  /\} else \{\s*product\.stockQuantity -= itemDto\.quantity;\s*await manager\.save\(Product, product\);\s*\}/g,
  `} else if (!product.isCombo) {
            product.stockQuantity -= itemDto.quantity;
            await manager.save(Product, product);
          }`
);

// The block in createOrder (requiresPreparation check):
code = code.replace(
  /\} else \{\s*if \(product\.stockQuantity < itemDto\.quantity\) \{\s*requiresPreparation = true;\s*\}\s*\}/g,
  `} else if (!product.isCombo) {
            if (product.stockQuantity < itemDto.quantity) {
              requiresPreparation = true;
            }
          }`
);

// The block in updateOrderStatus (DELIVERED physicalStock check):
code = code.replace(
  /\} else \{\s*if \(product\.physicalStock < item\.quantity\) \{\s*throw new BadRequestException\('Falta stock f\\u00edsico para entregar'\);\s*\}\s*product\.physicalStock -= item\.quantity;\s*await manager\.save\(Product, product\);\s*\}/g,
  `} else if (!product.isCombo) {
                if (product.physicalStock < item.quantity) {
                  throw new BadRequestException('Falta stock físico para entregar');
                }
                product.physicalStock -= item.quantity;
                await manager.save(Product, product);
              }`
);
// Also need to handle the actual bytes for í if it fails.
// Let's just use a simpler replacement for updateOrderStatus (DELIVERED)

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', code, 'utf8');
console.log("Done");
