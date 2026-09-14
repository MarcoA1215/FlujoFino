const fs = require('fs');

let orders = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
orders = orders.replace("const paginatedOrders = filteredOrders.slice(0, displayCount);", "");
orders = orders.replace("paginatedOrders.map", "filteredOrders.map");
orders = orders.replace(/<IonInfiniteScroll[^>]*>[\s\S]*?<\/IonInfiniteScroll>/, "");
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', orders, 'utf8');

let prod = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');
prod = prod.replace("paginatedBatches.map", "batches.map");
prod = prod.replace(/<IonInfiniteScroll[^>]*>[\s\S]*?<\/IonInfiniteScroll>/, "");
fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prod, 'utf8');

let mov = fs.readFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', 'utf8');
mov = mov.replace("paginatedMovements.map", "movements.map");
mov = mov.replace(/<IonInfiniteScroll[^>]*>[\s\S]*?<\/IonInfiniteScroll>/, "");
fs.writeFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', mov, 'utf8');
