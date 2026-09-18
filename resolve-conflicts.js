const fs = require('fs');

let orderContent = fs.readFileSync('apps/backend/src/entities/order.entity.ts', 'utf8');

orderContent = orderContent.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> main\r?\n/, "$1\n$2\n");
fs.writeFileSync('apps/backend/src/entities/order.entity.ts', orderContent);

let settingsContent = fs.readFileSync('apps/backend/src/entities/settings.entity.ts', 'utf8');
settingsContent = settingsContent.replace(/<<<<<<< HEAD\r?\n([\s\S]*?)=======\r?\n([\s\S]*?)>>>>>>> main\r?\n/, "$1\n$2\n");
fs.writeFileSync('apps/backend/src/entities/settings.entity.ts', settingsContent);

console.log("Resolved conflicts");
