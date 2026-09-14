const fs = require('fs');
let file = 'apps/frontend/src/pages/DeliveryZones.tsx';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(/onIonChange/g, 'onIonInput');
text = text.replace(/Configuraci\uFFFDn/g, 'Configuración');
text = text.replace(/env\uFFFDo/g, 'envío');
text = text.replace(/type="number"/g, 'type="number" step="any"');

fs.writeFileSync(file, text, 'utf8');
