const fs = require('fs');
let c = fs.readFileSync('apps/backend/src/orders/orders.service.ts', 'utf8');

c = c.replace(/this\.orderRepo/g, "this.dataSource.getRepository(Order)");

c = c.replace(/if \(dto\.pagoMovilBank\) order\.pagoMovilBank = dto\.pagoMovilBank;\r?\n\s*order\.abonosTotal = dto\.initialAbono \|\| 0;\r?\n\s*if \(dto\.initialAbono && dto\.initialAbono > 0\) \{\r?\n\s*order\.abonosHistory = \[\{ id: Date\.now\(\)\.toString\(\), amount: dto\.initialAbono, date: new Date\(\)\.toISOString\(\) \}\];\r?\n\s*if \(order\.abonosTotal >= totalAmount\) \{\r?\n\s*order\.paymentStatus = PaymentStatus\.PAID;\r?\n\s*\}\r?\n\s*\}/, 
"if (dto.pagoMovilBank) order.pagoMovilBank = dto.pagoMovilBank;");

c = c.replace(/pagoMovilBank: dto\.pagoMovilBank,\r?\n\s*amountBs: dto\.amountBs,\r?\n\s*exchangeRate: dto\.exchangeRate,\r?\n\s*\}\);/, 
`pagoMovilBank: dto.pagoMovilBank,
          amountBs: dto.amountBs,
          exchangeRate: dto.exchangeRate,
          abonosTotal: dto.initialAbono || 0,
          abonosHistory: (dto.initialAbono && dto.initialAbono > 0) ? [{ id: Date.now().toString(), amount: dto.initialAbono, date: new Date().toISOString() }] : []
        });
        if (order.abonosTotal >= totalAmount) {
          order.paymentStatus = PaymentStatus.PAID;
        }`);

fs.writeFileSync('apps/backend/src/orders/orders.service.ts', c);
