const fs = require('fs');

const fixVars = (p) => {
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/const \[searchText, setSearchText\] = useState\(''\);\r?\n\s*const \[searchText, setSearchText\] = useState\(''\);/g, "const [searchText, setSearchText] = useState('');");
  c = c.replace(/const \[searchText, setSearchText\] = useState\(''\);\n\s*const \[searchText, setSearchText\] = useState\(''\);/g, "const [searchText, setSearchText] = useState('');");
  
  // also fix imports
  c = c.replace(/IonPage, IonSearchbar,\r?\n\s*IonToolbar, IonSearchbar,/g, "IonPage,\n  IonToolbar, IonSearchbar,");
  c = c.replace(/IonSearchbar,[\s\S]*?IonSearchbar,/g, "IonSearchbar,");

  fs.writeFileSync(p, c, 'utf8');
}
fixVars('apps/frontend/src/pages/Pos.tsx');
fixVars('apps/frontend/src/pages/Production.tsx');
