const fs = require('fs');
let r = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');

const replacement = `const openEditNameAlert = (m: RawMaterial) => {
    presentAlert({
      header: 'Editar Insumo',
      inputs: [
        { name: 'newName', type: 'text', value: m.name, placeholder: 'Nuevo nombre' },
        { name: 'newMinStock', type: 'number', value: m.minStockAlert?.toString() || '5', placeholder: 'Alerta minima de stock' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (!data.newName) return;
            try {
              await apiClient.put('/raw-materials/' + m.id, { 
                name: data.newName, 
                minStockAlert: parseFloat(data.newMinStock) || 0
              });
              presentToast({ message: 'Insumo actualizado', duration: 2000, color: 'success' });
              fetchMaterials();
            } catch (e) {
              presentToast({ message: 'Error al actualizar', duration: 2000, color: 'danger' });
            }
          }
        }
      ]
    });
  };`;

const startIdx = r.indexOf('const openEditNameAlert = (m: RawMaterial) => {');
let endIdx = r.indexOf('};', r.indexOf('catch (e)', startIdx));
// Find the exact closing braces
endIdx = r.indexOf('};', endIdx) + 2;
// Wait, to be safe, I'll just substring until `const handleAddRawMaterial`
const endOfFunc = r.indexOf('const handleAddRawMaterial', startIdx);
r = r.substring(0, startIdx) + replacement + "\n\n  " + r.substring(endOfFunc);

fs.writeFileSync('apps/frontend/src/pages/RawMaterials.tsx', r);
console.log("Fixed openEditNameAlert!");
