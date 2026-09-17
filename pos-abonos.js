const fs = require('fs');

let c = fs.readFileSync('apps/frontend/src/pages/Pos.tsx', 'utf8');
if (!c.includes('allowPartialPayments')) {
  c = c.replace(/const \[exchangeRate, setExchangeRate\] = useState<number>\(40\.0\);/,
  "const [exchangeRate, setExchangeRate] = useState<number>(40.0);\n  const [allowPartialPayments, setAllowPartialPayments] = useState<boolean>(false);\n  const [initialAbono, setInitialAbono] = useState<string>('');");

  c = c.replace(/apiClient\.get<\{ exchangeRateBs: number \}>\('\/settings\/exchange-rate'\);/,
  "apiClient.get<any>('/settings');");
  
  c = c.replace(/setExchangeRate\(res\.data\.exchangeRateBs\);/,
  "setExchangeRate(res.data.exchangeRateBs || 40.0);\n      setAllowPartialPayments(res.data.allowPartialPayments || false);");

  c = c.replace(/items: cart\.map/,
  "initialAbono: initialAbono ? Number(initialAbono) : undefined,\n        items: cart.map");

  c = c.replace(/<IonButton expand="block" size="large" onClick=\{createOrder\}>/,
  `{allowPartialPayments && (
                        <IonItem className="ion-margin-bottom">
                          <IonLabel position="stacked">Abono Inicial (Opcional, en $)</IonLabel>
                          <IonInput type="number" placeholder="Monto abonado al momento" value={initialAbono} onIonInput={e => setInitialAbono(e.detail.value!)} />
                        </IonItem>
                      )}
                      <IonButton expand="block" size="large" onClick={createOrder}>`);

  c = c.replace(/setCustomerAddress\(''\);/, "setCustomerAddress('');\n      setInitialAbono('');");
  
  fs.writeFileSync('apps/frontend/src/pages/Pos.tsx', c);
  console.log('Pos.tsx patched for Abono Inicial');
}
