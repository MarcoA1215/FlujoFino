const fs = require('fs');
let r = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');

// 1. Add exchangeRate state
r = r.replace(/const \[inputCost, setInputCost\] = useState<number \| undefined>\(\);/, 
`const [inputCost, setInputCost] = useState<number | undefined>();
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);`);

// 2. Fetch settings
r = r.replace(/const fetchMaterials = async \(\) => \{\s*try \{\s*const res = await apiClient\.get<RawMaterial\[\]>\('\/raw-materials'\);\s*setMaterials\(res\.data\);\s*\} catch \(e\) \{\s*console\.error\(e\);\s*\}\s*\};\s*useEffect\(\(\) => \{ fetchMaterials\(\); \}, \[\]\);/,
`const fetchMaterials = async () => {
    try {
      const [matRes, setRes] = await Promise.all([
        apiClient.get<RawMaterial[]>('/raw-materials'),
        apiClient.get('/settings')
      ]);
      setMaterials(matRes.data);
      if (setRes.data && setRes.data.exchangeRateBs) {
        setExchangeRate(setRes.data.exchangeRateBs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);`);

// 3. Update handleCreate calculation
r = r.replace(/let costPerBaseUnit = inputCost \/ finalStock;/,
`let totalUSD = inputCost;
    if (currency === 'VES') {
      totalUSD = inputCost / exchangeRate;
    }
    let costPerBaseUnit = totalUSD / finalStock;`);

// 4. Update the UI for Costo Total
r = r.replace(/<IonLabel position="stacked">Costo Total de esta compra \(\$\)<\/IonLabel>/,
`<IonLabel position="stacked" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <span>Costo Total de esta compra</span>
  <IonSelect value={currency} onIonChange={e => setCurrency(e.detail.value)} style={{ minHeight: 'auto', padding: '0', background: '#eee', borderRadius: '4px', paddingLeft: '5px', paddingRight: '5px' }}>
    <IonSelectOption value="USD">$ USD</IonSelectOption>
    <IonSelectOption value="VES">Bs. VES</IonSelectOption>
  </IonSelect>
</IonLabel>`);

r = r.replace(/<StockOperationModal([\s\S]*?)\/>/, `<StockOperationModal$1 exchangeRate={exchangeRate} />`);

fs.writeFileSync('apps/frontend/src/pages/RawMaterials.tsx', r);
console.log('Fixed RawMaterials.tsx');
