const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

const newMethod = `
  async autoAllocatePhysicalStock() {
    // This is the intelligent FIFO routing system
    return this.dataSource.transaction(async (manager) => {
      // 1. Get all active orders (PENDING and PREPARING) ordered by creation date (FIFO)
      const activeOrders = await manager.find(Order, {
        where: [
          { status: OrderStatus.PENDING },
          { status: OrderStatus.PREPARING }
        ],
        order: { createdAt: 'ASC' },
        relations: { items: true }
      });

      // 2. We need a fast lookup for physical stock
      const products = await manager.find(Product, {
        relations: { comboItems: { component: true } }
      });
      const physicalStockMap = new Map<string, number>();
      for (const p of products) {
        physicalStockMap.set(p.id, p.physicalStock);
      }

      let changes = 0;

      // 3. Evaluate each order in FIFO order
      for (const order of activeOrders) {
        let canFulfill = true;

        // Simulate deducting from our virtual physicalStockMap
        const deductions = new Map<string, number>();

        for (const item of order.items) {
          const product = products.find(p => p.id === item.productId);
          if (!product) continue;

          if (product.comboItems && product.comboItems.length > 0) {
            for (const ci of product.comboItems) {
              if (ci.component) {
                const currentPhysical = physicalStockMap.get(ci.component.id) || 0;
                const required = item.quantity * ci.quantity;
                if (currentPhysical < required) {
                  canFulfill = false;
                  break;
                }
                deductions.set(ci.component.id, (deductions.get(ci.component.id) || 0) + required);
              }
            }
          } else {
            const currentPhysical = physicalStockMap.get(product.id) || 0;
            if (currentPhysical < item.quantity) {
              canFulfill = false;
            } else {
              deductions.set(product.id, (deductions.get(product.id) || 0) + item.quantity);
            }
          }
          if (!canFulfill) break;
        }

        if (canFulfill) {
          // Commit deductions to our tracking map so subsequent orders see less stock
          for (const [pId, amount] of deductions.entries()) {
            physicalStockMap.set(pId, (physicalStockMap.get(pId) || 0) - amount);
          }
          
          if (order.status !== OrderStatus.PENDING) {
            order.status = OrderStatus.PENDING;
            await manager.save(Order, order);
            changes++;
          }
        } else {
          // If it CANNOT be fulfilled, and it's currently PENDING, it must be downgraded to PREPARING
          if (order.status !== OrderStatus.PREPARING) {
            order.status = OrderStatus.PREPARING;
            await manager.save(Order, order);
            changes++;
          }
        }
      }

      return { success: true, processedOrders: activeOrders.length, statusChanges: changes };
    });
  }
`;

const insertIndex = code.lastIndexOf('}');
code = code.substring(0, insertIndex) + newMethod + '\n}';
fs.writeFileSync('apps/backend/src/orders/orders.service.ts', code, 'utf8');

let ctrlCode = fs.readFileSync('apps/backend/src/orders/orders.controller.ts', 'utf8');
const ctrlInsert = `
  @Get('auto-allocate')
  autoAllocate() {
    return this.ordersService.autoAllocatePhysicalStock();
  }
`;
const ctrlEnd = ctrlCode.lastIndexOf('}');
ctrlCode = ctrlCode.substring(0, ctrlEnd) + ctrlInsert + '\n}';
fs.writeFileSync('apps/backend/src/orders/orders.controller.ts', ctrlCode, 'utf8');
