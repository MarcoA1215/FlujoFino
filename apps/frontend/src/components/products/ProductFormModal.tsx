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
  archetype?: 'REVENTA' | 'FORMULA' | 'SERVICIO';
  isResaleOnly?: boolean;
  users: any[];
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  product,
  isCombo = false,
  archetype,
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
  const [selectedType, setSelectedType] = useState<'REVENTA' | 'FORMULA' | 'SERVICIO'>(archetype || 'REVENTA');

  const isResale = selectedType === 'REVENTA';
  const isFormula = selectedType === 'FORMULA';
  const isService = selectedType === 'SERVICIO';

  useEffect(() => {
    if (product) {
      const pType: 'REVENTA' | 'FORMULA' | 'SERVICIO' = 
        product.product_type || 
        (product.is_service === true || product.category === 'Servicios' ? 'SERVICIO' : 
        ((product.recipe && product.recipe.length > 0) || product.isCombo ? 'FORMULA' : 'REVENTA'));
      setSelectedType(pType);
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
      const initType = archetype || (isResaleOnly ? 'REVENTA' : 'REVENTA');
      setSelectedType(initType);
      setName('');
      setCategory(isCombo ? 'Combos' : initType === 'SERVICIO' ? 'Servicios' : 'General');
      setSalePrice('');
      setEstimatedCost('');
      setStock('0');
      setDurationMinutes('30');
      setSelectedStaffIds([]);
    }
  }, [product, isCombo, archetype, isResaleOnly, isOpen]);

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
      const stockNum = isResale ? (stock ? parseFloat(stock) : 0) : 0;
      const payload: any = {
        name: name.trim(),
        category: category.trim() || (isService ? 'Servicios' : 'General'),
        salePrice: priceNum,
        cost: isService ? 0 : costNum,
        estimatedCost: costNum,
        stock: isResale ? stockNum : 0,
        stockQuantity: isResale ? stockNum : 0,
        physicalStock: isResale ? stockNum : 0,
        durationMinutes: isService ? (durationMinutes ? parseInt(durationMinutes, 10) : 30) : null,
        assignedStaffIds: isService ? selectedStaffIds : [],
        is_service: isService,
        product_type: selectedType
      };

      if (product) {
        await apiClient.put(`/products/${product.id}`, payload);
        presentToast({ message: 'Producto/Servicio actualizado con éxito', duration: 2500, color: 'success' });
      } else {
        payload.isCombo = isCombo;
        payload.isPreAssembled = false;
        await apiClient.post('/products', payload);
        const successMsg = isCombo ? 'Combo creado con éxito' : isResale ? 'Producto de reventa creado con éxito' : isFormula ? 'Producto armable creado con éxito' : 'Servicio creado con éxito';
        presentToast({ message: successMsg, duration: 2500, color: 'success' });
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
            {product ? `Editar: ${product.name}` : isCombo ? 'Nuevo Combo' : isResale ? 'Nuevo Producto para Reventa' : isFormula ? 'Nuevo Producto Armable' : 'Nuevo Servicio / Cita'}
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
          {/* Selector de Arquetipo */}
          {!isCombo && (
            <div style={{
              display: 'flex',
              gap: '6px',
              backgroundColor: '#e2e8f0',
              padding: '4px',
              borderRadius: '10px',
              marginBottom: '16px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('REVENTA');
                  if (category === 'Servicios') setCategory('General');
                }}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: selectedType === 'REVENTA' ? '700' : '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  backgroundColor: selectedType === 'REVENTA' ? '#ffffff' : 'transparent',
                  color: selectedType === 'REVENTA' ? '#166534' : '#475569',
                  boxShadow: selectedType === 'REVENTA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                📦 Reventa Directa
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('FORMULA');
                  if (category === 'Servicios') setCategory('General');
                }}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: selectedType === 'FORMULA' ? '700' : '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  backgroundColor: selectedType === 'FORMULA' ? '#ffffff' : 'transparent',
                  color: selectedType === 'FORMULA' ? '#92400e' : '#475569',
                  boxShadow: selectedType === 'FORMULA' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                🧪 Con Fórmula
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('SERVICIO');
                  if (!category || category === 'General') setCategory('Servicios');
                }}
                style={{
                  flex: 1,
                  padding: '9px 6px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: selectedType === 'SERVICIO' ? '700' : '500',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  backgroundColor: selectedType === 'SERVICIO' ? '#ffffff' : 'transparent',
                  color: selectedType === 'SERVICIO' ? '#1e40af' : '#475569',
                  boxShadow: selectedType === 'SERVICIO' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                💆 Servicio / Cita
              </button>
            </div>
          )}

          {/* Main Info Card */}
          <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: '15px', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <IonIcon icon={pricetagOutline} color="primary" /> {isResale ? 'Datos del Producto de Reventa' : isFormula ? 'Datos del Producto Armable' : isService ? 'Datos del Servicio' : 'Información Principal'}
            </h4>

            <IonItem lines="none" style={{ marginBottom: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', '--background': '#ffffff' } as any}>
              <IonLabel position="stacked" style={{ color: '#475569', fontWeight: '600' }}>
                {isService ? 'Nombre del Servicio *' : 'Nombre del Producto *'}
              </IonLabel>
              <IonInput 
                value={name} 
                onIonInput={e => setName(e.detail.value!)} 
                placeholder={isResale ? 'Ej. Vestido Casual, Pantalón Jean, Nutella 350g...' : isFormula ? 'Ej. Hamburguesa Especial, Tinte Rubio Mix, Torta...' : 'Ej. Uñas Acrílicas, Corte de Cabello, Masaje...'} 
              />
            </IonItem>

            <IonItem lines="none" style={{ marginBottom: '12px', border: '1px solid #cbd5e1', borderRadius: '8px', '--background': '#ffffff' } as any}>
              <IonLabel position="stacked" style={{ color: '#475569', fontWeight: '600' }}>Categoría</IonLabel>
              <IonInput 
                value={category} 
                onIonInput={e => setCategory(e.detail.value!)} 
                placeholder={isResale ? 'Ej. Ropa, Snacks, Bodegón, Bebidas...' : isFormula ? 'Ej. Comida, Bebidas, Preparados...' : 'Ej. Servicios, Peluquería, Estética...'} 
              />
            </IonItem>

            <div style={{ display: 'grid', gridTemplateColumns: isService ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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

              {!isService && (
                <IonItem lines="none" style={{ border: '1px solid #cbd5e1', borderRadius: '8px', '--background': '#ffffff' } as any}>
                  <IonLabel position="stacked" style={{ color: '#475569', fontWeight: '600' }}>
                    {isResale ? 'Costo Unitario Compra ($)' : 'Costo Estimado Base ($)'}
                  </IonLabel>
                  <IonInput 
                    type="number" 
                    value={estimatedCost} 
                    onIonInput={e => setEstimatedCost(e.detail.value!)} 
                    placeholder={isResale ? 'Ej. 10.00' : 'Opcional (Ej. 5.00)'} 
                    step="0.01"
                  />
                </IonItem>
              )}
            </div>

            {isResale && (
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
            )}

            {isFormula && (
              <div style={{ padding: '12px 14px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', fontSize: '13px', marginTop: '6px' }}>
                🧪 <b>Producto Armable / Con Fórmula:</b> Este producto se elabora a partir de insumos. Una vez guardado, podrás ingresar su receta y materias primas desde el menú del producto.
              </div>
            )}

            {isService && (
              <>
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
                <div style={{ padding: '10px 12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '13px', marginTop: '10px' }}>
                  💆 <b>Servicio / Cita:</b> No maneja stock físico. Si para realizar este servicio consumes insumos o materiales de trabajo (ej. tintes, desinfectante, etc.), podrás vincularlos en "Configurar Insumos del Servicio" desde la tarjeta.
                </div>
              </>
            )}
          </div>

          {/* Assigned Staff Card - Solo para Servicios */}
          {isService && (
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
