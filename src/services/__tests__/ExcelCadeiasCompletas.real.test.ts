import type { Worksheet } from 'exceljs';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import type { CadeiaRelacional } from '../../models/types';
import { recalcularCadeia } from '../CalculoService';
import { buildCadeiasWorkbook } from '../ExcelCadeiasCompletasService';
import { parseExcelFile } from '../ExcelParser';

// Planilhas reais ficam fora do repo (Sheets/ do workspace ou BSMART_PERDCOMP_SHEETS_DIR);
// na ausência delas (repo isolado) esta suíte é pulada.
const sheetsDir = process.env.BSMART_PERDCOMP_SHEETS_DIR ?? resolve(process.cwd(), '..', 'Sheets');
const hasRealSheets = existsSync(sheetsDir);

let cadeias: CadeiaRelacional[];
let importQualityReport: ReturnType<typeof parseExcelFile>['importQualityReport'];
let empresa: ReturnType<typeof parseExcelFile>['empresa'];

function planilhaMaisRecente(): string {
  const arquivos = readdirSync(sheetsDir)
    .filter((nome) => /an[áa]lise.*e-?cac/i.test(nome) && nome.endsWith('.xlsx'))
    .map((nome) => resolve(sheetsDir, nome))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (arquivos.length === 0) throw new Error('Nenhum Relatório de Análise e-CAC encontrado em Sheets/.');
  return arquivos[0];
}

function colunaPorCabecalho(sheet: Worksheet, cabecalho: string): number {
  const row = sheet.getRow(4);
  for (let column = 2; column <= row.cellCount; column += 1) {
    if (row.getCell(column).value === cabecalho) return column;
  }
  throw new Error(`Cabeçalho não encontrado: ${cabecalho}`);
}

describe.skipIf(!hasRealSheets)('ExcelCadeiasCompletasService - planilha real', () => {
  beforeAll(() => {
    const arquivo = readFileSync(planilhaMaisRecente());
    const buffer = arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength);
    const resultado = parseExcelFile(buffer as ArrayBuffer);
    cadeias = resultado.cadeias.map(recalcularCadeia);
    importQualityReport = resultado.importQualityReport;
    empresa = resultado.empresa;
  }, 120_000);

  it('conserva as linhas: uma por PER/DCOMP na cascata, soma de max(1, debitos) nos debitos', () => {
    const workbook = buildCadeiasWorkbook({
      cadeias, empresa, importQualityReport, simulacoesSalvas: [],
      modo: 'completo', emitidoEm: new Date(2026, 8, 3),
    });

    const documentos = cadeias.reduce((total, cadeia) => total + cadeia.dcomps.length, 0);
    const linhasDebito = cadeias.reduce(
      (total, cadeia) => total + cadeia.dcomps.reduce((soma, d) => soma + Math.max(1, d.debitos.length), 0),
      0,
    );

    expect(workbook.getWorksheet('Cascata PER-DCOMP')!.rowCount).toBe(4 + documentos);
    expect(workbook.getWorksheet('Débitos por Linha')!.rowCount).toBe(4 + linhasDebito);
    expect(documentos).toBe(importQualityReport.dcompsCarregadas);
  }, 120_000);

  it('sem edicoes na sessao, o modo e-CAC bate com as colunas Original do modo completo', () => {
    const comum = {
      cadeias, empresa, importQualityReport, simulacoesSalvas: [], emitidoEm: new Date(2026, 8, 3),
    };
    const completo = buildCadeiasWorkbook({ ...comum, modo: 'completo' as const })
      .getWorksheet('Cascata PER-DCOMP')!;
    const ecac = buildCadeiasWorkbook({ ...comum, modo: 'ecac' as const })
      .getWorksheet('Cascata PER-DCOMP')!;

    const colCompleto = colunaPorCabecalho(completo, 'Crédito Orig. Usado — Original');
    const colEcac = colunaPorCabecalho(ecac, 'Crédito Orig. Usado');

    for (let linha = 5; linha <= Math.min(ecac.rowCount, 200); linha += 1) {
      expect(ecac.getCell(linha, colEcac).value).toEqual(completo.getCell(linha, colCompleto).value);
    }
  }, 120_000);

  it('gera o workbook completo dentro do limite de 15 s', () => {
    const inicio = performance.now();
    buildCadeiasWorkbook({
      cadeias, empresa, importQualityReport, simulacoesSalvas: [],
      modo: 'completo', emitidoEm: new Date(2026, 8, 3),
    });
    const decorrido = performance.now() - inicio;

    console.log(`[benchmark] buildCadeiasWorkbook completo: ${decorrido.toFixed(0)} ms`);
    expect(decorrido).toBeLessThan(15_000);
  }, 120_000);
});
