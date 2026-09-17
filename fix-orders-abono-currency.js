const fs = require('fs');
let f = fs.readFileSync('apps/frontend/src/pages/Orders.tsx', 'utf8');

// Add abonoCurrency state
f = f.replace(/const \[abonoAmount, setAbonoAmount\] = useState<string>\(''\);/,
`const [abonoAmount, setAbonoAmount] = useState<string>('');
  const [abonoCurrency, setAbonoCurrency] = useState<'USD' | 'VES'>('USD');`);

// Update handleAddAbono
f = f.replace(/await apiClient\.post\('\/orders\/' \+ selectedOrderForDetails\.id \+ '\/abono', \{ amount: Number\(abonoAmount\) \}\);/,
`let finalAmount = Number(abonoAmount);
      if (abonoCurrency === 'VES') {
        finalAmount = finalAmount / exchangeRate;
      }
      await apiClient.post('/orders/' + selectedOrderForDetails.id + '/abono', { amount: finalAmount });`);

// Update form UI
f = f.replace(/<IonLabel position="stacked">Monto \(\$\)<\/IonLabel>\s*<IonInput type="number" value=\{abonoAmount\} onIonInput=\{e => setAbonoAmount\(e\.detail\.value!\)\} placeholder="Ej\. 5\.00" \/>/,
`<IonLabel position="stacked" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <span>Monto del Abono</span>
                        <IonSelect value={abonoCurrency} onIonChange={e => setAbonoCurrency(e.detail.value)} style={{ minHeight: 'auto', padding: '0', background: '#eee', borderRadius: '4px', paddingLeft: '5px', paddingRight: '5px' }}>
                          <IonSelectOption value="USD">$ USD</IonSelectOption>
                          <IonSelectOption value="VES">Bs. VES</IonSelectOption>
                        </IonSelect>
                      </IonLabel>
                      <IonInput type="number" value={abonoAmount} onIonInput={e => setAbonoAmount(e.detail.value!)} placeholder={abonoCurrency === 'USD' ? "Ej. 5.00" : "Ej. 200.00"} />`);

fs.writeFileSync('apps/frontend/src/pages/Orders.tsx', f);
console.log('Added abono currency toggle');
