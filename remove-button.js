const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

const regex = /\{\s*order\.status === OrderStatus\.PREPARING &&\s*\(\s*<IonButton[\s\S]*?Mover a Pendiente[\s\S]*?<\/IonButton>\s*\)\s*\}/g;
code = code.replace(regex, "");

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', code, 'utf8');
