import React from 'react';
import { IonCol, IonCard, IonCardContent, IonBadge, IonButton, useIonActionSheet } from '@ionic/react';
import { pencilOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import type { RawMaterial } from '../../types';

interface RawMaterialCardProps {
  material: RawMaterial;
  onEditName: (m: RawMaterial) => void;
  onRestock: (m: RawMaterial) => void;
  onRegisterLoss: (m: RawMaterial) => void;
  onViewHistory: (m: RawMaterial) => void;
  onArchive: (m: RawMaterial) => void;
}

export const RawMaterialCard: React.FC<RawMaterialCardProps> = ({
  material: m,
  onEditName,
  onRestock,
  onRegisterLoss,
  onViewHistory,
  onArchive
}) => {
  const [present] = useIonActionSheet();

  const openOptions = () => {
    present({
      header: 'Opciones de Insumo',
      buttons: [
        { text: 'Comprar', handler: () => onRestock(m) },
        { text: 'Registrar Pérdida', handler: () => onRegisterLoss(m) },
        { text: 'Historial', handler: () => onViewHistory(m) },
        { text: 'Archivar', role: 'destructive', handler: () => onArchive(m) },
        { text: 'Cancelar', role: 'cancel' }
      ]
    });
  };
  
  return (
    <IonCol size="12" sizeSm="6" sizeLg="6">
      <IonCard style={{ margin: '5px' }}>
        <IonCardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 5px 0', wordBreak: 'break-word' }}>{m.name}</h2>
              <p style={{ margin: 0, color: 'gray', fontSize: '0.9rem' }}>Costo prom: {m.costPerUnit.toFixed(2)} / {m.unit}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '8px' }}>
              <IonBadge color={m.stockQuantity <= m.minStockAlert ? 'danger' : 'success'} style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                {m.stockQuantity.toFixed(2)} {m.unit}
              </IonBadge>
              <div style={{ display: 'flex', gap: '5px' }}>
                <IonButton fill="clear" size="small" onClick={() => onEditName(m)} style={{ margin: 0, width: '30px', height: '30px' }}><IonIcon icon={pencilOutline} slot="icon-only" /></IonButton>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
              <IonButton size="small" fill="solid" color="light" onClick={openOptions}>
                Opciones
              </IonButton>
            </div>
        </IonCardContent>
      </IonCard>
    </IonCol>
  );
};

