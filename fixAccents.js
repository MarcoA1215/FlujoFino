const fs = require('fs');
let c = fs.readFileSync('apps/frontend/src/components/Menu.tsx', 'utf8');
c = c.replace(/header: '.*',/, "header: 'Cerrar Sesión',");
c = c.replace(/message: '.*',/, "message: '¿Estás seguro de que quieres cerrar tu sesión?',");
c = c.replace(/Ocultar el men si no est logueado/, "Ocultar el menú si no está logueado");
fs.writeFileSync('apps/frontend/src/components/Menu.tsx', c, 'utf8');
