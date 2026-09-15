const fs = require('fs');
let code = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');

if (!code.includes("onToggleKitting")) {
  code = code.replace(
    /onRegisterLoss:\s*\(p:\s*Product\)\s*=>\s*void;/,
    "onRegisterLoss: (p: Product) => void;\n  onToggleKitting?: (p: Product) => void;"
  );

  code = code.replace(
    /<IonButton size="small" fill="outline" color="medium" onClick=\{.*?onAdjustStock.*?\}\s*>\s*Stock Inicial\s*<\/IonButton>/,
    `$&
              {p.isCombo && onToggleKitting && (
                <IonButton size="small" fill="outline" color="warning" onClick={() => onToggleKitting(p)}>
                  Hacer {p.isPreAssembled ? 'Virtual' : 'Físico (Kitting)'}
                </IonButton>
              )}`
  );

  // also fix the badges!
  code = code.replace(
    /\{\!p\.isCombo && \(/g,
    "{(!p.isCombo || p.isPreAssembled) && ("
  );
  code = code.replace(
    /\{p\.isCombo && \(/g,
    "{(p.isCombo && !p.isPreAssembled) && ("
  );

  fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', code, 'utf8');
}
