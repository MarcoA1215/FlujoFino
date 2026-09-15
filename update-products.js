const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/pages/Products.tsx', 'utf8');

if (!code.includes("onToggleKitting")) {
  const toggleFn = `
  const handleToggleKitting = async (p: Product) => {
    try {
      await apiClient.put('/products/' + p.id, { isPreAssembled: !p.isPreAssembled });
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.message || 'Error al cambiar modo');
    }
  };
  
  const openEditProductAlert = (p: Product) => {`;
  
  code = code.replace(/const openEditProductAlert = \(p: Product\) => \{/, toggleFn);
  
  code = code.replace(
    /onRegisterLoss=\{openLossAlert\}/,
    "onRegisterLoss={openLossAlert}\n                        onToggleKitting={handleToggleKitting}"
  );
  
  // also update create alert to default isPreAssembled = false
  code = code.replace(
    /isCombo\s*\}\);/,
    "isCombo, isPreAssembled: false });"
  );
  
  fs.writeFileSync('apps/frontend/src/pages/Products.tsx', code, 'utf8');
}
