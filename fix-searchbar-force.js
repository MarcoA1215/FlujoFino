const fs = require('fs');
let css = fs.readFileSync('apps/frontend/src/theme.css', 'utf8');

css = css.replace(/--border-radius: 20px;/, '--border-radius: 20px !important;');

fs.writeFileSync('apps/frontend/src/theme.css', css);
console.log('Forced searchbar border-radius');
