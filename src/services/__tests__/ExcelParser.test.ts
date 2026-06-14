import { beforeAll, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseExcelFile } from '../ExcelParser';
import { processExcelBuffer } from '../importPipeline';

const sheetsDir = resolve(process.cwd(), '..', 'Sheets');
const sheetFiles = readdirSync(sheetsDir)
  .filter((file) => file.toLowerCase().endsWith('.xlsx') && !file.startsWith('~$'))
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

  it('transporta metadados de status, DARF e lastro de pagamento para rastreabilidade', () => {
    const dcomp = findDcomp(latestResult.cadeias, '09896.37478.250424.1.3.24-6461');

    expect(dcomp?.situacaoDetalhada).toBe(
      'Análise concluída, com emissão de despacho decisório.',
    );
    expect(dcomp?.metadadosCreditoImportado?.competenciaCredito).toBe('12/2021');
    expect(dcomp?.metadadosCreditoImportado?.tipoCompetenciaCredito).toBe('DATA');
    expect(dcomp?.metadadosCreditoImportado?.numeroPagamento).toBe(
      '07.16.22018.0020381-1',
    );
    expect(formatLocalDate(dcomp?.metadadosCreditoImportado?.dataArrecadacaoCredito)).toBe(
      '20/01/2022',
    );
    expect(dcomp?.metadadosCreditoImportado?.codigoReceitaCredito).toBe('1138');
  });

  it('transporta metadados de titularidade, sucessao e recibos dos debitos', () => {
    const dcomp = findDcomp(latestResult.cadeias, '13941.91673.180923.1.7.24-0207');
    const debito = dcomp?.debitos.find((item) => item.codigoReceita === '1191-01');

    expect(debito?.cnpjTransmissorDcomp).toBe('61486650000183');
    expect(debito?.cnpjDetentorCredito).toBe('83933275000105');
    expect(debito?.cnpjDebito).toBe('83933275000105');
    expect(debito?.debitoSucedida).toBe('SIM');
    expect(debito?.debitoControladoEmProcesso).toBe('NÃO');
    expect(debito?.numeroReciboTransmissaoDctf).toBe('50000163079606');
    expect(debito?.numeroReciboPerDcomp).toBe('1573792095');
    expect(debito?.categoriaDctf).toBe('Geral');
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
    expect(dcompJudicial?.statusProcessamentoConsultivo?.vigenciaCascata).toBe(
      'vigente',
    );
    expect(dcompJudicial?.statusProcessamentoConsultivo?.editabilidadeSimulacao).toBe(
      'editavel',
    );

    expect(dcompHomologada?.statusProcessamentoConsultivo?.vigenciaCascata).toBe(
      'vigente',
    );
    expect(dcompHomologada?.statusProcessamentoConsultivo?.editabilidadeSimulacao).toBe(
      'bloqueado',
    );
  });

  it('executa o pipeline usado pelo worker com a planilha real mais recente', () => {
    const { cadeias: cadeiasRecalculadas, empresa, importQualityReport } =
      processExcelBuffer(readRealSheet(latestSheetFile()));

    expect(cadeiasRecalculadas).toHaveLength(latestResult.cadeias.length);
    expect(totalDcomps(cadeiasRecalculadas)).toBe(totalDcomps(latestResult.cadeias));
    expect(totalDebitos(cadeiasRecalculadas)).toBe(totalDebitos(latestResult.cadeias));
    expect(empresa).toEqual(latestResult.empresa);
    expect(importQualityReport.dcompsCarregadas).toBe(
      latestResult.importQualityReport.dcompsCarregadas,
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
