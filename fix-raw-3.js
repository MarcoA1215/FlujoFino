const fs = require('fs');
let r = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');

const regex = /const openEditNameAlert = \(m: RawMaterial\) => \{[\s\S]*?\}\];\s*\}\);\s*\};\s*const openEditNameAlert = \(m: RawMaterial\) => \{[\s\S]*?\}\];\s*\}\);\s*\};/g;
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

// I will just replace both of them manually.
const start1 = r.indexOf('const openEditNameAlert = (m: RawMaterial) => {');
const startFilter = r.indexOf('const filteredData = materials.filter');
r = r.substring(0, start1) + replacement + "\n\n  " + r.substring(startFilter);

fs.writeFileSync('apps/frontend/src/pages/RawMaterials.tsx', r);
console.log("Fixed duplicate!");
