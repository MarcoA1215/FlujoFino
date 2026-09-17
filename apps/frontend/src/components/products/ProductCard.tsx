import { pencilOutline, trashOutline, buildOutline, cubeOutline, swapHorizontalOutline, cutOutline, warningOutline, closeOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import React from 'react';
import { IonCol, IonCard, IonCardContent, IonBadge, IonButton, useIonActionSheet } from '@ionic/react';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onConfigure: (p: Product) => void;
  onAdjustStock: (p: Product) => void;
  onRegisterLoss: (p: Product) => void;
  onToggleKitting?: (p: Product) => void;
  onUnpackKit?: (p: Product) => void;
  isClientMode?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product: p,
  onEdit,
  onDelete,
  onConfigure,
  onAdjustStock,
  onRegisterLoss,
  onToggleKitting,
  onUnpackKit,
  isClientMode
}) => {
  const [present] = useIonActionSheet();

  const openOptions = () => {
    const buttons: any[] = [
      { text: p.isCombo ? 'Configurar Combo' : 'Configurar Receta', icon: buildOutline, handler: () => onConfigure(p) },
      { text: 'Stock Inicial / Ajuste', icon: cubeOutline, handler: () => onAdjustStock(p) }
    ];

    if (p.isCombo && onToggleKitting) {
      buttons.push({ text: `Convertir a ${p.isPreAssembled ? 'Virtual' : 'Físico (Kitting)'}`, icon: swapHorizontalOutline, handler: () => onToggleKitting(p) });
    }

    if (p.isCombo && p.isPreAssembled && onUnpackKit && (p.physicalStock || 0) > 0) {
      buttons.push({ text: 'Desarmar 1 Und', icon: cutOutline, handler: () => onUnpackKit(p) });
    }

    buttons.push({ text: 'Registrar Pérdida', icon: warningOutline, handler: () => onRegisterLoss(p) });
    buttons.push({ text: 'Cancelar', icon: closeOutline, role: 'cancel' });

    present({
      header: 'Opciones de Producto',
      buttons
    });
  };
  
  return (
    <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3">
      <IonCard style={{ margin: '5px' }}>
        <IonCardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ flex: '1 1 150px', minWidth: '150px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 5px 0' }}>{p.name}</h2>
              {!isClientMode && (
                <p style={{ margin: 0, color: 'gray', fontSize: '0.85rem' }}>
                  {p.category || 'Sin categoría'} - {p.isCombo ? 'Combo' : 'Base'}
                </p>
              )}
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>Precio: ${p.salePrice.toFixed(2)}</p>
  {isClientMode && (
    <p style={{ margin: '5px 0 0 0', color: p.stockQuantity > 0 ? 'green' : 'red', fontWeight: '500', fontSize: '0.9rem' }}>
      Disponible: {p.stockQuantity}
    </p>
  )}
            </div>
            
            {!isClientMode && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    {(!p.isCombo || p.isPreAssembled) && (
                      <>
                        <IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                          Físico: {p.physicalStock}
                        </IonBadge>
                        <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                          Disp: {p.stockQuantity}
                        </IonBadge>
                      </>
                    )}
                    {(p.isCombo && !p.isPreAssembled) && (
                      <IonBadge color="tertiary" style={{ padding: '8px 10px', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                        Combo (Virtual)
                      </IonBadge>
                    )}
                  </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <IonButton fill="clear" size="small" onClick={() => onEdit(p)} style={{ margin: 0, width: '30px', height: '30px' }}><IonIcon icon={pencilOutline} slot="icon-only" /></IonButton>
                  <IonButton fill="clear" size="small" color="danger" onClick={() => onDelete(p)} style={{ margin: 0, width: "30px", height: "30px" }}><IonIcon icon={trashOutline} slot="icon-only" /></IonButton>
                </div>
              </div>
            )}
          </div>
          
          {!isClientMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '15px' }}>
                <IonButton size="small" fill="solid" color="primary" onClick={openOptions}>
                  Opciones
                </IonButton>
              </div>
          )}
        </IonCardContent>
      </IonCard>
    </IonCol>
  );
};
