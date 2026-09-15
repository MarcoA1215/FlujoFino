const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

const replacement = `
      // Check if we have enough physical stock for everything
      let requiresPreparation = false;
      for (const itemDto of dto.items) {
        const product = await manager.findOne(Product, { 
          where: { id: itemDto.productId },
          relations: { comboItems: { component: true } }
        });
        if (product) {
          if (product.comboItems && product.comboItems.length > 0) {
            for (const ci of product.comboItems) {
              if (ci.component && ci.component.physicalStock < (itemDto.quantity * ci.quantity)) {
                requiresPreparation = true;
              }
            }
          } else {
            if (product.physicalStock < itemDto.quantity) {
              requiresPreparation = true;
            }
          }
        }
      }

      const initialStatus = requiresPreparation ? OrderStatus.PREPARING : OrderStatus.PENDING;

      const order = manager.create(Order, {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone || '',
        customerAddress: dto.customerAddress || '',
        notes: dto.notes || '',
        paymentStatus: dto.paymentStatus,
        status: initialStatus,`;

code = code.replace("const order = manager.create(Order, {", replacement);
// Ensure we don't duplicate if already replaced, but this is simple enough.
// Now replace the hardcoded status.
code = code.replace("status: OrderStatus.PENDING,", ""); 

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', code, 'utf8');
