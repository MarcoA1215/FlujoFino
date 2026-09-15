const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

const startStr = "async updateOrderStatus(id: string, status: OrderStatus) {";
const endStr = "async cloneOrder(id: string) {";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

const newFn = `async updateOrderStatus(id: string, status: OrderStatus) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { id },
        relations: { items: true } 
      });
      
      if (!order) throw new BadRequestException('Pedido no encontrado');
      if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido ya está cancelado');

      if (status === OrderStatus.DELIVERED) {
        for (const item of order.items) {
          const product = await manager.findOne(Product, { 
            where: { id: item.productId },
            relations: { comboItems: { component: true } }
          });
          if (product) {
            if (product.comboItems && product.comboItems.length > 0) {
              for (const ci of product.comboItems) {
                if (ci.component) {
                  if (ci.component.physicalStock < (item.quantity * ci.quantity)) {
                    throw new BadRequestException('Falta stock físico para entregar');
                  }
                  ci.component.physicalStock -= (item.quantity * ci.quantity);
                  await manager.save(Product, ci.component);
                }
              }
            } else {
              if (product.physicalStock < item.quantity) {
                throw new BadRequestException('Falta stock físico para entregar');
              }
              product.physicalStock -= item.quantity;
              await manager.save(Product, product);
            }
          }
        }
      }

      if (status === OrderStatus.CANCELED) {
        // Reverse inventory
        for (const item of order.items) {
          const product = await manager.findOne(Product, { 
            where: { id: item.productId },
            relations: { comboItems: { component: true }, recipe: { rawMaterial: true } }
          });
          
          if (product) {
            if (product.comboItems && product.comboItems.length > 0) {
              // Restore combo components
              for (const ci of product.comboItems) {
                if (ci.component) {
                  ci.component.stockQuantity += (item.quantity * ci.quantity);
                  if (order.status === OrderStatus.DELIVERED) {
                     ci.component.physicalStock += (item.quantity * ci.quantity);
                  }
                  await manager.save(Product, ci.component);
                }
              }
              // Restore raw materials
              if (product.recipe && product.recipe.length > 0) {
                for (const ri of product.recipe) {
                  if (ri.rawMaterial) {
                    ri.rawMaterial.stockQuantity += (item.quantity * ri.quantity);
                    await manager.save(RawMaterial, ri.rawMaterial);
                    const mov = manager.create(StockMovement, {
                      rawMaterialId: ri.rawMaterial.id,
                      type: MovementType.IN,
                      quantity: item.quantity * ri.quantity,
                      totalCost: (item.quantity * ri.quantity) * ri.rawMaterial.costPerUnit,
                      description: 'Reverso por Cancelación de Pedido: ' + order.id
                    });
                    await manager.save(StockMovement, mov);
                  }
                }
              }
            } else {
              product.stockQuantity += item.quantity;
              if (order.status === OrderStatus.DELIVERED) {
                 product.physicalStock += item.quantity;
              }
              await manager.save(Product, product);
            }
          }
        }
        // Reverse Payment
        if (order.paymentStatus === PaymentStatus.PAID) {
          order.paymentStatus = PaymentStatus.REFUNDED;
        }
      }

      order.status = status;
      return manager.save(Order, order);
    });
  }

  `;

let newCode = code.substring(0, startIndex) + newFn + code.substring(endIndex);
fs.writeFileSync('apps/backend/src/orders/orders.service.ts', newCode, 'utf8');
