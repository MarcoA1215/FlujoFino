const fs = require('fs');

const fixDups = (p) => {
  let c = fs.readFileSync(p, 'utf8');
  // Just carefully replace duplicates if they exist
  const regex = /IonSearchbar[\s\S]*?IonSearchbar/g;
  if(c.match(regex)) {
    c = c.replace(/IonSearchbar,\s*IonSearchbar/g, 'IonSearchbar');
    c = c.replace(/IonPage,\s*IonSearchbar,\s*IonTitle,\r?\n\s*IonToolbar,\s*IonSearchbar/g, 'IonPage, IonTitle,\n  IonToolbar, IonSearchbar');
    c = c.replace(/IonPage,\s*IonSearchbar,\s*IonTitle,\n\s*IonToolbar,\s*IonSearchbar/g, 'IonPage, IonTitle,\n  IonToolbar, IonSearchbar');
  }
  c = c.replace(/const \[searchText, setSearchText\] = useState\(''\);\r?\n\s*const \[searchText, setSearchText\] = useState\(''\);/g, "const [searchText, setSearchText] = useState('');");
  c = c.replace(/const \[searchText, setSearchText\] = useState\(''\);\n\s*const \[searchText, setSearchText\] = useState\(''\);/g, "const [searchText, setSearchText] = useState('');");
  fs.writeFileSync(p, c, 'utf8');
}

fixDups('apps/frontend/src/pages/Calculator.tsx');
fixDups('apps/frontend/src/pages/Production.tsx');
fixDups('apps/frontend/src/pages/DeliveryZones.tsx');
fixDups('apps/frontend/src/pages/Pos.tsx');
