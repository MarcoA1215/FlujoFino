const fs = require('fs');
let login = fs.readFileSync('apps/frontend/src/pages/Login.tsx', 'utf8');
login = login.replace(/presentToast\(\{ message: 'Credenciales inválidas'/g, "presentToast({ message: 'Error: ' + (e.response?.data?.message || e.message)");
fs.writeFileSync('apps/frontend/src/pages/Login.tsx', login, 'utf8');
