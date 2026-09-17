const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
p = p.replace(/useEffect\(\(\) => \{\s*fetchProducts\(\);\s*fetchRate\(\);\s*fetchZones\(\);\s*\}, \[\]\);/,
`useEffect(() => {
    fetchProducts();
    fetchRate();
    fetchZones();
    const calcCart = localStorage.getItem('calculator_cart');
    if (calcCart) {
      try {
        setCart(JSON.parse(calcCart));
        localStorage.removeItem('calculator_cart');
      } catch (e) {}
    }
  }, []);`);
fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', p);
