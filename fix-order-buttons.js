const fs = require('fs');
let o = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// The layout issue: the style={{ display: 'flex'... }} wasn't working perfectly on IonCardHeader in all viewports.
// Let's use position absolute for the buttons.
o = o.replace(/<IonCardHeader style=\{\{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' \}\}>/,
`<IonCardHeader style={{ position: 'relative', paddingRight: '70px' }}>`);

o = o.replace(/<div style=\{\{ display: 'flex', gap: '5px' \}\}>/,
`<div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '5px' }}>`);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', o);
console.log('Fixed button positioning locally');
