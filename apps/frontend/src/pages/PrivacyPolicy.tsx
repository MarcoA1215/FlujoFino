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
import { arrowBackOutline, lockClosedOutline } from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';

export const PrivacyContent: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', color: '#334155', lineHeight: '1.7', fontSize: '15px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#065f46', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
          <IonIcon icon={lockClosedOutline} /> Privacidad y Protección de Datos
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
          Política de Privacidad
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          Última actualización: Octubre 2026 • Plataforma SaaS FinoWork
        </p>
      </div>

      <div className="ff-card" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: 0 }}>
          1. Responsable del Tratamiento y Compromiso de Confidencialidad
        </h2>
        <p>
          El responsable legal y técnico del tratamiento de los datos recopilados a través de la plataforma <strong>FinoWork</strong> (versión web y aplicación móvil Android) es <strong>Marco David Avila Pinto</strong>, titular de la Cédula de Identidad N° <strong>V-31.075.846</strong> (en adelante "el Responsable" o "FinoWork").
        </p>
        <p>
          Respetamos y protegemos la privacidad de los negocios suscritos y de sus clientes finales. Esta Política de Privacidad describe de manera transparente cómo recolectamos, utilizamos, almacenamos y resguardamos la información comercial y operativa cuando usted utiliza nuestros servicios.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          2. Información que Recopilamos
        </h2>
        <p>
          Para brindar el servicio de gestión comercial, recopilamos las siguientes categorías de información:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li><strong>Datos de Cuenta del Negocio:</strong> Nombre comercial, nombre de contacto, nombre de usuario, correo electrónico, número de teléfono o WhatsApp y contraseña cifrada.</li>
          <li><strong>Datos Comerciales y de Operación:</strong> Catálogo de productos, recetas, precios de venta, costos base, zonas de reparto y registros de movimientos de stock.</li>
          <li><strong>Datos de Clientes de su Negocio:</strong> Nombres, cédulas o identificadores fiscales, teléfonos y direcciones de entrega ingresados por usted o a través del catálogo/reserva pública para tramitar sus compras o citas.</li>
          <li><strong>Comprobantes de Pago:</strong> Imágenes o capturas de pago móvil/transferencia subidas voluntariamente para validación de ventas o de suscripción mensual al SaaS.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          3. Finalidad del Tratamiento de los Datos
        </h2>
        <p>
          La información recabada se utiliza estrictamente para:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Operar, mantener y optimizar los módulos de venta, caja, cocina, despacho y reservas del Negocio.</li>
          <li>Facilitar el envío de notificaciones automáticas y alertas operativas a su personal.</li>
          <li>Procesar y verificar la suscripción mensual de su empresa a la plataforma FinoWork.</li>
          <li>Brindar soporte técnico directo cuando sea solicitado por el titular de la cuenta.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          4. Prohibición de Venta o Cesión a Terceros
        </h2>
        <p>
          <strong>FinoWork no vende, no alquila y no comparte bases de datos con terceros con fines publicitarios, mercadológicos o comerciales bajo ninguna circunstancia.</strong> Los datos de sus ventas y clientes son de estricta titularidad de su negocio.
        </p>
        <p>
          <strong>Excepción de Infraestructura:</strong> FinoWork utiliza proveedores de infraestructura en la nube de terceros (ej. servidores web, bases de datos, envío de correos) estrictamente para alojar y operar la plataforma. Estos proveedores procesan la información bajo protocolos de seguridad y acuerdos de confidencialidad, sin adquirir derechos de propiedad ni autorización para usar los datos con fines publicitarios ajenos al servicio.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          5. Seguridad y Almacenamiento
        </h2>
        <p>
          Implementamos altos estándares técnicos de seguridad:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li><strong>Cifrado de Contraseñas:</strong> Todas las contraseñas se almacenan mediante algoritmos de cifrado irreversible (bcrypt con salt seguro).</li>
          <li><strong>Comunicaciones Seguras:</strong> Toda la transmisión de datos viaja protegida con cifrado SSL/TLS de grado bancario (HTTPS y WSS).</li>
          <li><strong>Aislamiento Multi-Tenant:</strong> La base de datos separa e independiza lógicamente los registros de cada comercio mediante identificadores únicos de inquilino.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          6. Derechos del Titular (Acceso y Supresión)
        </h2>
        <p>
          El Usuario titular de la cuenta tiene derecho a consultar, rectificar o solicitar la exportación o supresión definitiva de los datos de su negocio en cualquier momento mediante solicitud formal a nuestro equipo de soporte.
        </p>
        <p>
          Dado que FinoWork actúa como procesador técnico, si un cliente final de un Negocio (comprador) solicita la eliminación de sus datos, FinoWork redirigirá dicha solicitud al titular del Comercio correspondiente para que este ejecute la acción desde su panel administrativo.
        </p>
        <p>
          En caso de que el Usuario solicite la supresión definitiva de su cuenta, los datos activos serán eliminados inmediatamente del sistema de producción. Sin embargo, copias residuales cifradas podrán permanecer en nuestras copias de seguridad automatizadas (backups) por un período máximo de 30 días con fines de recuperación ante desastres, tras lo cual serán destruidas irreversiblemente.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          7. Uso de Cookies y Almacenamiento Local (Sin Rastreo Publicitario)
        </h2>
        <p>
          FinoWork <strong>no utiliza cookies de seguimiento publicitario ni comercializa perfiles de navegación con redes de anuncios</strong>. Empleamos exclusivamente tecnologías de almacenamiento técnico local en el navegador y en el dispositivo móvil (tales como <em>localStorage</em>, <em>sessionStorage</em> e <em>IndexedDB</em>) que son estrictamente indispensables para mantener su sesión iniciada de manera segura y permitir que el punto de venta (POS) y catálogo sigan operando sin conexión a internet (Modo Offline).
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          8. Contacto y Soporte de Privacidad
        </h2>
        <p style={{ margin: 0 }}>
          Si tiene alguna inquietud respecto al tratamiento de sus datos o desea ejercer sus derechos de acceso, rectificación o supresión, comuníquese directamente con nuestro canal de atención oficial vía WhatsApp o a través del centro de soporte de FinoWork.
        </p>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          © 2026 Marco David Avila Pinto (C.I. V-31.075.846) • Todos los derechos reservados • Plataforma FinoWork
        </div>
      </div>
    </div>
  );
};

const PrivacyPolicy: React.FC = () => {
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
            Política de Privacidad
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
        <div style={{ padding: '16px 12px 60px 12px' }}>
          <PrivacyContent />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PrivacyPolicy;
