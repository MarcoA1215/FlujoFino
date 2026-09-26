// @ts-nocheck
import React from 'react';
import { IonCol, IonBadge, IonButton, useIonActionSheet } from '@ionic/react';
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
      <div className="ff-card" style={{ margin: '6px', width: '100%', display: 'flex', flexDirection: 'column', padding: '16px', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#0f172a', lineHeight: '1.3', wordBreak: 'break-word' }}>
              {m.name}
            </h2>
            <IonBadge color={m.stockQuantity <= m.minStockAlert ? 'danger' : 'success'} style={{ borderRadius: '8px', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 600 }}>
              {m.stockQuantity.toFixed(2)} {m.unit}
            </IonBadge>
          </div>
          
          <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '0.85rem' }}>
            Costo prom: <strong style={{ color: '#0f172a' }}>${m.costPerUnit.toFixed(2)}</strong> / {m.unit}
          </p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          <IonButton size="small" fill="outline" color="dark" onClick={openOptions} style={{ margin: 0, borderRadius: '8px', fontWeight: 600, fontSize: '0.75rem' }}>
            Gestionar
          </IonButton>
        </div>
      </div>
    </IonCol>
  );
};
