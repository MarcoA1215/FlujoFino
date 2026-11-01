import React, { useState, useEffect, useContext } from 'react';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  useIonToast,
  IonToggle,
  IonText,
  IonIcon,
  IonCheckbox,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons
} from '@ionic/react';
import {
  informationCircleOutline,
  arrowBackOutline,
  arrowForwardOutline,
  checkmarkDoneOutline,
  giftOutline,
  closeOutline,
  shieldCheckmarkOutline,
  documentTextOutline,
  optionsOutline,
  chevronDownOutline,
  chevronUpOutline,
  checkmarkCircle
} from 'ionicons/icons';
import { apiClient } from '../api/client';
import { AuthContext } from '../context/AuthContext';
import { useIonRouter } from '@ionic/react';
import { TermsContent } from './TermsAndConditions';
import { PrivacyContent } from './PrivacyPolicy';

export type BusinessProfileType = 'SERVICES' | 'RETAIL' | 'FOOD_PRODUCTION' | 'CUSTOM';

export interface OnboardingModuleFlags {
  featureCustomerSchedules: boolean;
  featureBuySell: boolean;
  featureRecipes: boolean;
  featureProduction: boolean;
  featureDelivery: boolean;
  featureShowCatalog: boolean;
}

export function getPresetFlagsForProfile(profile: Exclude<BusinessProfileType, 'CUSTOM'>): OnboardingModuleFlags {
  switch (profile) {
    case 'SERVICES':
      return {
        featureCustomerSchedules: true,
        featureBuySell: false,
        featureRecipes: false,
        featureProduction: false,
        featureDelivery: false,
        featureShowCatalog: true,
      };
    case 'RETAIL':
      return {
        featureCustomerSchedules: false,
        featureBuySell: true,
        featureRecipes: false,
        featureProduction: false,
        featureDelivery: true,
        featureShowCatalog: true,
      };
    case 'FOOD_PRODUCTION':
      return {
        featureCustomerSchedules: false,
        featureBuySell: false,
        featureRecipes: true,
        featureProduction: true,
        featureDelivery: true,
        featureShowCatalog: true,
      };
  }
}

const BUSINESS_ARCHETYPES: Array<{
  id: Exclude<BusinessProfileType, 'CUSTOM'>;
  emoji: string;
  title: string;
  subtitle: string;
  badges: string[];
}> = [
  {
    id: 'SERVICES',
    emoji: '💅',
    title: 'Servicios y Citas',
    subtitle: 'Spas, salones de belleza, barberías, estéticas y consultorios.',
    badges: ['Agenda Online', 'Especialistas y Comisiones', 'Catálogo de Servicios'],
  },
  {
    id: 'RETAIL',
    emoji: '🛍️',
    title: 'Tienda y Comercio',
    subtitle: 'Ropa, calzado, accesorios, bodegas, cosméticos y compra-venta.',
    badges: ['Compra-Venta Directa', 'Tallas y Variantes', 'Tienda Virtual + Delivery'],
  },
  {
    id: 'FOOD_PRODUCTION',
    emoji: '🍔',
    title: 'Alimentos y Producción',
    subtitle: 'Restaurantes, cafés, panaderías, comida rápida y repostería.',
    badges: ['Recetas e Insumos', 'Lotes de Producción', 'Menú Digital + Delivery'],
  },
];

const Register: React.FC = () => {
  const [step, setStep] = useState(1);
  const [tenantName, setTenantName] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [identification, setIdentification] = useState('');
  const [phone, setPhone] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const [businessProfile, setBusinessProfile] = useState<BusinessProfileType | null>(null);
  const [showCustomModules, setShowCustomModules] = useState(false);

  const [featureCustomerSchedules, setFeatureCustomerSchedules] = useState(false);
  const [featureBuySell, setFeatureBuySell] = useState(false);
  const [featureRecipes, setFeatureRecipes] = useState(false);
  const [featureProduction, setFeatureProduction] = useState(false);
  const [featureDelivery, setFeatureDelivery] = useState(false);
  const [featureShowCatalog, setFeatureShowCatalog] = useState(true);
  const [featureFiscalSupport, setFeatureFiscalSupport] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') || params.get('referral');
    if (ref) {
      setReferralCode(ref.trim().toUpperCase());
    }
  }, []);

  const { login } = useContext(AuthContext);
  const [presentToast] = useIonToast();
  const router = useIonRouter();

  const selectArchetype = (profile: Exclude<BusinessProfileType, 'CUSTOM'>) => {
    const preset = getPresetFlagsForProfile(profile);
    setBusinessProfile(profile);
    setFeatureCustomerSchedules(preset.featureCustomerSchedules);
    setFeatureBuySell(preset.featureBuySell);
    setFeatureRecipes(preset.featureRecipes);
    setFeatureProduction(preset.featureProduction);
    setFeatureDelivery(preset.featureDelivery);
    setFeatureShowCatalog(preset.featureShowCatalog);
  };

  const handleManualToggle = (updater: (val: boolean) => void, value: boolean) => {
    updater(value);
    setBusinessProfile('CUSTOM');
  };

  const handleNextStep = () => {
    if (!tenantName.trim() || !username.trim() || !email.trim() || !password) {
      presentToast({
        message: 'Por favor, llena los datos del negocio, correo, usuario y contraseña.',
        duration: 3000,
        color: 'warning',
      });
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!tenantName.trim() || !username.trim() || !email.trim() || !password) {
      presentToast({
        message: 'Por favor, llena los datos de la empresa, correo y usuario.',
        duration: 3000,
        color: 'warning',
      });
      return;
    }

    const hasAnyCoreModule =
      businessProfile !== null ||
      featureCustomerSchedules ||
      featureBuySell ||
      featureRecipes ||
      featureProduction;

    if (!hasAnyCoreModule) {
      presentToast({
        message: 'Por favor, selecciona el modelo principal de tu negocio para configurar tus herramientas.',
        duration: 3500,
        color: 'warning',
      });
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      presentToast({
        message: 'Debes leer y aceptar tanto los Términos y Condiciones como la Política de Privacidad para registrar tu negocio.',
        duration: 4000,
        color: 'warning',
      });
      return;
    }

    try {
      const res = await apiClient.post('/auth/register', {
        tenantName: tenantName.trim(),
        fullName: fullName.trim() || undefined,
        username: username.trim(),
        email: email.trim(),
        password,
        identification: identification.trim() || undefined,
        phone: phone.trim() || undefined,
        referralCode: referralCode.trim() || undefined,
        businessProfile: businessProfile || 'CUSTOM',
        featureCustomerSchedules,
        featureBuySell,
        featureRecipes,
        featureProduction,
        featureDelivery,
        featureShowCatalog,
        featureFiscalSupport,
        acceptedTerms: true,
        acceptedPrivacy: true,
      });

      localStorage.removeItem('tenant_settings');
      login(res.data.access_token, res.data.user, res.data.workspaces);
      presentToast({ message: '¡Negocio registrado con éxito!', duration: 3000, color: 'success' });
      router.push('/dashboard', 'root', 'replace');
    } catch (e: any) {
      presentToast({
        message: 'Error: ' + (e.response?.data?.message || e.message),
        duration: 3000,
        color: 'danger',
      });
    }
  };

  const showInfo = (title: string, info: string) => {
    presentToast({ header: title, message: info, duration: 4000, position: 'top', color: 'dark' });
  };

  return (
    <IonPage>
      <IonContent fullscreen className="ion-padding" style={{ '--background': '#F8FAFC' } as any}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100%', padding: '20px 0' }}>
          <IonCard style={{ width: '100%', maxWidth: '460px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.06)', background: '#FFFFFF' }}>
            <IonCardHeader className="ion-text-center">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <img
                  src="/assets/logo.png"
                  alt="FinoWork"
                  style={{
                    width: '72px',
                    height: '72px',
                    maxWidth: '72px',
                    maxHeight: '72px',
                    borderRadius: '16px',
                    objectFit: 'cover',
                    display: 'block',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onError={e => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <IonCardTitle style={{ fontWeight: 800, color: '#0F172A', fontSize: '20px' }}>Registro en FinoWork</IonCardTitle>
              <p style={{ margin: '5px 0 0 0', color: '#64748B', fontSize: '13px', fontWeight: 600 }}>
                Paso {step} de 2 — {step === 1 ? 'Datos de tu Cuenta' : 'Modelo de tu Negocio'}
              </p>
            </IonCardHeader>
            <IonCardContent>
              {step === 1 && (
                <>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Nombre del Negocio</IonLabel>
                    <IonInput value={tenantName} placeholder="Ej. Boutique Bella / Exótica Spa" onIonInput={e => setTenantName(e.detail.value!)} />
                  </IonItem>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Correo Electrónico</IonLabel>
                    <IonInput type="email" value={email} placeholder="Ej. admin@negocio.com" onIonInput={e => setEmail(e.detail.value!)} />
                  </IonItem>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Cédula de Identidad (Opcional)</IonLabel>
                    <IonInput value={identification} placeholder="Ej. V-12345678" onIonInput={e => setIdentification(e.detail.value!)} />
                  </IonItem>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Teléfono / WhatsApp (Opcional)</IonLabel>
                    <IonInput type="tel" value={phone} placeholder="Ej. 04141234567" onIonInput={e => setPhone(e.detail.value!)} />
                  </IonItem>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Tu Nombre y Apellido (Visible para Clientes)</IonLabel>
                    <IonInput value={fullName} placeholder="Ej. María Pérez" onIonInput={e => setFullName(e.detail.value!)} />
                  </IonItem>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Usuario para Iniciar Sesión</IonLabel>
                    <IonInput value={username} placeholder="Ej. maria_admin" onIonInput={e => setUsername(e.detail.value!)} />
                  </IonItem>
                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked">Contraseña</IonLabel>
                    <IonInput type="password" value={password} placeholder="Mínimo 6 caracteres" onIonInput={e => setPassword(e.detail.value!)} />
                  </IonItem>

                  <IonItem lines="full" className="ion-margin-bottom">
                    <IonLabel position="stacked" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={giftOutline} style={{ color: '#f59e0b' }} />
                      ¿Tienes un código de referido? (Opcional)
                    </IonLabel>
                    <IonInput
                      value={referralCode}
                      placeholder="Ej. BURG-9X2A"
                      onIonInput={e => setReferralCode(e.detail.value || '')}
                      style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                    />
                  </IonItem>
                  {referralCode.trim() && (
                    <div style={{ margin: '-8px 0 14px 4px', fontSize: '12px', color: 'var(--theme-primary-readable, #065F46)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IonIcon icon={checkmarkDoneOutline} /> Código de invitación vinculado: <strong>{referralCode.trim().toUpperCase()}</strong>
                    </div>
                  )}

                  <IonButton
                    expand="block"
                    className="ion-margin-top"
                    onClick={handleNextStep}
                    style={{ '--background': 'var(--theme-primary, #10B981)', '--color': 'var(--theme-primary-contrast, #ffffff)', fontWeight: 700 } as any}
                  >
                    Siguiente <IonIcon slot="end" icon={arrowForwardOutline} />
                  </IonButton>
                  <div style={{ marginTop: '15px', textAlign: 'center' }}>
                    <IonButton fill="clear" color="medium" onClick={() => router.push('/login', 'back')}>
                      Volver al Login
                    </IonButton>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', marginBottom: '4px' }}>
                      ¿Cuál es el modelo principal de tu negocio?
                    </div>
                    <IonText style={{ fontSize: '12px', color: '#64748B' }}>
                      Elige una opción para activar tus herramientas ideales en 1 clic. Podrás cambiarlas cuando quieras en Configuración.
                    </IonText>
                  </div>

                  {/* Tarjetas de Arquetipo de Negocio */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                    {BUSINESS_ARCHETYPES.map(arch => {
                      const isSelected = businessProfile === arch.id;
                      return (
                        <div
                          key={arch.id}
                          data-testid={`archetype-${arch.id}`}
                          onClick={() => selectArchetype(arch.id)}
                          style={{
                            padding: '13px 14px',
                            borderRadius: '14px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#ECFDF5' : '#FFFFFF',
                            border: isSelected ? '2px solid var(--theme-primary, #10B981)' : '1px solid #E2E8F0',
                            boxShadow: isSelected ? '0 4px 12px rgba(16, 185, 129, 0.12)' : 'none',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                              <span style={{ fontSize: '24px', lineHeight: '1.1' }}>{arch.emoji}</span>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {arch.title}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', lineHeight: '1.35' }}>
                                  {arch.subtitle}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <IonIcon
                                icon={checkmarkCircle}
                                style={{ fontSize: '22px', color: 'var(--theme-primary, #10B981)', flexShrink: 0 }}
                              />
                            )}
                          </div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '9px', paddingLeft: '34px' }}>
                            {arch.badges.map(badge => (
                              <span
                                key={badge}
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '999px',
                                  backgroundColor: isSelected ? '#D1FAE5' : '#F1F5F9',
                                  color: isSelected ? '#065F46' : '#475569',
                                }}
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Opción Independiente de IVA y Libro de Ventas para Contador */}
                  <div
                    style={{
                      marginBottom: '12px',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      backgroundColor: featureFiscalSupport ? '#F0FDF4' : '#F8FAFC',
                      border: featureFiscalSupport ? '1px solid #86EFAC' : '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>🧾 ¿Manejas IVA (16%) y Libro de Ventas para Contador?</span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: '999px',
                            backgroundColor: '#E2E8F0',
                            color: '#475569',
                          }}
                        >
                          Opcional
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B', marginTop: '3px', lineHeight: '1.35' }}>
                        Actívalo si necesitas desglosar Base Imponible / Exento y exportar el Libro de Ventas. Si vendes a precio neto cerrado, déjalo apagado.
                      </div>
                    </div>
                    <IonToggle
                      data-testid="toggle-fiscal-support"
                      checked={featureFiscalSupport}
                      onIonChange={e => setFeatureFiscalSupport(e.detail.checked)}
                    />
                  </div>

                  {/* Botón Desplegable para Personalización Manual (Negocios Mixtos) */}
                  <div style={{ marginBottom: '16px' }}>
                    <button
                      type="button"
                      data-testid="toggle-custom-modules"
                      onClick={() => setShowCustomModules(prev => !prev)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1px dashed #CBD5E1',
                        backgroundColor: '#F8FAFC',
                        color: '#475569',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <IonIcon icon={optionsOutline} style={{ fontSize: '15px', color: '#64748B' }} />
                        Personalizar módulos manualmente (Negocios mixtos)
                      </span>
                      <IonIcon icon={showCustomModules ? chevronUpOutline : chevronDownOutline} style={{ fontSize: '15px' }} />
                    </button>

                    {showCustomModules && (
                      <div
                        data-testid="custom-modules-panel"
                        style={{
                          marginTop: '8px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          backgroundColor: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        {/* 1. Citas y Reservaciones */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 0' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Agenda de Citas y Reservaciones</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>Turnos de clientes, especialistas y comisiones</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IonToggle
                              data-testid="toggle-schedules"
                              checked={featureCustomerSchedules}
                              onIonChange={e => handleManualToggle(setFeatureCustomerSchedules, e.detail.checked)}
                            />
                            <IonButton
                              fill="clear"
                              size="small"
                              onClick={() => showInfo('Citas y Reservaciones', 'Permite que tus clientes reserven citas online y asigna especialistas por servicio.')}
                            >
                              <IonIcon slot="icon-only" icon={informationCircleOutline} />
                            </IonButton>
                          </div>
                        </div>

                        {/* 2. Compra-Venta / Retail */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 0', borderTop: '1px solid #E2E8F0' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Compra-Venta Directa (Retail)</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>Productos físicos, tallas, colores y stock directo</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IonToggle
                              data-testid="toggle-buysell"
                              checked={featureBuySell}
                              onIonChange={e => handleManualToggle(setFeatureBuySell, e.detail.checked)}
                            />
                            <IonButton
                              fill="clear"
                              size="small"
                              onClick={() => showInfo('Compra-Venta', 'Ideal para tiendas de ropa, calzado, accesorios o bodegas donde vendes productos con o sin variantes.')}
                            >
                              <IonIcon slot="icon-only" icon={informationCircleOutline} />
                            </IonButton>
                          </div>
                        </div>

                        {/* 3. Recetas e Insumos */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 0', borderTop: '1px solid #E2E8F0' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Recetas y Materia Prima</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>Descuenta ingredientes automáticamente al vender</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IonToggle
                              data-testid="toggle-recipes"
                              checked={featureRecipes}
                              onIonChange={e => handleManualToggle(setFeatureRecipes, e.detail.checked)}
                            />
                            <IonButton
                              fill="clear"
                              size="small"
                              onClick={() => showInfo('Recetas', 'Permite que un plato o producto descuente gramos o unidades de tus insumos base al venderse.')}
                            >
                              <IonIcon slot="icon-only" icon={informationCircleOutline} />
                            </IonButton>
                          </div>
                        </div>

                        {/* 4. Lotes de Producción */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 0', borderTop: '1px solid #E2E8F0' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Lotes de Producción</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>Fabricación previa por tandas (panadería/fábrica)</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IonToggle
                              data-testid="toggle-production"
                              checked={featureProduction}
                              onIonChange={e => handleManualToggle(setFeatureProduction, e.detail.checked)}
                            />
                            <IonButton
                              fill="clear"
                              size="small"
                              onClick={() => showInfo('Lotes de Producción', 'Registra tandas fabricadas en taller o cocina para sumarlas al stock de productos terminados.')}
                            >
                              <IonIcon slot="icon-only" icon={informationCircleOutline} />
                            </IonButton>
                          </div>
                        </div>

                        {/* 5. Envíos / Delivery */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 0', borderTop: '1px solid #E2E8F0' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Envíos y Zonas de Delivery</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>Despacho a domicilio con tarifas por zona</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IonToggle
                              data-testid="toggle-delivery"
                              checked={featureDelivery}
                              onIonChange={e => handleManualToggle(setFeatureDelivery, e.detail.checked)}
                            />
                            <IonButton
                              fill="clear"
                              size="small"
                              onClick={() => showInfo('Envíos y Delivery', 'Permite gestionar tarifas de entrega a domicilio y repartidores.')}
                            >
                              <IonIcon slot="icon-only" icon={informationCircleOutline} />
                            </IonButton>
                          </div>
                        </div>

                        {/* 6. Catálogo / Tienda Virtual Online */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', padding: '4px 0', borderTop: '1px solid #E2E8F0' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#1E293B' }}>Catálogo / Enlace Público Online</div>
                            <div style={{ fontSize: '11px', color: '#64748B' }}>Link web para recibir pedidos o citas desde redes</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <IonToggle
                              data-testid="toggle-catalog"
                              checked={featureShowCatalog}
                              onIonChange={e => handleManualToggle(setFeatureShowCatalog, e.detail.checked)}
                            />
                            <IonButton
                              fill="clear"
                              size="small"
                              onClick={() => showInfo('Catálogo Público', 'Genera un enlace web para compartir en Instagram y WhatsApp donde tus clientes ven precios y compran o reservan.')}
                            >
                              <IonIcon slot="icon-only" icon={informationCircleOutline} />
                            </IonButton>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Casilla 1: Términos y Condiciones */}
                  <div
                    style={{
                      marginTop: '12px',
                      marginBottom: '10px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: acceptedTerms ? '1px solid var(--theme-primary, #10B981)' : '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    <IonCheckbox
                      data-testid="checkbox-terms"
                      checked={acceptedTerms}
                      onIonChange={e => setAcceptedTerms(e.detail.checked)}
                      style={{
                        marginTop: '2px',
                        '--size': '20px',
                        '--checkbox-background-checked': 'var(--theme-primary, #10B981)',
                        '--border-color-checked': 'var(--theme-primary, #10B981)'
                      } as any}
                    />
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.45', flex: 1 }}>
                      He leído y acepto los{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--theme-primary-readable, #065F46)',
                          fontWeight: '700',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Términos y Condiciones
                      </button>{' '}
                      de FinoWork.
                    </div>
                  </div>

                  {/* Casilla 2: Política de Privacidad */}
                  <div
                    style={{
                      marginBottom: '16px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: '#F8FAFC',
                      border: acceptedPrivacy ? '1px solid var(--theme-primary, #10B981)' : '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'border-color 0.2s ease'
                    }}
                  >
                    <IonCheckbox
                      data-testid="checkbox-privacy"
                      checked={acceptedPrivacy}
                      onIonChange={e => setAcceptedPrivacy(e.detail.checked)}
                      style={{
                        marginTop: '2px',
                        '--size': '20px',
                        '--checkbox-background-checked': 'var(--theme-primary, #10B981)',
                        '--border-color-checked': 'var(--theme-primary, #10B981)'
                      } as any}
                    />
                    <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.45', flex: 1 }}>
                      He leído y acepto la{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--theme-primary-readable, #065F46)',
                          fontWeight: '700',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        Política de Privacidad
                      </button>{' '}
                      de FinoWork.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                    <IonButton expand="block" fill="outline" onClick={() => setStep(1)} style={{ flex: 1 }}>
                      <IonIcon slot="start" icon={arrowBackOutline} /> Atrás
                    </IonButton>
                    <IonButton
                      data-testid="btn-finish-register"
                      expand="block"
                      onClick={handleRegister}
                      disabled={!acceptedTerms || !acceptedPrivacy}
                      style={{
                        flex: 2,
                        '--background': (acceptedTerms && acceptedPrivacy) ? 'var(--theme-primary, #10B981)' : undefined,
                        '--color': (acceptedTerms && acceptedPrivacy) ? 'var(--theme-primary-contrast, #ffffff)' : undefined,
                        fontWeight: 700,
                      } as any}
                    >
                      Finalizar <IonIcon slot="end" icon={checkmarkDoneOutline} />
                    </IonButton>
                  </div>
                </>
              )}
            </IonCardContent>
          </IonCard>
        </div>

        {/* Modal Términos y Condiciones */}
        <IonModal isOpen={showTermsModal} onDidDismiss={() => setShowTermsModal(false)}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#0F172A', '--color': '#FFFFFF' } as any}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '12px' }}>
                <IonIcon icon={documentTextOutline} style={{ color: '#10B981', fontSize: '20px' }} />
                <IonTitle style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold' }}>Términos y Condiciones</IonTitle>
              </div>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowTermsModal(false)} style={{ color: '#FFFFFF' }}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding" style={{ '--background': '#F8FAFC' } as any}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <TermsContent />
              <div style={{ marginTop: '24px', paddingBottom: '30px', textAlign: 'center' }}>
                <IonButton
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTermsModal(false);
                  }}
                  style={{ '--background': 'var(--theme-primary, #10B981)', '--color': 'var(--theme-primary-contrast, #ffffff)' } as any}
                >
                  <IonIcon slot="start" icon={checkmarkDoneOutline} />
                  Aceptar y Continuar
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>

        {/* Modal Política de Privacidad */}
        <IonModal isOpen={showPrivacyModal} onDidDismiss={() => setShowPrivacyModal(false)}>
          <IonHeader>
            <IonToolbar style={{ '--background': '#0F172A', '--color': '#FFFFFF' } as any}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '12px' }}>
                <IonIcon icon={shieldCheckmarkOutline} style={{ color: '#10B981', fontSize: '20px' }} />
                <IonTitle style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 'bold' }}>Política de Privacidad</IonTitle>
              </div>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowPrivacyModal(false)} style={{ color: '#FFFFFF' }}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding" style={{ '--background': '#F8FAFC' } as any}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <PrivacyContent />
              <div style={{ marginTop: '24px', paddingBottom: '30px', textAlign: 'center' }}>
                <IonButton
                  onClick={() => {
                    setAcceptedPrivacy(true);
                    setShowPrivacyModal(false);
                  }}
                  style={{ '--background': 'var(--theme-primary, #10B981)', '--color': 'var(--theme-primary-contrast, #ffffff)' } as any}
                >
                  <IonIcon slot="start" icon={checkmarkDoneOutline} />
                  Aceptar y Continuar
                </IonButton>
              </div>
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Register;
