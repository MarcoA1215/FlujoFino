import React, { useState, useEffect } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
} from '@ionic/react';
import {
  closeOutline,
  bulbOutline,
  logoWhatsapp,
  arrowForwardOutline,
  arrowBackOutline,
  sparklesOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';
import type { ModuleGuideContent } from '../../constants/moduleGuides';

interface ModuleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  guide: ModuleGuideContent | null;
}

export const ModuleGuideModal: React.FC<ModuleGuideModalProps> = ({
  isOpen,
  onClose,
  guide,
}) => {
  const navigate = useNavigate();
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    if (guide?.tabs && guide.tabs.length > 0) {
      setActiveTabId(guide.tabs[0].id);
    } else {
      setActiveTabId('');
    }
  }, [guide, isOpen]);

  if (!guide) return null;

  const currentTabIndex = guide.tabs ? guide.tabs.findIndex((t) => t.id === activeTabId) : -1;
  const currentTab = guide.tabs?.find((t) => t.id === activeTabId) || guide.tabs?.[0];
  const prevTab = guide.tabs && currentTabIndex > 0 ? guide.tabs[currentTabIndex - 1] : null;
  const nextTab =
    guide.tabs && currentTabIndex >= 0 && currentTabIndex < guide.tabs.length - 1
      ? guide.tabs[currentTabIndex + 1]
      : null;

  const activeSteps = currentTab ? currentTab.steps : guide.steps;
  const activeConcept = currentTab?.concept || guide.concept;
  const activeProTip = currentTab?.proTip || guide.proTip;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || !guide.tabs || guide.tabs.length <= 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const swipeThreshold = 50;
    if (deltaX < -swipeThreshold && nextTab) {
      // Deslizar izquierda -> siguiente pestaña
      setActiveTabId(nextTab.id);
    } else if (deltaX > swipeThreshold && prevTab) {
      // Deslizar derecha -> pestaña anterior
      setActiveTabId(prevTab.id);
    }
    setTouchStartX(null);
  };

  const handleActionClick = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleWhatsAppHelp = () => {
    const supportPhone = import.meta.env.VITE_SUPPORT_WHATSAPP || '584145652381';
    const tabName = currentTab ? ` - Sección ${currentTab.label}` : '';
    const message = encodeURIComponent(
      `¡Hola! Estoy usando el módulo de "${guide.title}${tabName}" en FinoWork y tengo una duda. ¿Podrías apoyarme?`
    );
    window.open(`https://wa.me/${supportPhone}?text=${message}`, '_blank');
  };

  const handleMarkAsReadAndClose = () => {
    try {
      localStorage.setItem(`finowork_guide_read_${guide.key}`, 'true');
    } catch {
      // Ignorar si localStorage está deshabilitado
    }
    onClose();
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidDismiss={handleMarkAsReadAndClose}
      style={{
        '--width': '94%',
        '--max-width': '640px',
        '--height': '88vh',
        '--max-height': '820px',
        '--border-radius': '20px',
        '--box-shadow': '0 20px 45px rgba(15, 23, 42, 0.25)',
      } as any}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar
          style={{
            ['--background' as any]: '#ffffff',
            ['--border-color' as any]: '#E2E8F0',
            borderBottom: '1px solid #E2E8F0',
            padding: '4px 8px',
          } as any}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--theme-primary, #10B981)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                flexShrink: 0,
              }}
            >
              <IonIcon icon={guide.icon} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {guide.category} • Guía Práctica
              </span>
              <IonTitle
                style={{
                  padding: 0,
                  fontSize: '16px',
                  fontWeight: '900',
                  color: '#0F172A',
                }}
              >
                {guide.title}
              </IonTitle>
            </div>
          </div>

          <IonButtons slot="end">
            <IonButton onClick={handleMarkAsReadAndClose} color="medium">
              <IonIcon icon={closeOutline} style={{ fontSize: '22px' }} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent
        style={{
          ['--background' as any]: '#F8FAFC',
        } as any}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          style={{
            padding: '16px 20px 50px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {/* Selector de Pestañas / Sub-Secciones (Envuelto en flex-wrap para visibilidad total sin cortes) */}
          {guide.tabs && guide.tabs.length > 1 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              {guide.tabs.map((tab) => {
                const isSelected = tab.id === activeTabId;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTabId(tab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: isSelected
                        ? '1.5px solid var(--theme-primary, #10B981)'
                        : '1px solid #CBD5E1',
                      backgroundColor: isSelected
                        ? 'var(--theme-primary, #10B981)'
                        : '#FFFFFF',
                      color: isSelected
                        ? 'var(--theme-primary-contrast, #ffffff)'
                        : '#334155',
                      fontSize: '12px',
                      fontWeight: isSelected ? 800 : 600,
                      cursor: 'pointer',
                      boxShadow: isSelected
                        ? '0 2px 6px rgba(16, 185, 129, 0.25)'
                        : 'var(--ff-shadow-sm)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Concepto Principal y Para quién es */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '14px 16px',
              boxShadow: 'var(--ff-shadow-sm)',
            }}
          >
            <div
              style={{
                fontSize: '13.5px',
                color: '#1E293B',
                lineHeight: '1.55',
                fontWeight: 500,
                marginBottom: '10px',
              }}
            >
              {activeConcept}
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #DBEAFE',
                borderRadius: '20px',
                padding: '4px 10px',
                fontSize: '11.5px',
                color: '#1E40AF',
                fontWeight: 600,
              }}
            >
              <IonIcon icon={sparklesOutline} style={{ fontSize: '13px' }} />
              <span>Recomendado para: {guide.bestFor}</span>
            </div>
          </div>

          {/* Pasos 1-2-3-4 */}
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '800',
                color: '#0F172A',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <IonIcon
                icon={informationCircleOutline}
                style={{ color: 'var(--theme-primary, #10B981)', fontSize: '17px' }}
              />
              <span>
                {currentTab ? `Pasos para ${currentTab.label}` : '¿Cómo usar este módulo?'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activeSteps.map((step) => (
                <div
                  key={step.stepNumber}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--theme-primary, #10B981)',
                      color: 'var(--theme-primary-contrast, #ffffff)',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    {step.stepNumber}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#0F172A',
                        marginBottom: '2px',
                      }}
                    >
                      {step.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12.5px',
                        color: '#475569',
                        lineHeight: '1.45',
                      }}
                    >
                      {step.description}
                    </div>

                    {step.keyDetail && (
                      <div
                        style={{
                          marginTop: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          color: '#334155',
                          fontWeight: 600,
                        }}
                      >
                        <span>📌</span>
                        <span>{step.keyDetail}</span>
                      </div>
                    )}

                    {step.actionLabel && step.actionPath && (
                      <div style={{ marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleActionClick(step.actionPath!)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            color: '#0F172A',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <span>{step.actionLabel}</span>
                          <IonIcon icon={arrowForwardOutline} style={{ fontSize: '13px' }} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Barra de Navegación entre Pestañas (Anterior / Siguiente) */}
            {guide.tabs && guide.tabs.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  marginTop: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                {prevTab ? (
                  <button
                    type="button"
                    onClick={() => setActiveTabId(prevTab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      color: '#1E293B',
                      border: '1px solid #CBD5E1',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <IonIcon icon={arrowBackOutline} style={{ fontSize: '13px' }} />
                    <span>{prevTab.label}</span>
                  </button>
                ) : (
                  <div />
                )}

                <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>
                  Sección {currentTabIndex + 1} de {guide.tabs.length}
                </span>

                {nextTab ? (
                  <button
                    type="button"
                    onClick={() => setActiveTabId(nextTab.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--theme-primary, #10B981)',
                      color: 'var(--theme-primary-contrast, #ffffff)',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                    }}
                  >
                    <span>{nextTab.label}</span>
                    <IonIcon icon={arrowForwardOutline} style={{ fontSize: '13px' }} />
                  </button>
                ) : (
                  <div />
                )}
              </div>
            )}
          </div>

          {/* Tip Pro */}
          <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '12.5px',
              color: '#92400E',
              lineHeight: '1.5',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}
          >
            <IonIcon
              icon={bulbOutline}
              style={{ fontSize: '19px', color: '#D97706', flexShrink: 0, marginTop: '2px' }}
            />
            <div>
              <strong style={{ display: 'block', marginBottom: '2px', color: '#B45309' }}>
                Consejo FinoWork:
              </strong>
              {activeProTip}
            </div>
          </div>

          {/* Soporte Directo con el Desarrollador */}
          <div
            style={{
              backgroundColor: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IonIcon icon={logoWhatsapp} style={{ fontSize: '24px', color: '#059669', flexShrink: 0 }} />
              <div style={{ fontSize: '12px', color: '#065F46', lineHeight: '1.35' }}>
                <strong style={{ display: 'block' }}>¿Necesitas una mano configurándolo?</strong>
                Escríbele directo al desarrollador por WhatsApp.
              </div>
            </div>
            <button
              type="button"
              onClick={handleWhatsAppHelp}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#059669',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
              }}
            >
              Preguntar
            </button>
          </div>

          {/* Botón de Cierre Entendido */}
          <button
            type="button"
            onClick={handleMarkAsReadAndClose}
            className="ff-btn-primary bg-theme-primary"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '800',
              cursor: 'pointer',
              backgroundColor: 'var(--theme-primary, #10B981)',
              color: 'var(--theme-primary-contrast, #ffffff)',
              border: 'none',
              boxShadow: 'var(--ff-shadow-sm)',
              marginTop: '4px',
            }}
          >
            ¡Listo, entendido!
          </button>
        </div>
      </IonContent>
    </IonModal>
  );
};

export default ModuleGuideModal;
