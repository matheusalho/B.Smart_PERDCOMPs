import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { createReportSheet, WIDTH, type ReportColumn } from '../workbookKit';

const colunas: ReportColumn[] = [
  { key: 'documento', header: 'Doc', width: WIDTH.regular },
  { key: 'valorDocumento', header: 'Valor Documento', kind: 'currency', width: WIDTH.regular, subtotal: false },
  { key: 'valorDebito', header: 'Valor Débito', kind: 'currency', width: WIDTH.regular },
];

const linhas = [
  { documento: 'A', valorDocumento: 100, valorDebito: 40 },
  { documento: 'A', valorDocumento: 100, valorDebito: 60 },
];

describe('workbookKit.createReportSheet', () => {
  it('aplica SUBTOTAL apenas nas colunas monetarias que nao desligaram o subtotal', () => {
    const sheet = createReportSheet(new ExcelJS.Workbook(), 'Teste', colunas, linhas);

    // Coluna 2 = 'Doc', 3 = 'Valor Documento' (subtotal: false), 4 = 'Valor Débito'
    expect(sheet.getCell(2, 3).value).toBeNull();
    expect(sheet.getCell(2, 4).value).toMatchObject({
      formula: expect.stringContaining('SUBTOTAL(9,'),
    });
  });

  it('mantem o contrato visual e-CAC: cabecalho na linha 4, dados na 5, autofiltro e coluna-calha', () => {
    const sheet = createReportSheet(new ExcelJS.Workbook(), 'Teste', colunas, linhas);

    expect(sheet.getColumn(1).width).toBe(2.625);
    expect(sheet.getCell(4, 2).value).toBe('Doc');
    expect(sheet.getCell(5, 2).value).toBe('A');
    expect(sheet.autoFilter).toBeTruthy();
    expect(sheet.getCell(5, 2).font).toMatchObject({ name: 'Segoe UI', size: 11 });
    expect(sheet.getCell(5, 2).alignment).toMatchObject({ horizontal: 'center', vertical: 'middle' });
  });
});
