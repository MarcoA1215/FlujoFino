const fs = require('fs');
let f = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// The "Registrar Nuevo Abono" input should appear if PENDING or PARTIAL
f = f.replace(/\{selectedOrderForDetails\.paymentStatus === PaymentStatus\.PENDING && settings\?\.allowPartialPayments && \(/,
`{[PaymentStatus.PENDING, PaymentStatus.PARTIAL].includes(selectedOrderForDetails.paymentStatus) && settings?.allowPartialPayments && (`);

// Translate PARTIAL to "Abonado Parcial"
f = f.replace(/status === PaymentStatus\.PENDING \? 'Por Pagar' : 'Pagado'/,
`status === PaymentStatus.PENDING ? 'Por Pagar' : status === PaymentStatus.PARTIAL ? 'Abonado Parcial' : 'Pagado'`);

f = f.replace(/status === PaymentStatus\.PENDING \? 'danger' : 'success'/,
`status === PaymentStatus.PENDING ? 'danger' : status === PaymentStatus.PARTIAL ? 'warning' : 'success'`);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', f);
console.log('Fixed frontend Orders.tsx');
