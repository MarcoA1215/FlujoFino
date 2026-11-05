import React from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react';
import {
  closeOutline,
  bulbOutline,
  logoWhatsapp,
  arrowForwardOutline,
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

  if (!guide) return null;

  const handleActionClick = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleWhatsAppHelp = () => {
    const supportPhone = import.meta.env.VITE_SUPPORT_WHATSAPP || '584145652381';
    const message = encodeURIComponent(
      `¡Hola! Estoy usando el módulo de "${guide.title}" en FinoWork y tengo una duda. ¿Podrías apoyarme?`
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
      breakpoints={[0, 0.75, 0.95]}
      initialBreakpoint={0.75}
      style={{
        ['--border-radius' as any]: '20px 20px 0 0',
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
                {guide.category} • Guía Rápida
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

      <div
        style={{
          background: '#F8FAFC',
          padding: '16px 20px 32px 20px',
          overflowY: 'auto',
          maxHeight: 'calc(95vh - 70px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
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
            {guide.concept}
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

        {/* Pasos 1-2-3 */}
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
            <span>¿Cómo empezar en este módulo? (Paso a paso)</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {guide.steps.map((step) => (
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
                  {step.actionLabel && step.actionPath && (
                    <button
                      type="button"
                      onClick={() => handleActionClick(step.actionPath!)}
                      style={{
                        marginTop: '8px',
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
                  )}
                </div>
              </div>
            ))}
          </div>
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
            {guide.proTip}
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
            marginTop: '2px',
          }}
        >
          ¡Listo, entendido!
        </button>
      </div>
    </IonModal>
  );
};
export default ModuleGuideModal;
