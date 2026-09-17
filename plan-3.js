const fs = require('fs');

let c = fs.readFileSync('apps/backend/src/orders/orders.controller.ts', 'utf8');
if (!c.includes('/abono')) {
  c = c.replace(/export class OrdersController \{/, 
`export class OrdersController {
  @Post(':id/abono')
  addAbono(@Param('id') id: string, @Body('amount') amount: number) {
    return this.ordersService.addAbono(id, amount);
  }

  @Delete(':id/abono/:index')
  revertAbono(@Param('id') id: string, @Param('index') index: string) {
    return this.ordersService.revertAbono(id, parseInt(index, 10));
  }
`);
  fs.writeFileSync('apps/backend/src/orders/orders.controller.ts', c);
  console.log("Updated orders controller");
}
