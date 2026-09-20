import { pencilOutline, trashOutline, buildOutline, cubeOutline, swapHorizontalOutline, cutOutline, warningOutline, closeOutline } from 'ionicons/icons';
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
  featureRecipes?: boolean;
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
  isClientMode,
  featureRecipes
}) => {
  const [present] = useIonActionSheet();

  const openOptions = () => {
    const buttons: any[] = [
      { text: 'Editar Info / Precio', icon: pencilOutline, cssClass: 'action-sheet-editar', handler: () => onEdit(p) }
    ];

    if (p.isCombo) {
      buttons.push({ text: 'Configurar Combo', icon: buildOutline, cssClass: 'action-sheet-editar', handler: () => onConfigure(p) });
    } else if (featureRecipes) {
      buttons.push({ text: 'Configurar Fórmula', icon: buildOutline, cssClass: 'action-sheet-editar', handler: () => onConfigure(p) });
    }

    buttons.push({ text: 'Stock Inicial / Ajuste', icon: cubeOutline, cssClass: 'action-sheet-editar', handler: () => onAdjustStock(p) });

    if ((p.isCombo || (p.recipe && p.recipe.length > 0)) && onToggleKitting && (p.isCombo || featureRecipes)) {
      buttons.push({ text: `Convertir a ${p.isPreAssembled ? 'Hecho al Instante' : 'Pre-Fabricado'}`, icon: swapHorizontalOutline, cssClass: 'action-sheet-cambiar', handler: () => onToggleKitting(p) });
    }

    if (p.isCombo && p.isPreAssembled && onUnpackKit && (p.physicalStock || 0) > 0) {
      buttons.push({ text: 'Desarmar 1 Und', icon: cutOutline, cssClass: 'action-sheet-desarmar', handler: () => onUnpackKit(p) });
    }

    buttons.push({ text: 'Registrar Pérdida', icon: warningOutline, cssClass: 'action-sheet-eliminar', handler: () => onRegisterLoss(p) });
    buttons.push({ text: 'Eliminar Producto', icon: trashOutline, role: 'destructive', handler: () => onDelete(p) });
    buttons.push({ text: 'Cancelar', icon: closeOutline, role: 'cancel' });

    present({
      header: 'Opciones de Producto',
      buttons
    });
  };
  
  return (
    <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3" style={{ display: 'flex' }}>
      <IonCard style={{ margin: '5px', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <IonCardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px' }}>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 5px 0', lineHeight: '1.3' }}>{p.name}</h2>
            
            {!isClientMode && (
              <p style={{ margin: '0 0 8px 0', color: 'gray', fontSize: '0.85rem' }}>
                {p.category || 'Sin categoría'} - {p.isCombo ? 'Combo' : 'Base'}
              </p>
            )}
            
            <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--ion-color-dark)' }}>
              Precio: ${p.salePrice.toFixed(2)}
            </p>

            {isClientMode && (
              <p style={{ margin: '0 0 12px 0', color: p.stockQuantity > 0 ? 'var(--ion-color-success)' : 'var(--ion-color-danger)', fontWeight: '500', fontSize: '0.9rem' }}>
                Disponible: {p.stockQuantity}
              </p>
            )}

            {!isClientMode && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {(!p.isCombo || p.isPreAssembled) && (
                  <>
                    <IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                      Físico: {p.physicalStock}
                    </IonBadge>
                    <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                      Disp: {p.stockQuantity}
                    </IonBadge>
                  </>
                )}
                {(p.isCombo && !p.isPreAssembled) && (
                  <IonBadge color="tertiary" style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                    Combo (Virtual)
                  </IonBadge>
                )}
                {(p.recipe && p.recipe.length > 0 && !p.isCombo) && (
                  <IonBadge color={p.isPreAssembled ? 'dark' : 'warning'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                    {p.isPreAssembled ? 'Pre-Fabricado' : 'Hecho al Instante'}
                  </IonBadge>
                )}
              </div>
            )}
          </div>
          
          {!isClientMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
              <IonButton size="small" fill="solid" color="primary" onClick={openOptions} style={{ margin: 0 }}>
                Opciones
              </IonButton>
            </div>
          )}
          
        </IonCardContent>
      </IonCard>
    </IonCol>
  );
};
