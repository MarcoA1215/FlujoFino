const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.controller.ts', 'utf8');

if (!code.includes("unpackKit")) {
  code = code.replace(
    /export class ProductsController \{/,
    `export class ProductsController {
  @Post(':id/unpack')
  async unpackKit(@Param('id') id: string) {
    return this.productsService.unpackKit(id);
  }
`
  );
  fs.writeFileSync('apps/backend/src/products/products.controller.ts', code, 'utf8');
}
