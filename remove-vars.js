const fs = require('fs');

// Fix Orders
let orders = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
orders = orders.replace(", IonInfiniteScroll, IonInfiniteScrollContent", "");
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', orders, 'utf8');

// Fix Production
let prod = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');
prod = prod.replace("const paginatedBatches = batches.slice(0, displayCount);", "");
prod = prod.replace("const loadMore = (e: any) => {\n    setTimeout(() => {\n      setDisplayCount(prev => prev + 15);\n      e.target.complete();\n    }, 500);\n  };", "");
fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prod, 'utf8');

// Fix MovementHistoryModal
let mov = fs.readFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', 'utf8');
mov = mov.replace("const paginatedMovements = movements.slice(0, displayCount);", "");
mov = mov.replace("const loadMore = (e: any) => {\n    setTimeout(() => {\n      setDisplayCount(prev => prev + 15);\n      e.target.complete();\n    }, 500);\n  };", "");
fs.writeFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', mov, 'utf8');

