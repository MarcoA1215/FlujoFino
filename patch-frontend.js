const fs = require('fs');

// 1. ProductModal.tsx
let modalCode = fs.readFileSync('apps/frontend/src/components/products/ProductModal.tsx', 'utf8');
if (!modalCode.includes("isPreAssembled")) {
  modalCode = modalCode.replace(
    /<IonCheckbox\s+checked=\{formData\.isCombo\}\s+onIonChange=\{.*?\}\s*\/>/s,
    `$&
          </IonItem>
          {formData.isCombo && (
            <IonItem>
              <IonLabel>¿Es un Combo Pre-ensamblado? (Kitting)</IonLabel>
              <IonCheckbox 
                checked={formData.isPreAssembled || false} 
                onIonChange={e => setFormData({ ...formData, isPreAssembled: e.detail.checked })} 
              />
            </IonItem>
          )}
          <IonItem style={{ display: 'none' }}>`
  );
  fs.writeFileSync('apps/frontend/src/components/products/ProductModal.tsx', modalCode, 'utf8');
}

// 2. ProductCard.tsx
let cardCode = fs.readFileSync('apps/frontend/src/components/products/ProductCard.tsx', 'utf8');
cardCode = cardCode.replace(/\{\!p\.isCombo && \(/g, "{(!p.isCombo || p.isPreAssembled) && (");
cardCode = cardCode.replace(/\{p\.isCombo && \(/g, "{(p.isCombo && !p.isPreAssembled) && (");
fs.writeFileSync('apps/frontend/src/components/products/ProductCard.tsx', cardCode, 'utf8');

// 3. Production.tsx
let prodCode = fs.readFileSync('apps/frontend/src/pages/Production.tsx', 'utf8');
prodCode = prodCode.replace(
  /p => p\.recipe && p\.recipe\.length > 0/g,
  "p => (p.recipe && p.recipe.length > 0) || (p.isCombo && p.isPreAssembled)"
);
fs.writeFileSync('apps/frontend/src/pages/Production.tsx', prodCode, 'utf8');

console.log("Frontend patched!");
