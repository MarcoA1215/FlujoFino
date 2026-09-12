const fs = require('fs');

let types = fs.readFileSync('apps/frontend/src/types.ts', 'utf8');
if (!types.includes('isActive?: boolean;')) {
  types = types.replace(/minStockAlert: number;/g, "minStockAlert: number;\n  isActive?: boolean;");
  fs.writeFileSync('apps/frontend/src/types.ts', types, 'utf8');
}

let card = fs.readFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', 'utf8');
if (!card.includes('onArchive')) {
  card = card.replace(/onViewHistory:\s*\(m:\s*RawMaterial\)\s*=>\s*void;/g, "onViewHistory: (m: RawMaterial) => void;\n  onArchive: (m: RawMaterial) => void;");
  card = card.replace(/onViewHistory\r?\n\}\)/g, "onViewHistory,\n  onArchive\n})");
  card = card.replace(/<IonButton size="small" fill="outline" color="tertiary" onClick=\{\(\) => onViewHistory\(m\)\}>[\s\S]*?Historial[\s\S]*?<\/IonButton>/g, `<IonButton size="small" fill="outline" color="tertiary" onClick={() => onViewHistory(m)}>\n              Historial\n            </IonButton>\n            <IonButton size="small" fill="outline" color="danger" onClick={() => onArchive(m)}>\n              Archivar\n            </IonButton>`);
  fs.writeFileSync('apps/frontend/src/components/raw-materials/RawMaterialCard.tsx', card, 'utf8');
}

let page = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');
if (!page.includes('archiveRawMaterial')) {
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
  page = page.replace(/const openHistory[\s\S]*?};/, `const openHistory = (m: RawMaterial) => {\n    setSelectedMaterialForHistory(m);\n  };\n` + archiveLogic);
  
  page = page.replace(/onViewHistory=\{\(\) => setSelectedMaterialForHistory\(m\)\}/g, "onViewHistory={() => setSelectedMaterialForHistory(m)} onArchive={archiveRawMaterial}");
  fs.writeFileSync('apps/frontend/src/pages/RawMaterials.tsx', page, 'utf8');
}

