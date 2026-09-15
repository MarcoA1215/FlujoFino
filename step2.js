const fs = require('fs');
let code = fs.readFileSync('apps/backend/src/products/products.service.ts', 'utf8');

// Replace the query part
const startStr = "const reservedDirect = await this.dataSource.query(`";
const endStr = "return products.map(p => {";

const startIndex = code.indexOf(startStr);
const endIndex = code.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  let newCode = code.substring(0, startIndex);
  newCode += "return products.map(p => {\n";
  
  // replace inside the map
  const mapContent = `
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
  `;
  
  const endOfMap = code.indexOf("    }\n\n    async findOne(id: string)");
  newCode += mapContent + code.substring(endOfMap);
  fs.writeFileSync('apps/backend/src/products/products.service.ts', newCode, 'utf8');
}
