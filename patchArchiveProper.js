const fs = require('fs');
let page = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');

const archiveLogic = `
  const archiveRawMaterial = async (m: RawMaterial) => {
    presentAlert({
      header: 'Archivar Insumo',
      message: '¿Estás seguro de archivar este insumo? Desaparecerá de la lista, pero su historial se mantendrá intacto.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { 
          text: 'Archivar', 
          role: 'destructive',
          handler: async () => {
            try {
              await apiClient.patch('/raw-materials/' + m.id + '/archive');
              fetchMaterials();
              presentToast({ message: 'Insumo archivado', duration: 2000, color: 'success' });
            } catch (e) {
              presentToast({ message: 'Error al archivar', duration: 3000, color: 'danger' });
            }
          }
        }
      ]
    });
  };
`;
// Inject right before fetchMaterials
page = page.replace("const fetchMaterials = async () => {", archiveLogic + "\n  const fetchMaterials = async () => {");
fs.writeFileSync('apps/frontend/src/pages/RawMaterials.tsx', page, 'utf8');
