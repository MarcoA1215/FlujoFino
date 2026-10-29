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
import { arrowBackOutline, shieldCheckmarkOutline, cashOutline, lockClosedOutline } from 'ionicons/icons';
import { useNavigate } from 'react-router-dom';

export const PromoterTermsContent: React.FC = () => {
  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', color: '#334155', lineHeight: '1.7', fontSize: '14px' }}>
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: '#ecfdf5',
          color: '#065f46',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: 700,
          marginBottom: '10px'
        }}>
          <IonIcon icon={shieldCheckmarkOutline} /> Contrato Mercantil y Privacidad del Promotor Oficial
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
          Términos y Condiciones del Programa de Promotores y Política de Privacidad
        </h1>
        <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
          Última actualización: Octubre 2026 • Plataforma SaaS FinoWork
        </p>
      </div>

      <div style={{ background: '#ffffff', borderRadius: '16px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginTop: 0 }}>
          1. Partes Contratantes y Marco General
        </h2>
        <p>
          Los presentes Términos y Condiciones regulan la adhesión y participación de personas naturales en el <strong>Programa de Promotores Oficiales de FinoWork</strong>.
        </p>
        <p>
          Las partes del presente acuerdo son, por una parte, <strong>Marco David Avila Pinto</strong>, titular de la Cédula de Identidad N° <strong>V-31.075.846</strong>, actuando bajo la denominación comercial <strong>FinoWork</strong> (en adelante "FinoWork" o "la Plataforma"); y por la otra parte, el usuario registrado y verificado con rol de promotor comercial (en adelante "el Promotor" o "el Afiliado").
        </p>
        <p>
          Al aceptar este documento de forma digital, el Promotor declara bajo fe de juramento ser mayor de edad, poseer plena capacidad jurídica civil para contraer obligaciones mercantiles y aceptar sin reservas todas las cláusulas aquí estipuladas.
        </p>

        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          2. Naturaleza Jurídica de la Relación (Ausencia de Vínculo Laboral)
        </h2>
        <p>
          La relación entre FinoWork y el Promotor es estrictamente <strong>civil, mercantil e independiente</strong> bajo la modalidad de intermediación por referidos comerciales.
        </p>
        <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
          <li><strong>No relación laboral:</strong> En ningún momento este acuerdo generará vínculo laboral, subordinación, relación de dependencia, contrato de trabajo ni sociedad mercantil entre las partes.</li>
          <li><strong>Autonomía operativa:</strong> El Promotor ejerce sus actividades comerciales con absoluta autonomía de tiempo, método y lugar, sin estar sujeto a supervisión directa ni horarios fijos por parte de FinoWork.</li>
          <li><strong>Obligaciones tributarias:</strong> Las comisiones recibidas son brutas; cualquier declaración fiscal, pago de tributos o cargas impositivas derivadas de sus ingresos como promotor independiente corresponde única y exclusivamente al Promotor.</li>
        </ul>

        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          3. Esquema Oficial de Comisiones: Activación, Recurrencia y Metas Históricas
        </h2>
        <p>
          FinoWork remunera el esfuerzo de los promotores mediante tres componentes comerciales transparentes y auditables:
        </p>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>
            A. Comisión de Activación (50% del Primer Pago)
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
            Al concluir los 15 días de prueba gratuita, en el momento en que el comercio procesa su primer pago formal para activar la plataforma, el Promotor recibe de inmediato el <strong>50% del monto total abonado</strong>: <strong>$10.00 USD</strong> en cuota mensual estándar ($20 USD) o <strong>$100.00 USD</strong> en plan anual ($200 USD). La empresa y el promotor comparten dicho primer cobro al 50/50.
          </p>
        </div>

        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px', marginBottom: '8px' }}>
          B. Comisiones Recurrentes por Renovación
        </div>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#64748b' }}>
          En cada pago subsiguiente realizado por el comercio para renovar su servicio, el Promotor comisiona según su volumen de clientes activos:
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
          margin: '12px 0 16px 0'
        }}>
          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 800, color: '#b45309', fontSize: '14px' }}>Nivel 1: Bronce (1 a 49 clientes)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>10% por pago</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Equivale a <strong>$2.00 USD</strong> por mensualidad o <strong>$20.00 USD</strong> por anualidad.
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 800, color: '#475569', fontSize: '14px' }}>Nivel 2: Plata (50 a 99 clientes)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>15% por pago</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Equivale a <strong>$3.00 USD</strong> por mensualidad o <strong>$30.00 USD</strong> por anualidad.
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontWeight: 800, color: '#15803d', fontSize: '14px' }}>Nivel 3: Oro (100+ clientes)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', margin: '6px 0' }}>20% por pago</div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Equivale a <strong>$4.00 USD</strong> por mensualidad o <strong>$40.00 USD</strong> por anualidad.
            </div>
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
          <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '14px', marginBottom: '4px' }}>
            C. Bonos por Metas Históricas de Activación (Pagos Únicos Irrepetibles)
          </div>
          <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569' }}>
            FinoWork premia el volumen acumulado histórico de activaciones comerciales formales mediante bonos en dólares que se liquidan una única vez en la vida de la cuenta al alcanzar el hito:
          </p>
          <ul style={{ margin: '0 0 10px 0', paddingLeft: '20px', fontSize: '13px', color: '#334155' }}>
            <li><strong>Meta 1 (5 comercios activados):</strong> Bono directo de <strong>+$10.00 USD</strong>.</li>
            <li><strong>Meta 2 (10 comercios activados):</strong> Bono directo de <strong>+$25.00 USD</strong>.</li>
            <li><strong>Meta 3 (20 comercios activados):</strong> Bono directo de <strong>+$50.00 USD</strong>.</li>
            <li><strong>Meta 4 (50 comercios activados):</strong> Bono directo de <strong>+$100.00 USD</strong>.</li>
          </ul>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
            *Cláusula anti-rebote: Cada bono por meta se devenga y liquida estrictamente una sola vez. Si un comercio referido entra en mora, no renueva o cancela su cuenta disminuyendo el número de clientes activos, la meta histórica previamente alcanzada no se pierde, pero tampoco se vuelve a pagar si el promotor alcanza nuevamente dicha cifra.
          </p>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '14px', margin: '14px 0' }}>
          <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IonIcon icon={cashOutline} /> <strong>Devengo por Evento Real de Pago Aprobado</strong>
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: '#1e3a8a' }}>
            Las comisiones recurrentes se liquidan estrictamente sobre el monto neto efectivamente pagado y aprobado por la plataforma en cada ciclo de cobro. No se generan mensualidades ficticias anticipadas si el comercio optó por un plan anual: la comisión recurrente se devenga en su totalidad al aprobarse cada pago.
          </p>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          4. Atribución Automática y Enlace de Referido
        </h2>
        <p>
          Cada Promotor cuenta con un código alfanumérico exclusivo y un enlace de afiliado único. Para que un comercio sea atribuido a su cuenta:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
          <li>El dueño del comercio debe registrarse utilizando directamente el enlace de afiliado del Promotor o ingresar su código al crear la tienda.</li>
          <li>La vinculación entre el comercio y el promotor es permanente mientras el comercio continúe renovando su suscripción en la plataforma.</li>
          <li>No se admiten solicitudes de atribución manual retroactiva si un comercio se registró de manera independiente sin usar el código ni el enlace.</li>
        </ul>

        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          5. Liquidación y Pago de Comisiones
        </h2>
        <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
          <li><strong>Métodos de liquidación:</strong> Las comisiones devengadas y aprobadas por el SuperAdmin se liquidan mediante <strong>Pago Móvil</strong> en bolívares (a la tasa oficial del BCV vigente al momento de la transferencia) o mediante <strong>Binance Pay</strong> en USDT.</li>
          <li><strong>Datos bancarios correctos:</strong> Es responsabilidad exclusiva del Promotor mantener actualizados y correctos sus datos de cobro (teléfono, cédula, banco receptor o Binance Pay ID) en el panel. FinoWork no se hace responsable por transferencias fallidas derivadas de datos erróneos ingresados por el Promotor.</li>
          <li><strong>Comprobante de desembolso:</strong> Cada pago procesado incluirá su número de referencia bancaria o ID de transacción Binance para plena transparencia contable.</li>
        </ul>

        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          6. Buenas Prácticas y Prohibición de Fraude
        </h2>
        <p>
          El Promotor se compromete a actuar con ética, lealtad y veracidad en la captación de negocios:
        </p>
        <ul style={{ paddingLeft: '20px', margin: '6px 0' }}>
          <li><strong>PROHIBICIÓN ESTRICTA DE RECAUDAR DINERO EN MANO:</strong> El Promotor <strong>TIENE TERMINANTEMENTE PROHIBIDO</strong> cobrar o recibir pagos en efectivo, transferencias personales o depósitos directos de los comercios para el pago de la suscripción SaaS. Todos los pagos deben ser transferidos por el comercio directamente a las cuentas oficiales de FinoWork y reportados en el sistema.</li>
          <li><strong>Prohibición de Spam y Publicidad Engañosa:</strong> No se permite el envío masivo de correos no deseados ni mensajes intrusivos en redes sociales o grupos de mensajería sin consentimiento. Queda prohibido ofrecer descuentos, condiciones o promesas funcionales que no existan formalmente en FinoWork.</li>
          <li><strong>Prohibición de Autofraude:</strong> El Promotor no puede crear comercios ficticios ni auto-referirse cuentas personales con la única finalidad de cobrar comisiones de forma indebida.</li>
        </ul>

        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          7. Política de Privacidad y Protección de Datos del Promotor
        </h2>
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', margin: '12px 0' }}>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <IonIcon icon={lockClosedOutline} /> <strong>Tratamiento de Información Personal</strong>
          </div>
          <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
            FinoWork recopila únicamente los datos personales indispensables del Promotor (nombre, usuario, correo, teléfono y cuentas de cobro de Pago Móvil o Binance Pay).
          </p>
          <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '13px' }}>
            <li><strong>Finalidad exclusiva:</strong> La información se utilizará estrictamente para la gestión de su cuenta de afiliado, contacto operativo y desembolso de comisiones.</li>
            <li><strong>No comercialización:</strong> FinoWork no vende, no alquila ni comparte la información de sus promotores con empresas de mercadeo ni terceras partes ajenas a la relación contractual.</li>
            <li><strong>Seguridad:</strong> Las contraseñas se almacenan mediante algoritmos de cifrado criptográfico unidireccional y las sesiones están protegidas con tokens JWT de alta seguridad.</li>
          </ul>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          8. Modificaciones, Suspensión y Rescisión del Acuerdo
        </h2>
        <p>
          FinoWork se reserva la facultad de suspender o revocar de manera inmediata la cuenta del Promotor en caso de violación comprobada a las normas éticas, intento de fraude o apropiación indebida de fondos.
        </p>
        <p>
          Cualquier ajuste en la tabla de porcentajes o políticas comerciales será notificado con al menos quince (15) días de anticipación a través del panel del Promotor o por correo electrónico.
        </p>

        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
          9. Legislación Aplicable y Jurisdicción
        </h2>
        <p>
          Este acuerdo se rige e interpretará bajo las leyes de la República Bolivariana de Venezuela. Ante cualquier controversia no resuelta de mutuo acuerdo, las partes se someten expresamente a la jurisdicción de los tribunales de la ciudad de Barinas, Estado Barinas.
        </p>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>
          © 2026 Marco David Avila Pinto (C.I. V-31.075.846) • FinoWork • Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
};

export const PromoterTermsAndConditions: React.FC = () => {
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
          <IonTitle style={{ color: '#0f172a', fontWeight: 800, fontSize: '16px' }}>
            Términos y Política de Promotores
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding" style={{ '--background': '#f8fafc' } as any}>
        <div style={{ padding: '16px 12px 60px 12px' }}>
          <PromoterTermsContent />
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PromoterTermsAndConditions;
