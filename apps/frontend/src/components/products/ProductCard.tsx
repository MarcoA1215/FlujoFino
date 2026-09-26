import { pencilOutline, trashOutline, buildOutline, cubeOutline, swapHorizontalOutline, cutOutline, warningOutline, closeOutline } from 'ionicons/icons';
import React from 'react';
import { IonCol, IonCard, IonCardContent, IonBadge, IonButton, useIonActionSheet } from '@ionic/react';
import type { Product } from '../../types';
import { useImageViewer } from '../../context/ImageViewerContext';

interface ProductCardProps {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (p: Product) => void;
  onConfigure: (p: Product) => void;
  onAdjustStock: (p: Product) => void;
  onAddStock?: (p: Product) => void;
  onRegisterLoss: (p: Product) => void;
  onToggleKitting?: (p: Product) => void;
  onUnpackKit?: (p: Product) => void;
  onConvertType?: (p: Product, targetType: 'REVENTA' | 'FORMULA' | 'SERVICIO') => void;
  isClientMode?: boolean;
  featureRecipes?: boolean;
  featureProduction?: boolean;
  featureBuySell?: boolean;
  featureCustomerSchedules?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product: p,
  onEdit,
  onDelete,
  onConfigure,
  onAdjustStock,
  onAddStock,
  onRegisterLoss,
  onToggleKitting,
  onUnpackKit,
  onConvertType,
  isClientMode,
  featureRecipes,
  featureProduction,
  featureBuySell,
  featureCustomerSchedules
}) => {
  const { openImage } = useImageViewer();
  const [present] = useIonActionSheet();

  const openOptions = () => {
    const currentType: 'REVENTA' | 'FORMULA' | 'SERVICIO' = 
      p.product_type || 
      (p.is_service === true || p.category === 'Servicios' ? 'SERVICIO' : 
      ((p.recipe && p.recipe.length > 0) || p.isCombo ? 'FORMULA' : 'REVENTA'));
    const isService = currentType === 'SERVICIO';
    const isFormula = currentType === 'FORMULA';
    const isResale = currentType === 'REVENTA';

    const buttons: any[] = [
      { text: 'Editar Info / Precio', icon: pencilOutline, cssClass: 'action-sheet-editar', handler: () => onEdit(p) }
    ];

    // Opciones según arquetipo del producto
    if (isResale) {
      if (onAddStock) {
        buttons.push({ text: 'Cargar Stock', icon: cubeOutline, cssClass: 'action-sheet-editar', handler: () => onAddStock(p) });
      }
    } else if (isFormula || p.isCombo) {
      if (p.isCombo) {
        buttons.push({ text: 'Configurar Combo', icon: buildOutline, cssClass: 'action-sheet-editar', handler: () => onConfigure(p) });
      } else if (featureRecipes) {
        buttons.push({ text: 'Configurar Fórmula / Receta', icon: buildOutline, cssClass: 'action-sheet-editar', handler: () => onConfigure(p) });
      }

      if (featureProduction !== false && (p.isCombo || (p.recipe && p.recipe.length > 0)) && onToggleKitting && (p.isCombo || featureRecipes)) {
        buttons.push({ text: `Convertir a ${p.isPreAssembled ? 'Hecho al Instante' : 'Pre-Fabricado'}`, icon: swapHorizontalOutline, cssClass: 'action-sheet-cambiar', handler: () => onToggleKitting(p) });
      }

      if (featureProduction !== false && p.isCombo && p.isPreAssembled && onUnpackKit && (p.physicalStock || 0) > 0) {
        buttons.push({ text: 'Desarmar 1 Und', icon: cutOutline, cssClass: 'action-sheet-desarmar', handler: () => onUnpackKit(p) });
      }

      if (p.isPreAssembled && onAdjustStock) {
        buttons.push({ text: 'Ajustar Stock Ensamblado', icon: cubeOutline, cssClass: 'action-sheet-editar', handler: () => onAdjustStock(p) });
      }
    }
    // NOTA: Para SERVICIOS no se agrega ninguna opción de stock, fórmulas ni insumos.

    if (onConvertType) {
      if (currentType !== 'REVENTA' && featureBuySell) {
        buttons.push({
          text: 'Convertir a Reventa Directa',
          icon: cubeOutline,
          cssClass: 'action-sheet-cambiar',
          handler: () => onConvertType(p, 'REVENTA')
        });
      }
      if (currentType !== 'FORMULA' && featureRecipes) {
        buttons.push({
          text: 'Convertir a Producto Armable / Fórmula',
          icon: buildOutline,
          cssClass: 'action-sheet-cambiar',
          handler: () => onConvertType(p, 'FORMULA')
        });
      }
      if (currentType !== 'SERVICIO' && featureCustomerSchedules) {
        buttons.push({
          text: 'Convertir a Servicio / Cita',
          icon: cutOutline,
          cssClass: 'action-sheet-cambiar',
          handler: () => onConvertType(p, 'SERVICIO')
        });
      }
    }

    if (!isService) {
      buttons.push({ text: 'Registrar Pérdida', icon: warningOutline, cssClass: 'action-sheet-eliminar', handler: () => onRegisterLoss(p) });
    }

    buttons.push({ text: 'Subir Imagen', icon: 'image-outline', handler: () => document.getElementById(`upload-${p.id}`)?.click() });
    buttons.push({ text: isService ? 'Eliminar Servicio' : 'Eliminar Producto', icon: trashOutline, role: 'destructive', handler: () => onDelete(p) });
    buttons.push({ text: 'Cancelar', icon: closeOutline, role: 'cancel' });

    present({
      header: 'Opciones de Producto',
      buttons
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('file', file);
      try {
        const { apiClient } = await import('../../api/client');
        await apiClient.post(`/products/${p.id}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Imagen subida con éxito');
        window.location.reload(); // Quick refresh to show it, or trigger a fetch
      } catch (err) {
        alert('Error al subir la imagen');
      }
    }
  };
  
  const getProductImage = () => {
    if (!p.images) return null;
    if (Array.isArray(p.images) && p.images.length > 0) {
      return p.images[p.images.length - 1];
    }
    if (typeof p.images === 'string' && (p.images as string).trim().length > 0) {
      const parts = (p.images as string).split(',');
      return parts[parts.length - 1].trim();
    }
    return null;
  };
  const imageUrl = getProductImage();
  const currentType: 'REVENTA' | 'FORMULA' | 'SERVICIO' = 
    p.product_type || 
    (p.is_service === true || p.category === 'Servicios' ? 'SERVICIO' : 
    ((p.recipe && p.recipe.length > 0) || p.isCombo ? 'FORMULA' : 'REVENTA'));
  const isService = currentType === 'SERVICIO';
  const isFormula = currentType === 'FORMULA';
  const isResale = currentType === 'REVENTA';
  const costValue = p.cost !== undefined && p.cost !== null && Number(p.cost) > 0 ? Number(p.cost) : (p.estimatedCost ? Number(p.estimatedCost) : 0);
  const currentStock = p.stock !== undefined && p.stock !== null ? p.stock : p.stockQuantity;

  return (
    <IonCol size="12" sizeSm="6" sizeMd="4" sizeLg="3" style={{ display: 'flex' }}>
      <input type="file" id={`upload-${p.id}`} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
      <IonCard style={{ margin: '5px', width: '100%', display: 'flex', flexDirection: 'column' }}>
        <IonCardContent style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '15px' }}>
          
          <div style={{ flex: 1 }}>
            {imageUrl && (
              <img 
                src={imageUrl} 
                alt={p.name} 
                onClick={(e) => { e.stopPropagation(); openImage(imageUrl, p.name); }}
                title="Toca para ver en grande"
                style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px', cursor: 'zoom-in' }} 
              />
            )}
            <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 5px 0', lineHeight: '1.3' }}>{p.name}</h2>
            
            {!isClientMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 8px 0', flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{p.category || 'Sin categoría'}</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 'bold',
                  backgroundColor: isResale ? '#dcfce7' : isFormula ? '#fef3c7' : '#e0e7ff',
                  color: isResale ? '#166534' : isFormula ? '#92400e' : '#3730a3',
                }}>
                  {isResale ? '📦 Reventa' : isFormula ? '🧪 Armable / Fórmula' : '💆 Servicio'}
                </span>
              </div>
            )}
            
            <p style={{ margin: '0 0 12px 0', fontWeight: 'bold', fontSize: '1.05rem', color: 'var(--ion-color-dark)' }}>
              Precio: ${p.salePrice.toFixed(2)}
            </p>

            {costValue > 0 && !isClientMode && (
              <p style={{ margin: '-8px 0 10px 0', fontSize: '0.82rem', color: '#10b981', fontWeight: 600 }}>
                {isResale ? 'Costo:' : 'Costo Est.:'} ${costValue.toFixed(2)} &bull; Margen: ${(p.salePrice - costValue).toFixed(2)}
              </p>
            )}

            {isClientMode && (
              <p style={{ margin: '0 0 12px 0', color: (isService || currentStock > 0) ? 'var(--ion-color-success)' : 'var(--ion-color-danger)', fontWeight: '500', fontSize: '0.9rem' }}>
                {isService ? 'Disponible' : (currentStock > 0 ? `Disponible: ${currentStock}` : 'Agotado')}
              </p>
            )}

            {!isClientMode && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {isResale ? (
                  <IonBadge color={currentStock <= 0 ? 'danger' : 'success'} style={{ padding: '6px 8px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                    Stock: {currentStock}
                  </IonBadge>
                ) : !isService && (!p.isCombo || p.isPreAssembled) ? (
                  <>
                    {Boolean(featureProduction) && (
                      <IonBadge color={p.physicalStock! <= 0 ? 'medium' : 'primary'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                        Físico: {p.physicalStock}
                      </IonBadge>
                    )}
                    <IonBadge color={p.stockQuantity <= 0 ? 'medium' : 'success'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                      Disp: {p.stockQuantity}
                    </IonBadge>
                  </>
                ) : null}
                {!isService && (p.isCombo && !p.isPreAssembled) && (
                  <IonBadge color="tertiary" style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                    Combo (Virtual)
                  </IonBadge>
                )}
                {!isService && Boolean(featureProduction) && (p.recipe && p.recipe.length > 0 && !p.isCombo) && (
                  <IonBadge color={p.isPreAssembled ? 'dark' : 'warning'} style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                    {p.isPreAssembled ? 'Pre-Fabricado' : 'Hecho al Instante'}
                  </IonBadge>
                )}
                {isService && (
                  <IonBadge color="success" style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                    Disponible
                  </IonBadge>
                )}
                {p.durationMinutes ? (
                  <IonBadge color="light" style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal', border: '1px solid #ddd' }}>
                    ⏱️ {p.durationMinutes} min
                  </IonBadge>
                ) : null}
                {p.assignedStaffIds && (Array.isArray(p.assignedStaffIds) ? p.assignedStaffIds.length > 0 : String(p.assignedStaffIds).trim().length > 0) && (
                  <IonBadge color="secondary" style={{ padding: '6px 8px', fontSize: '0.8rem', fontWeight: 'normal' }}>
                    👤 {(Array.isArray(p.assignedStaffIds) ? p.assignedStaffIds.length : String(p.assignedStaffIds).split(',').filter(Boolean).length)} especial.
                  </IonBadge>
                )}
              </div>
            )}
          </div>
          
          {!isClientMode && (
            <div style={{ marginTop: 'auto', paddingTop: '10px', display: 'flex', gap: '8px' }}>
              {isResale && onAddStock && (
                <IonButton expand="block" size="small" color="success" onClick={() => onAddStock(p)} style={{ flex: 1, margin: 0, fontWeight: '700' }}>
                  + Cargar Stock
                </IonButton>
              )}
              <IonButton expand={isResale && onAddStock ? undefined : "block"} size="small" fill="outline" color="primary" onClick={openOptions} style={{ margin: 0, fontWeight: '600' }}>
                Opciones
              </IonButton>
            </div>
          )}
          
        </IonCardContent>
      </IonCard>
    </IonCol>
  );
};
