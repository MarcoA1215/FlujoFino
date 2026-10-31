export interface PrintLegalOptions {
  title: string;
  version?: string;
  lastUpdated?: string;
  referenceCode?: string;
  precedenceUrl?: string;
  contentHtml: string;
}

export function printLegalDocument(options: PrintLegalOptions): void {
  const {
    title,
    version = '2.0',
    lastUpdated = 'Noviembre 2026',
    referenceCode = 'FW-LEGAL-V2.0-SENIAT-SECURE',
    precedenceUrl = '/terms',
    contentHtml,
  } = options;

  const now = new Date();
  const emissionTimestamp =
    now.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }) +
    ' ' +
    now.toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  // Limpiar posibles elementos de interfaz interactivos y duplicados
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = contentHtml;
  tempDiv
    .querySelectorAll('.ff-no-print, .ff-print-header, ion-button, ion-icon, button')
    .forEach((el) => el.remove());
  const cleanBodyHtml = tempDiv.innerHTML;

  // Crear un iframe invisible para aislar la impresión de los Web Components y Shadow DOM de Ionic
  const iframe = document.createElement('iframe');
  iframe.setAttribute(
    'style',
    'position: fixed; right: 0; bottom: 0; width: 1024px; height: 1024px; border: 0; opacity: 0; pointer-events: none; z-index: -9999;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  const printDocumentHtml = `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${title} • FinoWork SaaS</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 20mm 16mm 20mm 16mm;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      html, body {
        background: #ffffff !important;
        color: #1e293b !important;
        margin: 0;
        padding: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.6;
        font-size: 13px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      h1 {
        font-size: 18px;
        font-weight: 900;
        color: #0f172a;
        margin: 14px 0 8px 0;
        text-align: center;
        letter-spacing: -0.3px;
      }
      h2 {
        font-size: 14px;
        font-weight: 800;
        color: #0f172a;
        margin: 18px 0 6px 0;
        padding-bottom: 4px;
        border-bottom: 1px solid #e2e8f0;
        page-break-after: avoid;
        break-after: avoid;
      }
      h3, h4 {
        font-size: 13px;
        font-weight: 700;
        color: #0f172a;
        margin: 12px 0 4px 0;
        page-break-after: avoid;
        break-after: avoid;
      }
      p {
        margin: 6px 0;
        color: #334155;
        orphans: 3;
        widows: 3;
      }
      ul, ol {
        margin: 6px 0 10px 0;
        padding-left: 22px;
        color: #334155;
      }
      li {
        margin-bottom: 4px;
        orphans: 3;
        widows: 3;
      }
      strong {
        color: #0f172a;
      }
      .ff-no-print, .ff-print-header, ion-button, ion-icon, button {
        display: none !important;
      }
      .ff-card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
      }
      .letterhead-container {
        border-bottom: 2px solid #0f172a;
        padding-bottom: 12px;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .letterhead-brand {
        font-size: 20px;
        font-weight: 900;
        color: #0f172a;
        letter-spacing: -0.5px;
      }
      .letterhead-sub {
        font-size: 11px;
        font-weight: 700;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
      .letterhead-meta {
        text-align: right;
        font-size: 10.5px;
        color: #475569;
        line-height: 1.45;
      }
      .precedence-notice-box {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 10px 14px;
        margin: 12px 0 18px 0;
        font-size: 10.5px;
        line-height: 1.45;
        color: #334155;
      }
      .precedence-notice-box strong {
        color: #0f172a;
      }
      .document-footer {
        border-top: 1px solid #cbd5e1;
        margin-top: 24px;
        padding-top: 10px;
        text-align: center;
        font-size: 11px;
        color: #64748b;
        page-break-inside: avoid;
        break-inside: avoid;
      }
    </style>
  </head>
  <body>
    <div class="letterhead-container">
      <div>
        <div class="letterhead-brand">FINOWORK SAAS</div>
        <div class="letterhead-sub">Sistema de Gestión Comercial y Facturación Fiscal</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Marco David Avila Pinto • C.I. V-31.075.846
        </div>
      </div>
      <div class="letterhead-meta">
        <div><strong>Versión Documento:</strong> ${version}</div>
        <div><strong>Revisión:</strong> ${lastUpdated}</div>
        <div><strong>Fecha de Emisión:</strong> ${emissionTimestamp}</div>
        <div><strong>Código de Control:</strong> ${referenceCode}</div>
      </div>
    </div>

    <h1>${title}</h1>

    <div class="precedence-notice-box">
      <strong>AVISO DE VALIDEZ Y PREVALENCIA LEGAL:</strong> El presente documento descargado en formato PDF o impreso certifica las condiciones contractuales y políticas vigentes al momento de su expedición (${emissionTimestamp}). De conformidad con lo estipulado en este acuerdo, FinoWork se reserva el derecho de actualizar sus términos para reflejar mejoras operativas o adecuar su funcionamiento a la normativa legal y tributaria aplicable (incluyendo regulaciones del SENIAT). La versión más reciente y jurídicamente vinculante estará siempre publicada y accesible en tiempo real en <strong>https://finowork.com${precedenceUrl}</strong>, la cual prevalecerá legalmente ante cualquier divergencia con copias impresas o archivos digitales descargados con anterioridad.
    </div>

    <div class="document-body">
      ${cleanBodyHtml}
    </div>

    <div class="document-footer">
      © 2026 Marco David Avila Pinto (C.I. V-31.075.846) • FinoWork SaaS • finowork.com • Documento con validez legal referencial • Código: ${referenceCode}
    </div>
  </body>
</html>`;

  doc.open();
  doc.write(printDocumentHtml);
  doc.close();

  // Esperar a que el navegador procese el renderizado del iframe y lanzar print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Error invocando impresión por iframe:', err);
      window.print();
    } finally {
      setTimeout(() => {
        try {
          if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
          }
        } catch (e) {}
      }, 5000);
    }
  }, 250);
}

export function printLegalContainer(
  containerIdOrElement: string | HTMLElement,
  options: Omit<PrintLegalOptions, 'contentHtml'>
): void {
  let element: HTMLElement | null = null;
  if (typeof containerIdOrElement === 'string') {
    element = document.getElementById(containerIdOrElement);
  } else {
    element = containerIdOrElement;
  }

  if (!element) {
    element =
      document.querySelector('.ff-legal-document') ||
      document.querySelector('.ff-legal-container') ||
      document.querySelector('.ff-card');
  }

  if (!element) {
    console.warn('Contenedor legal no encontrado para imprimir:', containerIdOrElement);
    window.print();
    return;
  }

  printLegalDocument({
    ...options,
    contentHtml: element.innerHTML,
  });
}
