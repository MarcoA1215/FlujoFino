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
import { arrowBackOutline, lockClosedOutline, printOutline } from 'ionicons/icons';
import { LegalPrintHeader } from '../components/legal/LegalPrintHeader';
import { useNavigate } from 'react-router-dom';

export const PrivacyContent: React.FC = () => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', color: '#334155', lineHeight: '1.7', fontSize: '15px' }}>
      <LegalPrintHeader
        title="POLÍTICA DE PRIVACIDAD Y PROTECCIÓN DE DATOS PERSONALES"
        version="2.0"
        lastUpdated="Noviembre 2026"
        referenceCode="FW-PRIVACY-V2.0-SECURE"
        precedenceUrl="/privacy"
      />
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ecfdf5', color: '#065f46', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, marginBottom: '12px' }}>
          <IonIcon icon={lockClosedOutline} /> Privacidad y Protección de Datos
        </div>
        <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0' }}>
          Política de Privacidad
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
          Última actualización: Noviembre 2026 • Plataforma SaaS FinoWork
        </p>
      </div>

      <div className="ff-card" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: 0 }}>
          1. Responsable del Tratamiento, Encargado Técnico y Alcance
        </h2>
        <p>
          El titular legal y responsable de la plataforma tecnológica <strong>FinoWork</strong> (en adelante "el Prestador" o "FinoWork") es <strong>Marco David Avila Pinto</strong>, titular de la Cédula de Identidad N° <strong>V-31.075.846</strong>.
        </p>
        <p>
          FinoWork opera bajo un modelo Software como Servicio (SaaS) con dos roles claramente diferenciados en el tratamiento de datos:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li><strong>Como Responsable del Tratamiento:</strong> FinoWork gestiona directamente los datos de cuenta, facturación y contacto de los comercios suscritos, sus administradores, usuarios de personal y promotores de calle.</li>
          <li><strong>Como Encargado del Tratamiento (Procesador Técnico):</strong> FinoWork proporciona la infraestructura técnica para que el Comercio gestione las ventas de su catálogo público, tienda online, caja registradora, emisión de facturas fiscales y citas de reserva. El Comercio es el responsable primario de los datos de sus clientes finales y consumidores.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          2. Información que Recopilamos según el Usuario
        </h2>
        <p>
          Recopilamos únicamente los datos indispensables para la operatividad del sistema, clasificados de la siguiente manera:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li><strong>Datos del Negocio y Administradores:</strong> Razón social o nombre comercial, nombre de contacto, correo electrónico, número telefónico o WhatsApp, contraseña cifrada, tipo de comercio y configuración de monedas.</li>
          <li>
            <strong>Datos Fiscales y Tributarios del Negocio y sus Clientes:</strong> Registro Único de Información Fiscal (RIF), Razón Social oficial registrada, dirección fiscal declarada, números de facturas y notas de crédito, series correlativas, números de control fiscal, discriminación de montos exentos y gravados con IVA, alícuotas impositivas aplicadas, impuestos liquidados (IVA e IGTF), comprobantes fiscales emitidos y datos agregados para la conformación del Libro de Ventas mensual.
          </li>
          <li><strong>Datos de Empleados y Personal Operativo:</strong> Nombres, nombres de usuario, contraseñas cifradas y asignación de roles (cajero, cocinero, repartidor, inventario).</li>
          <li><strong>Datos de Clientes Finales (Tienda Online, Catálogo Público y Reservas):</strong> Nombre o seudónimo del comprador, número de WhatsApp/teléfono, cédula o RIF para identificación y facturación, dirección física o geolocalización de entrega para delivery, referencias de domicilio, fecha y hora de citas reservadas, notas de pedido y comprobantes o capturas de pago bancario adjuntadas para validar la compra.</li>
          <li><strong>Datos de Promotores de Calle:</strong> Nombre, teléfono, canal de contacto y datos de cuenta bancaria o pago móvil requeridos exclusivamente para la liquidación de sus comisiones por comercios referidos.</li>
          <li><strong>Archivos Multimedia y Contenidos:</strong> Fotografías de productos, logotipos comerciales, imágenes de insumos y capturas de transferencias bancarias o Pago Móvil cargadas voluntariamente a los servidores.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          3. Finalidad del Tratamiento de los Datos
        </h2>
        <p>
          La información recabada se utiliza estrictamente para propósitos operativos y contractuales legítimos:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Habilitar la recepción, procesamiento y despacho de pedidos generados en el catálogo digital y tienda online pública.</li>
          <li>Gestionar la disponibilidad de citas y reservas en el calendario autogestionado del Comercio.</li>
          <li>Operar los módulos de caja registradora (POS), recetas, producción, inventario y asignación de despachos a repartidores.</li>
          <li>
            Facilitar la emisión de comprobantes fiscales digitales y notas de crédito con numeración correlativa y cálculo automatizado de bases imponibles e impuestos, y consolidar automáticamente los Libros de Ventas mensuales requeridos para el control contable del negocio.
          </li>
          <li>
            Facilitar la interoperabilidad técnica y transmisión cifrada hacia proveedores autorizados de facturación electrónica homologados cuando el Comercio active voluntariamente dicha pasarela.
          </li>
          <li>Enviar notificaciones operativas en tiempo real (vía Web Push) sobre pedidos entrantes, estados de comanda en cocina y pedidos en camino.</li>
          <li>Verificar los pagos de suscripción mensual al software y liquidar las comisiones del programa de promotores.</li>
          <li>Brindar soporte técnico directo solicitado por el Comercio.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          4. Permisos en Dispositivos Móviles y Navegadores
        </h2>
        <p>
          Tanto la aplicación móvil Android (APK) como la versión web de FinoWork solicitan únicamente los permisos técnicos estrictamente indispensables:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li><strong>Notificaciones Push (<code>POST_NOTIFICATIONS</code> / Web Push API):</strong> Empleado para alertar a los administradores, repartidores y clientes finales sobre el estado de sus pedidos y reservas. El usuario puede revocar este permiso en cualquier momento desde los ajustes de su navegador o dispositivo.</li>
          <li><strong>Acceso a Cámara y Almacenamiento/Galería:</strong> Requerido únicamente cuando el usuario decide capturar o adjuntar fotografías de productos, comprobantes de pago o el logo de su establecimiento. FinoWork no accede a la galería ni a la cámara de forma oculta ni fuera de dicha acción específica.</li>
          <li><strong>Acceso a Red e Internet:</strong> Indispensable para sincronizar las transacciones con el servidor y validar suscripciones.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          5. Interacción con Plataformas Externas (WhatsApp y Terceros)
        </h2>
        <p>
          La tienda online y el sistema de pedidos incorporan botones y enlaces directos que redirigen al cliente hacia <strong>WhatsApp</strong> (propiedad de Meta Platforms, Inc.) con un mensaje preconfigurado conteniendo el resumen del pedido.
        </p>
        <p>
          Al hacer clic en dichos enlaces, el usuario sale de FinoWork y pasa a interactuar en la infraestructura de WhatsApp, rigiéndose por los términos de servicio y políticas de privacidad de Meta Platforms. FinoWork no accede a los chats privados ni a la libreta de contactos del dispositivo del usuario.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          6. Confidencialidad Fiscal, Prohibición de Venta de Datos y Proveedores
        </h2>
        <p>
          <strong>FinoWork no comercializa, no alquila, no monetiza ni transfiere bases de datos a agencias de marketing ni a redes publicitarias de terceros bajo ninguna circunstancia.</strong> Los datos comerciales pertenecen al Comercio y a sus respectivos titulares.
        </p>
        <p>
          <strong>Estricta Confidencialidad de la Información Comercial y Fiscal:</strong> FinoWork garantiza que los montos facturados, libros de ventas, costos, márgenes de ganancia y reportes impositivos tienen carácter de secreto comercial e información estrictamente confidencial. FinoWork no realiza minería de datos comerciales de sus clientes para comercializarla con competidores ni entidades financieras.
        </p>
        <p>
          <strong>Transmisión a Autoridades Públicas:</strong> La información fiscal o comercial únicamente podrá ser divulgada o transmitida ante autoridades tributarias o judiciales cuando medie una orden judicial motivada, mandamiento vinculante o requerimiento legal fundado expedido por autoridad competente en el marco estricto del ordenamiento jurídico aplicable.
        </p>
        <p>
          <strong>Proveedores de Servicios Tecnológicos:</strong> Para operar el servicio, FinoWork utiliza proveedores de infraestructura en la nube de primer nivel (servidores de base de datos PostgreSQL, almacenamiento seguro de archivos en la nube y servicios de pasarela de notificaciones push de Google Firebase/VAPID). En caso de activación de proveedores autorizados de facturación electrónica (como UniDigital), los datos requeridos por la ley tributaria se transmiten mediante canales API seguros y cifrados. Todos los proveedores actúan como subprocesadores técnicos bajo estrictos acuerdos de seguridad y confidencialidad.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          7. Medidas de Seguridad y Aislamiento Técnico
        </h2>
        <p>
          Implementamos altos estándares técnicos de seguridad para salvaguardar la información:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li><strong>Cifrado Criptográfico de Contraseñas:</strong> Todas las credenciales se almacenan mediante algoritmos de cifrado irreversible (bcrypt con salt seguro).</li>
          <li><strong>Comunicaciones Cifradas en Tránsito:</strong> Toda la transmisión de datos viaja protegida con protocolos SSL/TLS de grado bancario (HTTPS y WebSockets seguros).</li>
          <li><strong>Aislamiento Multi-Tenant:</strong> La arquitectura de datos independiza lógicamente la información de cada negocio mediante identificadores exclusivos de inquilino (Tenant ID), impidiendo el acceso cruzado entre comercios.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          8. Cookies y Tecnologías de Almacenamiento Local (Sin Rastreo Publicitario)
        </h2>
        <p>
          FinoWork <strong>no utiliza cookies de rastreo publicitario ni herramientas de telemetría invasiva</strong>. Empleamos exclusivamente tecnologías de almacenamiento técnico local en el navegador del usuario (tales como <em>localStorage</em>, <em>sessionStorage</em> e <em>IndexedDB</em>) estrictamente necesarias para:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Mantener la sesión autenticada del personal del comercio.</li>
          <li>Preservar los artículos en el carrito de compras del cliente final durante su navegación en la tienda online.</li>
          <li>Permitir que la caja registradora (POS) funcione en modo fuera de línea (offline) y almacene las ventas temporalmente hasta recuperar la conexión a internet.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          9. Plazos de Retención, Exportación y Supresión de Datos
        </h2>
        <p>
          Los datos se conservan mientras el Comercio mantenga activa su suscripción al servicio:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li><strong>Disponibilidad de Exportación de Información Fiscal:</strong> Durante la vigencia de la suscripción, el Comercio dispone de herramientas en la plataforma para exportar en formatos estándar (PDF, Excel, CSV) todos sus Libros de Ventas, facturas emitidas y reportes contables para el cumplimiento de sus deberes formales de archivo y custodia tributaria a largo plazo.</li>
          <li><strong>Período de Gracia tras Vencimiento:</strong> Al suspenderse una cuenta por impago, FinoWork conservará la base de datos por un lapso de cortesía de <strong>45 días calendario</strong> para permitir la reactivación o exportación de la información, tras lo cual podrá ser depurada definitivamente.</li>
          <li><strong>Copias de Seguridad (Backups):</strong> Ante una solicitud formal de supresión de cuenta, los datos activos se borran de inmediato de los servidores de producción, pudiendo permanecer copias residuales en respaldos cifrados por un plazo máximo de 30 días antes de su eliminación física definitiva.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          10. Derechos del Titular y Eliminación de Cuenta (Google Play Compliance)
        </h2>
        <p>
          Cualquier titular de datos puede ejercer en todo momento sus derechos de acceso, rectificación, limitación y supresión de sus datos personales:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Si es un <strong>cliente final o comprador de un comercio</strong>, puede solicitar la supresión de sus datos de entrega dirigiéndose al Comercio respectivo, quien podrá eliminar su ficha desde su panel de clientes, o contactándonos para intermediar la solicitud.</li>
          <li>Si es el <strong>titular de una cuenta comercial</strong>, puede solicitar la eliminación inmediata de su cuenta y todos sus datos asociados desde la sección de Configuración de la app o a través de nuestro portal web público de autoservicio:</li>
        </ul>
        <p style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '14px', marginTop: '12px' }}>
          🔒 <strong>Mecanismo de Eliminación Directa:</strong> Puede gestionar el borrado definitivo en <a href="/delete-account" style={{ color: '#059669', fontWeight: 700, textDecoration: 'underline' }}>Solicitud de Eliminación de Cuenta y Datos</a>.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          11. Contacto y Soporte de Privacidad
        </h2>
        <p style={{ margin: 0 }}>
          Para cualquier consulta, reclamo o ejercicio de derechos sobre privacidad y datos personales, comuníquese con nuestro canal oficial de soporte a través de WhatsApp o mediante el correo oficial de atención de FinoWork.
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
          <IonButtons slot="end">
            <IonButton onClick={() => window.print()} style={{ color: '#0f172a' }} title="Descargar PDF / Imprimir">
              <IonIcon slot="icon-only" icon={printOutline} />
            </IonButton>
          </IonButtons>
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
