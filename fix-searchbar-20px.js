const fs = require('fs');
let css = fs.readFileSync('apps/frontend/src/theme.css', 'utf8');

css = css.replace(/--border-radius: 10px;/, '--border-radius: 20px;');

fs.writeFileSync('apps/frontend/src/theme.css', css);
console.log('Updated searchbar border-radius to 20px');
