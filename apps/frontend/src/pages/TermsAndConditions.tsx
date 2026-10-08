import React from 'react';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { arrowBackOutline, shieldCheckmarkOutline } from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';

export const TermsContent: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', color: '#334155', lineHeight: '1.7', fontSize: '15px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#065f46', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
          <IonIcon icon={shieldCheckmarkOutline} /> Documento Legal Oficial
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
          Términos y Condiciones del Servicio
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          Última actualización: Octubre 2026 • Plataforma SaaS FinoWork
        </p>
      </div>

      <div className="ff-card" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: 0 }}>
          1. Aceptación de los Términos
        </h2>
        <p>
          Al crear una cuenta, registrar su negocio o utilizar la plataforma <strong>FinoWork</strong> (en adelante "el Servicio" o "la Plataforma"), usted (en adelante "el Usuario" o "el Negocio") declara ser mayor de edad, tener la facultad legal para representar a su empresa o emprendimiento y acepta expresamente quedar vinculado por los presentes Términos y Condiciones, así como por nuestra Política de Privacidad.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          2. Descripción del Servicio y Licencia SaaS
        </h2>
        <p>
          FinoWork es un software de gestión comercial bajo modalidad Software como Servicio (SaaS) que provee herramientas para:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Punto de venta y caja registradora (POS) con capacidades en línea y fuera de línea (offline).</li>
          <li>Control de inventario de productos terminados, insumos y materias primas.</li>
          <li>Despiece automático por recetas y órdenes de producción.</li>
          <li>Agenda de citas y reservas con enlace público autogestionado.</li>
          <li>Gestión de despacho, zonas de entrega y pedidos para delivery.</li>
          <li>Cálculo de equivalencia multimoneda y reportes financieros operativos.</li>
        </ul>
        <p>
          FinoWork otorga al Usuario una licencia limitada, revocable, no exclusiva e intransferible para acceder y hacer uso de las funciones contratadas durante la vigencia de su suscripción activa o período de prueba.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          3. Período de Prueba Gratuita y Suscripción Mensual
        </h2>
        <p>
          Todo nuevo negocio registrado tiene derecho a un <strong>período de prueba gratuito de 15 días consecutivos</strong> sin necesidad de registrar tarjetas de crédito ni realizar depósitos previos.
        </p>
        <p>
          Concluido el período de prueba, para continuar operando en la Plataforma, el Negocio deberá abonar la cuota mensual de suscripción establecida en la plataforma (actualmente $20 USD mensuales o su equivalente según tasa oficial o método acordado como Pago Móvil o Binance Pay).
        </p>
        <p>
          En caso de impago o mora tras cumplirse el período de gracia, el acceso a las funciones operativas del negocio quedará pausado preventivamente hasta la regularización de la cuenta, sin que ello implique la pérdida inmediata de su información histórica.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          4. Propiedad y Confidencialidad de los Datos
        </h2>
        <p>
          <strong>El Negocio es el único y exclusivo propietario de sus datos:</strong> catálogo de productos, recetas, precios, datos de clientes, historiales de ventas y reportes contables.
        </p>
        <p>
          FinoWork no comercializa, no transfiere y no utiliza la información interna de su negocio para fines publicitarios de terceros ni para beneficio propio ajeno a la prestación del servicio técnico.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          5. Responsabilidad Operativa, Comercial y Fiscal
        </h2>
        <p>
          El Usuario reconoce y acepta que FinoWork es una herramienta tecnológica de asistencia operativa y administrativa. El Negocio es el único y exclusivo responsable de:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Cumplir con las normativas tributarias, fiscales, mercantiles y de facturación fiscal vigentes en su respectivo país o jurisdicción.</li>
          <li>La exactitud de los precios, cobros y vuelto entregados a sus clientes finales.</li>
          <li>La calidad, idoneidad e higiene de los productos o alimentos manufacturados y despachados.</li>
          <li>El resguardo de sus credenciales de acceso (usuario y contraseña) asignadas a su personal y colaboradores.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          6. Disponibilidad del Servicio y Modo Offline
        </h2>
        <p>
          FinoWork procura una disponibilidad del servicio del 99.5%. La Plataforma incorpora tecnología de almacenamiento local (IndexedDB) para permitir que la caja registradora continúe cobrando ventas ante interrupciones de internet. No obstante, FinoWork no se hace responsable por fallas derivadas de cortes de energía locales, daños en hardware de terceros o caídas masivas de proveedores de telecomunicaciones.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          7. Modificaciones a los Términos
        </h2>
        <p>
          FinoWork se reserva el derecho de actualizar los presentes Términos periódicamente para reflejar mejoras operativas o exigencias legales. Cualquier cambio sustancial será notificado oportunamente a través de la interfaz del sistema o por correo electrónico.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          8. Contacto y Soporte
        </h2>
        <p style={{ margin: 0 }}>
          Para cualquier duda, aclaratoria o soporte relacionado con estos Términos, comuníquese con el canal oficial de atención a través de nuestro soporte por WhatsApp o al correo de soporte de la plataforma.
        </p>
      </div>
    </div>
  );
};

const TermsAndConditions: React.FC = () => {
  const navigate = useNavigate();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar style={{ '--background': '#ffffff', '--border-color': '#e2e8f0' } as any}>
          <IonButtons slot="start">
            <IonButton onClick={() => navigate(-1)} style={{ color: '#0f172a' }}>
              <IonIcon slot="icon-only" icon={arrowBackOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle style={{ color: '#0f172a', fontWeight: 800, fontSize: '17px' }}>
            Términos y Condiciones
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
        <div style={{ padding: '16px 12px 60px 12px' }}>
          <TermsContent />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TermsAndConditions;
