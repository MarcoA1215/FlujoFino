const fs = require('fs');

const patchFile = (filePath, filterField) => {
  let code = fs.readFileSync(filePath, 'utf8');
  if (!code.includes('IonSearchbar')) {
    code = code.replace("IonPage", "IonPage, IonSearchbar");
  }
  if (!code.includes('searchText')) {
    code = code.replace("  const [presentAlert] = useIonAlert();", "  const [presentAlert] = useIonAlert();\n  const [searchText, setSearchText] = useState('');");
    
    // Add Searchbar in header
    code = code.replace(
      "        </IonToolbar>\r\n      </IonHeader>",
      "        </IonToolbar>\r\n        <IonToolbar color=\"success\">\r\n          <IonSearchbar value={searchText} onIonChange={e => setSearchText(e.detail.value!)} placeholder=\"Buscar...\" animated />\r\n        </IonToolbar>\r\n      </IonHeader>"
    );
    code = code.replace(
      "        </IonToolbar>\n      </IonHeader>",
      "        </IonToolbar>\n        <IonToolbar color=\"success\">\n          <IonSearchbar value={searchText} onIonChange={e => setSearchText(e.detail.value!)} placeholder=\"Buscar...\" animated />\n        </IonToolbar>\n      </IonHeader>"
    );
    
    // Filter array
    const stateArray = filePath.includes('Products') ? 'products' : 'materials';
    const regex = new RegExp(`{${stateArray}\\.map\\(`, 'g');
    
    const filterBlock = `
  const filteredData = ${stateArray}.filter(item => {
    if (searchText.trim() === '') return true;
    return item.${filterField}.toLowerCase().includes(searchText.toLowerCase());
  });
  `;
    code = code.replace("  return (", filterBlock + "\n  return (");
    code = code.replace(regex, `{filteredData.map(`);
    
    fs.writeFileSync(filePath, code, 'utf8');
  }
};

patchFile('apps/frontend/src/pages/Products.tsx', 'name');
patchFile('apps/frontend/src/pages/RawMaterials.tsx', 'name');
