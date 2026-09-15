const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

if (!code.includes("onUnpackKit")) {
  code = code.replace(
    /onToggleKitting\?:\s*\(p:\s*Product\)\s*=>\s*void;/,
    "onToggleKitting?: (p: Product) => void;\n  onUnpackKit?: (p: Product) => void;"
  );

  code = code.replace(
    /onToggleKitting\n\}\) => \{/,
    "onToggleKitting,\n  onUnpackKit\n}) => {"
  );

  code = code.replace(
    /Hacer \{p\.isPreAssembled \? 'Virtual' : 'Físico \(Kitting\)'\}\s*<\/IonButton>\s*\)\}/,
    `$&
              {(p.isCombo && p.isPreAssembled && onUnpackKit && (p.physicalStock || 0) > 0) && (
                <IonButton size="small" fill="outline" color="secondary" onClick={() => onUnpackKit(p)}>
                  Desarmar 1 Und
                </IonButton>
              )}`
  );

  fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', code, 'utf8');
}

// 2. update Products.tsx
let prodCode = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');
if (!prodCode.includes("handleUnpackKit")) {
  prodCode = prodCode.replace(
    /const handleToggleKitting/,
    `const handleUnpackKit = async (p: Product) => {
    if (!window.confirm(\`¿Estás seguro de desarmar 1 \${p.name}? Los componentes regresarán al inventario.\`)) return;
    try {
      await apiClient.post(\`/products/\${p.id}/unpack\`);
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error al desarmar el kit');
    }
  };
  
  const handleToggleKitting`
  );
  
  prodCode = prodCode.replace(
    /onToggleKitting=\{handleToggleKitting\}/,
    "onToggleKitting={handleToggleKitting}\n                        onUnpackKit={handleUnpackKit}"
  );
  
  fs.writeFileSync('apps/frontend/src/pages/Products.tsx', prodCode, 'utf8');
}
