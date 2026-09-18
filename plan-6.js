const fs = require('fs');

let c = fs.readFileSync('apps/frontend/src/pages/Users.tsx', 'utf8');
if (!c.includes('allowPartialPayments')) {
  c = c.replace(/<IonList>/, 
`<IonList>
                    <IonItem>
                      <IonLabel>Permitir Pagos Parciales (Abonos)</IonLabel>
                      <IonToggle checked={settings.allowPartialPayments || false} onIonChange={e => setSettings({...settings, allowPartialPayments: e.detail.checked})} />
                    </IonItem>`);
  fs.writeFileSync('apps/frontend/src/pages/Users.tsx', c);
  console.log('Updated Users.tsx');
}
