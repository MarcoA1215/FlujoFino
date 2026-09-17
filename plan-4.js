const fs = require('fs');

let c = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

if (!c.includes('initialAbono?: number;')) {
  c = c.replace(/items: \{ productId: string; quantity: number; unitPrice: number \}\[\];/, 
`items: { productId: string; quantity: number; unitPrice: number }[];
  initialAbono?: number;`);
}

if (!c.includes('addAbono(orderId')) {
  c = c.replace(/async createOrder\(dto: CreateOrderDto\) \{/,
`async addAbono(orderId: string, amount: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    const history = order.abonosHistory || [];
    history.push({ id: Date.now().toString(), amount, date: new Date().toISOString() });
    order.abonosHistory = history;
    order.abonosTotal = (order.abonosTotal || 0) + amount;
    if (order.abonosTotal >= order.totalAmount && order.paymentStatus === PaymentStatus.PENDING) {
      order.paymentStatus = PaymentStatus.PAID;
    }
    return this.orderRepo.save(order);
  }

  async revertAbono(orderId: string, index: number) {
    const order = await this.orderRepo.findOne({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    const history = order.abonosHistory || [];
    if (index >= 0 && index < history.length) {
      const removed = history.splice(index, 1)[0];
      order.abonosHistory = history;
      order.abonosTotal = (order.abonosTotal || 0) - removed.amount;
      if (order.abonosTotal < order.totalAmount && order.paymentStatus === PaymentStatus.PAID) {
        order.paymentStatus = PaymentStatus.PENDING;
      }
      return this.orderRepo.save(order);
    }
    return order;
  }

  async createOrder(dto: CreateOrderDto) {`);
}

if (!c.includes('order.abonosTotal = dto.initialAbono;')) {
  c = c.replace(/order\.pagoMovilBank = dto\.pagoMovilBank;/,
`order.pagoMovilBank = dto.pagoMovilBank;
      order.abonosTotal = dto.initialAbono || 0;
      if (dto.initialAbono && dto.initialAbono > 0) {
        order.abonosHistory = [{ id: Date.now().toString(), amount: dto.initialAbono, date: new Date().toISOString() }];
        if (order.abonosTotal >= totalAmount) {
          order.paymentStatus = PaymentStatus.PAID;
        }
      }`);
}

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', c);
console.log('Updated orders service');
