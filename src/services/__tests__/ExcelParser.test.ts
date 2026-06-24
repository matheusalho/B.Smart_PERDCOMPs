import { beforeAll, describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

import { parseExcelFile } from '../ExcelParser';
import { processExcelBuffer } from '../importPipeline';

// Planilhas reais ficam fora do repo (pasta Sheets/ do workspace ou BSMART_PERDCOMP_SHEETS_DIR).
// Quando ausentes (repo aberto isoladamente), os testes de planilha real são pulados.
const sheetsDir = process.env.BSMART_PERDCOMP_SHEETS_DIR ?? resolve(process.cwd(), '..', 'Sheets');
const hasRealSheets = existsSync(sheetsDir);
const sheetFiles = hasRealSheets
  ? readdirSync(sheetsDir).filter(isEcacFixture).sort()
  : [];

describe.skipIf(!hasRealSheets)('ExcelParser - planilhas reais e-CAC', () => {
  let latestResult: ReturnType<typeof parseExcelFile>;

  beforeAll(() => {
    latestResult = parseExcelFile(readRealSheet(referenceSheetFile()));
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

  it('preserva o timestamp consistente da aba PERDCOMP Debitos', () => {
    const dcomp = findDcomp(latestResult.cadeias, '22718.81103.161024.1.3.02-6299');

    expect(formatLocalDateTime(dcomp?.dataHoraTransmissaoImportada)).toBe(
      '16/10/2024 16:26:22',
    );
  });

  it('usa os horarios reais para desempatar documentos da mesma cadeia e dia', () => {
    const ids = new Set([
      '31737.53037.130824.1.7.02-2004',
      '10991.45632.130824.1.7.02-1578',
      '20923.60398.130824.1.7.02-2217',
    ]);
    const cadeia = latestResult.cadeias.find((item) =>
      item.dcomps.some((dcomp) => ids.has(dcomp.id)),
    );

    expect(cadeia?.dcomps.filter((dcomp) => ids.has(dcomp.id)).map((dcomp) => dcomp.id))
      .toEqual([
        '10991.45632.130824.1.7.02-1578',
        '31737.53037.130824.1.7.02-2004',
        '20923.60398.130824.1.7.02-2217',
      ]);
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
      processExcelBuffer(readRealSheet(referenceSheetFile()));

    expect(cadeiasRecalculadas).toHaveLength(latestResult.cadeias.length);
    expect(totalDcomps(cadeiasRecalculadas)).toBe(totalDcomps(latestResult.cadeias));
    expect(totalDebitos(cadeiasRecalculadas)).toBe(totalDebitos(latestResult.cadeias));
    expect(empresa).toEqual(latestResult.empresa);
    expect(importQualityReport.dcompsCarregadas).toBe(
      latestResult.importQualityReport.dcompsCarregadas,
    );
  });
});

describe('ExcelParser - desempate cronologico por timestamp', () => {
  it('ordena linhagens independentes do mesmo dia pelo timestamp dos debitos', () => {
    const result = parseExcelFile(createOrderingWorkbook({
      processingRows: [
        processingRow('RAIZ', '01/01/2024'),
        processingRow('MAIS-TARDE', '02/01/2024', 'RAIZ'),
        processingRow('MAIS-CEDO', '02/01/2024', 'RAIZ'),
      ],
      debitRows: [
        debitRow('MAIS-TARDE', '02/01/2024 11:30:00'),
        debitRow('MAIS-CEDO', '02/01/2024 09:15:00'),
      ],
    }));

    expect(result.cadeias[0].dcomps.map((dcomp) => dcomp.id)).toEqual([
      'RAIZ',
      'MAIS-CEDO',
      'MAIS-TARDE',
    ]);
  });

  it('preserva a ordem da aba de processamento quando um timestamp nao esta disponivel', () => {
    const result = parseExcelFile(createOrderingWorkbook({
      processingRows: [
        processingRow('RAIZ', '01/01/2024'),
        processingRow('SEM-TIMESTAMP', '02/01/2024', 'RAIZ'),
        processingRow('COM-TIMESTAMP', '02/01/2024', 'RAIZ'),
      ],
      debitRows: [
        debitRow('COM-TIMESTAMP', '02/01/2024 09:15:00'),
      ],
    }));

    expect(result.cadeias[0].dcomps.map((dcomp) => dcomp.id)).toEqual([
      'RAIZ',
      'SEM-TIMESTAMP',
      'COM-TIMESTAMP',
    ]);
  });

  it('ignora timestamps conflitantes e preserva a ordem da aba de processamento', () => {
    const result = parseExcelFile(createOrderingWorkbook({
      processingRows: [
        processingRow('RAIZ', '01/01/2024'),
        processingRow('CONFLITANTE', '02/01/2024', 'RAIZ'),
        processingRow('CONSISTENTE', '02/01/2024', 'RAIZ'),
      ],
      debitRows: [
        debitRow('CONFLITANTE', '02/01/2024 11:30:00'),
        debitRow('CONFLITANTE', '02/01/2024 12:30:00'),
        debitRow('CONSISTENTE', '02/01/2024 09:15:00'),
      ],
    }));

    expect(result.cadeias[0].dcomps.map((dcomp) => dcomp.id)).toEqual([
      'RAIZ',
      'CONFLITANTE',
      'CONSISTENTE',
    ]);
    expect(findDcomp(result.cadeias, 'CONFLITANTE')?.dataHoraTransmissaoImportada)
      .toBeUndefined();
  });

  it('mantem a original antes da retificadora independentemente do horario', () => {
    const original = processingRow('ORIGINAL', '02/01/2024');
    original['Retificado ou Cancelado Por'] = 'RETIFICADORA';

    const result = parseExcelFile(createOrderingWorkbook({
      processingRows: [
        original,
        processingRow('RETIFICADORA', '02/01/2024'),
      ],
      debitRows: [
        debitRow('ORIGINAL', '02/01/2024 11:30:00'),
        debitRow('RETIFICADORA', '02/01/2024 09:15:00'),
      ],
    }));

    expect(result.cadeias[0].dcomps.map((dcomp) => dcomp.id)).toEqual([
      'ORIGINAL',
      'RETIFICADORA',
    ]);
  });
});

function readRealSheet(fileName: string): ArrayBuffer {
  const buffer = readFileSync(resolve(sheetsDir, fileName));

  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function referenceSheetFile(): string {
  const canonicalFixture = 'Relatorio de Analise eCAC_06.06.26.xlsx';
  if (sheetFiles.includes(canonicalFixture)) return canonicalFixture;

  return sheetFiles
    .map((file) => ({
      file,
      mtime: statSync(resolve(sheetsDir, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;
}

function isEcacFixture(fileName: string): boolean {
  const normalized = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isEcacReport = normalized === 'relatorio.xlsx' ||
    normalized.startsWith('relatorio de analise ecac') ||
    normalized.startsWith('relatorio de analise e-cac');
  return isEcacReport && normalized.endsWith('.xlsx') && !fileName.startsWith('~$');
}

function formatLocalDate(date?: Date): string {
  if (!date) return '';

  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('/');
}

function formatLocalDateTime(date?: Date): string {
  if (!date) return '';

  return [
    formatLocalDate(date),
    [
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0'),
    ].join(':'),
  ].join(' ');
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

function createOrderingWorkbook(input: {
  processingRows: Array<Record<string, unknown>>;
  debitRows: Array<Record<string, unknown>>;
}): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  const processingSheet = XLSX.utils.json_to_sheet(input.processingRows, { origin: 'A4' });
  const debitSheet = XLSX.utils.json_to_sheet(input.debitRows, { origin: 'A4' });

  XLSX.utils.book_append_sheet(workbook, processingSheet, 'Processamento PERDCOMP');
  XLSX.utils.book_append_sheet(workbook, debitSheet, 'PERDCOMP Débitos');

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return buffer as ArrayBuffer;
}

function processingRow(
  id: string,
  dataTransmissao: string,
  detalhamentoAnterior = '',
): Record<string, unknown> {
  return {
    'Número Perdcomp': id,
    'Retificado ou Cancelado Por': '',
    'Detalhado Perdcomp Anterior': detalhamentoAnterior,
    'Data Transmissão': dataTransmissao,
    'Data de Transmissão do Perdcomp': dataTransmissao,
    'Indicador de Crédito': '1',
    'Tipo de Crédito': 'Pagamento Indevido ou a Maior',
    'Tipo do Documento': 'Decl. Compensação',
    Situação: 'Em análise',
    'Detentor do Crédito': 'Empresa Teste',
    'Período de Apuração': '01/2024',
    'Valor Total do Crédito': 1000,
    'Valor do Crédito na Data de Transmissão': 1000,
    'Valor Utilizado no Perdcomp': 100,
    'IDs da Cadeia Relacional': 'CADEIA-TESTE',
  };
}

function debitRow(id: string, timestamp: string): Record<string, unknown> {
  return {
    'Número do PER/DCOMP': id,
    'Data de Transmissão': timestamp,
    'Código de Receita': '0001-01',
    'Período de Apuração do Débito': '01/2024',
    'Data de Vencimento Tributo Quota': '31/01/2024',
    'Valor Principal': 100,
    'Valor Multa': 0,
    'Valor Juros': 0,
    'Valor Total': 100,
  };
}
