const fs = require('fs');

// 1. RawMaterialCard
let r = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');
r = r.replace(/=> \{\s*return \(/,
`=> {
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
  };
  
  return (`);
fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', r);

// 2. ProductCard
let p = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');
p = p.replace(/=> \{\s*return \(/,
`=> {
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
  };
  
  return (`);
fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', p);

console.log('Fixed missing openOptions');
