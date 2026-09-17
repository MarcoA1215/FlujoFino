const fs = require('fs');
let r = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');

r = r.replace(/const openEditNameAlert = \(m: RawMaterial\) => \{[\s\S]*?\}\];\s*\}\);\s*\};/, 
`const openEditNameAlert = (m: RawMaterial) => {
    presentAlert({
      header: 'Editar Insumo',
      inputs: [
        { name: 'newName', type: 'text', value: m.name, placeholder: 'Nuevo nombre' },
        { name: 'newMinStock', type: 'number', value: m.minStockAlert?.toString() || '5', placeholder: 'Alerta mnima de stock' }
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
                minStockAlert: parseFloat(data.newMinStock) 
              });
              presentToast({ message: 'Insumo actualizado', duration: 2000, color: 'success' });
              fetchData();
            } catch (e) {
              presentToast({ message: 'Error al actualizar', duration: 2000, color: 'danger' });
            }
          }
        }
      ]
    });
  };`);
fs.writeFileSync('apps/frontend/src/pages/RawMaterials.tsx', r);
console.log("Fixed!");
