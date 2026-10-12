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
          1. Aceptación de los Términos y Partes Contratantes
        </h2>
        <p>
          Los presentes Términos y Condiciones regulan la relación contractual entre <strong>Marco David Avila Pinto</strong>, titular de la Cédula de Identidad N° <strong>V-31.075.846</strong>, actuando bajo la denominación comercial <strong>FinoWork</strong> (en adelante "el Prestador", "el Desarrollador" o "FinoWork"), y cualquier persona natural o jurídica que cree una cuenta, registre un negocio o utilice la plataforma web, aplicación móvil Android y servicios asociados (en adelante "el Usuario" o "el Negocio").
        </p>
        <p>
          Al registrarse o acceder al Servicio, el Usuario declara ser mayor de edad, tener plena capacidad jurídica y legal para vincularse y representar a su comercio, y acepta expresamente quedar obligado por los presentes Términos y por nuestra Política de Privacidad.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          2. Descripción del Servicio y Licencia SaaS
        </h2>
        <p>
          FinoWork es un software de gestión comercial bajo modalidad Software como Servicio (SaaS) que provee herramientas para:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Punto de venta y caja registradora (POS) con capacidades en línea y fuera de línea (offline).</li>
          <li>Catálogo digital y Tienda Online pública autogestionada para recepción de pedidos web de clientes finales (Delivery y Retiro en tienda).</li>
          <li>Control de inventario de productos terminados, insumos y materias primas.</li>
          <li>Despiece automático por recetas y órdenes de producción.</li>
          <li>Agenda de citas y reservas con enlace público autogestionado.</li>
          <li>Gestión de despacho, zonas de entrega, tarifas de flete y asignación de repartidores para delivery.</li>
          <li>Cálculo de equivalencia multimoneda y reportes financieros operativos.</li>
          <li>Gestión de clientes, historial de consumo y seguimiento de cuentas pendientes.</li>
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
        <p>
          FinoWork se reserva el derecho de modificar las tarifas de suscripción (actualmente $20 USD). Cualquier cambio en las tarifas será notificado al Usuario con al menos treinta (30) días de anticipación y aplicará a partir de su siguiente ciclo de facturación.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          4. Propiedad Intelectual, Código Fuente y Titularidad Exclusiva
        </h2>
        <p>
          Todos los derechos morales y patrimoniales de autor, propiedad intelectual, marcas, logotipos, nombres comerciales (incluyendo la marca comercial <strong>FinoWork</strong>), diseños de interfaz de usuario, esquemas de bases de datos, algoritmos, arquitectura de software, código fuente, código objeto y el instalador de la aplicación móvil (<strong>FinoWork.apk</strong>) son y seguirán siendo de la autoría y titularidad exclusiva y legítima de <strong>Marco David Avila Pinto (C.I. V-31.075.846)</strong>.
        </p>
        <p>
          Bajo ninguna circunstancia la contratación del servicio, el pago de cuotas de suscripción mensual ni el acceso temporal a la plataforma constituirá una venta, cesión, enajenación ni renuncia de derechos de autor ni de propiedad intelectual sobre el software. Ningún tercero, colaborador o cliente podrá arrogarse derechos de autoría, co-autoría, sociedad o explotación no autorizada sobre FinoWork.
        </p>
        <p>
          Queda terminantemente prohibido al Usuario y a cualquier tercero:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Descompilar, desensamblar, desofuscar, realizar ingeniería inversa o intentar extraer el código fuente del software web o del paquete instalador APK por cualquier medio tecnológico.</li>
          <li>Copiar, clonar, reproducir, sublicenciar, revender, arrendar o explotar comercialmente la plataforma o cualquiera de sus módulos a terceros sin autorización escrita expresa del titular.</li>
          <li>Modificar, crear obras derivadas o suprimir menciones de derechos de autor, marcas registradas o avisos legales de titularidad insertos en el sistema.</li>
        </ul>
        <p>
          Cualquier sugerencia, idea, propuesta de funcionalidad o retroalimentación (feedback) que el Usuario proporcione para la mejora del sistema se considerará no confidencial y pasará a ser de propiedad exclusiva de Marco David Avila Pinto / FinoWork, sin que ello genere derecho a compensación económica, regalías o reclamo de co-autoría sobre las características implementadas.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          5. Propiedad y Responsabilidad del Contenido Multimedia e Imágenes Subidas
        </h2>
        <p>
          <strong>El Negocio es el único y exclusivo propietario de sus datos y contenidos:</strong> catálogo de productos, recetas, precios, datos de clientes, historiales de ventas, logotipos e imágenes ilustrativas.
        </p>
        <p>
          El Comercio declara y garantiza que posee los derechos, licencias y autorizaciones necesarias sobre cualquier fotografía, imagen de marca, logotipo o descripción que cargue a su tienda online o catálogo digital. El Usuario mantendrá indemne a FinoWork frente a cualquier reclamación de terceros por infracción de derechos de autor, marcas registradas o propiedad intelectual derivada de los contenidos que haya publicado en la Plataforma.
        </p>
        <p>
          FinoWork no comercializa, no transfiere y no utiliza la información interna ni las imágenes de su negocio para fines publicitarios de terceros ajenos a la prestación técnica del servicio.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          6. Módulo de Catálogo Digital, Tienda Online Pública y Pedidos Web
        </h2>
        <p>
          FinoWork pone a disposición del Comercio un módulo que permite generar una tienda online y catálogo público accesible mediante enlace web directo para que sus clientes finales puedan consultar productos y emitir pedidos:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li><strong>Intermediación Tecnológica Exclusiva:</strong> FinoWork actúa única y exclusivamente como proveedor de la plataforma de software. FinoWork <strong>NO</strong> es parte compradora ni vendedora en las transacciones comerciales pactadas entre el Comercio y sus clientes finales, no adquiere posesión de los artículos ofertados ni responde por el cumplimiento del contrato de compraventa entre las partes.</li>
          <li><strong>No Custodia ni Procesamiento de Fondos:</strong> FinoWork <strong>no recauda, no retiene, no intermedia ni custodia dinero</strong> de los clientes finales. Los pagos (vía Pago Móvil, transferencia bancaria, efectivo, divisas u otros métodos) se coordinan y liquidan directamente entre el cliente final y las cuentas bancarias o canales pertenecientes al Comercio.</li>
          <li><strong>Verificación Obligatoria de Pagos por el Comercio:</strong> Cualquier comprobante, referencia o captura de pago adjuntada por un cliente final a través de la tienda web tiene carácter estrictamente informativo. Es responsabilidad exclusiva e indelegable del Comercio validar en su propia plataforma bancaria la efectiva acreditación de los fondos antes de preparar, despachar o entregar los productos. FinoWork no se responsabiliza por estafas, referencias bancarias falsas o pagos no confirmados.</li>
          <li><strong>Exactitud de Precios, Descripciones y Disponibilidad:</strong> El Comercio es enteramente responsable de mantener actualizados los precios, imágenes, especificaciones de alérgenos, ingredientes y la disponibilidad de inventario (productos inmediatos, bajo encargo o fabricados al momento). Cualquier discrepancia o inconformidad por parte del consumidor final deberá ser gestionada y subsanada directamente por el Comercio.</li>
          <li><strong>Devoluciones, Reclamaciones y Garantías:</strong> La política de cambios, devoluciones, garantías o cancelaciones es fijada de manera autónoma por el Comercio. FinoWork no interviene en disputas de consumo ni asume obligaciones de reembolso frente a compradores finales.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          7. Módulo de Reservas y Citas Online Autogestionadas
        </h2>
        <p>
          La herramienta de reservas públicas permite a los clientes finales del Comercio seleccionar fechas y turnos de atención para servicios presenciales:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>El Comercio es el único responsable de configurar de manera fidedigna los horarios de atención, tiempos por servicio, capacidad de aforo y disponibilidad de su personal.</li>
          <li>FinoWork no asume responsabilidad alguna por la inasistencia de clientes que hayan reservado un turno (no-show), ni por retrasos, cancelaciones o reprogramaciones efectuadas por el establecimiento comercial.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          8. Servicios de Delivery, Zonas de Entrega y Envíos
        </h2>
        <p>
          FinoWork provee funcionalidades para la delimitación de zonas geográficas de entrega, cálculo de tarifas de flete y seguimiento de pedidos en camino. No obstante:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>FinoWork <strong>no es una empresa de transporte ni agencia de encomiendas</strong>. El transporte, custodia física de las mercancías, puntualidad en la entrega y seguridad de los repartidores (ya sean propios del negocio o contratistas independientes) corresponden en su totalidad al Comercio.</li>
          <li>FinoWork no responderá por pérdidas, deterioro, accidentes de tránsito, hurtos o daños sufridos por los productos durante el traslado o proceso de delivery.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          9. Servicios de Terceros, WhatsApp y Notificaciones Push
        </h2>
        <p>
          La Plataforma incluye funcionalidades para compartir detalles de pedidos o comprobantes a través de enlaces directos a la aplicación <strong>WhatsApp</strong> (propiedad de Meta Platforms, Inc.) y alertas de navegador mediante <strong>Web Push Notifications</strong>:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>FinoWork no tiene vinculación societaria con Meta Platforms ni garantiza la disponibilidad ininterrumpida de sus servicios. FinoWork no se hace responsable por bloqueos de líneas telefónicas, cambios en las políticas de mensajería de WhatsApp o suspensiones impuestas por Meta al Comercio.</li>
          <li>La recepción efectiva de notificaciones push en dispositivos de clientes o empleados depende de la configuración de permisos del navegador, el estado de conectividad y las políticas de ahorro de batería del fabricante del hardware.</li>
        </ul>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          10. Gestión de Clientes, Cuentas Pendientes y Créditos Comerciales
        </h2>
        <p>
          El registro de cuentas por cobrar, pagos fraccionados o créditos otorgados a clientes a través del sistema constituye una facilidad de control administrativo interno. FinoWork no actúa como entidad financiera ni como agencia de cobranzas, no evalúa la capacidad crediticia de terceros y no asume responsabilidad alguna por la morosidad o impago de deudas contraídas por los clientes de su negocio.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          11. Uso Lícito y Prohibición de Actividades Ilícitas
        </h2>
        <p>
          El Usuario se compromete de manera irrevocable a utilizar la Plataforma exclusivamente para fines comerciales lícitos y legítimos. Queda terminantemente prohibido utilizar FinoWork para:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li>Registrar, inventariar, vender o distribuir sustancias controladas, estupefacientes, armas, artículos robados o mercancías de contrabando.</li>
          <li>Facilitar, registrar o encubrir operaciones de legitimación de capitales (lavado de dinero), financiamiento al terrorismo o fraude financiero.</li>
          <li>Publicar en la tienda pública material pornográfico, engañoso, difamatorio o que atente contra el orden público.</li>
          <li>Llevar contabilidad ilícita o incurrir en prácticas destinadas a estafar a consumidores o evadir a las autoridades.</li>
        </ul>
        <p>
          FinoWork se reserva el derecho de suspender o rescindir inmediatamente el acceso y cancelar la cuenta de cualquier comercio ante indicios fundamentados de infracción legal, sin derecho a indemnización ni reembolso, y cooperará con las autoridades competentes si existiere orden judicial o requerimiento legal fundado.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          12. Responsabilidad Operativa, Comercial y Comprobantes Fiscales
        </h2>
        <p>
          El Usuario reconoce y acepta que FinoWork es una herramienta tecnológica de asistencia operativa y administrativa. El Negocio es el único y exclusivo responsable de:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
          <li><strong>Carácter No Fiscal de los Comprobantes:</strong> Salvo integración expresa y certificada con hardware o impresoras fiscales homologadas, los tickets, recibos y comandas emitidos por FinoWork son comprobantes de control interno y <strong>no sustituyen las facturas fiscales, máquinas fiscales ni los requisitos formales exigidos por la administración tributaria (ej. SENIAT en Venezuela)</strong>. El Comercio asume la obligación de emitir sus facturas fiscales correspondientes.</li>
          <li>Cumplir con las normativas tributarias, fiscales, mercantiles y de facturación fiscal vigentes en su respectivo país o jurisdicción.</li>
          <li>La exactitud de los precios, cobros y vuelto entregados a sus clientes finales.</li>
          <li>La calidad, idoneidad, higiene y salubridad de los productos o alimentos manufacturados y despachados.</li>
          <li>El resguardo de sus credenciales de acceso (usuario y contraseña) asignadas a su personal y colaboradores.</li>
        </ul>
        <p>
          FinoWork provee herramientas de cálculo y sincronización de tasas de cambio (ej. BCV, Paralelo) de manera estrictamente referencial. El Comercio es única y exclusivamente responsable de verificar, aprobar y aplicar la tasa de cambio final en sus cobros, asumiendo toda responsabilidad legal, penal o administrativa ante las autoridades competentes (ej. SUNDDE) por la fijación de precios.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          13. Control de Empleados, Roles de Usuario y Prevención de Fraude Interno
        </h2>
        <p>
          La Plataforma permite la creación de subcuentas con roles diferenciados (Cajero/POS, Cocina, Reparto, Inventario, Administrador). El titular del Comercio es enteramente responsable de asignar los permisos adecuados y custodiar la confidencialidad de los accesos de sus dependientes.
        </p>
        <p>
          FinoWork no se hace responsable por descuadres de caja, mermas indebidas, hurtos, manipulaciones no autorizadas ni pérdidas financieras originadas por acciones u omisiones del personal del Comercio.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          14. Seguridad Técnica y Prohibición de Abuso de la Plataforma
        </h2>
        <p>
          Queda expresamente prohibido ejecutar pruebas de penetración no autorizadas, ataques de denegación de servicio (DDoS), inyecciones de código, extracción automatizada masiva (scraping) o cualquier acción técnica que sobrecargue o vulnere los servidores o redes de FinoWork. El incumplimiento de esta cláusula será causal de rescisión inmediata del contrato y cierre definitivo de la cuenta sin derecho a reembolso, reservándose FinoWork el derecho a ejercer las acciones legales correspondientes.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          15. Disponibilidad del Servicio y Modo Offline (SLA As-Is)
        </h2>
        <p>
          FinoWork se esfuerza por mantener la máxima disponibilidad, pero el servicio se proporciona "tal cual" (As-Is). No garantizamos un tiempo de actividad ininterrumpido y no somos responsables por lucro cesante, pérdida de ventas o daños derivados por caídas del servidor o fallas de red.
        </p>
        <p>
          La Plataforma incorpora tecnología de almacenamiento local (IndexedDB) para permitir que la caja registradora continúe cobrando ventas ante interrupciones de internet. No obstante, FinoWork no se hace responsable por fallas derivadas de cortes de energía locales, daños en hardware de terceros o caídas masivas de proveedores de telecomunicaciones.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          16. Suspensión, Cancelación y Retención de Datos tras Impago
        </h2>
        <p>
          Al vencer el período de prueba gratuita o la mensualidad activa, la cuenta pasará al estado de suspensión operativa preventiva hasta la regularización del pago.
        </p>
        <p>
          <strong>Política de Retención y Cortesía:</strong> FinoWork conservará la base de datos histórica del comercio por un lapso de <strong>45 días calendario</strong> posteriores a la fecha de vencimiento. Durante dicho plazo, el Comercio podrá reactivar su acceso cancelando la mensualidad o solicitar formalmente una exportación de sus datos. Transcurrido el plazo de 45 días sin reactivación ni solicitud, FinoWork se reserva la facultad de depurar o eliminar de forma definitiva los datos del sistema para optimizar los recursos del servidor, sin responsabilidad de custodia indefinida.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          17. Límite de Responsabilidad Financiera
        </h2>
        <p>
          En la máxima medida permitida por la ley aplicable, la responsabilidad económica total y acumulada de FinoWork frente al Usuario por cualquier daño, perjuicio, reclamo o acción contractual o extracontractual estará estrictamente limitada a la suma total efectivamente pagada por el Usuario a FinoWork en el último mes de suscripción inmediatamente anterior al hecho que dio origen al reclamo.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          18. Programa de Promotores de Calle
        </h2>
        <p>
          El programa de Promotores de FinoWork constituye una relación estrictamente comercial y mercantil basada en referidos. Bajo ninguna circunstancia crea una relación laboral, de dependencia, subordinación o sociedad entre el Promotor y FinoWork. FinoWork no retiene impuestos sobre comisiones, siendo la declaración y pago de estos responsabilidad exclusiva del Promotor.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          19. Legislación Aplicable y Resolución de Controversias
        </h2>
        <p>
          Los presentes Términos se rigen e interpretan conforme a las leyes de la República Bolivariana de Venezuela. Cualquier controversia, desacuerdo o reclamación derivada de la prestación del servicio se procurará resolver en primera instancia mediante negociación amistosa y de buena fe entre las partes. En caso de no alcanzarse un acuerdo, las partes se someten a la jurisdicción de los tribunales competentes de la ciudad de Barinas, Estado Barinas, Venezuela.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          20. Modificaciones a los Términos
        </h2>
        <p>
          FinoWork se reserva el derecho de actualizar los presentes Términos periódicamente para reflejar mejoras operativas o exigencias legales. Cualquier cambio sustancial en los términos o en las tarifas de suscripción será notificado oportunamente a través de la interfaz del sistema o por correo electrónico con al menos treinta (30) días de anticipación.
        </p>

        <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
          21. Contacto y Soporte
        </h2>
        <p style={{ margin: 0 }}>
          Para cualquier duda, aclaratoria o soporte relacionado con estos Términos, comuníquese con el canal oficial de atención a través de nuestro soporte por WhatsApp o al correo de soporte de la plataforma.
        </p>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          © 2026 Marco David Avila Pinto (C.I. V-31.075.846) • Todos los derechos reservados • Plataforma FinoWork
        </div>
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
