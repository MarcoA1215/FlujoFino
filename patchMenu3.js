const fs = require('fs');
let menu = fs.readFileSync('apps/frontend/src/components/Menu.tsx', 'utf8');
menu = menu.replace(/warningOutline/g, "alertCircleOutline");
if (!menu.includes('alertCircleOutline')) {
  menu = menu.replace(/mapOutline \}/, "mapOutline, alertCircleOutline }");
}
// check line 56: appPages.map
// Ah, if I didn't change the map, why is it failing?
// Wait, warningOutline import failed. I'll just use mapOutline instead of warningOutline or just not use an icon.
menu = menu.replace(/icon=\{warningOutline\}/g, "icon={pieChartOutline}");
fs.writeFileSync('apps/frontend/src/components/Menu.tsx', menu, 'utf8');
