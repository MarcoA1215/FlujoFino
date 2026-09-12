const fs = require('fs');
let p = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');

// The filteredData block
const filterBlock = `
  const filteredData = products.filter(p => {
    if (p.isCombo) return false;
    if (searchText.trim() === '') return true;
    return p.name?.toLowerCase().includes(searchText.toLowerCase());
  });
`;

p = p.replace("  return (", filterBlock + "\n  return (");
p = p.replace("{products.filter(p => !p.isCombo).map(p => (", "{filteredData.map(p => (");

fs.writeFileSync('apps/frontend/src/pages/Production.tsx', p, 'utf8');
