const fs = require('fs');

const injectSearchbar = (filePath, stateArray, filterField) => {
  let code = fs.readFileSync(filePath, 'utf8');
  if (code.includes('searchText')) return; // already added

  // Add search state
  code = code.replace("  const [presentToast] = useIonToast();", "  const [presentToast] = useIonToast();\n  const [searchText, setSearchText] = useState('');");
  code = code.replace("  const [presentAlert] = useIonAlert();", "  const [presentAlert] = useIonAlert();\n  const [searchText, setSearchText] = useState('');");
  
  if (!code.includes('const [searchText, setSearchText]')) {
    // try to find any useState to inject it
    code = code.replace(/const \[([a-zA-Z]+), set\1\] = useState/i, "const [searchText, setSearchText] = useState('');\n  const [$1, set$1] = useState");
  }

  // Import IonSearchbar if missing
  if (!code.includes('IonSearchbar')) {
    code = code.replace("IonPage,", "IonPage, IonSearchbar,");
    code = code.replace("IonToolbar,", "IonToolbar, IonSearchbar,");
  }

  // Add Searchbar in UI
  // Usually right after </IonHeader> or inside the last <IonToolbar>
  const searchbarUI = `\n        <IonToolbar color="light">\n          <IonSearchbar value={searchText} onIonChange={e => setSearchText(e.detail.value!)} placeholder="Buscar..." animated />\n        </IonToolbar>`;
  
  code = code.replace("      </IonHeader>", searchbarUI + "\n      </IonHeader>");

  // Apply Filter
  const filterBlock = `\n  const filteredData = ${stateArray}.filter(item => {
    if (searchText.trim() === '') return true;
    return item.${filterField}?.toLowerCase().includes(searchText.toLowerCase());
  });\n`;

  // Find the exact map call and replace it. 
  // It could be products.map or deliveryZones.map
  const mapRegex = new RegExp(`{${stateArray}\\.map\\(`, 'g');
  if (code.match(mapRegex)) {
    code = code.replace("  return (", filterBlock + "  return (");
    code = code.replace(mapRegex, `{filteredData.map(`);
  } else {
    // If it's combos in Production.tsx
    const comboRegex = new RegExp(`{combos\\.map\\(`, 'g');
    if (code.match(comboRegex)) {
       code = code.replace("  return (", `\n  const filteredData = combos.filter(item => { if(searchText.trim() === '') return true; return item.name?.toLowerCase().includes(searchText.toLowerCase()); });\n  return (`);
       code = code.replace(comboRegex, `{filteredData.map(`);
    }
  }

  fs.writeFileSync(filePath, code, 'utf8');
}

injectSearchbar('apps/frontend/src/pages/Calculator.tsx', 'products', 'name');
injectSearchbar('apps/frontend/src/pages/Production.tsx', 'combos', 'name'); // Production usually maps 'combos'
injectSearchbar('apps/frontend/src/pages/DeliveryZones.tsx', 'zones', 'name'); // DeliveryZones maps 'zones'
injectSearchbar('apps/frontend/src/pages/Pos.tsx', 'products', 'name'); // POS also maps products

