const fs = require('fs');

let prod = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');
prod = prod.replace("const [displayCount, setDisplayCount] = useState(15);", "");
fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prod, 'utf8');

let mov = fs.readFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', 'utf8');
mov = mov.replace("const [displayCount, setDisplayCount] = useState(15);", "");
fs.writeFileSync('apps/frontend/src/components/raw-materials/MovementHistoryModal.tsx', mov, 'utf8');

let orders = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');
orders = orders.replace("const [displayCount, setDisplayCount] = useState(10);", "");
fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', orders, 'utf8');
