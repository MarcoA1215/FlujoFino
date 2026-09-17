const fs = require('fs');
const path = require('path');
const appModulePath = path.join(__dirname, 'apps/backend/src/app.module.ts');

let content = fs.readFileSync(appModulePath, 'utf8');

// Add imports
if (!content.includes('Tenant')) {
  content = `import { Tenant } from './entities/tenant.entity';
import { UserTenantAccess } from './entities/user-tenant-access.entity';
import { WorkSchedule } from './entities/work-schedule.entity';
` + content;
}

// Add to entities array
content = content.replace(
  /entities: \[RawMaterial, StockMovement, RecipeItem, Product, ComboItem, ProductionBatch, Order, OrderItem, Settings, DeliveryZone, User\]/,
  'entities: [RawMaterial, StockMovement, RecipeItem, Product, ComboItem, ProductionBatch, Order, OrderItem, Settings, DeliveryZone, User, Tenant, UserTenantAccess, WorkSchedule]'
);

// Fallback if the array is multiline or slightly different
if (!content.includes('Tenant, UserTenantAccess, WorkSchedule')) {
  content = content.replace(
    /entities: \[([^\]]+)\]/,
    'entities: [$1, Tenant, UserTenantAccess, WorkSchedule]'
  );
}

fs.writeFileSync(appModulePath, content);
console.log("app.module.ts updated!");
