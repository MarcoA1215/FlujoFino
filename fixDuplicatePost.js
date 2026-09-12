const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.controller.ts', 'utf8');
code = code.replace("import { Post } from '@nestjs/common';\n", "");
fs.writeFileSync('apps/backend/src/orders/orders.controller.ts', code, 'utf8');
