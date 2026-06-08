import { beforeAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseExcelFile } from '../ExcelParser';

const sheetsDir = resolve(process.cwd(), '..', 'Sheets');
const sheetFiles = readdirSync(sheetsDir)
  .filter((file) => file.toLowerCase().endsWith('.xlsx'))
  .sort();

describe('ExcelParser - planilhas reais e-CAC', () => {
  let latestResult: ReturnType<typeof parseExcelFile>;

  beforeAll(() => {
    latestResult = parseExcelFile(readRealSheet(latestSheetFile()));
  });

  it.each(sheetFiles)('continua importando a planilha real %s', (fileName) => {
    const result = parseExcelFile(readRealSheet(fileName));

    expect(result.cadeias.length).toBeGreaterThan(0);
    expect(totalDcomps(result.cadeias)).toBeGreaterThan(0);
    expect(totalDebitos(result.cadeias)).toBeGreaterThan(0);
  });

  it('reporta qualidade da importacao na planilha real mais recente', () => {
    expect(latestResult.importQualityReport.linhasProcessamento).toBe(1472);
    expect(latestResult.importQualityReport.dcompsCarregadas).toBe(1443);
    expect(latestResult.importQualityReport.cadeiasCarregadas).toBe(565);
    expect(latestResult.importQualityReport.debitosCarregados).toBe(4641);
    expect(latestResult.importQualityReport.documentosIgnorados).toHaveLength(29);
    expect(latestResult.importQualityReport.documentosIgnorados[0]).toEqual({
      numeroPerdcomp: '20412.42534.150526.1.3.24-5753',
      motivo: 'sem_cadeia_relacional',
      tipoCredito: 'Pagamento Indevido ou a Maior eSocial',
      situacao: 'Em análise',
    });
  });

  it('preserva metadados opcionais encontrados na planilha real mais recente', () => {
    const dcomp = findDcomp(latestResult.cadeias, '32552.06818.210225.1.3.57-2529');

    expect(dcomp?.metadadosCreditoImportado?.processoJudicial).toBe(
      '5004178-45.2021.4.03.6144',
    );
    expect(dcomp?.metadadosCreditoImportado?.processoHabilitacao).toBe(
      '13868.740732/2024-63',
    );
    expect(dcomp?.metadadosCreditoImportado?.processoAdministrativo).toBeUndefined();
    expect(dcomp?.valorUtilizadoPerdcompOriginal).toBe(607590.62);
  });

  it('preserva o dia civil das datas de transmissao importadas do Excel', () => {
    const dcomp = findDcomp(latestResult.cadeias, '06251.86776.210720.1.7.02-1771');

    expect(formatLocalDate(dcomp?.dataTransmissao)).toBe('21/07/2020');
    expect(formatLocalDate(dcomp?.dataTransmissaoOriginal)).toBe('19/04/2016');
  });

  it('anexa classificacoes consultivas de credito e status sem bloquear a importacao', () => {
    const dcompJudicial = findDcomp(latestResult.cadeias, '32552.06818.210225.1.3.57-2529');
    const dcompHomologada = findDcomp(latestResult.cadeias, '06251.86776.210720.1.7.02-1771');

    expect(dcompJudicial?.classificacaoCreditoConsultiva?.tipoCreditoId).toBe(
      'credito_judicial',
    );
    expect(dcompJudicial?.classificacaoCreditoConsultiva?.dcompAdmitida).toBe(
      'depende',
    );
    expect(dcompJudicial?.classificacaoCreditoConsultiva?.alertas).toEqual(
      expect.arrayContaining([
        expect.stringContaining('VED-CRED-JUD-SEM-TJ'),
        expect.stringContaining('VED-CRED-JUD-LIMITE'),
      ]),
    );
    expect(dcompJudicial?.statusProcessamentoConsultivo?.editabilidadeSimulacao).toBe(
      'indeterminado',
    );

    expect(dcompHomologada?.statusProcessamentoConsultivo?.vigenciaCascata).toBe(
      'vigente',
    );
    expect(dcompHomologada?.statusProcessamentoConsultivo?.editabilidadeSimulacao).toBe(
      'bloqueado',
    );
  });
});

function readRealSheet(fileName: string): ArrayBuffer {
  const buffer = readFileSync(resolve(sheetsDir, fileName));

  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function latestSheetFile(): string {
  return sheetFiles
    .map((file) => ({
      file,
      mtime: statSync(resolve(sheetsDir, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;
}

function formatLocalDate(date?: Date): string {
  if (!date) return '';

  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('/');
}

function totalDcomps(
  cadeias: ReturnType<typeof parseExcelFile>['cadeias'],
): number {
  return cadeias.reduce((total, cadeia) => total + cadeia.dcomps.length, 0);
}

function totalDebitos(
  cadeias: ReturnType<typeof parseExcelFile>['cadeias'],
): number {
  return cadeias.reduce(
    (total, cadeia) =>
      total +
      cadeia.dcomps.reduce(
        (dcompTotal, dcomp) => dcompTotal + dcomp.debitos.length,
        0,
      ),
    0,
  );
}

function findDcomp(
  cadeias: ReturnType<typeof parseExcelFile>['cadeias'],
  dcompId: string,
) {
  return cadeias
    .flatMap((cadeia) => cadeia.dcomps)
    .find((dcomp) => dcomp.id === dcompId);
}
