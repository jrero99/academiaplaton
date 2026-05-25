import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { SepaDebitType, SepaMandateType } from '@academiaplaton/shared';
import type { SepaCreditor } from './sepa-creditor';
import templateUrl from '@/assets/ADEUDOSMAIG2.xlsx?url';

// ─────────────────────────────────────────────────────────────────────────────
// Generador de remesa SEPA para BBVA Net Cash.
//
// Estrategia: cargar la plantilla oficial ADEUDOSMAIG2.xlsx desde assets,
// limpiar el área de datos (filas 12-212 de la hoja "Remesa Adeudos") y
// sobrescribir SOLO las celdas que cambian:
//
//   - A7..I7: cabecera presentador + acreedor (no se toca H7 porque es
//     fórmula SUM(G12:G212) que se recalcula sola al abrir el Excel).
//   - A12..H(12+N-1): una fila por adeudo.
//
// Los estilos, validaciones, fórmulas y celdas con strings mágicos
// (H1="ADEUDOS_1914_DIR", hoja "Instrucciones", hoja "Secuencias del
// adeudo") se preservan intactos porque exceljs mantiene el estado de
// cada celda al sobrescribir solo `.value`.
// ─────────────────────────────────────────────────────────────────────────────

export type SepaSequence = 'FRST' | 'RCUR' | 'FNAL' | 'OOFF';

export interface SepaRemittanceLine {
  holderName: string;
  holderIban: string;
  mandateReference: string;
  mandateSignedAt: Date;
  sequence: SepaSequence;
  debitReference: string;
  amount: number;
  concept: string;
  mandateType?: SepaMandateType;
  debitType?: SepaDebitType;
}

export interface SepaRemittanceData {
  creditor: SepaCreditor;
  collectionDate: Date;
  lines: SepaRemittanceLine[];
}

// Hoja principal y rango de datos de la plantilla oficial.
const SHEET_NAME = 'Remesa Adeudos';
const DATA_START_ROW = 12;
const DATA_END_ROW = 212; // capacidad máxima (la fórmula H7 = SUM(G12:G212))

// Formatea un IBAN compacto en grupos de 4 separados por espacios, como
// hace la plantilla en G7 (CUENTA DEL ACREEDOR).
function formatIbanWithSpaces(iban: string): string {
  return iban.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

async function loadTemplate(): Promise<ExcelJS.Workbook> {
  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la plantilla SEPA (HTTP ${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  return wb;
}

function clearDataArea(ws: ExcelJS.Worksheet): void {
  for (let r = DATA_START_ROW; r <= DATA_END_ROW; r++) {
    for (let c = 1; c <= 8; c++) {
      ws.getCell(r, c).value = null;
    }
  }
}

function writeHeader(ws: ExcelJS.Worksheet, data: SepaRemittanceData): void {
  // Cabecera presentador (A7:C7)
  ws.getCell('A7').value = data.creditor.identifier;
  ws.getCell('B7').value = data.creditor.name;
  ws.getCell('C7').value = data.creditor.bbvaOffice;

  // Cabecera acreedor (D7:I7) — NO se toca H7 (fórmula del total)
  ws.getCell('D7').value = data.creditor.identifier;
  ws.getCell('E7').value = data.collectionDate;
  ws.getCell('F7').value = data.creditor.name;
  ws.getCell('G7').value = formatIbanWithSpaces(data.creditor.iban);
  ws.getCell('I7').value = data.creditor.currency;
}

function writeLines(ws: ExcelJS.Worksheet, lines: SepaRemittanceLine[]): void {
  const capacity = DATA_END_ROW - DATA_START_ROW + 1;
  if (lines.length > capacity) {
    throw new Error(
      `Demasiados adeudos: ${lines.length} (capacidad de la plantilla: ${capacity}).`,
    );
  }

  lines.forEach((line, idx) => {
    const r = DATA_START_ROW + idx;
    ws.getCell(r, 1).value = line.holderName;
    ws.getCell(r, 2).value = line.holderIban.replace(/\s+/g, '');
    ws.getCell(r, 3).value = line.mandateReference;
    ws.getCell(r, 4).value = line.mandateSignedAt;
    ws.getCell(r, 5).value = line.sequence;
    ws.getCell(r, 6).value = line.debitReference;
    ws.getCell(r, 7).value = line.amount;
    ws.getCell(r, 8).value = line.concept;
  });
}

export async function generateSepaRemittanceXlsx(
  data: SepaRemittanceData,
): Promise<Blob> {
  const wb = await loadTemplate();
  const ws = wb.getWorksheet(SHEET_NAME);
  if (!ws) {
    throw new Error(`Plantilla SEPA corrupta: falta la hoja "${SHEET_NAME}".`);
  }

  clearDataArea(ws);
  writeHeader(ws, data);
  writeLines(ws, data.lines);

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export async function generateAndDownloadSepaRemittance(
  data: SepaRemittanceData,
  filename: string,
): Promise<void> {
  const blob = await generateSepaRemittanceXlsx(data);
  saveAs(blob, filename);
}
