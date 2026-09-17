const fs = require('fs');

let c = fs.readFileSync('apps/frontend/src/components/raw-materials/StockOperationModal.tsx', 'utf8');

c = c.replace(/interface Props \{/, `interface Props {\n  exchangeRate?: number;`);
c = c.replace(/export const StockOperationModal: React\.FC<Props> = \(\{ material, operationType, onClose, onSuccess \}\) => \{/,
`export const StockOperationModal: React.FC<Props> = ({ material, operationType, onClose, onSuccess, exchangeRate = 36.5 }) => {`);

c = c.replace(/const \[cost, setCost\] = useState<number \| undefined>\(\);/,
`const [cost, setCost] = useState<number | undefined>();\n  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');`);

c = c.replace(/await apiClient\.post\(\`\/raw-materials\/\$\{material\.id\}\/restock\`, \{\s*quantity: finalQuantity,\s*totalCost: cost\s*\}\);/,
`let totalUSD = cost;
        if (currency === 'VES') {
          totalUSD = cost / exchangeRate;
        }
        await apiClient.post(\`/raw-materials/\${material.id}/restock\`, {
          quantity: finalQuantity,
          totalCost: totalUSD
        });`);

c = c.replace(/<IonLabel position="stacked">Costo Total de la Compra \(\$\)<\/IonLabel>/,
`<IonLabel position="stacked" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
  <span>Costo Total de la Compra</span>
  <IonSelect value={currency} onIonChange={e => setCurrency(e.detail.value)} style={{ minHeight: 'auto', padding: '0', background: '#eee', borderRadius: '4px', paddingLeft: '5px', paddingRight: '5px' }}>
    <IonSelectOption value="USD">$ USD</IonSelectOption>
    <IonSelectOption value="VES">Bs. VES</IonSelectOption>
  </IonSelect>
</IonLabel>`);

fs.writeFileSync('apps/frontend/src/components/raw-materials/StockOperationModal.tsx', c);
console.log('Fixed StockOperationModal');
