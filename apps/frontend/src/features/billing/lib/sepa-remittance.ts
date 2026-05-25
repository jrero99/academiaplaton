import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { SepaDebitType, SepaMandateType } from '@academiaplaton/shared';
import type { SepaCreditor } from './sepa-creditor';

// ─────────────────────────────────────────────────────────────────────────────
// Generador de remesa SEPA en formato Excel siguiendo la plantilla de
// BBVA Net Cash. La estructura, los literales y el orden de columnas
// replican los del PDF de referencia (ADEUDOSMAIG2.pdf).
// ─────────────────────────────────────────────────────────────────────────────

export type SepaSequence = 'FRST' | 'RCUR' | 'FNAL' | 'OOFF';

export interface SepaRemittanceLine {
  // Datos del deudor (titular de la cuenta).
  holderName: string;
  holderIban: string;
  // Datos del mandato.
  mandateReference: string;
  mandateSignedAt: Date;
  // Datos del adeudo.
  sequence: SepaSequence;
  debitReference: string;
  amount: number;
  concept: string;
  // Metadatos opcionales (no se vuelcan al Excel, solo para uso interno).
  mandateType?: SepaMandateType;
  debitType?: SepaDebitType;
}

export interface SepaRemittanceData {
  creditor: SepaCreditor;
  collectionDate: Date;
  lines: SepaRemittanceLine[];
}

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' },
};

const TITLE_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFBFBFBF' },
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' },
};

function applySectionTitle(cell: ExcelJS.Cell) {
  cell.fill = TITLE_FILL;
  cell.font = { bold: true, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

function applyHeader(cell: ExcelJS.Cell) {
  cell.fill = HEADER_FILL;
  cell.font = { bold: true, size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = THIN_BORDER;
}

function applyData(cell: ExcelJS.Cell) {
  cell.font = { size: 10 };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  cell.border = THIN_BORDER;
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function generateSepaRemittanceXlsx(
  data: SepaRemittanceData,
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = data.creditor.name;
  wb.created = new Date();

  const ws = wb.addWorksheet('Adeudos', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true },
  });

  // Anchos de columna pensados para que los textos largos no se corten al
  // abrir en Excel sin tener que ajustar nada.
  ws.columns = [
    { width: 32 }, // A
    { width: 30 }, // B
    { width: 28 }, // C
    { width: 20 }, // D
    { width: 20 }, // E
    { width: 22 }, // F
    { width: 18 }, // G
    { width: 50 }, // H
  ];

  // ── Nota informativa ──────────────────────────────────────────
  ws.mergeCells('A1:H1');
  const note = ws.getCell('A1');
  note.value =
    'Plantilla generada automáticamente. Revise los datos antes de subir a BBVA Net Cash.';
  note.font = { italic: true, size: 10, color: { argb: 'FF666666' } };

  // ── Datos generales ───────────────────────────────────────────
  ws.mergeCells('A3:H3');
  applySectionTitle(ws.getCell('A3'));
  ws.getCell('A3').value = 'Datos generales';

  // Subtítulo cabecera presentador
  ws.mergeCells('A4:C4');
  const presTitle = ws.getCell('A4');
  presTitle.value = 'Datos cabecera presentador';
  presTitle.font = { italic: true, size: 10 };
  presTitle.alignment = { horizontal: 'center' };
  presTitle.fill = HEADER_FILL;

  ['IDENTIFICADOR DEL PRESENTADOR', 'NOMBRE DEL PRESENTADOR', 'OFICINA BBVA RECEPTORA'].forEach(
    (label, i) => {
      const c = ws.getCell(5, i + 1);
      c.value = label;
      applyHeader(c);
    },
  );
  ws.getCell(6, 1).value = data.creditor.identifier;
  ws.getCell(6, 2).value = data.creditor.name;
  ws.getCell(6, 3).value = data.creditor.bbvaOffice;
  for (let c = 1; c <= 3; c++) applyData(ws.getCell(6, c));

  // Subtítulo cabecera acreedor
  ws.mergeCells('A8:F8');
  const acrTitle = ws.getCell('A8');
  acrTitle.value = 'Datos cabecera acreedor';
  acrTitle.font = { italic: true, size: 10 };
  acrTitle.alignment = { horizontal: 'center' };
  acrTitle.fill = HEADER_FILL;

  const acreedorHeaders = [
    'IDENTIFICADOR DEL ACREEDOR',
    'FECHA DE COBRO ORIGINAL',
    'NOMBRE DEL ACREEDOR',
    'CUENTA DEL ACREEDOR',
    'IMPORTE TOTAL ADEUDOS',
    'DIVISA',
  ];
  acreedorHeaders.forEach((label, i) => {
    const c = ws.getCell(9, i + 1);
    c.value = label;
    applyHeader(c);
  });

  const totalAmount = data.lines.reduce((acc, l) => acc + l.amount, 0);
  const valuesRow = 10;
  ws.getCell(valuesRow, 1).value = data.creditor.identifier;
  ws.getCell(valuesRow, 2).value = formatDate(data.collectionDate);
  ws.getCell(valuesRow, 3).value = data.creditor.name;
  ws.getCell(valuesRow, 4).value = data.creditor.iban;
  const totalCell = ws.getCell(valuesRow, 5);
  totalCell.value = totalAmount;
  totalCell.numFmt = '#,##0.00';
  ws.getCell(valuesRow, 6).value = data.creditor.currency;
  for (let c = 1; c <= 6; c++) applyData(ws.getCell(valuesRow, c));
  totalCell.alignment = { vertical: 'middle', horizontal: 'right' };

  // ── Datos del cobro ───────────────────────────────────────────
  const cobroTitleRow = 12;
  ws.mergeCells(cobroTitleRow, 1, cobroTitleRow, 8);
  applySectionTitle(ws.getCell(cobroTitleRow, 1));
  ws.getCell(cobroTitleRow, 1).value = 'Datos del cobro';

  const lineHeaderRow = 13;
  const lineHeaders = [
    'NOMBRE DEL DEUDOR',
    'CUENTA DEL DEUDOR',
    'REFERENCIA ÚNICA DEL MANDATO',
    'FECHA FIRMA MANDATO',
    'SECUENCIA DEL ADEUDO',
    'REFERENCIA DEL ADEUDO',
    'IMPORTE DEL ADEUDO',
    'CONCEPTO',
  ];
  lineHeaders.forEach((label, i) => {
    const c = ws.getCell(lineHeaderRow, i + 1);
    c.value = label;
    applyHeader(c);
  });
  ws.getRow(lineHeaderRow).height = 30;

  data.lines.forEach((line, idx) => {
    const r = lineHeaderRow + 1 + idx;
    ws.getCell(r, 1).value = line.holderName;
    ws.getCell(r, 2).value = line.holderIban;
    ws.getCell(r, 3).value = line.mandateReference;
    ws.getCell(r, 4).value = formatDate(line.mandateSignedAt);
    ws.getCell(r, 5).value = line.sequence;
    ws.getCell(r, 6).value = line.debitReference;
    const amt = ws.getCell(r, 7);
    amt.value = line.amount;
    amt.numFmt = '#,##0.00';
    ws.getCell(r, 8).value = line.concept;
    for (let c = 1; c <= 8; c++) applyData(ws.getCell(r, c));
    amt.alignment = { vertical: 'middle', horizontal: 'right' };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

// Helper de conveniencia: genera y descarga en una sola llamada.
export async function generateAndDownloadSepaRemittance(
  data: SepaRemittanceData,
  filename: string,
): Promise<void> {
  const blob = await generateSepaRemittanceXlsx(data);
  saveAs(blob, filename);
}
