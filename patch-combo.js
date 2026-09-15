const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

// Replace the fallback condition
// We want to skip stock checks if (product.isCombo && (!product.comboItems || product.comboItems.length === 0))

// In updateOrderStatus (DELIVERED check)
code = code.replace(
  `} else {
                if (product.physicalStock < item.quantity) {`,
  `} else if (!product.isCombo) {
                if (product.physicalStock < item.quantity) {`
);

code = code.replace(
  `product.physicalStock -= item.quantity;
                await manager.save(Product, product);
              }`,
  `product.physicalStock -= item.quantity;
                await manager.save(Product, product);
              }`
);

// In createOrder (PREPARING check)
code = code.replace(
  `} else {
            if (product.stockQuantity < itemDto.quantity) {`,
  `} else if (!product.isCombo) {
            if (product.stockQuantity < itemDto.quantity) {`
);

code = code.replace(
  `          } else {
            product.stockQuantity -= itemDto.quantity;
            await manager.save(Product, product);
          }`,
  `          } else if (!product.isCombo) {
            product.stockQuantity -= itemDto.quantity;
            await manager.save(Product, product);
          }`
);


// In autoAllocatePhysicalStock
code = code.replace(
  `} else {
              const currentPhysical = physicalStockMap.get(product.id) || 0;`,
  `} else if (!product.isCombo) {
              const currentPhysical = physicalStockMap.get(product.id) || 0;`
);

// In updateOrderStatus (Restore stock check)
code = code.replace(
  `} else {
                product.stockQuantity += item.quantity;`,
  `} else if (!product.isCombo) {
                product.stockQuantity += item.quantity;`
);

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', code, 'utf8');
