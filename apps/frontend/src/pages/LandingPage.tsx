import React from 'react';
import {
  IonPage,
  IonContent,
  IonIcon,
  useIonRouter
} from '@ionic/react';
import {
  rocketOutline,
  logoAndroid,
  storefrontOutline,
  receiptOutline,
  calendarOutline,
  bicycleOutline,
  trendingUpOutline,
  shieldCheckmarkOutline,
  checkmarkCircle,
  arrowForwardOutline,
  phonePortraitOutline,
  chatbubbleEllipsesOutline,
  downloadOutline
} from 'ionicons/icons';

const LandingPage: React.FC = () => {
  const router = useIonRouter();

  return (
    <IonPage>
      <IonContent fullscreen style={{ '--background': '#F8FAFC' } as any}>
        {/* Navigation Bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(8px)',
            borderBottom: '1px solid #E2E8F0',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            maxWidth: '1200px',
            margin: '0 auto',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <div
            onClick={() => router.push('/', 'root', 'replace')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <img
              src="/assets/logo.png"
              alt="FinoWork Logo"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                objectFit: 'cover'
              }}
              onError={e => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', letterSpacing: '-0.5px' }}>
                Fino<span style={{ color: '#10B981' }}>Work</span>
              </span>
              <span style={{ fontSize: '10px', color: '#64748B', fontWeight: '500', marginTop: '-2px' }}>
                Sistema de Gestión & POS
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={() => router.push('/login', 'forward')}
              style={{
                background: 'transparent',
                border: '1px solid #CBD5E1',
                color: '#334155',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => router.push('/register', 'forward')}
              style={{
                background: '#10B981',
                border: 'none',
                color: '#FFFFFF',
                padding: '8px 18px',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              Probar Gratis
            </button>
          </div>
        </header>

        {/* Main Container */}
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px 80px 20px', boxSizing: 'border-box' }}>
          
          {/* HERO SECTION */}
          <section style={{ textAlign: 'center', paddingTop: '48px', paddingBottom: '40px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: '#ECFDF5',
                border: '1px solid #A7F3D0',
                color: '#065F46',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '20px'
              }}
            >
              <IonIcon icon={rocketOutline} style={{ fontSize: '16px', color: '#10B981' }} />
              <span>Plataforma Cloud & App Móvil • Todo en Uno</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(28px, 5vw, 46px)',
                fontWeight: '900',
                color: '#0F172A',
                lineHeight: '1.18',
                letterSpacing: '-1px',
                margin: '0 auto 18px auto',
                maxWidth: '850px'
              }}
            >
              El sistema moderno para controlar y{' '}
              <span style={{ color: '#10B981' }}>escalar tu negocio</span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(15px, 2.5vw, 18px)',
                color: '#475569',
                lineHeight: '1.6',
                margin: '0 auto 32px auto',
                maxWidth: '680px'
              }}
            >
              Punto de venta (POS) ultra rápido, recetas e inventario automático, control de turnos, delivery, citas y reportes de ganancias en tiempo real.
            </p>

            {/* CTA Buttons */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: '14px',
                marginBottom: '20px'
              }}
            >
              <button
                onClick={() => router.push('/register', 'forward')}
                style={{
                  background: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '14px 28px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <span>Comenzar 15 Días Gratis</span>
                <IonIcon icon={arrowForwardOutline} style={{ fontSize: '18px' }} />
              </button>

              <a
                href="/FinoWork.apk"
                download="FinoWork.apk"
                style={{
                  textDecoration: 'none',
                  background: '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '14px 26px',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                  transition: 'transform 0.15s ease'
                }}
              >
                <IonIcon icon={logoAndroid} style={{ fontSize: '20px', color: '#10B981' }} />
                <span>Descargar APK para Android</span>
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap', fontSize: '13px', color: '#64748B' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={checkmarkCircle} style={{ color: '#10B981' }} /> Sin tarjeta de crédito
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={checkmarkCircle} style={{ color: '#10B981' }} /> Configuración en 2 minutos
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <IonIcon icon={checkmarkCircle} style={{ color: '#10B981' }} /> Soporte en español
              </span>
            </div>
          </section>

          {/* HIGHLIGHT BANNER: APK ANDROID DIRECTO */}
          <section
            style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              borderRadius: '20px',
              padding: '32px 28px',
              color: '#FFFFFF',
              margin: '24px 0 56px 0',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '24px',
              alignItems: 'center'
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  color: '#34D399',
                  fontSize: '12px',
                  fontWeight: '700',
                  marginBottom: '12px'
                }}
              >
                <IonIcon icon={logoAndroid} style={{ fontSize: '15px' }} />
                <span>APLICACIÓN MÓVIL DISPONIBLE</span>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '800', margin: '0 0 10px 0', color: '#FFFFFF', lineHeight: '1.25' }}>
                Instala FinoWork directamente en tu teléfono o tablet
              </h2>
              <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: '1.6', margin: '0 0 18px 0' }}>
                Lleva el control de tu caja, cobra desde cualquier mesa o mostrador e imprime comprobantes. Descarga el paquete oficial APK e instálalo en segundos.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#CBD5E1', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>1</span>
                  <span>Descarga el instalador <strong>FinoWork.apk</strong> con el botón inferior.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>2</span>
                  <span>Acepta instalar aplicaciones desde este origen o navegador.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#10B981', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold' }}>3</span>
                  <span>¡Abre FinoWork e ingresa con tu usuario o regístrate!</span>
                </div>
              </div>
              <a
                href="/FinoWork.apk"
                download="FinoWork.apk"
                style={{
                  textDecoration: 'none',
                  background: '#10B981',
                  color: '#FFFFFF',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
              >
                <IonIcon icon={downloadOutline} style={{ fontSize: '20px' }} />
                <span>Descargar APK (FinoWork.apk)</span>
              </a>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  background: '#0B1120',
                  border: '1px solid #334155',
                  borderRadius: '16px',
                  padding: '24px',
                  maxWidth: '300px',
                  width: '100%',
                  textAlign: 'center'
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: '#10B981',
                    margin: '0 auto 14px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  <IonIcon icon={phonePortraitOutline} style={{ fontSize: '32px', color: '#FFFFFF' }} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#FFFFFF', marginBottom: '4px' }}>
                  FinoWork Android
                </div>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '16px' }}>
                  Versión 1.0.0 • Listo para producción
                </div>
                <div
                  style={{
                    background: '#1E293B',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '12px',
                    color: '#CBD5E1',
                    lineHeight: '1.4'
                  }}
                >
                  Compatible con teléfonos y tabletas Android (cajas registradoras, comanderos y repartidores).
                </div>
              </div>
            </div>
          </section>

          {/* FEATURES GRID */}
          <section style={{ marginBottom: '64px' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A', margin: '0 0 10px 0' }}>
                Todo lo que tu negocio necesita en una sola pantalla
              </h2>
              <p style={{ color: '#64748B', fontSize: '15px', margin: 0, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
                Diseñado para simplificar tu operación diaria, evitar pérdidas y brindarte números claros.
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px'
              }}
            >
              {/* Feature 1 */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#ECFDF5',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <IonIcon icon={storefrontOutline} style={{ fontSize: '24px' }} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0' }}>
                  Punto de Venta Ultra Rápido (POS)
                </h3>
                <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                  Factura en segundos, maneja multimoneda (USD y moneda local), cálculo de vuelto exacto, descuentos y emisión de comandas e impresiones térmicas.
                </p>
              </div>

              {/* Feature 2 */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#EFF6FF',
                    color: '#3B82F4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <IonIcon icon={receiptOutline} style={{ fontSize: '24px' }} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0' }}>
                  Inventario & Recetas Inteligentes
                </h3>
                <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                  Al vender una hamburguesa o plato, FinoWork descuenta automáticamente cada gramo o unidad de carne, pan y vegetales con soporte para mermas.
                </p>
              </div>

              {/* Feature 3 */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#FDF2F8',
                    color: '#EC4899',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <IonIcon icon={calendarOutline} style={{ fontSize: '24px' }} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0' }}>
                  Citas y Reservaciones de Clientes
                </h3>
                <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                  Agenda turnos, gestiona estilistas o especialistas, asigna tiempos de servicio y envía confirmaciones para barberías, spas o clínicas.
                </p>
              </div>

              {/* Feature 4 */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#FEF3C7',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <IonIcon icon={bicycleOutline} style={{ fontSize: '24px' }} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0' }}>
                  Delivery y Despacho en Tiempo Real
                </h3>
                <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                  Control de estados (Pendiente, En Cocina, En Camino, Entregado), asignación de repartidores y cálculo automático de cobro al cliente.
                </p>
              </div>

              {/* Feature 5 */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#F3E8FF',
                    color: '#9333EA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <IonIcon icon={trendingUpOutline} style={{ fontSize: '24px' }} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0' }}>
                  Reportes Financieros y Cierre de Caja
                </h3>
                <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                  Cortes X y Z, control de turnos de cajeros, conciliación de pagos (efectivo, pago móvil, tarjeta) y márgenes de ganancia neta.
                </p>
              </div>

              {/* Feature 6 */}
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px'
                  }}
                >
                  <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: '24px' }} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#0F172A', margin: '0 0 8px 0' }}>
                  Seguridad y Multi-Sucursal
                </h3>
                <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: 0 }}>
                  Roles delimitados (Admin, Cajero, Cocinero, Repartidor), control de horarios con autorización remota y soporte para múltiples sedes.
                </p>
              </div>
            </div>
          </section>

          {/* PRICING SECTION */}
          <section style={{ marginBottom: '64px' }}>
            <div style={{ textAlign: 'center', marginBottom: '36px' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: '#ECFDF5',
                  color: '#065F46',
                  fontSize: '12px',
                  fontWeight: '700',
                  marginBottom: '10px'
                }}
              >
                PRECIOS CLAROS Y SIN LETRA PEQUEÑA
              </div>
              <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px 0' }}>
                Un plan simple con todo incluido
              </h2>
              <p style={{ color: '#64748B', fontSize: '15px', margin: 0 }}>
                Comienza gratis sin compromiso y continúa por una tarifa fija accesible.
              </p>
            </div>

            <div style={{ maxWidth: '440px', margin: '0 auto' }}>
              <div
                style={{
                  background: '#FFFFFF',
                  borderRadius: '20px',
                  border: '2px solid #10B981',
                  padding: '32px 28px',
                  boxShadow: '0 10px 30px rgba(16, 185, 129, 0.1)',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#10B981',
                    color: '#FFFFFF',
                    padding: '4px 14px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: '800',
                    letterSpacing: '0.5px'
                  }}
                >
                  PRUEBA GRATIS DE 15 DÍAS
                </div>

                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px 0' }}>
                    Plan Profesional FinoWork
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '38px', fontWeight: '900', color: '#0F172A' }}>$20</span>
                    <span style={{ fontSize: '14px', color: '#64748B', fontWeight: '600' }}>USD / mes</span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#10B981', fontWeight: '600', margin: '6px 0 0 0' }}>
                    15 días totalmente gratis al registrar tu negocio
                  </p>
                </div>

                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '20px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IonIcon icon={checkmarkCircle} style={{ color: '#10B981', fontSize: '18px', flexShrink: 0 }} />
                      <span>Punto de Venta (POS) ilimitado</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IonIcon icon={checkmarkCircle} style={{ color: '#10B981', fontSize: '18px', flexShrink: 0 }} />
                      <span>Inventario completo con recetas automáticas</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IonIcon icon={checkmarkCircle} style={{ color: '#10B981', fontSize: '18px', flexShrink: 0 }} />
                      <span>Módulo de Citas y Reservaciones</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IonIcon icon={checkmarkCircle} style={{ color: '#10B981', fontSize: '18px', flexShrink: 0 }} />
                      <span>Gestión de Delivery y Comandas</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IonIcon icon={checkmarkCircle} style={{ color: '#10B981', fontSize: '18px', flexShrink: 0 }} />
                      <span>Usuarios y roles ilimitados</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IonIcon icon={checkmarkCircle} style={{ color: '#10B981', fontSize: '18px', flexShrink: 0 }} />
                      <span>App móvil Android para tus dispositivos</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IonIcon icon={checkmarkCircle} style={{ color: '#10B981', fontSize: '18px', flexShrink: 0 }} />
                      <span>Soporte prioritario y actualizaciones</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => router.push('/register', 'forward')}
                  style={{
                    width: '100%',
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  Registrar Mi Negocio Ahora
                </button>
              </div>
            </div>
          </section>

          {/* FINAL CTA SECTION */}
          <section
            style={{
              background: '#F1F5F9',
              borderRadius: '20px',
              padding: '36px 24px',
              textAlign: 'center',
              border: '1px solid #E2E8F0',
              marginBottom: '40px'
            }}
          >
            <h3 style={{ fontSize: '24px', fontWeight: '800', color: '#0F172A', margin: '0 0 10px 0' }}>
              ¿Listo para ordenar las ventas y números de tu negocio?
            </h3>
            <p style={{ color: '#64748B', fontSize: '15px', margin: '0 auto 24px auto', maxWidth: '540px' }}>
              Únete a los comercios que ya operan con FinoWork y ahorra horas de cuadres manuales y pérdidas de inventario.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/register', 'forward')}
                style={{
                  background: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Probar 15 Días Gratis
              </button>
              <a
                href="https://wa.me/584141234567?text=Hola,%20deseo%20más%20información%20sobre%20FinoWork"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textDecoration: 'none',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #CBD5E1',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <IonIcon icon={chatbubbleEllipsesOutline} style={{ color: '#10B981', fontSize: '18px' }} />
                <span>Hablar por WhatsApp</span>
              </a>
            </div>
          </section>

          {/* FOOTER */}
          <footer
            style={{
              borderTop: '1px solid #E2E8F0',
              paddingTop: '28px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
              fontSize: '13px',
              color: '#64748B'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', color: '#0F172A' }}>FinoWork</span>
              <span>© {new Date().getFullYear()} Todos los derechos reservados.</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => router.push('/terms', 'forward')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#64748B',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                Términos y Condiciones
              </button>
              <button
                type="button"
                onClick={() => router.push('/privacy', 'forward')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#64748B',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'underline'
                }}
              >
                Política de Privacidad
              </button>
              <a
                href="/FinoWork.apk"
                download="FinoWork.apk"
                style={{
                  color: '#10B981',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <IonIcon icon={logoAndroid} />
                <span>Descargar APK</span>
              </a>
              <button
                type="button"
                onClick={() => router.push('/login', 'forward')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#0F172A',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                Ingresar al Sistema
              </button>
            </div>
          </footer>
        </main>
      </IonContent>
    </IonPage>
  );
};

export default LandingPage;
