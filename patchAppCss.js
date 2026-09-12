const fs = require('fs');
let app = fs.readFileSync('apps/frontend/src/App.tsx', 'utf8');
app = app.replace(/import '\.\/theme\/variables\.css';/, "import './theme.css';");
fs.writeFileSync('apps/frontend/src/App.tsx', app, 'utf8');
