// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonGrid, IonRow, IonCol, IonCard, IonCardContent, IonItem, IonInput, IonSelect, IonSelectOption, IonButton, IonLabel, useIonAlert, useIonToast, IonNote, IonIcon, IonModal, IonToggle } from '@ionic/react';
import { addOutline, archiveOutline, refreshOutline, timeOutline, chevronUpOutline, chevronDownOutline } from 'ionicons/icons';
import { apiClient } from '../api/client';
import type { RawMaterial } from '../types';
import { RawMaterialCard } from '../components/raw-materials/RawMaterialCard';
import { MovementHistoryModal } from '../components/raw-materials/MovementHistoryModal';
import { StockOperationModal } from '../components/raw-materials/StockOperationModal';
import { AppHeader } from '../components/AppHeader';

const RawMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [name, setName] = useState('');
  const [baseUnit, setBaseUnit] = useState('Kg');
  const [inputUnit, setInputUnit] = useState('Kg');
  const [inputQty, setInputQty] = useState<number>();
  const [inputCost, setInputCost] = useState<number>();
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');
  const [exchangeRate, setExchangeRate] = useState<number>(36.5);
  
  // Extra customization (Create)
  const [allowAsExtra, setAllowAsExtra] = useState(false);
  const [extraPriceType, setExtraPriceType] = useState<'COST' | 'MARGIN_PERCENT' | 'FIXED_PRICE'>('COST');
  const [extraPriceValue, setExtraPriceValue] = useState<number>(0);

  // Edit Modal State
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [editName, setEditName] = useState('');
  const [editMinStock, setEditMinStock] = useState<number>(5);
  const [editAllowAsExtra, setEditAllowAsExtra] = useState(false);
  const [editExtraPriceType, setEditExtraPriceType] = useState<'COST' | 'MARGIN_PERCENT' | 'FIXED_PRICE'>('COST');
  const [editExtraPriceValue, setEditExtraPriceValue] = useState<number>(0);

  const [presentAlert] = useIonAlert();
  const [searchText, setSearchText] = useState('');
  const [presentToast] = useIonToast();
  const [selectedMaterialForHistory, setSelectedMaterialForHistory] = useState<RawMaterial | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [operationMaterial, setOperationMaterial] = useState<RawMaterial | null>(null);
  const [operationType, setOperationType] = useState<'restock' | 'loss' | null>(null);
  
  useEffect(() => {
    setInputUnit(baseUnit);
  }, [baseUnit]);

  const [showArchivedPanel, setShowArchivedPanel] = useState(false);
  const [archivedMaterials, setArchivedMaterials] = useState<RawMaterial[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);

  // Pull-down gesture state (Telegram style)
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const pullStartYRef = React.useRef(0);
  const isPullingRef = React.useRef(false);
  const contentRef = React.useRef<HTMLIonContentElement | null>(null);
  const scrollElementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.getScrollElement().then((el) => {
        scrollElementRef.current = el;
      });
    }
  }, []);

  const fetchArchivedMaterials = async () => {
    setLoadingArchived(true);
    try {
      const res = await apiClient.get<RawMaterial[]>('/raw-materials/archived');
      setArchivedMaterials(res.data);
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error al cargar archivados', duration: 3000, color: 'danger' });
    } finally {
      setLoadingArchived(false);
    }
  };

  const unarchiveMaterial = async (m: RawMaterial) => {
    try {
      await apiClient.patch(`/raw-materials/${m.id}/unarchive`);
      presentToast({ message: `Insumo "${m.name}" restaurado con éxito`, duration: 2000, color: 'success' });
      fetchMaterials();
      fetchArchivedMaterials();
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error al restaurar insumo', duration: 3000, color: 'danger' });
    }
  };

  const archiveRawMaterial = async (m: RawMaterial) => {
    try {
      const { data: usage } = await apiClient.get<{
        inUse: boolean;
        count: number;
        products: Array<{ id: string; name: string }>;
      }>(`/raw-materials/${m.id}/usage`);

      if (usage.inUse) {
        const productNames = usage.products.map(p => p.name).join(', ');
        presentAlert({
          header: '⚠️ Insumo en Uso',
          message: `Este insumo forma parte de la receta de: ${productNames}. Si lo archivas sin removerlo, no podrás fabricar estos productos por falta de stock.`,
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Remover de recetas y archivar',
              role: 'destructive',
              handler: async () => {
                try {
                  await apiClient.patch(`/raw-materials/${m.id}/archive`, { removeFromRecipes: true });
                  fetchMaterials();
                  if (showArchivedPanel) fetchArchivedMaterials();
                  presentToast({ message: 'Insumo removido de recetas y archivado', duration: 2500, color: 'success' });
                } catch (e) {
                  console.error(e);
                  presentToast({ message: 'Error al archivar', duration: 3000, color: 'danger' });
                }
              }
            }
          ]
        });
      } else {
        presentAlert({
          header: 'Archivar Insumo',
          message: '¿Archivar este insumo? Desaparecerá de la lista activa pero podrás acceder a él deslizando hacia abajo en el tope.',
          buttons: [
            { text: 'Cancelar', role: 'cancel' },
            {
              text: 'Archivar',
              role: 'destructive',
              handler: async () => {
                try {
                  await apiClient.patch(`/raw-materials/${m.id}/archive`);
                  fetchMaterials();
                  if (showArchivedPanel) fetchArchivedMaterials();
                  presentToast({ message: 'Insumo archivado', duration: 2000, color: 'success' });
                } catch (e) {
                  console.error(e);
                  presentToast({ message: 'Error al archivar', duration: 3000, color: 'danger' });
                }
              }
            }
          ]
        });
      }
    } catch (e) {
      console.error(e);
      presentToast({ message: 'Error al verificar uso del insumo', duration: 3000, color: 'danger' });
    }
  };

  const fetchMaterials = async () => {
    try {
      const [matRes, setRes] = await Promise.all([
        apiClient.get<RawMaterial[]>('/raw-materials'),
        apiClient.get('/settings')
      ]);
      setMaterials(matRes.data);
      if (setRes.data && setRes.data.exchangeRateBs) {
        setExchangeRate(setRes.data.exchangeRateBs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => { fetchMaterials(); }, []);

  const handleCreate = async () => {
    if (!name || !inputQty || !inputCost) {
      presentToast({ message: 'Llena todos los campos', duration: 2000, color: 'warning' });
      return;
    }

    let finalStock: number = inputQty;
    if (inputUnit === 'g' || inputUnit === 'ml') {
      finalStock = inputQty / 1000;
    }

    const costUSD: number = currency === 'VES'
      ? Number(inputCost) / (exchangeRate && exchangeRate > 0 ? exchangeRate : 1)
      : Number(inputCost);

    const costPerBaseUnit: number = costUSD / finalStock;

    try {
      await apiClient.post('/raw-materials', { 
        name, 
        unit: baseUnit, 
        costPerUnit: costPerBaseUnit, 
        initialStock: finalStock, 
        minStockAlert: 5,
        allowAsExtra,
        extraPriceType,
        extraPriceValue: Number(extraPriceValue) || 0
      });
      setName(''); 
      setInputQty(undefined); 
      setInputCost(undefined);
      setCurrency('USD');
      setAllowAsExtra(false);
      setExtraPriceType('COST');
      setExtraPriceValue(0);
      fetchMaterials();
      presentToast({ message: 'Insumo creado', duration: 2000, color: 'success' });
      setShowCreateModal(false);
    } catch (e) {
      presentToast({ message: 'Error', duration: 3000, color: 'danger' });
    }
  };

  const openRestockAlert = (m: RawMaterial) => {
    setOperationMaterial(m);
    setOperationType('restock');
  };

  const openLossAlert = (m: RawMaterial) => {
    setOperationMaterial(m);
    setOperationType('loss');
  };

  const openEditModal = (m: RawMaterial) => {
    setEditingMaterial(m);
    setEditName(m.name || '');
    setEditMinStock(m.minStockAlert !== undefined ? m.minStockAlert : 5);
    setEditAllowAsExtra(Boolean(m.allowAsExtra));
    setEditExtraPriceType(m.extraPriceType || 'COST');
    setEditExtraPriceValue(Number(m.extraPriceValue) || 0);
  };

  const handleSaveEdit = async () => {
    if (!editingMaterial || !editName.trim()) {
      presentToast({ message: 'El nombre es obligatorio', duration: 2000, color: 'warning' });
      return;
    }
    try {
      await apiClient.put('/raw-materials/' + editingMaterial.id, { 
        name: editName.trim(), 
        minStockAlert: parseFloat(editMinStock) || 0,
        allowAsExtra: editAllowAsExtra,
        extraPriceType: editExtraPriceType,
        extraPriceValue: parseFloat(editExtraPriceValue) || 0
      });
      presentToast({ message: 'Insumo actualizado exitosamente', duration: 2000, color: 'success' });
      setEditingMaterial(null);
      fetchMaterials();
    } catch (e) {
      presentToast({ message: 'Error al actualizar', duration: 2000, color: 'danger' });
    }
  };

  const filteredData = materials.filter(item => {
    if (searchText.trim() === '') return true;
    return item.name.toLowerCase().includes(searchText.toLowerCase());
  });
  
  // Telegram-style pull-down handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const el = scrollElementRef.current;
    if (el) {
      if (el.scrollTop <= 1) {
        isPullingRef.current = true;
        pullStartYRef.current = e.touches[0].clientY;
      } else {
        isPullingRef.current = false;
      }
    } else if (contentRef.current) {
      contentRef.current.getScrollElement().then((scrolledEl) => {
        scrollElementRef.current = scrolledEl;
        if (scrolledEl && scrolledEl.scrollTop <= 1) {
          isPullingRef.current = true;
          pullStartYRef.current = e.touches[0].clientY;
        } else {
          isPullingRef.current = false;
        }
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - pullStartYRef.current;
    if (delta > 0) {
      // Damping factor for rubber band feel
      const distance = Math.min(100, delta * 0.45);
      setPullDistance(distance);
      setIsPulling(true);
    } else {
      setPullDistance(0);
      setIsPulling(false);
    }
  };

  const handleTouchEnd = () => {
    if (isPullingRef.current) {
      if (pullDistance >= 55) {
        // Trigger opening archived drawer
        setShowArchivedPanel(true);
        fetchArchivedMaterials();
      }
      isPullingRef.current = false;
      setIsPulling(false);
      setPullDistance(0);
    }
  };

  const toggleArchivedPanel = () => {
    if (!showArchivedPanel) {
      fetchArchivedMaterials();
    }
    setShowArchivedPanel(!showArchivedPanel);
  };

  return (
    <IonPage>
      <AppHeader title="Insumos (Materia Prima)" />
      <IonContent
        ref={contentRef}
        fullscreen
        className="ion-padding ff-has-bottom-nav"
        style={{ '--background': '#F8FAFC' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Indicador de Resorte Estilo Telegram al Estirar en el Tope (0px en reposo) */}
        <div
          style={{
            overflow: 'hidden',
            maxHeight: isPulling ? `${pullDistance}px` : '0px',
            opacity: isPulling ? Math.min(1, pullDistance / 40) : 0,
            transform: `scale(${0.8 + (pullDistance / 100) * 0.2})`,
            transition: isPulling ? 'none' : 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: pullDistance >= 55 ? '#047857' : '#64748B',
            fontWeight: 700,
            fontSize: '13px',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              background: pullDistance >= 55 ? '#D1FAE5' : '#F1F5F9',
              border: `1px solid ${pullDistance >= 55 ? '#6EE7B7' : '#E2E8F0'}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            <IonIcon
              icon={archiveOutline}
              style={{
                fontSize: '16px',
                transform: pullDistance >= 55 ? 'rotate(-10deg) scale(1.15)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
            <span>
              {pullDistance >= 55 ? 'Soltar para abrir' : '📦 Desliza para ver Archivados'}
            </span>
          </div>
        </div>

        {/* Cajón / Panel Retráctil Superior de Insumos Archivados */}
        {showArchivedPanel && (
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto 16px auto',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #CBD5E1',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
              overflow: 'hidden',
              animation: 'fadeInSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              style={{
                background: '#0F172A',
                color: '#FFFFFF',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IonIcon icon={archiveOutline} style={{ fontSize: '1.25rem', color: '#94A3B8' }} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                  Insumos Archivados / Descontinuados ({archivedMaterials.length})
                </span>
              </div>
              <button
                onClick={() => setShowArchivedPanel(false)}
                style={{
                  background: '#334155',
                  border: 'none',
                  color: '#F8FAFC',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <IonIcon icon={chevronUpOutline} />
                <span>Ocultar</span>
              </button>
            </div>

            <div style={{ padding: '16px' }}>
              {loadingArchived ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                  Cargando insumos archivados...
                </div>
              ) : archivedMaterials.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#94A3B8', fontSize: '14px' }}>
                  No hay insumos archivados en este momento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {archivedMaterials.map((archived) => (
                    <div
                      key={archived.id}
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: '#F8FAFC',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        gap: '12px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1E293B' }}>
                          {archived.name}
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                          <span>
                            Último Stock: <strong style={{ color: '#334155' }}>{Number(archived.stockQuantity || 0).toFixed(2)} {archived.unit}</strong>
                          </span>
                          <span>
                            Costo Histórico: <strong style={{ color: '#334155' }}>${Number(archived.costPerUnit || 0).toFixed(2)} / {archived.unit}</strong>
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="ff-btn-primary"
                          onClick={() => unarchiveMaterial(archived)}
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <IonIcon icon={refreshOutline} />
                          <span>Restaurar</span>
                        </button>
                        <button
                          onClick={() => setSelectedMaterialForHistory(archived)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #CBD5E1',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '6px 12px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          <IonIcon icon={timeOutline} />
                          <span>Historial</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '90px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <div className="ff-search-pill" style={{ flex: 1 }}>
              <input
                type="text"
                placeholder="Buscar insumo o materia prima..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <button
              className="ff-btn-primary"
              onClick={() => setShowCreateModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <IonIcon icon={addOutline} style={{ fontSize: '1.2rem' }} />
              <span>Nuevo Insumo</span>
            </button>
          </div>

          <IonGrid className="ion-no-padding">
            <IonRow>
              {filteredData.map(m => (
                <RawMaterialCard key={m.id} material={m} onEditName={openEditModal} onRestock={openRestockAlert} onRegisterLoss={openLossAlert} onViewHistory={() => setSelectedMaterialForHistory(m)} onArchive={archiveRawMaterial} />
              ))}
            </IonRow>
          </IonGrid>
        </div>

    <IonModal isOpen={showCreateModal} onDidDismiss={() => setShowCreateModal(false)}>
      <IonHeader>
        <IonToolbar color="success">
          <IonTitle>Agregar Insumo</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowCreateModal(false)}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        
              <IonCard>
                
                <IonCardContent>
                  <IonItem>
                    <IonLabel position="stacked">Nombre</IonLabel>
                    <IonInput value={name} onIonInput={e => setName(e.detail.value!)} placeholder="Ej. Nombre del insumo o material" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Unidad Base (Inventario)</IonLabel>
                    <IonSelect value={baseUnit} onIonChange={e => setBaseUnit(e.detail.value)}>
                      <IonSelectOption value="Kg">Kg</IonSelectOption>
                      <IonSelectOption value="Litros">Litros</IonSelectOption>
                      <IonSelectOption value="Unidades">Unidades</IonSelectOption>
                    </IonSelect>
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Cantidad a Cargar</IonLabel>
                    <IonInput type="number" min="0" step="any" value={inputQty} onIonInput={e => setInputQty(parseFloat(e.detail.value!) || undefined)} placeholder="Ej. 100" />
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked">Unidad de Carga</IonLabel>
                    <IonSelect value={inputUnit} onIonChange={e => setInputUnit(e.detail.value)}>
                      <IonSelectOption value={baseUnit}>{baseUnit}</IonSelectOption>
                      {baseUnit === 'Kg' && <IonSelectOption value="g">Gramos (g)</IonSelectOption>}
                      {baseUnit === 'Litros' && <IonSelectOption value="ml">Mililitros (ml)</IonSelectOption>}
                    </IonSelect>
                  </IonItem>
                  <IonItem>
                    <IonLabel position="stacked" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <span>Costo Total de esta compra</span>
  <IonSelect value={currency} onIonChange={e => setCurrency(e.detail.value)} style={{ minHeight: 'auto', padding: '0', background: '#eee', borderRadius: '4px', paddingLeft: '5px', paddingRight: '5px' }}>
    <IonSelectOption value="USD">$ USD</IonSelectOption>
    <IonSelectOption value="VES">Bs. VES</IonSelectOption>
  </IonSelect>
</IonLabel>
                    <IonInput type="number" min="0" step="any" value={inputCost} onIonInput={e => setInputCost(parseFloat(e.detail.value!) || undefined)} placeholder="Ej. 2.00" />
                  </IonItem>
                  {inputQty && inputCost && (
                    <IonNote color="primary" className="ion-margin-top ion-padding-horizontal" style={{display: 'block', fontSize: '12px', background: '#F0FDF4', color: '#166534', padding: '10px', borderRadius: '8px', border: '1px solid #BBF7D0'}}>
                      Resumen: Se registrarán <strong>{(inputUnit === 'g' || inputUnit === 'ml') ? inputQty / 1000 : inputQty} {baseUnit}</strong> en inventario. Costo: <strong>${(
                        (currency === 'VES' ? (Number(inputCost) || 0) / (exchangeRate && exchangeRate > 0 ? exchangeRate : 1) : (Number(inputCost) || 0)) / ((inputUnit === 'g' || inputUnit === 'ml') ? inputQty / 1000 : inputQty)
                      ) < 0.01 ? (
                        (currency === 'VES' ? (Number(inputCost) || 0) / (exchangeRate && exchangeRate > 0 ? exchangeRate : 1) : (Number(inputCost) || 0)) / ((inputUnit === 'g' || inputUnit === 'ml') ? inputQty / 1000 : inputQty)
                      ).toFixed(4) : (
                        (currency === 'VES' ? (Number(inputCost) || 0) / (exchangeRate && exchangeRate > 0 ? exchangeRate : 1) : (Number(inputCost) || 0)) / ((inputUnit === 'g' || inputUnit === 'ml') ? inputQty / 1000 : inputQty)
                      ).toFixed(2)} USD/{baseUnit}</strong> (Total compra: ${(currency === 'VES' ? (Number(inputCost) || 0) / (exchangeRate && exchangeRate > 0 ? exchangeRate : 1) : (Number(inputCost) || 0)).toFixed(2)} USD).
                    </IonNote>
                  )}

                  <IonItem lines="none" style={{ marginTop: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '8px' }}>
                    <IonLabel>Permitir como Adicional / Extra</IonLabel>
                    <IonToggle checked={allowAsExtra} onIonChange={e => setAllowAsExtra(e.detail.checked)} />
                  </IonItem>
                  {allowAsExtra && (
                    <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', marginTop: '6px' }}>
                      <IonItem lines="none" style={{ background: 'transparent' }}>
                        <IonLabel position="stacked">Cálculo de Precio de Venta</IonLabel>
                        <IonSelect value={extraPriceType} onIonChange={e => setExtraPriceType(e.detail.value)}>
                          <IonSelectOption value="COST">Al Costo Directo</IonSelectOption>
                          <IonSelectOption value="MARGIN_PERCENT">Margen de Ganancia (%)</IonSelectOption>
                          <IonSelectOption value="FIXED_PRICE">Precio Fijo en USD ($)</IonSelectOption>
                        </IonSelect>
                      </IonItem>
                      {extraPriceType !== 'COST' && (
                        <IonItem lines="none" style={{ background: 'transparent' }}>
                          <IonLabel position="stacked">
                            {extraPriceType === 'MARGIN_PERCENT' ? 'Porcentaje de Margen (% ej. 50)' : 'Precio Fijo en USD ($)'}
                          </IonLabel>
                          <IonInput
                            type="number"
                            min="0"
                            step="any"
                            value={extraPriceValue}
                            onIonInput={e => setExtraPriceValue(parseFloat(e.detail.value!) || 0)}
                          />
                        </IonItem>
                      )}
                    </div>
                  )}

                  <IonButton expand="block" color="success" className="ion-margin-top" onClick={handleCreate}>Guardar</IonButton>
                </IonCardContent>
              </IonCard>
            
      </IonContent>
    </IonModal>

    {/* Modal Editar Insumo & Extras */}
    <IonModal isOpen={Boolean(editingMaterial)} onDidDismiss={() => setEditingMaterial(null)}>
      <IonHeader>
        <IonToolbar color="success">
          <IonTitle>Editar Insumo y Configurar Extras</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setEditingMaterial(null)}>Cerrar</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding" style={{ '--background': '#F8FAFC' }}>
        <IonCard style={{ borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #E2E8F0' }}>
          <IonCardContent>
            <IonItem lines="full">
              <IonLabel position="stacked" style={{ fontWeight: '700', color: '#0F172A' }}>Nombre del Insumo</IonLabel>
              <IonInput value={editName} onIonInput={e => setEditName(e.detail.value!)} placeholder="Nombre del insumo" />
            </IonItem>
            <IonItem lines="full">
              <IonLabel position="stacked" style={{ fontWeight: '700', color: '#0F172A' }}>Alerta Mínima de Stock</IonLabel>
              <IonInput type="number" min="0" step="any" value={editMinStock} onIonInput={e => setEditMinStock(parseFloat(e.detail.value!) || 0)} />
            </IonItem>

            <div style={{ marginTop: '16px', padding: '14px', background: '#F8FAFC', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '800', fontSize: '14px', color: '#0F172A' }}>
                    🍔 Vender como Adicional / Extra
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                    Permite a los cajeros añadir este insumo con costo extra en pedidos y personalizar recetas
                  </div>
                </div>
                <IonToggle checked={editAllowAsExtra} onIonChange={e => setEditAllowAsExtra(e.detail.checked)} color="success" />
              </div>

              {editAllowAsExtra && editingMaterial && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1' }}>
                  <IonItem lines="none" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '8px' }}>
                    <IonLabel position="stacked" style={{ fontWeight: '700', color: '#0F172A' }}>Cálculo de Precio al Cliente</IonLabel>
                    <IonSelect value={editExtraPriceType} onIonChange={e => setEditExtraPriceType(e.detail.value)}>
                      <IonSelectOption value="COST">Al Costo Directo del Insumo (${editingMaterial.costPerUnit.toFixed(2)})</IonSelectOption>
                      <IonSelectOption value="MARGIN_PERCENT">Margen de Ganancia sobre Costo (%)</IonSelectOption>
                      <IonSelectOption value="FIXED_PRICE">Precio Fijo en USD ($)</IonSelectOption>
                    </IonSelect>
                  </IonItem>

                  {editExtraPriceType !== 'COST' && (
                    <IonItem lines="none" style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '8px' }}>
                      <IonLabel position="stacked" style={{ fontWeight: '700', color: '#0F172A' }}>
                        {editExtraPriceType === 'MARGIN_PERCENT' ? 'Porcentaje de Margen (% ej. 50)' : 'Precio Fijo en USD ($ ej. 1.50)'}
                      </IonLabel>
                      <IonInput
                        type="number"
                        min="0"
                        step="any"
                        value={editExtraPriceValue}
                        onIonInput={e => setEditExtraPriceValue(parseFloat(e.detail.value!) || 0)}
                      />
                    </IonItem>
                  )}

                  <div style={{ marginTop: '10px', padding: '10px 14px', background: '#ECFDF5', borderRadius: '10px', border: '1px solid #A7F3D0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#065F46' }}>
                      Precio extra cobrado en POS:
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: '900', color: '#047857' }}>
                      +${(
                        editExtraPriceType === 'FIXED_PRICE'
                          ? Number(editExtraPriceValue || 0)
                          : editExtraPriceType === 'MARGIN_PERCENT'
                          ? (editingMaterial.costPerUnit || 0) * (1 + Number(editExtraPriceValue || 0) / 100)
                          : (editingMaterial.costPerUnit || 0)
                      ).toFixed(2)} USD
                    </span>
                  </div>
                </div>
              )}
            </div>

            <IonButton expand="block" color="success" className="ion-margin-top" onClick={handleSaveEdit} style={{ fontWeight: '700', borderRadius: '10px' }}>
              Guardar Insumo y Extras
            </IonButton>
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonModal>
  
        <MovementHistoryModal material={selectedMaterialForHistory} onClose={() => setSelectedMaterialForHistory(null)} onCorrected={fetchMaterials} />
        
        <StockOperationModal 
          material={operationMaterial} 
          operationType={operationType} 
          onClose={() => { setOperationMaterial(null); setOperationType(null); }} 
          onSuccess={fetchMaterials} 
         exchangeRate={exchangeRate} />
      </IonContent>
    </IonPage>
  );
};
export default RawMaterials;
