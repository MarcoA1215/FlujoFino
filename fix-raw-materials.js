const fs = require('fs');
let content = fs.readFileSync('apps/frontend/src/pages/RawMaterials.tsx', 'utf8');

// 1. Add IonModal to imports
content = content.replace(/IonIcon \} from '@ionic\/react';/, `IonIcon, IonModal } from '@ionic/react';`);

// 2. Add state
content = content.replace(/const \[selectedMaterialForHistory, setSelectedMaterialForHistory\] = useState<RawMaterial \| null>\(null\);/, 
  `const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<RawMaterial | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);`);

// 3. Add modal close inside handleCreate
content = content.replace(/presentToast\(\{ message: 'Insumo creado', duration: 2000, color: 'success' \}\);/,
  `presentToast({ message: 'Insumo creado', duration: 2000, color: 'success' });
      setShowCreateModal(false);`);

// 4. Refactor the Grid and add Modal
const gridMatch = content.match(/<IonGrid>\s*<IonRow>\s*<IonCol size="12" sizeMd="4">([\s\S]*?)<\/IonCol>\s*<IonCol size="12" sizeMd="8">([\s\S]*?)<\/IonCol>\s*<\/IonRow>\s*<\/IonGrid>/);

if (gridMatch) {
  const formCard = gridMatch[1];
  const listGrid = gridMatch[2];

  const newLayout = `
    <IonRow className="ion-margin-bottom">
      <IonCol size="12" sizeSm="6" sizeMd="4">
        <IonButton expand="block" color="primary" onClick={() => setShowCreateModal(true)}>+ Agregar Insumo</IonButton>
      </IonCol>
    </IonRow>

    <IonGrid className="ion-no-padding">
      <IonRow>
        {filteredData.map(m => (
          <RawMaterialCard key={m.id} material={m} onEditName={openEditNameAlert} onRestock={openRestockAlert} onRegisterLoss={openLossAlert} onViewHistory={() => setSelectedMaterialForHistory(m)} onArchive={archiveRawMaterial} />
        ))}
      </IonRow>
    </IonGrid>

    <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)}>
      <IonHeader>
        <IonToolbar color="success">
          <IonTitle>Agregar Insumo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowCreateModal(false)}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        ${formCard.replace(/<IonCardHeader>[\s\S]*?<\/IonCardHeader>/, '')}
      </IonContent>
    </IonModal>
  `;
  
  content = content.replace(gridMatch[0], newLayout);
}

fs.writeFileSync('apps/frontend/src/pages/RawMaterials.tsx', content);
console.log('RawMaterials refactored');
