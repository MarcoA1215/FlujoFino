const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');

const resets = `setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setPagoMovilRef('');
      setPagoMovilPhone('');
      setPagoMovilCedula('');
      setPagoMovilBank('');
      setDeliveryMethod(DeliveryMethod.IN_STORE);
      setDeliveryZoneId('');
      setUsdReceived('');
      setSearchTerm('');
      setPaymentMethod('PAGO_MOVIL');`;

code = code.replace(
  /setCart\(\[\]\);\s*setCustomerName\(''\);\s*setUsdReceived\(''\);\s*setPaymentMethod\('PAGO_MOVIL'\);/,
  resets
);

fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', code, 'utf8');
