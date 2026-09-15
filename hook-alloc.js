const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/production/production.service.ts', 'utf8');

if (!code.includes("OrdersService")) {
  code = "import { OrdersService } from '../orders/orders.service';\n" + code;
  code = code.replace("constructor(", "constructor(\n    private ordersService: OrdersService,\n");
  
  // In createBatch
  code = code.replace("return savedBatch;", "await this.ordersService.autoAllocatePhysicalStock();\n      return savedBatch;");
  
  fs.writeFileSync('apps/backend/src/production/production.service.ts', code, 'utf8');
}
