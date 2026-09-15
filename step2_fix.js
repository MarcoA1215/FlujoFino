const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.service.ts', 'utf8');

// Find the start of getAllProducts and end of it.
const startFn = "async getAllProducts() {";
const endFn = "async findOne(id: string) {";

let before = code.substring(0, code.indexOf(startFn));
let after = code.substring(code.indexOf(endFn));

let newFn = `async getAllProducts() {
    const products = await this.productRepo.find({
      relations: {
        comboItems: { component: true },
        recipe: { rawMaterial: true }
      }
    });

    return products.map(p => {
      let finalStock = p.stockQuantity;
      let finalPhysical = p.physicalStock;

      if (p.comboItems && p.comboItems.length > 0) {
        let minAvail = Infinity;
        let minPhys = Infinity;
        for (const ci of p.comboItems) {
          const availFromComp = Math.floor((ci.component?.stockQuantity || 0) / ci.quantity);
          const physFromComp = Math.floor((ci.component?.physicalStock || 0) / ci.quantity);
          if (availFromComp < minAvail) minAvail = availFromComp;
          if (physFromComp < minPhys) minPhys = physFromComp;
        }
        finalStock = minAvail === Infinity ? 0 : minAvail;
        finalPhysical = minPhys === Infinity ? 0 : minPhys;
      }

      const cleanedComboItems = p.comboItems?.map(ci => ({
        id: ci.id,
        componentId: ci.componentId,
        quantity: ci.quantity
      })) || [];

      return {
        ...p,
        stockQuantity: finalStock,
        physicalStock: finalPhysical,
        comboItems: cleanedComboItems,
        recipe: undefined
      };
    });
  }

  `;

fs.writeFileSync('apps/backend/src/products/products.service.ts', before + newFn + after, 'utf8');
