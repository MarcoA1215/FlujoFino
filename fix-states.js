const fs = require('fs');
let r = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');

r = r.replace(/const \[inputCost, setInputCost\] = useState<number>\(\);/,
`const [inputCost, setInputCost] = useState<number>();
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);`);

fs.writeFileSync('apps/frontend/src/pages/RawMaterials.tsx', r);
console.log('Fixed RawMaterials states');
