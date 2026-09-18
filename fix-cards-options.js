const fs = require('fs');

// 1. RawMaterialCard.tsx
let r = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');

if (!r.includes('useIonActionSheet')) {
  r = r.replace(/import \{ IonCol, IonCard, IonCardContent, IonBadge, IonButton \} from '@ionic\/react';/,
`import { IonCol, IonCard, IonCardContent, IonBadge, IonButton, useIonActionSheet } from '@ionic/react';`);
}

r = r.replace(/const m = material;/, 
`const m = material;
  const [present] = useIonActionSheet();

  const openOptions = () => {
    present({
      header: 'Opciones de Insumo',
      buttons: [
        { text: 'Comprar', handler: () => onRestock(m) },
        { text: 'Registrar P\u00e9rdida', handler: () => onRegisterLoss(m) },
        { text: 'Historial', handler: () => onViewHistory(m) },
        { text: 'Archivar', role: 'destructive', handler: () => onArchive(m) },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
  };`);

r = r.replace(/<div style=\{\{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' \}\}>[\s\S]*?<\/div>/,
`<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
              <IonButton size="small" fill="solid" color="light" onClick={openOptions}>
                Opciones
              </IonButton>
            </div>`);

fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', r);

// 2. ProductCard.tsx
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

if (!p.includes('useIonActionSheet')) {
  p = p.replace(/import \{ IonCol, IonCard, IonCardContent, IonBadge, IonButton \} from '@ionic\/react';/,
`import { IonCol, IonCard, IonCardContent, IonBadge, IonButton, useIonActionSheet } from '@ionic/react';`);
}

p = p.replace(/const p = product;/, 
`const p = product;
  const [present] = useIonActionSheet();

  const openOptions = () => {
    const buttons: any[] = [
      { text: p.isCombo ? 'Configurar Combo' : 'Configurar Receta', handler: () => onConfigure(p) },
      { text: 'Stock Inicial / Ajuste', handler: () => onAdjustStock(p) }
    ];

    if (p.isCombo && onToggleKitting) {
      buttons.push({ text: \`Convertir a \${p.isPreAssembled ? 'Virtual' : 'F\u00edsico (Kitting)'}\`, handler: () => onToggleKitting(p) });
    }

    if (p.isCombo && p.isPreAssembled && onUnpackKit && (p.physicalStock || 0) > 0) {
      buttons.push({ text: 'Desarmar 1 Und', handler: () => onUnpackKit(p) });
    }

    buttons.push({ text: 'Registrar P\u00e9rdida', handler: () => onRegisterLoss(p) });
    buttons.push({ text: 'Cancelar', role: 'cancel' });

    present({
      header: 'Opciones de Producto',
      buttons
    });
  };`);

p = p.replace(/<div style=\{\{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' \}\}>[\s\S]*?<\/div>/,
`<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                <IonButton size="small" fill="solid" color="light" onClick={openOptions}>
                  Opciones
                </IonButton>
              </div>`);

fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);

console.log('Action sheets implemented');
