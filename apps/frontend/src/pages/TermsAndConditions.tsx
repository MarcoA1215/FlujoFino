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
        <p>
          FinoWork ofrece 15 días de prueba gratuita para garantizar que el sistema se adapta a las necesidades del Comercio. Por consiguiente, una vez procesado el pago de la suscripción mensual o anual, no se emitirán reembolsos parciales ni totales por cancelación anticipada o falta de uso del sistema.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          4. Propiedad Intelectual, Código Fuente y Prohibición de Ingeniería Inversa
        </h2>
        <p>
          Todos los derechos de propiedad intelectual, marcas, logotipos, nombres comerciales (incluyendo la marca <strong>FinoWork</strong>), diseños de interfaz, arquitectura de software, bases de datos, código fuente, código objeto y el instalador APK (<strong>FinoWork.apk</strong>) son y seguirán siendo de la titularidad exclusiva y legítima de los creadores y desarrolladores de FinoWork.
        </p>
        <p>
          El pago de la suscripción mensual otorga únicamente una licencia temporal de uso bajo la modalidad SaaS. En ningún momento constituye una venta, cesión ni transferencia de derechos de autor ni de propiedad sobre el software. Queda expresamente prohibido al Usuario y a cualquier tercero:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Descompilar, desensamblar, desofuscar, realizar ingeniería inversa o intentar obtener el código fuente del software o del APK por cualquier medio.</li>
          <li>Copiar, clonar, reproducir, sublicenciar, revender, arrendar o comercializar la plataforma o cualquiera de sus módulos a terceros.</li>
          <li>Modificar, crear obras derivadas o suprimir avisos de derechos de autor, marcas registradas o leyendas de propiedad insertas en el sistema.</li>
        </ul>
        <p>
          Cualquier sugerencia, idea, propuesta de funcionalidad o retroalimentación (feedback) que el Usuario proporcione para la mejora del sistema se considerará no confidencial y pasará a ser de propiedad exclusiva de FinoWork, sin que ello genere derecho a compensación económica, regalías o reclamo de co-autoría sobre las características implementadas.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          5. Propiedad y Confidencialidad de los Datos del Negocio
        </h2>
        <p>
          <strong>El Negocio es el único y exclusivo propietario de sus datos:</strong> catálogo de productos, recetas, precios, datos de clientes, historiales de ventas y reportes contables.
        </p>
        <p>
          FinoWork no comercializa, no transfiere y no utiliza la información interna de su negocio para fines publicitarios de terceros ni para beneficio propio ajeno a la prestación del servicio técnico.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          6. Uso Lícito y Prohibición de Actividades Ilícitas
        </h2>
        <p>
          El Usuario se compromete de manera irrevocable a utilizar la Plataforma exclusivamente para fines comerciales lícitos y legítimos. Queda terminantemente prohibido utilizar FinoWork para:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Registrar, inventariar, vender o distribuir sustancias controladas, estupefacientes, armas, artículos robados o mercancías de contrabando.</li>
          <li>Facilitar, registrar o encubrir operaciones de legitimación de capitales (lavado de dinero), financiamiento al terrorismo o fraude financiero.</li>
          <li>Llevar contabilidad ilícita o incurrir en prácticas destinadas a estafar a consumidores o evadir a las autoridades.</li>
        </ul>
        <p>
          FinoWork se reserva el derecho de suspender o rescindir inmediatamente el acceso y cancelar la cuenta de cualquier comercio ante indicios fundamentados de infracción legal, sin derecho a indemnización ni reembolso, y cooperará con las autoridades competentes si existiere orden judicial o requerimiento legal fundado.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          7. Responsabilidad Operativa, Comercial y Fiscal (Escudo Fiscal y Tasas de Cambio)
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
        <p>
          FinoWork provee herramientas de cálculo y sincronización de tasas de cambio (ej. BCV, Paralelo) de manera estrictamente referencial. El Comercio es única y exclusivamente responsable de verificar, aprobar y aplicar la tasa de cambio final en sus cobros, asumiendo toda responsabilidad legal, penal o administrativa ante las autoridades competentes (ej. SUNDDE) por la fijación de precios.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          8. Seguridad de Cuentas y Abuso Técnico de la Plataforma
        </h2>
        <p>
          El titular del Comercio es enteramente responsable de mantener la confidencialidad de las cuentas y credenciales de acceso creadas para sus cajeros, cocineros, repartidores y administradores. Cualquier operación efectuada con sus credenciales se presumirá realizada por personal autorizado del Comercio.
        </p>
        <p>
          Queda expresamente prohibido ejecutar pruebas de penetración no autorizadas, ataques de denegación de servicio (DDoS), inyecciones de código, extracción automatizada masiva (scraping) o cualquier acción técnica que sobrecargue o vulnere los servidores o redes de FinoWork.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          9. Disponibilidad del Servicio y Modo Offline (SLA As-Is)
        </h2>
        <p>
          FinoWork se esfuerza por mantener la máxima disponibilidad, pero el servicio se proporciona "tal cual" (As-Is). No garantizamos un tiempo de actividad ininterrumpido y no somos responsables por lucro cesante, pérdida de ventas o daños derivados por caídas del servidor o fallas de red.
        </p>
        <p>
          La Plataforma incorpora tecnología de almacenamiento local (IndexedDB) para permitir que la caja registradora continúe cobrando ventas ante interrupciones de internet. No obstante, FinoWork no se hace responsable por fallas derivadas de cortes de energía locales, daños en hardware de terceros o caídas masivas de proveedores de telecomunicaciones.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          10. Suspensión, Cancelación y Retención de Datos tras Impago
        </h2>
        <p>
          Al vencer el período de prueba gratuita o la mensualidad activa, la cuenta pasará al estado de suspensión operativa preventiva hasta la regularización del pago.
        </p>
        <p>
          <strong>Política de Retención y Cortesía:</strong> FinoWork conservará la base de datos histórica del comercio por un lapso de <strong>45 días calendario</strong> posteriores a la fecha de vencimiento. Durante dicho plazo, el Comercio podrá reactivar su acceso cancelando la mensualidad o solicitar formalmente una exportación de sus datos. Transcurrido el plazo de 45 días sin reactivación ni solicitud, FinoWork se reserva la facultad de depurar o eliminar de forma definitiva los datos del sistema para optimizar los recursos del servidor, sin responsabilidad de custodia indefinida.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          11. Límite de Responsabilidad Financiera
        </h2>
        <p>
          En la máxima medida permitida por la ley aplicable, la responsabilidad económica total y acumulada de FinoWork frente al Usuario por cualquier daño, perjuicio, reclamo o acción contractual o extracontractual estará estrictamente limitada a la suma total efectivamente pagada por el Usuario a FinoWork en el último mes de suscripción inmediatamente anterior al hecho que dio origen al reclamo.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          12. Programa de Promotores de Calle
        </h2>
        <p>
          El programa de Promotores de FinoWork constituye una relación estrictamente comercial y mercantil basada en referidos. Bajo ninguna circunstancia crea una relación laboral, de dependencia, subordinación o sociedad entre el Promotor y FinoWork. FinoWork no retiene impuestos sobre comisiones, siendo la declaración y pago de estos responsabilidad exclusiva del Promotor.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          13. Legislación Aplicable y Resolución de Controversias
        </h2>
        <p>
          Los presentes Términos se rigen e interpretan conforme a las leyes de la República Bolivariana de Venezuela. Cualquier controversia, desacuerdo o reclamación derivada de la prestación del servicio se procurará resolver en primera instancia mediante negociación amistosa y de buena fe entre las partes. En caso de no alcanzarse un acuerdo, las partes se someten a la jurisdicción de los tribunales competentes de la sede de operaciones de FinoWork.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          14. Modificaciones a los Términos
        </h2>
        <p>
          FinoWork se reserva el derecho de actualizar los presentes Términos periódicamente para reflejar mejoras operativas o exigencias legales. Cualquier cambio sustancial será notificado oportunamente a través de la interfaz del sistema o por correo electrónico.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          15. Contacto y Soporte
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
