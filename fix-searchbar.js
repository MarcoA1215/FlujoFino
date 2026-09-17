const fs = require('fs');
let css = fs.readFileSync('apps/frontend/src/theme.css', 'utf8');

css += `\n/* Rounded Searchbars */\nion-searchbar {\n  --border-radius: 10px;\n}\n`;

fs.writeFileSync('apps/frontend/src/theme.css', css);
console.log('Added searchbar border-radius');
