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
    <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3" style={{ display: 'flex' }}>
      <IonCard style={{ margin: '5px', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <IonCardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px' }}>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 5px 0', lineHeight: '1.3', wordBreak: 'break-word' }}>{m.name}</h2>
            
            <p style={{ margin: '0 0 12px 0', color: 'gray', fontSize: '0.9rem' }}>
              Costo prom: {m.costPerUnit.toFixed(2)} / {m.unit}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              <IonBadge color={m.stockQuantity <= m.minStockAlert ? 'danger' : 'success'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                Stock: {m.stockQuantity.toFixed(2)} {m.unit}
              </IonBadge>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
            <IonButton size="small" fill="solid" color="primary" onClick={openOptions} style={{ margin: 0 }}>
              Opciones
            </IonButton>
          </div>
          
        </IonCardContent>
      </IonCard>
    </IonCol>
  );
};
