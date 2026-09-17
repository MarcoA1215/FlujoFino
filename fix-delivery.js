const fs = require('fs');

// Calculator.tsx
let c = fs.readFileSync('apps/frontend/src/pages/Calculator.tsx', 'utf8');
c = c.replace(/const passToPos = \(\) => \{[\s\S]*?localStorage\.setItem\('calculator_cart', JSON\.stringify\(cart\)\);\s*window\.location\.href = '\/pos';\s*\};/,
`const passToPos = () => {
    if (cart.length === 0) return;
    localStorage.setItem('calculator_cart', JSON.stringify(cart));
    if (selectedZoneId) {
      localStorage.setItem('calculator_zone', selectedZoneId);
    }
    window.location.href = '/pos';
  };`);
fs.writeFileSync('apps/frontend/src/pages/Calculator.tsx', c);

// Pos.tsx
let p = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
p = p.replace(/const calcCart = localStorage\.getItem\('calculator_cart'\);\s*if \(calcCart\) \{\s*try \{\s*setCart\(JSON\.parse\(calcCart\)\);\s*localStorage\.removeItem\('calculator_cart'\);\s*\} catch \(e\) \{\}\s*\}/,
`const calcCart = localStorage.getItem('calculator_cart');
    if (calcCart) {
      try {
        setCart(JSON.parse(calcCart));
        localStorage.removeItem('calculator_cart');
        const calcZone = localStorage.getItem('calculator_zone');
        if (calcZone) {
          setDeliveryMethod(DeliveryMethod.DELIVERY);
          setDeliveryZoneId(calcZone);
          localStorage.removeItem('calculator_zone');
        }
      } catch (e) {}
    }`);
fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', p);

console.log('Fixed delivery passing');
