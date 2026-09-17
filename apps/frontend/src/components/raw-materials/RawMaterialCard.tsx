import React from 'react';
import { IonCol, IonCard, IonCardContent, IonBadge, IonButton, useIonActionSheet } from '@ionic/react';
import { pencilOutline, cartOutline, warningOutline, timeOutline, archiveOutline, closeOutline } from 'ionicons/icons';
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
        { text: 'Editar Nombre/Alerta', icon: pencilOutline, cssClass: 'action-sheet-editar', handler: () => onEditName(m) },
        { text: 'Comprar', icon: cartOutline, cssClass: 'action-sheet-comprar', handler: () => onRestock(m) },
        { text: 'Registrar Pérdida', icon: warningOutline, cssClass: 'action-sheet-eliminar', handler: () => onRegisterLoss(m) },
        { text: 'Historial', icon: timeOutline, cssClass: 'action-sheet-editar', handler: () => onViewHistory(m) },
        { text: 'Archivar', icon: archiveOutline, role: 'destructive', handler: () => onArchive(m) },
        { text: 'Cancelar', icon: closeOutline, role: 'cancel' }
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
              
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
              <IonButton size="small" fill="solid" color="primary" onClick={openOptions}>
                Opciones
              </IonButton>
            </div>
        </IonCardContent>
      </IonCard>
    </IonCol>
  );
};

