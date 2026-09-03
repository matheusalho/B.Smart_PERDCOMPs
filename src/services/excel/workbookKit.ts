import ExcelJS from 'exceljs';
import type { Alignment, Border, Cell, Fill, Font, Workbook, Worksheet } from 'exceljs';

import type { FonteNormativa } from '../normativo/types';

export const HEADER_ROW = 4;
export const DATA_START_ROW = 5;
export const LAST_EXCEL_ROW = 1_048_576;
export const HEADER_COLOR = 'FF00B4FF';
export const CURRENT_HEADER_COLOR = 'FFC8C8C8';
export const CORRECT_HEADER_COLOR = 'FF64C864';
export const WHITE = 'FFFFFFFF';
export const BLACK = 'FF000000';

export const ECAC_CURRENCY_FORMAT =
  '_-"R$"\\ * #,##0.00_-;\\-"R$"\\ * #,##0.00_-;_-"R$"\\ * "-"??_-;_-@_-';

export const DATE_FORMAT = 'dd/mm/yyyy';
export const DATE_TIME_FORMAT = 'dd/mm/yyyy hh:mm';
export const MONTH_FORMAT = 'mm/yyyy';
export const CNPJ_FORMAT = '00"."000"."000"/"0000"-"00';
export const PERCENT_FORMAT = '0.00%';

export const WIDTH = {
  compact: 9.125,
  short: 14.875,
  medium: 18.25,
  date: 20.625,
  regular: 27.25,
  wide: 35,
  wider: 36.75,
  description: 39.625,
  maximum: 39.875,
} as const;

export type CellInput = string | number | boolean | Date | null | undefined;
export type RowInput = Record<string, CellInput>;
export type ColumnKind =
  | 'text'
  | 'integer'
  | 'date'
  | 'datetime'
  | 'month'
  | 'currency'
  | 'percentage'
  | 'cnpj';

export type ReportColumn = {
  key: string;
  header: string;
  kind?: ColumnKind;
  width: number;
  wrap?: boolean;
  align?: 'left' | 'center' | 'right';
  headerRole?: 'current' | 'correct';
  hidden?: boolean;
  /** Default true. Só tem efeito em colunas `currency`. */
  subtotal?: boolean;
};

const thinBlackBorder: Partial<Border> = {
  style: 'thin',
  color: { argb: BLACK },
};

export const allBorders = {
  top: thinBlackBorder,
  left: thinBlackBorder,
  bottom: thinBlackBorder,
  right: thinBlackBorder,
};

export const headerFont: Partial<Font> = {
  name: 'Segoe UI',
  size: 11,
  bold: true,
  color: { argb: WHITE },
};

export const bodyFont: Partial<Font> = {
  name: 'Segoe UI',
  size: 11,
  color: { argb: BLACK },
};

export const headerFill: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: HEADER_COLOR },
};

export const bodyFill: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: WHITE },
};

export const centered: Partial<Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
};

type EstiloCorpo = {
  font: Partial<Font>;
  fill: Fill;
  alignment: Partial<Alignment>;
  border: typeof allBorders;
  numFmt: string;
};

/**
 * Pacote de estilo calculado uma vez por coluna. Em planilhas com centenas de
 * milhares de células, alocar um `alignment` por célula domina o custo.
 */
function criarEstiloCorpo(column: ReportColumn): EstiloCorpo {
  return {
    font: bodyFont,
    fill: bodyFill,
    alignment: {
      horizontal: column.align ?? 'center',
      vertical: 'middle',
      wrapText: column.wrap ?? false,
    },
    border: allBorders,
    numFmt: numberFormatFor(column.kind),
  };
}

function aplicarEstiloCorpo(cell: Cell, estilo: EstiloCorpo): void {
  cell.font = estilo.font;
  cell.fill = estilo.fill;
  cell.alignment = estilo.alignment;
  cell.border = estilo.border;
  cell.numFmt = estilo.numFmt;
}

export function createReportSheet(
  workbook: Workbook,
  name: string,
  columns: ReportColumn[],
  rows: RowInput[],
): Worksheet {
  const worksheet = workbook.addWorksheet(name, {
    properties: { defaultRowHeight: 16.5 },
    views: [
      {
        state: 'frozen',
        xSplit: 1,
        ySplit: 4,
        topLeftCell: 'B5',
        activeCell: 'B5',
        showGridLines: false,
      },
    ],
  });

  worksheet.getColumn(1).width = 2.625;
  columns.forEach((column, index) => {
    const worksheetColumn = worksheet.getColumn(index + 2);
    worksheetColumn.width = column.width;
    worksheetColumn.hidden = column.hidden ?? false;
  });

  const headerRow = worksheet.getRow(HEADER_ROW);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 2);
    cell.value = column.header;
    applyHeaderStyle(cell, column.headerRole);
  });
  headerRow.height = 33;

  const estilos = columns.map(criarEstiloCorpo);

  rows.forEach((row, rowOffset) => {
    const excelRow = worksheet.getRow(DATA_START_ROW + rowOffset);
    let wrappedLines = 1;

    columns.forEach((column, columnOffset) => {
      const cell = excelRow.getCell(columnOffset + 2);
      cell.value = normalizeCellValue(row[column.key], column.kind);
      aplicarEstiloCorpo(cell, estilos[columnOffset]);
      if (column.wrap) {
        wrappedLines = Math.max(
          wrappedLines,
          estimateWrappedLines(String(row[column.key] ?? ''), column.width),
        );
      }
    });

    excelRow.height = Math.min(49.5, wrappedLines * 16.5);
  });

  applySubtotals(worksheet, columns);

  const lastColumn = columns.length + 1;
  const lastRow = Math.max(HEADER_ROW, DATA_START_ROW + rows.length - 1);
  worksheet.autoFilter = {
    from: { row: HEADER_ROW, column: 2 },
    to: { row: lastRow, column: lastColumn },
  };

  return worksheet;
}

function applySubtotals(worksheet: Worksheet, columns: ReportColumn[]): void {
  columns.forEach((column, index) => {
    if (column.kind !== 'currency') return;
    if (column.subtotal === false) return;
    const columnNumber = index + 2;
    const columnLetter = worksheet.getColumn(columnNumber).letter;
    const cell = worksheet.getCell(2, columnNumber);
    cell.value = { formula: `SUBTOTAL(9,${columnLetter}${DATA_START_ROW}:${columnLetter}${LAST_EXCEL_ROW})` };
    cell.numFmt = ECAC_CURRENCY_FORMAT;
    applyHeaderStyle(cell, column.headerRole);
  });
  worksheet.getRow(2).height = 16.5;
}

export function applyHeaderStyle(cell: Cell, role?: ReportColumn['headerRole']): void {
  const roleColor = role === 'current'
    ? CURRENT_HEADER_COLOR
    : role === 'correct'
      ? CORRECT_HEADER_COLOR
      : null;

  cell.font = roleColor
    ? { ...headerFont, color: { argb: BLACK } }
    : headerFont;
  cell.fill = roleColor
    ? { type: 'pattern', pattern: 'solid', fgColor: { argb: roleColor } }
    : headerFill;
  cell.alignment = { ...centered, wrapText: true };
  cell.border = allBorders;
}

export function numberFormatFor(kind: ColumnKind | undefined): string {
  switch (kind) {
    case 'currency':
      return ECAC_CURRENCY_FORMAT;
    case 'date':
      return DATE_FORMAT;
    case 'datetime':
      return DATE_TIME_FORMAT;
    case 'month':
      return MONTH_FORMAT;
    case 'percentage':
      return PERCENT_FORMAT;
    case 'cnpj':
      return CNPJ_FORMAT;
    case 'integer':
      return '0';
    default:
      return '@';
  }
}

export function normalizeCellValue(value: CellInput, kind: ColumnKind | undefined): ExcelJS.CellValue {
  if (value === undefined || value === null || value === '') return null;
  if (kind === 'cnpj') return toCnpjNumber(value);
  return value;
}

export function toCnpjNumber(value: CellInput): number | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length !== 14) return null;
  return Number(digits);
}

export function toExcelDate(value: unknown, includeTime = false): Date | string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      value.getFullYear(),
      value.getMonth(),
      value.getDate(),
      includeTime ? value.getHours() : 0,
      includeTime ? value.getMinutes() : 0,
      includeTime ? value.getSeconds() : 0,
    );
  }
  if (typeof value !== 'string' || value.trim() === '') return null;

  const brazilian = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (brazilian) {
    return new Date(
      Number(brazilian[3]),
      Number(brazilian[2]) - 1,
      Number(brazilian[1]),
      includeTime ? Number(brazilian[4] ?? 0) : 0,
      includeTime ? Number(brazilian[5] ?? 0) : 0,
      includeTime ? Number(brazilian[6] ?? 0) : 0,
    );
  }

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    return new Date(
      Number(iso[1]),
      Number(iso[2]) - 1,
      Number(iso[3]),
      includeTime ? Number(iso[4] ?? 0) : 0,
      includeTime ? Number(iso[5] ?? 0) : 0,
      includeTime ? Number(iso[6] ?? 0) : 0,
    );
  }

  return value.trim();
}

export function toExcelMonth(value: unknown): Date | string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }
  if (typeof value !== 'string' || value.trim() === '') return null;

  const monthYear = value.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYear) return new Date(Number(monthYear[2]), Number(monthYear[1]) - 1, 1);

  const isoMonth = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?/);
  if (isoMonth) return new Date(Number(isoMonth[1]), Number(isoMonth[2]) - 1, 1);

  return value.trim();
}

export function joinFontes(fontes: FonteNormativa[] | undefined): string {
  return (fontes ?? [])
    .map((fonte) => [fonte.ato, fonte.artigo, fonte.arquivo, fonte.paginaOuSecao].filter(Boolean).join(' | '))
    .filter(Boolean)
    .join('; ');
}

export function joinList(values: string[] | undefined): string {
  return values?.join('; ') ?? '';
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function estimateWrappedLines(value: string, width: number): number {
  if (value === '') return 1;
  const approximateCharactersPerLine = Math.max(8, Math.floor(width * 0.8));
  return Math.max(
    1,
    ...value.split('\n').map((line) => Math.ceil(line.length / approximateCharactersPerLine)),
  );
}

export function formatFileTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}
