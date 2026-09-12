const fs = require('fs');
let menu = fs.readFileSync('apps/frontend/src/components/Menu.tsx', 'utf8');
menu = menu.replace(/buildOutline/g, 'constructOutline');
if (!menu.includes('warningOutline')) {
  menu = menu.replace(/mapOutline \}/, "mapOutline, warningOutline }");
}
fs.writeFileSync('apps/frontend/src/components/Menu.tsx', menu, 'utf8');
