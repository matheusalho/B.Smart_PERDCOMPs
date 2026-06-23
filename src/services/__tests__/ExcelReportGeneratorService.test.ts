import { describe, expect, it } from 'vitest';

import type { DCOMP, SimulacaoSalva } from '../../models/types';
import { buildExcelWorkbook } from '../ExcelReportGeneratorService';

const CURRENCY_FORMAT =
  '_-"R$"\\ * #,##0.00_-;\\-"R$"\\ * #,##0.00_-;_-"R$"\\ * "-"??_-;_-@_-';

describe('ExcelReportGeneratorService', () => {
  it('cria as sete abas auditaveis na ordem contratada e consolida simulacoes', () => {
    const workbook = buildExcelWorkbook(
      [criarSimulacaoCompleta(), criarSimulacaoLegada()],
      [],
      { cnpj: '12345678000199', razaoSocial: 'Empresa Teste Ltda.' },
      new Date(2026, 5, 22, 14, 30),
    );

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Projeção Retificações Cadeias',
      'Resumo',
      'Premissas',
      'Debitos',
      'SELIC',
      'StatusVigencia',
      'Evidencias',
    ]);

    const resumo = workbook.getWorksheet('Resumo');
    expect(resumo).toBeDefined();
    expect(resumo?.getCell(5, colunaPorCabecalho(resumo!, 'Simulação')).value).toBe('SIM-1');
    expect(resumo?.getCell(6, colunaPorCabecalho(resumo!, 'Simulação')).value).toBe('SIM-LEGADA');

    expect(workbook.getWorksheet('Projeção Retificações Cadeias')?.rowCount).toBe(6);
    expect(workbook.getWorksheet('Debitos')?.rowCount).toBe(6);

    const premissas = workbook.getWorksheet('Premissas')!;
    const categorias = linhasDeDados(premissas).map((row) =>
      row.getCell(colunaPorCabecalho(premissas, 'Categoria')).value,
    );
    expect(categorias).toContain('Tabela SELIC');
  });

  it('transforma divergencia sem edicao manual em roteiro de recalculo da cascata', () => {
    const simulacao = criarSimulacaoCompleta();
    simulacao.dcomps = [
      {
        ...criarDcompCompleta(),
        id: 'RET-SEM-EDICAO',
        isManuallyEdited: false,
        statusCascata: 'RETIFICAR',
        divergenciaDetalhes: { esperado: 900, calculado: 800 },
        valorCreditoDataTransmissao: 900,
        debitos: criarDcompCompleta().debitos.map((debito) => ({
          ...debito,
          valorPrincipal: debito.valorPrincipalOriginal,
          valorMulta: debito.valorMultaOriginal,
          valorJuros: debito.valorJurosOriginal,
          valorTotal: debito.valorTotalOriginal,
        })),
        valorUtilizadoPerdcomp: 500,
        valorUtilizadoPerdcompOriginal: 500,
        saldoCreditoOriginalAnterior: 400,
        saldoCreditoOriginalCalculado: 300,
      },
    ];

    const sheet = buildExcelWorkbook([simulacao]).getWorksheet('Projeção Retificações Cadeias')!;

    expect(valorPorCabecalho(sheet, 5, 'Status Cascata')).toBe('A RETIFICAR');
    expect(valorPorCabecalho(sheet, 5, 'Motivo da Retificação')).toBe('Recálculo em Cascata');
    expect(String(valorPorCabecalho(sheet, 5, 'Campos a Retificar'))).toContain(
      'Crédito na Data de Transmissão',
    );
    expect(valorPorCabecalho(sheet, 5, 'Crédito Data Transmissão - Atual')).toBe(900);
    expect(valorPorCabecalho(sheet, 5, 'Crédito Data Transmissão - Correto')).toBe(800);
    expect(valorPorCabecalho(sheet, 5, 'Crédito Inicial - Atual')).toBe(1000);
    expect(valorPorCabecalho(sheet, 5, 'Crédito Inicial - Correto')).toBe(1000);
    expect(valorPorCabecalho(sheet, 5, 'Débitos Compensados - Atual')).toBe(460);
    expect(valorPorCabecalho(sheet, 5, 'Débitos Compensados - Correto')).toBe(460);
    expect(valorPorCabecalho(sheet, 5, 'Crédito Original Usado - Atual')).toBe(500);
    expect(valorPorCabecalho(sheet, 5, 'Crédito Original Usado - Correto')).toBe(500);
    expect(valorPorCabecalho(sheet, 5, 'Saldo Próxima DCOMP - Atual')).toBe(400);
    expect(valorPorCabecalho(sheet, 5, 'Saldo Próxima DCOMP - Correto')).toBe(300);
  });

  it('explica edicoes manuais e impede retificacao de documento nao vigente', () => {
    const manual = criarSimulacaoCompleta();
    manual.dcomps[0].valorTotalCreditoDetalhado = 900;

    const naoVigente = criarSimulacaoCompleta();
    naoVigente.id = 'SIM-NAO-VIGENTE';
    naoVigente.dcomps = [{
      ...naoVigente.dcomps[0],
      situacao: 'Retificado',
      statusCascata: 'RETIFICAR',
      divergenciaDetalhes: { esperado: 900, calculado: 800 },
      statusProcessamentoConsultivo: {
        ...naoVigente.dcomps[0].statusProcessamentoConsultivo!,
        statusOriginal: 'Retificado',
        statusNormalizado: 'retificado',
        vigenciaCascata: 'nao_vigente',
        editabilidadeSimulacao: 'bloqueado',
        cancelabilidade: 'nao_cancelavel',
      },
    }];

    const sheet = buildExcelWorkbook([manual, naoVigente])
      .getWorksheet('Projeção Retificações Cadeias')!;

    expect(valorPorCabecalho(sheet, 5, 'Status Cascata')).toBe('A RETIFICAR');
    expect(String(valorPorCabecalho(sheet, 5, 'Motivo da Retificação'))).toContain(
      'Edição Manual de Débitos',
    );
    expect(String(valorPorCabecalho(sheet, 5, 'Motivo da Retificação'))).toContain(
      'Edição Manual de Saldo de Créditos',
    );
    expect(valorPorCabecalho(sheet, 6, 'Status Cascata')).toBe('IGNORAR - NÃO VIGENTE');
    expect(valorPorCabecalho(sheet, 6, 'Motivo da Retificação')).toBeNull();
  });

  it('diferencia visualmente cabecalhos de valores atuais e corretos', () => {
    const sheet = buildExcelWorkbook([criarSimulacaoCompleta()])
      .getWorksheet('Projeção Retificações Cadeias')!;
    const atual = sheet.getCell(4, colunaPorCabecalho(sheet, 'Crédito Inicial - Atual'));
    const correto = sheet.getCell(4, colunaPorCabecalho(sheet, 'Crédito Inicial - Correto'));

    expect(atual.fill).toMatchObject({ fgColor: { argb: 'FFC8C8C8' } });
    expect(atual.font).toMatchObject({ color: { argb: 'FF000000' } });
    expect(correto.fill).toMatchObject({ fgColor: { argb: 'FF64C864' } });
    expect(correto.font).toMatchObject({ color: { argb: 'FF000000' } });
    expect(sheet.getColumn(colunaPorCabecalho(sheet, 'Status Técnico')).hidden).toBe(true);
    expect(sheet.getColumn(colunaPorCabecalho(sheet, 'ID Simulação')).hidden).toBe(true);
    expect(sheet.getColumn(colunaPorCabecalho(sheet, 'ID Cadeia')).hidden).toBe(true);
  });

  it('reproduz o contrato visual e-CAC em todas as abas', () => {
    const workbook = buildExcelWorkbook([criarSimulacaoCompleta()]);

    workbook.eachSheet((sheet) => {
      expect(sheet.getColumn(1).width).toBe(2.625);
      expect(sheet.properties.defaultRowHeight).toBe(16.5);
      expect(sheet.views).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            state: 'frozen',
            xSplit: 1,
            ySplit: 4,
            topLeftCell: 'B5',
            showGridLines: false,
          }),
        ]),
      );

      const header = sheet.getCell(4, 2);
      expect(header.font).toMatchObject({
        name: 'Segoe UI',
        size: 11,
        bold: true,
        color: { argb: 'FFFFFFFF' },
      });
      expect(header.fill).toMatchObject({
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF00B4FF' },
      });
      expect(header.alignment).toMatchObject({ horizontal: 'center', vertical: 'middle' });
      expect(header.border.top).toMatchObject({ style: 'thin', color: { argb: 'FF000000' } });

      const body = sheet.getCell(5, 2);
      expect(body.font).toMatchObject({ name: 'Segoe UI', size: 11 });
      expect(body.alignment).toMatchObject({ horizontal: 'center', vertical: 'middle' });
      expect(sheet.autoFilter).toBeTruthy();
    });
  });

  it('preserva tipos e formatos de datas, moedas, percentuais, CNPJ e identificadores', () => {
    const workbook = buildExcelWorkbook(
      [criarSimulacaoCompleta()],
      [],
      { cnpj: '00123456000109', razaoSocial: 'Empresa Teste Ltda.' },
      new Date(2026, 5, 22, 14, 30),
    );

    const resumo = workbook.getWorksheet('Resumo')!;
    const cnpj = resumo.getCell(5, colunaPorCabecalho(resumo, 'CNPJ'));
    const emissao = resumo.getCell(5, colunaPorCabecalho(resumo, 'Emissão'));
    const saldo = resumo.getCell(5, colunaPorCabecalho(resumo, 'Saldo Original Total'));
    const identificador = resumo.getCell(5, colunaPorCabecalho(resumo, 'PER/DCOMP Inicial'));

    expect(cnpj.value).toBe(123456000109);
    expect(cnpj.numFmt).toBe('00"."000"."000"/"0000"-"00');
    expect(emissao.value).toBeInstanceOf(Date);
    expect(emissao.numFmt).toBe('dd/mm/yyyy hh:mm');
    expect(saldo.numFmt).toBe(CURRENCY_FORMAT);
    expect(identificador.value).toBe('00001.00001.010124.1.1.01-0001');
    expect(identificador.numFmt).toBe('@');

    const cascata = workbook.getWorksheet('Projeção Retificações Cadeias')!;
    const dataTransmissao = cascata.getCell(5, colunaPorCabecalho(cascata, 'Data Transmissão'));
    expect(dataTransmissao.value).toBeInstanceOf(Date);
    expect(dataTransmissao.numFmt).toBe('dd/mm/yyyy');

    const selic = workbook.getWorksheet('SELIC')!;
    const taxa = selic.getCell(5, colunaPorCabecalho(selic, 'Taxa SELIC'));
    expect(taxa.value).toBe(0.1);
    expect(taxa.numFmt).toBe('0.00%');
  });

  it('aplica SUBTOTAL somente nas colunas monetarias com o range e-CAC', () => {
    const workbook = buildExcelWorkbook([criarSimulacaoCompleta()]);
    const resumo = workbook.getWorksheet('Resumo')!;
    const colunaSaldo = colunaPorCabecalho(resumo, 'Saldo Original Total');
    const colunaSimulacao = colunaPorCabecalho(resumo, 'Simulação');
    const letraSaldo = resumo.getColumn(colunaSaldo).letter;

    expect(resumo.getCell(2, colunaSaldo).value).toEqual({
      formula: `SUBTOTAL(9,${letraSaldo}5:${letraSaldo}1048576)`,
    });
    expect(resumo.getCell(2, colunaSaldo).numFmt).toBe(CURRENCY_FORMAT);
    expect(resumo.getCell(2, colunaSimulacao).value).toBeNull();
  });

  it('aceita snapshots antigos sem SELIC, status consultivo ou rastreabilidade', () => {
    const workbook = buildExcelWorkbook([criarSimulacaoLegada()]);

    expect(workbook.getWorksheet('SELIC')?.getCell(5, 2).value).toBe('SIM-LEGADA');
    expect(workbook.getWorksheet('StatusVigencia')?.getCell(5, 2).value).toBe('SIM-LEGADA');
    expect(workbook.getWorksheet('Evidencias')?.rowCount).toBeGreaterThanOrEqual(5);
  });

  it('expande rastreabilidade de valores e referencias normativas em evidencias', () => {
    const workbook = buildExcelWorkbook([criarSimulacaoCompleta()]);
    const evidencias = workbook.getWorksheet('Evidencias')!;
    const tipoCol = colunaPorCabecalho(evidencias, 'Tipo Evidência');
    const campoCol = colunaPorCabecalho(evidencias, 'Campo');
    const tipos = linhasDeDados(evidencias).map((row) => row.getCell(tipoCol).value);
    const campos = linhasDeDados(evidencias).map((row) => row.getCell(campoCol).value);

    expect(tipos).toContain('valor_rastreado');
    expect(tipos).toContain('fonte_normativa');
    expect(campos).toContain('valorUtilizadoPerdcomp');
  });
});

function colunaPorCabecalho(sheet: NonNullable<ReturnType<ReturnType<typeof buildExcelWorkbook>['getWorksheet']>>, cabecalho: string) {
  const row = sheet.getRow(4);
  for (let column = 2; column <= row.cellCount; column += 1) {
    if (row.getCell(column).value === cabecalho) return column;
  }
  throw new Error(`Cabeçalho não encontrado: ${cabecalho}`);
}

function linhasDeDados(sheet: NonNullable<ReturnType<ReturnType<typeof buildExcelWorkbook>['getWorksheet']>>) {
  const rows = [];
  for (let index = 5; index <= sheet.rowCount; index += 1) rows.push(sheet.getRow(index));
  return rows;
}

function valorPorCabecalho(
  sheet: NonNullable<ReturnType<ReturnType<typeof buildExcelWorkbook>['getWorksheet']>>,
  row: number,
  cabecalho: string,
) {
  return sheet.getCell(row, colunaPorCabecalho(sheet, cabecalho)).value;
}

function criarSimulacaoCompleta(): SimulacaoSalva {
  return {
    id: 'SIM-1',
    dataSalvamento: new Date(2026, 5, 22, 13, 45),
    cadeiaId: 'CADEIA-1',
    numeroDcompInicial: '00001.00001.010124.1.1.01-0001',
    tipoCredito: 'Pagamento Indevido ou a Maior',
    kpis: {
      saldoOriginalTotal: 1000,
      saldoAtualizadoTotal: 1100,
      economiaProjetada: 100,
      lastroOriginalDisponibilizado: 90,
      saldoOriginalRestanteAntigo: 500,
      saldoOriginalRestanteNovo: 600,
    },
    metadadosAuditoria: {
      versaoMotorCalculo: '1.0.1',
      statusCalculoGlobal: 'normativo',
      fontesNormativas: [
        {
          arquivo: 'manual-rfb.pdf',
          ato: 'IN RFB 2.055/2021',
          artigo: 'art. 152',
          paginaOuSecao: 'Atualização do crédito',
          resumo: 'Atualização pela taxa SELIC.',
        },
      ],
      tabelaSelic: {
        fonte: 'Banco Central do Brasil',
        emitidaEm: '2026-06-01',
        coberturaAte: '2026-05',
      },
      hipoteses: ['Taxa SELIC disponível para o período.'],
      dadosAusentes: [],
    },
    rastreabilidadeValores: [
      {
        dcompId: '00001.00001.010124.1.1.01-0001',
        valores: [
          {
            campo: 'valorUtilizadoPerdcomp',
            rotulo: 'Crédito Original Usado',
            valor: 400,
            origemValor: 'calculado_motor',
            metodo: 'selic_normativa_por_tipo_credito',
            statusCalculo: 'normativo',
            dadosAusentes: [],
          },
        ],
      },
    ],
    dcomps: [criarDcompCompleta()],
  };
}

function criarSimulacaoLegada(): SimulacaoSalva {
  const dcomp = criarDcompCompleta();
  delete dcomp.resultadoSelic;
  delete dcomp.statusProcessamentoConsultivo;

  return {
    id: 'SIM-LEGADA',
    dataSalvamento: '2025-12-31T23:59:00.000Z' as unknown as Date,
    cadeiaId: 'CADEIA-LEGADA',
    numeroDcompInicial: '00002.00002.010124.1.1.01-0002',
    tipoCredito: 'Saldo Negativo de IRPJ',
    kpis: {
      saldoOriginalTotal: 900,
      saldoAtualizadoTotal: 950,
      economiaProjetada: 50,
      lastroOriginalDisponibilizado: 45,
      saldoOriginalRestanteAntigo: 400,
      saldoOriginalRestanteNovo: 450,
    },
    dcomps: [{ ...dcomp, id: '00002.00002.010124.1.1.01-0002', idCadeiaRelacional: 'CADEIA-LEGADA' }],
  };
}

function criarDcompCompleta(): DCOMP {
  return {
    id: '00001.00001.010124.1.1.01-0001',
    dataTransmissaoOriginal: new Date(2024, 1, 10),
    dataTransmissao: '2024-02-10T00:00:00.000Z' as unknown as Date,
    tipoDocumento: 'Declaração de Compensação',
    situacao: 'Em análise',
    indicadorCredito: '1',
    tipoCredito: 'Pagamento Indevido ou a Maior',
    detentorCredito: 'Empresa Teste Ltda.',
    periodoApuracaoCredito: '01/2024',
    valorTotalCreditoDetalhado: 1000,
    valorTotalCreditoDetalhadoOriginal: 1000,
    valorCreditoDataTransmissao: 1100,
    valorUtilizadoPerdcomp: 400,
    valorUtilizadoPerdcompOriginal: 500,
    saldoCreditoOriginalCalculado: 600,
    saldoCreditoOriginalAnterior: 500,
    statusCascata: 'EDITADO',
    isManuallyEdited: true,
    idCadeiaRelacional: 'CADEIA-1',
    metadadosCreditoImportado: {
      cnpjOrigem: '00123456000109',
      dataExtracao: new Date(2026, 5, 6),
      dataArrecadacaoCredito: new Date(2024, 0, 15),
      competenciaCredito: '01/2024',
      numeroPagamento: '000000000000001',
      processoJudicial: '0000000-00.2024.4.03.0000',
    },
    statusProcessamentoConsultivo: {
      statusOriginal: 'Em análise',
      statusNormalizado: 'em analise',
      tipoDocumentoOriginal: 'Declaração de Compensação',
      tipoDocumentoNormalizado: 'declaracao de compensacao',
      vigenciaCascata: 'vigente',
      editabilidadeSimulacao: 'editavel',
      cancelabilidade: 'cancelavel',
      motivos: ['documento_em_analise_vigente_editavel'],
      fontesNormativas: [],
    },
    resultadoSelic: {
      statusCalculo: 'normativo',
      metodo: 'selic_normativa_por_tipo_credito',
      origemValor: 'calculado_motor',
      fontesNormativas: [],
      dadosUsados: ['tipoCredito', 'taxaSelicDecimal'],
      dadosAusentes: [],
      hipoteses: [],
      alertas: [],
      valor: {
        taxaSelicDecimal: 0.1,
        valorCreditoAtualizado: 1100,
        creditoOriginalUtilizadoCalculado: 400,
        saldoCreditoOriginalCalculado: 600,
        tipoCreditoId: 'pagamento_indevido_maior',
        termoInicialMes: '2024-01',
        termoFinalMes: '2024-02',
        dataEntregaValoracao: new Date(2024, 1, 10),
      },
    },
    debitos: [
      {
        id: 'DEB-0001',
        codigoReceita: '0012-01',
        periodoApuracao: '01/2024',
        dataVencimento: '20/02/2024',
        valorPrincipal: 300,
        valorMulta: 20,
        valorJuros: 30,
        valorTotal: 350,
        valorPrincipalOriginal: 400,
        valorMultaOriginal: 25,
        valorJurosOriginal: 35,
        valorTotalOriginal: 460,
        cnpjDebito: '00123456000109',
        numeroReciboPerDcomp: '00000000000000001',
      },
    ],
  };
}
