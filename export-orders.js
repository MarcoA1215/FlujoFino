const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.module.ts', 'utf8');
code = code.replace("providers: [OrdersService],", "providers: [OrdersService],\n  exports: [OrdersService],");
fs.writeFileSync('apps/backend/src/orders/orders.module.ts', code, 'utf8');

let pCode = fs.readFileSync('apps/backend/src/production/production.module.ts', 'utf8');
if(!pCode.includes("OrdersModule")) {
  pCode = "import { OrdersModule } from '../orders/orders.module';\n" + pCode;
  pCode = pCode.replace("imports: [TypeOrmModule.forFeature([Product, RawMaterial, ProductionBatch])],", "imports: [TypeOrmModule.forFeature([Product, RawMaterial, ProductionBatch]), OrdersModule],");
  fs.writeFileSync('apps/backend/src/production/production.module.ts', pCode, 'utf8');
}
