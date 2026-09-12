const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/orders/orders.controller.ts', 'utf8');

if (!code.includes('clone(')) {
  code = code.replace(
    "} from '@nestjs/common';",
    "} from '@nestjs/common';\nimport { Post } from '@nestjs/common';"
  );
  // Actually Post is already imported
  // Let's just append the clone route
  const cloneCode = `
  @Post(':id/clone')
  clone(@Param('id') id: string) {
    return this.ordersService.cloneOrder(id);
  }
}
`;
  code = code.replace(/}\s*$/, cloneCode);
  fs.writeFileSync('apps/backend/src/orders/orders.controller.ts', code, 'utf8');
}
