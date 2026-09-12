const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

// Replace updatePaymentStatus to block cancelled
const payStatusSearch = `  async updatePaymentStatus(id: string, dto: UpdatePaymentDto) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id } });
    if (!order) throw new BadRequestException('Pedido no encontrado');`;
const payStatusReplace = `  async updatePaymentStatus(id: string, dto: UpdatePaymentDto) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ where: { id } });
    if (!order) throw new BadRequestException('Pedido no encontrado');
    if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido está cancelado y no puede ser modificado');`;

code = code.replace(payStatusSearch, payStatusReplace);

// Replace updateOrderStatus to handle cancellation & block
const updateOrderTarget = `  async updateOrderStatus(id: string, status: OrderStatus) {
    const orderRepo = this.dataSource.getRepository(Order);
    const order = await orderRepo.findOne({ 
      where: { id },
      relations: { items: true } 
    });
    
    if (!order) throw new BadRequestException('Pedido no encontrado');

    if (status === OrderStatus.DELIVERED) {`;

const newUpdateOrder = `  async updateOrderStatus(id: string, status: OrderStatus) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { 
        where: { id },
        relations: { items: true } 
      });
      
      if (!order) throw new BadRequestException('Pedido no encontrado');
      if (order.status === OrderStatus.CANCELED) throw new BadRequestException('El pedido ya está cancelado y no puede modificarse');

      if (status === OrderStatus.DELIVERED) {`;

code = code.replace(updateOrderTarget, newUpdateOrder);
code = code.replace("    order.status = status;\n    return orderRepo.save(order);\n  }", "    order.status = status;\n    return manager.save(Order, order);\n  }");

// Now we need to add the cancellation reversal logic inside updateOrderStatus
// Let's rewrite updateOrderStatus completely because it's tricky with Regex
