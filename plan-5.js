const fs = require('fs');

let c = fs.readFileSync('apps/frontend/src/types.ts', 'utf8');
if (!c.includes('allowPartialPayments?: boolean;')) {
  c = c.replace(/companyPhone\?: string;/, "companyPhone?: string;\n  allowPartialPayments?: boolean;");
  fs.writeFileSync('apps/frontend/src/types.ts', c);
}
if (!c.includes('abonosTotal')) {
  c = c.replace(/totalAmount: number;/, "totalAmount: number;\n  abonosTotal?: number;\n  abonosHistory?: {id:string; amount:number; date:string}[];");
  fs.writeFileSync('apps/frontend/src/types.ts', c);
}
console.log('Updated frontend types');
