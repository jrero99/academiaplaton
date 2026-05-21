// Genera el PDF del recibo abriendo una ventana del navegador con la factura
// maquetada en HTML/CSS usando la tipografía Montserrat y los colores de marca.
// El usuario pulsa "Imprimir / Guardar como PDF" en el diálogo nativo del navegador.
//
// Por qué no librería externa: respeta la regla de CLAUDE.md de no añadir deps
// salvo justificación. El print-to-PDF nativo produce un PDF vectorial con la
// tipografía real, indexable y con calidad de impresión.

import platoLogo from '@/assets/logo/plato-logo.svg';
import montserratRegular from '@/assets/fonts/montserrat/Montserrat-Regular.ttf?url';
import montserratMedium from '@/assets/fonts/montserrat/Montserrat-Medium.ttf?url';
import montserratSemiBold from '@/assets/fonts/montserrat/Montserrat-SemiBold.ttf?url';
import montserratBold from '@/assets/fonts/montserrat/Montserrat-Bold.ttf?url';
import type { InvoiceDto, StudentDto } from '@academiaplaton/shared';

const BURGUNDY = '#691a37';
const CREAM = '#f4cea1';

const eurFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
});

const dateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const longDateFmt = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

const STATUS_LABEL: Record<InvoiceDto['status'], string> = {
  pending: 'Pendiente',
  sent: 'Enviado',
  paid: 'Pagado',
  overdue: 'Vencido',
  cancelled: 'Anulado',
};

interface OpenInvoicePdfParams {
  invoice: InvoiceDto;
  student: StudentDto;
  organizationName?: string;
  centerName?: string;
}

function escape(s: string | number | undefined | null): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildHtml({ invoice, student, organizationName, centerName }: OpenInvoicePdfParams): string {
  const origin = window.location.origin;
  const logoUrl = new URL(platoLogo, origin).toString();
  const fontRegular = new URL(montserratRegular, origin).toString();
  const fontMedium = new URL(montserratMedium, origin).toString();
  const fontSemiBold = new URL(montserratSemiBold, origin).toString();
  const fontBold = new URL(montserratBold, origin).toString();

  const orgName = organizationName ?? 'Plató Centre d’estudis';
  const studentFullName = `${student.firstName} ${student.lastName}`.trim();
  const issuedAtText = invoice.issuedAt
    ? dateFmt.format(new Date(invoice.issuedAt))
    : '—';
  const dueDateText = dateFmt.format(new Date(invoice.dueDate));
  const issueDateLong = longDateFmt.format(
    invoice.issuedAt ? new Date(invoice.issuedAt) : new Date(),
  );

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Recibo ${escape(invoice.number)} — ${escape(orgName)}</title>
<style>
  @font-face {
    font-family: 'Montserrat';
    src: url('${fontRegular}') format('truetype');
    font-weight: 400; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: 'Montserrat';
    src: url('${fontMedium}') format('truetype');
    font-weight: 500; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: 'Montserrat';
    src: url('${fontSemiBold}') format('truetype');
    font-weight: 600; font-style: normal; font-display: swap;
  }
  @font-face {
    font-family: 'Montserrat';
    src: url('${fontBold}') format('truetype');
    font-weight: 700; font-style: normal; font-display: swap;
  }

  :root {
    --burgundy: ${BURGUNDY};
    --cream: ${CREAM};
    --ink: #1a1a1a;
    --muted: #6b6b6b;
    --border: #e6e6e6;
  }

  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: #f4f4f5;
    color: var(--ink);
    font-family: 'Montserrat', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; justify-content: flex-end; gap: 8px;
    background: #fff; border-bottom: 1px solid var(--border);
    padding: 12px 24px;
  }
  .btn {
    font-family: inherit; font-weight: 600; font-size: 13px;
    border-radius: 6px; padding: 8px 14px; cursor: pointer;
    border: 1px solid var(--burgundy);
    background: var(--burgundy); color: #fff;
  }
  .btn.secondary {
    background: #fff; color: var(--burgundy);
  }
  @media print {
    .toolbar { display: none; }
    body { background: #fff; }
    .sheet { box-shadow: none; margin: 0; }
  }

  .sheet {
    width: 794px;            /* A4 a 96dpi */
    min-height: 1123px;
    margin: 32px auto;
    background: #fff;
    box-shadow: 0 2px 10px rgba(0,0,0,0.06);
    padding: 56px 56px 48px;
    display: flex; flex-direction: column;
  }

  header.top {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 4px solid var(--burgundy);
    padding-bottom: 20px;
  }
  header.top .brand img { display: block; height: 56px; width: auto; }
  header.top .brand .org-name {
    margin-top: 8px;
    font-weight: 700; font-size: 16px; color: var(--burgundy);
    letter-spacing: 0.2px;
  }
  header.top .brand .center {
    font-size: 12px; color: var(--muted); margin-top: 2px;
  }

  header.top .doc-meta { text-align: right; }
  header.top .doc-meta .doc-label {
    display: inline-block;
    background: var(--cream); color: var(--burgundy);
    font-weight: 700; font-size: 11px; letter-spacing: 1.5px;
    padding: 4px 10px; border-radius: 999px; text-transform: uppercase;
  }
  header.top .doc-meta .doc-number {
    margin-top: 12px; font-weight: 700; font-size: 22px; color: var(--ink);
  }
  header.top .doc-meta .doc-date {
    font-size: 12px; color: var(--muted); margin-top: 4px;
  }

  section.parties {
    display: grid; grid-template-columns: 1fr 1fr; gap: 32px;
    margin-top: 28px;
  }
  section.parties .party-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    color: var(--muted); text-transform: uppercase; margin-bottom: 6px;
  }
  section.parties .party-name {
    font-weight: 600; font-size: 14px; margin-bottom: 4px;
  }
  section.parties .party-line {
    font-size: 12px; color: var(--muted); line-height: 1.5;
  }

  section.dates {
    margin-top: 28px;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
    background: #fafafa; border: 1px solid var(--border); border-radius: 8px;
    padding: 16px;
  }
  section.dates .cell .label {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    color: var(--muted); text-transform: uppercase;
  }
  section.dates .cell .value {
    margin-top: 4px; font-weight: 600; font-size: 14px; color: var(--ink);
  }
  section.dates .cell .badge {
    margin-top: 4px;
    display: inline-block; font-size: 11px; font-weight: 600;
    padding: 2px 8px; border-radius: 4px;
    background: var(--cream); color: var(--burgundy);
  }

  table.lines {
    width: 100%; border-collapse: collapse; margin-top: 28px;
    font-size: 13px;
  }
  table.lines thead th {
    text-align: left; padding: 10px 12px;
    background: var(--burgundy); color: #fff;
    font-weight: 600; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;
  }
  table.lines thead th.amount { text-align: right; }
  table.lines tbody td {
    padding: 14px 12px; border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  table.lines tbody td.amount {
    text-align: right; font-weight: 600;
  }

  .totals {
    margin-top: 20px; display: flex; justify-content: flex-end;
  }
  .totals .box {
    min-width: 260px;
    border-top: 2px solid var(--burgundy);
    padding-top: 12px;
  }
  .totals .row {
    display: flex; justify-content: space-between;
    font-size: 13px; padding: 4px 0;
  }
  .totals .row.total {
    margin-top: 8px; padding-top: 8px; border-top: 1px dashed var(--border);
    font-weight: 700; font-size: 18px; color: var(--burgundy);
  }

  .notes {
    margin-top: 28px; padding: 14px 16px;
    background: #fafafa; border-left: 4px solid var(--cream);
    font-size: 12px; color: var(--muted); border-radius: 4px;
  }

  footer.bottom {
    margin-top: auto; padding-top: 32px;
    border-top: 1px solid var(--border);
    font-size: 10px; color: var(--muted); text-align: center;
    line-height: 1.6;
  }
  footer.bottom strong { color: var(--burgundy); font-weight: 700; }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="btn secondary" onclick="window.close()">Cerrar</button>
    <button class="btn" onclick="window.print()">Imprimir / Guardar como PDF</button>
  </div>

  <div class="sheet">
    <header class="top">
      <div class="brand">
        <img src="${logoUrl}" alt="${escape(orgName)}" />
        <div class="org-name">${escape(orgName)}</div>
        ${centerName ? `<div class="center">${escape(centerName)}</div>` : ''}
      </div>
      <div class="doc-meta">
        <span class="doc-label">Recibo</span>
        <div class="doc-number">${escape(invoice.number)}</div>
        <div class="doc-date">Emitido el ${escape(issueDateLong)}</div>
      </div>
    </header>

    <section class="parties">
      <div>
        <div class="party-label">Emisor</div>
        <div class="party-name">${escape(orgName)}</div>
        ${centerName ? `<div class="party-line">${escape(centerName)}</div>` : ''}
      </div>
      <div>
        <div class="party-label">Alumno / Pagador</div>
        <div class="party-name">${escape(studentFullName)}</div>
        ${student.email ? `<div class="party-line">${escape(student.email)}</div>` : ''}
        ${student.phone ? `<div class="party-line">${escape(student.phone)}</div>` : ''}
        ${student.address ? `<div class="party-line">${escape(student.address)}</div>` : ''}
      </div>
    </section>

    <section class="dates">
      <div class="cell">
        <div class="label">Fecha de vencimiento</div>
        <div class="value">${escape(dueDateText)}</div>
      </div>
      <div class="cell">
        <div class="label">Cobro enviado</div>
        <div class="value">${escape(issuedAtText)}</div>
      </div>
      <div class="cell">
        <div class="label">Estado</div>
        <div class="badge">${escape(STATUS_LABEL[invoice.status])}</div>
      </div>
    </section>

    <table class="lines">
      <thead>
        <tr>
          <th>Concepto</th>
          <th class="amount">Importe</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escape(invoice.concept)}</td>
          <td class="amount">${escape(eurFmt.format(invoice.amount))}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="box">
        <div class="row total">
          <span>Total</span>
          <span>${escape(eurFmt.format(invoice.amount))}</span>
        </div>
      </div>
    </div>

    ${invoice.notes ? `<div class="notes">${escape(invoice.notes)}</div>` : ''}

    <footer class="bottom">
      <strong>${escape(orgName)}</strong><br />
      Documento generado por la plataforma Plató — recibo ${escape(invoice.number)}
    </footer>
  </div>

  <script>
    // Tras cargar fuentes, levanta el diálogo de impresión automáticamente.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        setTimeout(function () { window.focus(); window.print(); }, 100);
      });
    } else {
      window.addEventListener('load', function () {
        setTimeout(function () { window.focus(); window.print(); }, 200);
      });
    }
  </script>
</body>
</html>`;
}

export function openInvoicePdf(params: OpenInvoicePdfParams): void {
  const w = window.open('', '_blank', 'width=900,height=1100');
  if (!w) {
    // Popup bloqueado — informamos al usuario sin romper la app.
    alert('Activa los popups para generar el PDF del recibo.');
    return;
  }
  w.document.open();
  w.document.write(buildHtml(params));
  w.document.close();
}
