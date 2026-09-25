import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonFooter,
  IonIcon,
  useIonToast
} from '@ionic/react';
import { closeOutline, checkmarkCircle, personOutline, timeOutline, pricetagOutline } from 'ionicons/icons';
import { apiClient } from '../../api/client';
import type { Product } from '../../types';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: Product | null;
  isCombo?: boolean;
  isResaleOnly?: boolean;
  users: any[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  product,
  isCombo = false,
  isResaleOnly = false,
  users
}) => {
  const [presentToast] = useIonToast();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [stock, setStock] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategory(product.category || '');
      setSalePrice(product.salePrice !== undefined ? String(product.salePrice) : '');
      const existingCost = product.cost !== undefined && product.cost !== null ? product.cost : product.estimatedCost;
      setEstimatedCost(existingCost !== undefined && existingCost !== null ? String(existingCost) : '');
      setStock(product.stock !== undefined && product.stock !== null ? String(product.stock) : String(product.stockQuantity || '0'));
      setDurationMinutes(product.durationMinutes ? String(product.durationMinutes) : '30');
      
      let staffIds: string[] = [];
      if (Array.isArray(product.assignedStaffIds)) {
        staffIds = product.assignedStaffIds;
      } else if (typeof product.assignedStaffIds === 'string' && (product.assignedStaffIds as string).trim()) {
        staffIds = (product.assignedStaffIds as string).split(',').map(s => s.trim()).filter(Boolean);
      }
      setSelectedStaffIds(staffIds);
    } else {
      setName('');
      setCategory(isCombo ? 'Combos' : isResaleOnly ? 'General' : 'Servicios');
      setSalePrice('');
      setEstimatedCost('');
      setStock('0');
      setDurationMinutes('30');
      setSelectedStaffIds([]);
    }
  }, [product, isCombo, isResaleOnly, isOpen]);

  const toggleStaff = (userId: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId) 
        : [...prev, userId]
    );
  };

  const handleSelectAllStaff = () => {
    if (selectedStaffIds.length === users.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(users.map(u => u.id));
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      presentToast({ message: 'El nombre es obligatorio', duration: 2500, color: 'warning' });
      return;
    }
    const priceNum = parseFloat(salePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      presentToast({ message: 'Ingresa un precio de venta válido', duration: 2500, color: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const costNum = estimatedCost ? parseFloat(estimatedCost) : 0;
      const stockNum = stock ? parseFloat(stock) : 0;
      const payload: any = {
        name: name.trim(),
        category: category.trim() || undefined,
        salePrice: priceNum,
        cost: costNum,
        estimatedCost: costNum,
        stock: stockNum,
        stockQuantity: stockNum,
        physicalStock: stockNum,
        durationMinutes: isResaleOnly ? null : (durationMinutes ? parseInt(durationMinutes, 10) : 30),
        assignedStaffIds: isResaleOnly ? [] : selectedStaffIds,
        is_service: isResaleOnly ? false : (product?.is_service !== undefined ? product.is_service : false)
      };

      if (product) {
        await apiClient.put(`/products/${product.id}`, payload);
        presentToast({ message: 'Producto/Servicio actualizado con éxito', duration: 2500, color: 'success' });
      } else {
        payload.isCombo = isCombo;
        payload.isPreAssembled = false;
        await apiClient.post('/products', payload);
        presentToast({ message: isCombo ? 'Combo creado con éxito' : isResaleOnly ? 'Producto creado con éxito' : 'Servicio/Producto creado con éxito', duration: 2500, color: 'success' });
      }

      onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      presentToast({
        message: 'Error al guardar: ' + (e.response?.data?.message || e.message),
        duration: 3500,
        color: 'danger'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>
            {product ? `Editar: ${product.name}` : isCombo ? 'Nuevo Combo' : isResaleOnly ? 'Nuevo Producto' : 'Nuevo Servicio / Fórmula'}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          
          {/* Main Info Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IonIcon icon={pricetagOutline} color="primary" /> {isResaleOnly ? 'Datos del Producto' : 'Información Principal'}
            </h4>

            <IonItem lines="none" style={{ marginBottom: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', '--background': '#ffffff' } as any}>
              <IonLabel position="stacked" style={{ color: '#475569', fontWeight: '600' }}>
                {isResaleOnly ? 'Nombre del Producto *' : 'Nombre del Servicio / Producto *'}
              </IonLabel>
              <IonInput 
                value={name} 
                onIonInput={e => setName(e.detail.value!)} 
                placeholder={isResaleOnly ? 'Ej. Vestido Casual, Pantalón Jean, Nutella 350g...' : 'Ej. Uñas Acrílicas, Masaje Relajante, etc.'} 
              />
            </IonItem>

            <IonItem lines="none" style={{ marginBottom: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', '--background': '#ffffff' } as any}>
              <IonLabel position="stacked" style={{ color: '#475569', fontWeight: '600' }}>Categoría</IonLabel>
              <IonInput 
                value={category} 
                onIonInput={e => setCategory(e.detail.value!)} 
                placeholder={isResaleOnly ? 'Ej. Ropa, Snacks, Bodegón, Bebidas...' : 'Ej. Servicios, Manicura, Masajes, Estética...'} 
              />
            </IonItem>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', '--background': '#ffffff' } as any}>
                <IonLabel position="stacked" style={{ color: '#475569', fontWeight: '600' }}>Precio Venta ($) *</IonLabel>
                <IonInput 
                  type="number" 
                  value={salePrice} 
                  onIonInput={e => setSalePrice(e.detail.value!)} 
                  placeholder="Ej. 25.00" 
                  step="0.01"
                />
              </IonItem>

              <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', '--background': '#ffffff' } as any}>
                <IonLabel position="stacked" style={{ color: '#475569', fontWeight: '600' }}>
                  {isResaleOnly ? 'Costo de Compra ($)' : 'Costo Insumos ($)'}
                </IonLabel>
                <IonInput 
                  type="number" 
                  value={estimatedCost} 
                  onIonInput={e => setEstimatedCost(e.detail.value!)} 
                  placeholder={isResaleOnly ? 'Ej. 10.00' : 'Opcional (Ej. 5.00)'} 
                  step="0.01"
                />
              </IonItem>
            </div>

            {isResaleOnly ? (
              <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', '--background': '#ffffff' } as any}>
                <IonLabel position="stacked" style={{ color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {product ? 'Stock Actual' : 'Stock Inicial'}
                </IonLabel>
                <IonInput 
                  type="number" 
                  value={stock} 
                  onIonInput={e => setStock(e.detail.value!)} 
                  placeholder="Ej. 15" 
                  min="0"
                />
              </IonItem>
            ) : (
              <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', '--background': '#ffffff' } as any}>
                <IonLabel position="stacked" style={{ color: '#475569', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <IonIcon icon={timeOutline} /> Duración Estimada (Minutos)
                </IonLabel>
                <IonInput 
                  type="number" 
                  value={durationMinutes} 
                  onIonInput={e => setDurationMinutes(e.detail.value!)} 
                  placeholder="Ej. 30, 45, 60..." 
                  min="5"
                  step="5"
                />
              </IonItem>
            )}
          </div>

          {/* Assigned Staff Card - only if not resale-only */}
          {!isResaleOnly && (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', marginBottom: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IonIcon icon={personOutline} color="primary" /> Especialistas / Personal que realiza este trabajo
                </h4>
              {users.length > 0 && (
                <button 
                  type="button"
                  onClick={handleSelectAllStaff}
                  style={{ background: 'none', border: 'none', color: 'var(--ion-color-primary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                >
                  {selectedStaffIds.length === users.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                </button>
              )}
            </div>

            <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
              Elige qué trabajadoras o especialistas están capacitadas para brindar este servicio. 
              {selectedStaffIds.length === 0 ? (
                <span style={{ color: '#0284c7', display: 'block', marginTop: '4px', fontWeight: '500' }}>
                  ℹ️ Al no seleccionar ninguna, cualquier trabajadora disponible podrá atenderlo por defecto.
                </span>
              ) : (
                <span style={{ color: '#059669', display: 'block', marginTop: '4px', fontWeight: '500' }}>
                  ✓ Solo las {selectedStaffIds.length} personas seleccionadas podrán ser elegidas para este servicio en la reserva.
                </span>
              )}
            </p>

            {users.length === 0 ? (
              <div style={{ padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', fontSize: '13px', color: '#64748b', textAlign: 'center' }}>
                No hay otros miembros registrados en el equipo. Puedes agregar usuarios desde la sección <b>Usuarios</b>.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {users.map(u => {
                  const isChecked = selectedStaffIds.includes(u.id);
                  return (
                    <div 
                      key={u.id}
                      onClick={() => toggleStaff(u.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: isChecked ? '2px solid var(--ion-color-primary)' : '1px solid #cbd5e1',
                        backgroundColor: isChecked ? '#eff6ff' : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.15s ease',
                        boxShadow: isChecked ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: isChecked ? 'var(--ion-color-primary)' : '#e2e8f0',
                          color: isChecked ? '#ffffff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '13px',
                          flexShrink: 0
                        }}>
                          {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>
                            {u.username}
                          </div>
                          {u.jobTitle && (
                            <div style={{ fontSize: '11px', color: '#64748b' }}>
                              {u.jobTitle}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ flexShrink: 0, marginLeft: '6px' }}>
                        {isChecked ? (
                          <IonIcon icon={checkmarkCircle} color="primary" style={{ fontSize: '20px' }} />
                        ) : (
                          <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #94a3b8' }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

        </div>
      </IonContent>

      <IonFooter className="ion-no-border" style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '10px 16px' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <IonButton fill="outline" color="medium" onClick={onClose} disabled={saving}>
            Cancelar
          </IonButton>
          <IonButton color="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : (product ? 'Guardar Cambios' : 'Crear')}
          </IonButton>
        </div>
      </IonFooter>
    </IonModal>
  );
};
