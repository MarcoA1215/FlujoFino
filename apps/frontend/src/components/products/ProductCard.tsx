import { pencilOutline, trashOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';
import React from 'react';
import { IonCol, IonCard, IonCardContent, IonBadge, IonButton } from '@ionic/react';
import type { Product } from '../../types';

interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onConfigure: (p: Product) => void;
  onAdjustStock: (p: Product) => void;
  onRegisterLoss: (p: Product) => void;
  onToggleKitting?: (p: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product: p,
  onEdit,
  onDelete,
  onConfigure,
  onAdjustStock,
  onRegisterLoss
}) => {
  return (
    <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3">
      <IonCard style={{ margin: '5px' }}>
        <IonCardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0 0 5px 0', wordBreak: 'break-word' }}>{p.name}</h2>
              <p style={{ margin: 0, color: 'gray', fontSize: '0.85rem' }}>
                {p.category || 'Sin categoría'} - {p.isCombo ? 'Combo' : 'Base'} - {p.isCombo ? 'Combo' : 'Base'}
              </p>
              <p style={{ margin: '5px 0 0 0', fontWeight: 'bold' }}>Precio: {p.salePrice.toFixed(2)}</p>
            </div>
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
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '15px' }}>
            <IonButton size="small" fill="outline" color={p.isCombo ? 'tertiary' : 'primary'} onClick={() => onConfigure(p)}>
              {p.isCombo ? 'Configurar Combo' : 'Configurar Receta'}
            </IonButton>
            <IonButton size="small" fill="outline" color="medium" onClick={() => onAdjustStock(p)}>
              Stock Inicial
            </IonButton>
              {p.isCombo && onToggleKitting && (
                <IonButton size="small" fill="outline" color="warning" onClick={() => onToggleKitting(p)}>
                  Hacer {p.isPreAssembled ? 'Virtual' : 'Físico (Kitting)'}
                </IonButton>
              )}
            <IonButton size="small" fill="outline" color="danger" onClick={() => onRegisterLoss(p)}>
              Pérdida
            </IonButton>
          </div>
        </IonCardContent>
      </IonCard>
    </IonCol>
  );
};

