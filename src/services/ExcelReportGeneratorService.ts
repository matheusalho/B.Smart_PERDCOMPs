import ExcelJS from 'exceljs';
import type { Workbook, Worksheet } from 'exceljs';

import type {
  CadeiaRelacional,
  DCOMP,
  Empresa,
  SimulacaoSalva,
} from '../models/types';
import type { FonteNormativa } from './normativo/types';
import {
  bodyFont,
  createReportSheet,
  DATA_START_ROW,
  ECAC_CURRENCY_FORMAT,
  formatFileTimestamp,
  joinFontes,
  joinList,
  toExcelDate,
  toExcelMonth,
  WIDTH,
  type ReportColumn,
  type RowInput,
} from './excel/workbookKit';
import {
  formatVigencia,
  getProjectionValues,
  getVigencia,
  hasManualDebitEdit,
  hasMeaningfulDifference,
  isHypothetical,
  type ProjectionValues,
} from './excel/dcompFacts';

export { ECAC_CURRENCY_FORMAT };

type OperationalStatus =
  | 'A RETIFICAR'
  | 'IGNORAR - NÃO VIGENTE'
  | 'REVISAR - BLOQUEADO'
  | 'TRANSMITIR NOVA PER/DCOMP'
  | 'SEM RETIFICAÇÃO';


export function buildExcelWorkbook(
  simulacoes: SimulacaoSalva[],
  _todasAsCadeias: CadeiaRelacional[] = [],
  empresa: Empresa | null = null,
  emitidoEm: Date = new Date(),
): Workbook {
  void _todasAsCadeias;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'B.Smart PER/DCOMPs';
  workbook.company = empresa?.razaoSocial ?? 'B.Smart PER/DCOMPs';
  workbook.created = emitidoEm;
  workbook.modified = emitidoEm;
  workbook.calcProperties.fullCalcOnLoad = true;

  const projectionRows = buildProjectionRows(simulacoes);
  const projectionSheet = createReportSheet(
    workbook,
    'Projeção Retificações Cadeias',
    projectionColumns,
    projectionRows,
  );
  applyProjectionStatusStyles(projectionSheet, projectionColumns, projectionRows);
  createReportSheet(workbook, 'Resumo', resumoColumns, buildResumoRows(simulacoes, empresa, emitidoEm));
  createReportSheet(workbook, 'Premissas', premissasColumns, buildPremissasRows(simulacoes));
  createReportSheet(workbook, 'Debitos', debitosColumns, buildDebitosRows(simulacoes));
  createReportSheet(workbook, 'SELIC', selicColumns, buildSelicRows(simulacoes));
  createReportSheet(workbook, 'StatusVigencia', statusColumns, buildStatusRows(simulacoes));
  createReportSheet(workbook, 'Evidencias', evidenciasColumns, buildEvidenciasRows(simulacoes));

  return workbook;
}

export async function generateExcelReport(
  simulacoes: SimulacaoSalva[],
  todasAsCadeias: CadeiaRelacional[] = [],
  empresa: Empresa | null = null,
): Promise<void> {
  if (simulacoes.length === 0) {
    throw new Error('Não há simulações salvas para exportar.');
  }

  const emitidoEm = new Date();
  const workbook = buildExcelWorkbook(simulacoes, todasAsCadeias, empresa, emitidoEm);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = `Relatorio_Consolidado_Simulacoes_${formatFileTimestamp(emitidoEm)}.xlsx`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const resumoColumns: ReportColumn[] = [
  { key: 'empresa', header: 'Empresa', width: WIDTH.maximum, wrap: true },
  { key: 'cnpj', header: 'CNPJ', kind: 'cnpj', width: WIDTH.date },
  { key: 'emissao', header: 'Emissão', kind: 'datetime', width: WIDTH.date },
  { key: 'simulacaoId', header: 'Simulação', width: WIDTH.regular },
  { key: 'salvamento', header: 'Salvamento', kind: 'datetime', width: WIDTH.date },
  { key: 'cadeiaId', header: 'Cadeia', width: WIDTH.regular },
  { key: 'numeroDcompInicial', header: 'PER/DCOMP Inicial', width: WIDTH.wide },
  { key: 'tipoCredito', header: 'Tipo de Crédito', width: WIDTH.maximum, wrap: true },
  { key: 'quantidadeDcomps', header: 'DCOMPs', kind: 'integer', width: WIDTH.short },
  { key: 'quantidadeDebitos', header: 'Débitos', kind: 'integer', width: WIDTH.short },
  { key: 'saldoOriginalTotal', header: 'Saldo Original Total', kind: 'currency', width: WIDTH.regular },
  { key: 'saldoAtualizadoTotal', header: 'Saldo Atualizado Total', kind: 'currency', width: WIDTH.regular },
  { key: 'economiaProjetada', header: 'Economia Projetada', kind: 'currency', width: WIDTH.regular },
  { key: 'lastroOriginalDisponibilizado', header: 'Lastro Original Disponibilizado', kind: 'currency', width: WIDTH.wide },
  { key: 'saldoOriginalRestanteAntigo', header: 'Saldo Original Restante Antigo', kind: 'currency', width: WIDTH.wide },
  { key: 'saldoOriginalRestanteNovo', header: 'Saldo Original Restante Novo', kind: 'currency', width: WIDTH.wide },
  { key: 'versaoMotor', header: 'Versão Motor', width: WIDTH.medium },
  { key: 'statusCalculo', header: 'Status Cálculo', width: WIDTH.regular },
];

const premissasColumns: ReportColumn[] = [
  { key: 'categoria', header: 'Categoria', width: WIDTH.regular },
  { key: 'simulacaoId', header: 'Simulação', width: WIDTH.regular },
  { key: 'codigo', header: 'Código', width: WIDTH.medium },
  { key: 'descricao', header: 'Descrição', width: WIDTH.maximum, wrap: true },
  { key: 'referencia', header: 'Referência / Status', width: WIDTH.maximum, wrap: true },
];

const projectionColumns: ReportColumn[] = [
  { key: 'cadeiaRaiz', header: 'Cadeia (PER/DCOMP Raiz)', width: WIDTH.wide },
  { key: 'dcompId', header: 'PER/DCOMP', width: WIDTH.wide },
  { key: 'dataTransmissaoOriginal', header: 'Data Transmissão Original', kind: 'date', width: WIDTH.date },
  { key: 'dataTransmissao', header: 'Data Transmissão', kind: 'date', width: WIDTH.date },
  { key: 'tipoDocumento', header: 'Tipo Documento', width: WIDTH.description, wrap: true },
  { key: 'situacao', header: 'Situação', width: WIDTH.regular, wrap: true },
  { key: 'vigencia', header: 'Vigência', width: WIDTH.medium },
  { key: 'tipoCredito', header: 'Tipo de Crédito', width: WIDTH.maximum, wrap: true },
  { key: 'statusCascata', header: 'Status Cascata', width: WIDTH.regular },
  { key: 'camposRetificar', header: 'Campos a Retificar', width: WIDTH.maximum, wrap: true, align: 'left' },
  { key: 'motivoRetificacao', header: 'Motivo da Retificação', width: WIDTH.maximum, wrap: true, align: 'left' },
  { key: 'orientacaoOperacional', header: 'Orientação Operacional', width: WIDTH.maximum, wrap: true, align: 'left' },
  { key: 'creditoInicialAtual', header: 'Crédito Inicial - Atual', kind: 'currency', width: WIDTH.regular, headerRole: 'current' },
  { key: 'creditoInicialCorreto', header: 'Crédito Inicial - Correto', kind: 'currency', width: WIDTH.regular, headerRole: 'correct' },
  { key: 'creditoTransmissaoAtual', header: 'Crédito Data Transmissão - Atual', kind: 'currency', width: WIDTH.regular, headerRole: 'current' },
  { key: 'creditoTransmissaoCorreto', header: 'Crédito Data Transmissão - Correto', kind: 'currency', width: WIDTH.regular, headerRole: 'correct' },
  { key: 'debitosAtuais', header: 'Débitos Compensados - Atual', kind: 'currency', width: WIDTH.regular, headerRole: 'current' },
  { key: 'debitosCorretos', header: 'Débitos Compensados - Correto', kind: 'currency', width: WIDTH.regular, headerRole: 'correct' },
  { key: 'creditoUsadoAtual', header: 'Crédito Original Usado - Atual', kind: 'currency', width: WIDTH.regular, headerRole: 'current' },
  { key: 'creditoUsadoCorreto', header: 'Crédito Original Usado - Correto', kind: 'currency', width: WIDTH.regular, headerRole: 'correct' },
  { key: 'saldoProximaAtual', header: 'Saldo Próxima DCOMP - Atual', kind: 'currency', width: WIDTH.regular, headerRole: 'current' },
  { key: 'saldoProximaCorreto', header: 'Saldo Próxima DCOMP - Correto', kind: 'currency', width: WIDTH.regular, headerRole: 'correct' },
  { key: 'indicadorCredito', header: 'Indicador Crédito', width: WIDTH.medium, hidden: true },
  { key: 'statusTecnico', header: 'Status Técnico', width: WIDTH.regular, hidden: true },
  { key: 'simulacaoId', header: 'ID Simulação', width: WIDTH.regular, hidden: true },
  { key: 'cadeiaId', header: 'ID Cadeia', width: WIDTH.regular, hidden: true },
];

const debitosColumns: ReportColumn[] = [
  { key: 'simulacaoId', header: 'Simulação', width: WIDTH.regular },
  { key: 'cadeiaId', header: 'Cadeia', width: WIDTH.regular },
  { key: 'dcompId', header: 'PER/DCOMP', width: WIDTH.wide },
  { key: 'debitoId', header: 'ID Débito', width: WIDTH.regular },
  { key: 'codigoReceita', header: 'Código Receita', width: WIDTH.medium },
  { key: 'periodoApuracao', header: 'Período Apuração', kind: 'month', width: WIDTH.date },
  { key: 'dataVencimento', header: 'Data Vencimento', kind: 'date', width: WIDTH.date },
  { key: 'cnpjDebito', header: 'CNPJ Débito', kind: 'cnpj', width: WIDTH.date },
  { key: 'reciboPerDcomp', header: 'Recibo PER/DCOMP', width: WIDTH.wide },
  { key: 'reciboDctf', header: 'Recibo DCTF', width: WIDTH.wide },
  { key: 'principalOriginal', header: 'Principal Original', kind: 'currency', width: WIDTH.regular },
  { key: 'principalAtual', header: 'Principal Recalculado', kind: 'currency', width: WIDTH.regular },
  { key: 'deltaPrincipal', header: 'Delta Principal', kind: 'currency', width: WIDTH.regular },
  { key: 'multaOriginal', header: 'Multa Original', kind: 'currency', width: WIDTH.regular },
  { key: 'multaAtual', header: 'Multa Recalculada', kind: 'currency', width: WIDTH.regular },
  { key: 'deltaMulta', header: 'Delta Multa', kind: 'currency', width: WIDTH.regular },
  { key: 'jurosOriginal', header: 'Juros Originais', kind: 'currency', width: WIDTH.regular },
  { key: 'jurosAtual', header: 'Juros Recalculados', kind: 'currency', width: WIDTH.regular },
  { key: 'deltaJuros', header: 'Delta Juros', kind: 'currency', width: WIDTH.regular },
  { key: 'totalOriginal', header: 'Total Original', kind: 'currency', width: WIDTH.regular },
  { key: 'totalAtual', header: 'Total Recalculado', kind: 'currency', width: WIDTH.regular },
  { key: 'deltaTotal', header: 'Delta Total', kind: 'currency', width: WIDTH.regular },
];

const selicColumns: ReportColumn[] = [
  { key: 'simulacaoId', header: 'Simulação', width: WIDTH.regular },
  { key: 'cadeiaId', header: 'Cadeia', width: WIDTH.regular },
  { key: 'dcompId', header: 'PER/DCOMP', width: WIDTH.wide },
  { key: 'statusCalculo', header: 'Status Cálculo', width: WIDTH.regular },
  { key: 'metodo', header: 'Método', width: WIDTH.maximum, wrap: true },
  { key: 'origem', header: 'Origem', width: WIDTH.regular },
  { key: 'taxaSelic', header: 'Taxa SELIC', kind: 'percentage', width: WIDTH.medium },
  { key: 'termoInicial', header: 'Termo Inicial', kind: 'month', width: WIDTH.date },
  { key: 'termoFinal', header: 'Termo Final', kind: 'month', width: WIDTH.date },
  { key: 'dataEntrega', header: 'Data Entrega / Valoração', kind: 'date', width: WIDTH.date },
  { key: 'creditoAtualizado', header: 'Crédito Atualizado', kind: 'currency', width: WIDTH.regular },
  { key: 'creditoUtilizado', header: 'Crédito Original Utilizado', kind: 'currency', width: WIDTH.regular },
  { key: 'saldoCalculado', header: 'Saldo Original Calculado', kind: 'currency', width: WIDTH.regular },
  { key: 'dadosUsados', header: 'Dados Usados', width: WIDTH.maximum, wrap: true },
  { key: 'dadosAusentes', header: 'Dados Ausentes', width: WIDTH.maximum, wrap: true },
  { key: 'hipoteses', header: 'Hipóteses', width: WIDTH.maximum, wrap: true },
  { key: 'alertas', header: 'Alertas', width: WIDTH.maximum, wrap: true },
];

const statusColumns: ReportColumn[] = [
  { key: 'simulacaoId', header: 'Simulação', width: WIDTH.regular },
  { key: 'cadeiaId', header: 'Cadeia', width: WIDTH.regular },
  { key: 'dcompId', header: 'PER/DCOMP', width: WIDTH.wide },
  { key: 'statusOriginal', header: 'Situação Original', width: WIDTH.description, wrap: true },
  { key: 'statusNormalizado', header: 'Situação Normalizada', width: WIDTH.description, wrap: true },
  { key: 'tipoOriginal', header: 'Tipo Documento Original', width: WIDTH.description, wrap: true },
  { key: 'tipoNormalizado', header: 'Tipo Documento Normalizado', width: WIDTH.description, wrap: true },
  { key: 'vigencia', header: 'Vigência', width: WIDTH.medium },
  { key: 'editabilidade', header: 'Editabilidade', width: WIDTH.medium },
  { key: 'cancelabilidade', header: 'Cancelabilidade', width: WIDTH.medium },
  { key: 'motivos', header: 'Motivos', width: WIDTH.maximum, wrap: true },
  { key: 'fontes', header: 'Fontes Normativas', width: WIDTH.maximum, wrap: true },
];

const evidenciasColumns: ReportColumn[] = [
  { key: 'simulacaoId', header: 'Simulação', width: WIDTH.regular },
  { key: 'tipoEvidencia', header: 'Tipo Evidência', width: WIDTH.regular },
  { key: 'dcompId', header: 'PER/DCOMP', width: WIDTH.wide },
  { key: 'campo', header: 'Campo', width: WIDTH.regular },
  { key: 'rotulo', header: 'Rótulo', width: WIDTH.description, wrap: true },
  { key: 'valor', header: 'Valor Rastreado', kind: 'currency', width: WIDTH.regular },
  { key: 'origem', header: 'Origem', width: WIDTH.regular },
  { key: 'metodo', header: 'Método', width: WIDTH.maximum, wrap: true },
  { key: 'status', header: 'Status', width: WIDTH.regular },
  { key: 'dadosAusentes', header: 'Dados Ausentes', width: WIDTH.maximum, wrap: true },
  { key: 'arquivo', header: 'Arquivo', width: WIDTH.maximum, wrap: true },
  { key: 'ato', header: 'Ato', width: WIDTH.description, wrap: true },
  { key: 'artigo', header: 'Artigo', width: WIDTH.regular },
  { key: 'paginaSecao', header: 'Página / Seção', width: WIDTH.description, wrap: true },
  { key: 'resumoFonte', header: 'Resumo da Fonte', width: WIDTH.maximum, wrap: true },
];

function buildResumoRows(simulacoes: SimulacaoSalva[], empresa: Empresa | null, emitidoEm: Date): RowInput[] {
  return simulacoes.map((simulacao) => ({
    empresa: empresa?.razaoSocial ?? '',
    cnpj: empresa?.cnpj ?? '',
    emissao: emitidoEm,
    simulacaoId: simulacao.id,
    salvamento: toExcelDate(simulacao.dataSalvamento, true),
    cadeiaId: simulacao.cadeiaId,
    numeroDcompInicial: simulacao.numeroDcompInicial,
    tipoCredito: simulacao.tipoCredito,
    quantidadeDcomps: simulacao.dcomps.length,
    quantidadeDebitos: simulacao.dcomps.reduce((total, dcomp) => total + dcomp.debitos.length, 0),
    saldoOriginalTotal: simulacao.kpis.saldoOriginalTotal,
    saldoAtualizadoTotal: simulacao.kpis.saldoAtualizadoTotal,
    economiaProjetada: simulacao.kpis.economiaProjetada,
    lastroOriginalDisponibilizado: simulacao.kpis.lastroOriginalDisponibilizado,
    saldoOriginalRestanteAntigo: simulacao.kpis.saldoOriginalRestanteAntigo,
    saldoOriginalRestanteNovo: simulacao.kpis.saldoOriginalRestanteNovo,
    versaoMotor: simulacao.metadadosAuditoria?.versaoMotorCalculo ?? '',
    statusCalculo: simulacao.metadadosAuditoria?.statusCalculoGlobal ?? '',
  }));
}

function buildPremissasRows(simulacoes: SimulacaoSalva[]): RowInput[] {
  const rows: RowInput[] = [
    premissa('Classe metodológica', '', 'IMPORTADO', 'Valor preservado do relatório e-CAC/RFB.', 'importado_rfb'),
    premissa('Classe metodológica', '', 'CALCULADO', 'Valor produzido pelo motor sem sobrescrever o original.', 'calculado_motor'),
    premissa('Classe metodológica', '', 'SIMULADO', 'Valor decorrente de edição ou inclusão feita pelo usuário.', 'simulado_usuario'),
    premissa('Classe metodológica', '', 'FALLBACK', 'Estimativa operacional usada quando faltam dados normativos.', 'fallback_operacional'),
    premissa('Roteiro de retificações', '', 'ATUAL', 'Cabeçalho cinza: valor atual importado ou histórico reconstruído a partir do e-CAC.', 'R: 200; G: 200; B: 200'),
    premissa('Roteiro de retificações', '', 'CORRETO', 'Cabeçalho verde: valor correto projetado pelo recálculo preservado no snapshot.', 'R: 100; G: 200; B: 100'),
    premissa('Roteiro de retificações', '', 'STATUS', 'A RETIFICAR exige ação; IGNORAR - NÃO VIGENTE não deve receber retificadora.', 'Projeção Retificações Cadeias'),
  ];

  for (const [codigo, descricao] of Object.entries(BADGE_GLOSSARY)) {
    rows.push(premissa('Glossário de indicadores', '', codigo, descricao, 'Indicadores de rastreabilidade'));
  }

  for (const simulacao of simulacoes) {
    const auditoria = simulacao.metadadosAuditoria;
    rows.push(
      premissa('Motor de cálculo', simulacao.id, 'VERSÃO', auditoria?.versaoMotorCalculo ?? 'Não registrada', auditoria?.statusCalculoGlobal ?? 'Não registrado'),
    );
    if (auditoria?.tabelaSelic) {
      rows.push(
        premissa(
          'Tabela SELIC',
          simulacao.id,
          'FONTE',
          auditoria.tabelaSelic.fonte,
          [
            auditoria.tabelaSelic.emitidaEm && `Emitida em: ${auditoria.tabelaSelic.emitidaEm}`,
            auditoria.tabelaSelic.coberturaAte && `Cobertura até: ${auditoria.tabelaSelic.coberturaAte}`,
          ].filter(Boolean).join('; '),
        ),
      );
    }
    for (const hipotese of auditoria?.hipoteses ?? []) {
      rows.push(premissa('Hipótese', simulacao.id, 'HIP', hipotese, auditoria?.statusCalculoGlobal ?? 'Não registrado'));
    }
    for (const dado of auditoria?.dadosAusentes ?? []) {
      rows.push(premissa('Dado ausente', simulacao.id, 'DADOS', dado, auditoria?.statusCalculoGlobal ?? 'Não registrado'));
    }
  }

  return rows;
}

function buildProjectionRows(simulacoes: SimulacaoSalva[]): RowInput[] {
  return simulacoes.flatMap((simulacao) =>
    simulacao.dcomps.map((dcomp, dcompIndex) => {
      const valores = getProjectionValues(dcomp);
      const vigencia = getVigencia(dcomp);
      const edicaoManualDebitos = hasManualDebitEdit(dcomp);
      const edicaoManualCredito = dcompIndex === 0 && hasMeaningfulDifference(
        valores.creditoInicialAtual,
        valores.creditoInicialCorreto,
      );
      const recalculoCascata = dcomp.statusCascata === 'RETIFICAR' ||
        dcomp.statusCascata === 'EDITADO_E_RETIFICAR';
      const statusOperacional = getOperationalStatus({
        dcomp,
        vigencia,
        edicaoManualDebitos,
        edicaoManualCredito,
        recalculoCascata,
      });
      const camposDivergentes = getChangedProjectionFields(valores);
      const motivos = statusOperacional === 'A RETIFICAR'
        ? [
            edicaoManualDebitos && 'Edição Manual de Débitos',
            edicaoManualCredito && 'Edição Manual de Saldo de Créditos',
            recalculoCascata && 'Recálculo em Cascata',
          ].filter((value): value is string => Boolean(value))
        : [];
      const camposRetificar = statusOperacional === 'A RETIFICAR'
        ? camposDivergentes.join('; ') || 'Divergência da cascata não detalhada no snapshot'
        : null;

      return {
        cadeiaRaiz: simulacao.numeroDcompInicial,
        simulacaoId: simulacao.id,
        cadeiaId: simulacao.cadeiaId,
        dcompId: dcomp.id,
        dataTransmissaoOriginal: toExcelDate(dcomp.dataTransmissaoOriginal),
        dataTransmissao: toExcelDate(dcomp.dataTransmissao),
        tipoDocumento: dcomp.tipoDocumento,
        situacao: dcomp.situacao,
        vigencia: formatVigencia(vigencia),
        tipoCredito: dcomp.tipoCredito,
        indicadorCredito: dcomp.indicadorCredito,
        statusCascata: statusOperacional,
        camposRetificar,
        motivoRetificacao: motivos.join('; ') || null,
        orientacaoOperacional: getOperationalGuidance(statusOperacional, camposDivergentes.length > 0),
        ...valores,
        statusTecnico: dcomp.statusCascata ?? '',
      };
    }),
  );
}

function buildDebitosRows(simulacoes: SimulacaoSalva[]): RowInput[] {
  return simulacoes.flatMap((simulacao) =>
    simulacao.dcomps.flatMap((dcomp) =>
      dcomp.debitos.map((debito) => ({
        simulacaoId: simulacao.id,
        cadeiaId: simulacao.cadeiaId,
        dcompId: dcomp.id,
        debitoId: debito.id,
        codigoReceita: debito.codigoReceita,
        periodoApuracao: toExcelMonth(debito.periodoApuracao),
        dataVencimento: toExcelDate(debito.dataVencimento),
        cnpjDebito: debito.cnpjDebito ?? '',
        reciboPerDcomp: debito.numeroReciboPerDcomp ?? '',
        reciboDctf: debito.numeroReciboTransmissaoDctf ?? '',
        principalOriginal: debito.valorPrincipalOriginal,
        principalAtual: debito.valorPrincipal,
        deltaPrincipal: debito.valorPrincipal - debito.valorPrincipalOriginal,
        multaOriginal: debito.valorMultaOriginal,
        multaAtual: debito.valorMulta,
        deltaMulta: debito.valorMulta - debito.valorMultaOriginal,
        jurosOriginal: debito.valorJurosOriginal,
        jurosAtual: debito.valorJuros,
        deltaJuros: debito.valorJuros - debito.valorJurosOriginal,
        totalOriginal: debito.valorTotalOriginal,
        totalAtual: debito.valorTotal,
        deltaTotal: debito.valorTotal - debito.valorTotalOriginal,
      })),
    ),
  );
}

function buildSelicRows(simulacoes: SimulacaoSalva[]): RowInput[] {
  return simulacoes.flatMap((simulacao) =>
    simulacao.dcomps.map((dcomp) => {
      const resultado = dcomp.resultadoSelic;
      return {
        simulacaoId: simulacao.id,
        cadeiaId: simulacao.cadeiaId,
        dcompId: dcomp.id,
        statusCalculo: resultado?.statusCalculo ?? '',
        metodo: resultado?.metodo ?? '',
        origem: resultado?.origemValor ?? '',
        taxaSelic: resultado?.valor?.taxaSelicDecimal ?? null,
        termoInicial: toExcelMonth(resultado?.valor?.termoInicialMes),
        termoFinal: toExcelMonth(resultado?.valor?.termoFinalMes),
        dataEntrega: toExcelDate(resultado?.valor?.dataEntregaValoracao),
        creditoAtualizado: resultado?.valor?.valorCreditoAtualizado ?? null,
        creditoUtilizado: resultado?.valor?.creditoOriginalUtilizadoCalculado ?? null,
        saldoCalculado: resultado?.valor?.saldoCreditoOriginalCalculado ?? null,
        dadosUsados: joinList(resultado?.dadosUsados),
        dadosAusentes: joinList(resultado?.dadosAusentes),
        hipoteses: joinList(resultado?.hipoteses),
        alertas: joinList(resultado?.alertas),
      };
    }),
  );
}

function buildStatusRows(simulacoes: SimulacaoSalva[]): RowInput[] {
  return simulacoes.flatMap((simulacao) =>
    simulacao.dcomps.map((dcomp) => {
      const status = dcomp.statusProcessamentoConsultivo;
      return {
        simulacaoId: simulacao.id,
        cadeiaId: simulacao.cadeiaId,
        dcompId: dcomp.id,
        statusOriginal: status?.statusOriginal ?? dcomp.situacao,
        statusNormalizado: status?.statusNormalizado ?? '',
        tipoOriginal: status?.tipoDocumentoOriginal ?? dcomp.tipoDocumento,
        tipoNormalizado: status?.tipoDocumentoNormalizado ?? '',
        vigencia: status?.vigenciaCascata ?? '',
        editabilidade: status?.editabilidadeSimulacao ?? '',
        cancelabilidade: status?.cancelabilidade ?? '',
        motivos: joinList(status?.motivos),
        fontes: joinFontes(status?.fontesNormativas),
      };
    }),
  );
}

function buildEvidenciasRows(simulacoes: SimulacaoSalva[]): RowInput[] {
  const rows: RowInput[] = [];

  for (const simulacao of simulacoes) {
    for (const dcompTrace of simulacao.rastreabilidadeValores ?? []) {
      for (const trace of dcompTrace.valores) {
        rows.push({
          simulacaoId: simulacao.id,
          tipoEvidencia: 'valor_rastreado',
          dcompId: dcompTrace.dcompId,
          campo: trace.campo,
          rotulo: trace.rotulo,
          valor: trace.valor,
          origem: trace.origemValor,
          metodo: trace.metodo,
          status: trace.statusCalculo ?? '',
          dadosAusentes: joinList(trace.dadosAusentes),
        });
      }
    }

    addFonteRows(rows, simulacao.id, '', 'auditoria_simulacao', simulacao.metadadosAuditoria?.fontesNormativas);

    for (const dcomp of simulacao.dcomps) {
      addFonteRows(rows, simulacao.id, dcomp.id, 'fonte_selic', dcomp.resultadoSelic?.fontesNormativas);
      addFonteRows(rows, simulacao.id, dcomp.id, 'fonte_status', dcomp.statusProcessamentoConsultivo?.fontesNormativas);
      addFonteRows(rows, simulacao.id, dcomp.id, 'fonte_credito', dcomp.classificacaoCreditoConsultiva?.fontesNormativas);
    }

    if (!rows.some((row) => row.simulacaoId === simulacao.id)) {
      rows.push({
        simulacaoId: simulacao.id,
        tipoEvidencia: 'ausencia_rastreabilidade',
        dcompId: '',
        campo: '',
        rotulo: 'Snapshot sem rastreabilidade ou fonte normativa preservada.',
        valor: null,
        origem: '',
        metodo: '',
        status: 'dados_ausentes',
        dadosAusentes: 'rastreabilidadeValores; fontesNormativas',
      });
    }
  }

  return rows;
}

function getOperationalStatus(input: {
  dcomp: DCOMP;
  vigencia: ReturnType<typeof getVigencia>;
  edicaoManualDebitos: boolean;
  edicaoManualCredito: boolean;
  recalculoCascata: boolean;
}): OperationalStatus {
  const {
    dcomp,
    vigencia,
    edicaoManualDebitos,
    edicaoManualCredito,
    recalculoCascata,
  } = input;

  if (vigencia === 'nao_vigente') return 'IGNORAR - NÃO VIGENTE';
  if (isHypothetical(dcomp)) return 'TRANSMITIR NOVA PER/DCOMP';
  if (
    dcomp.statusCascata === 'BLOQUEADO' ||
    dcomp.statusCascata === 'IMPACTADO_BLOQUEADO' ||
    dcomp.statusProcessamentoConsultivo?.editabilidadeSimulacao === 'bloqueado'
  ) {
    return 'REVISAR - BLOQUEADO';
  }
  if (
    edicaoManualDebitos ||
    edicaoManualCredito ||
    recalculoCascata ||
    dcomp.statusCascata === 'EDITADO'
  ) {
    return 'A RETIFICAR';
  }
  return 'SEM RETIFICAÇÃO';
}

function getChangedProjectionFields(values: ProjectionValues): string[] {
  return [
    ['Valor do Crédito Inicial', values.creditoInicialAtual, values.creditoInicialCorreto],
    ['Crédito na Data de Transmissão', values.creditoTransmissaoAtual, values.creditoTransmissaoCorreto],
    ['Débitos Compensados', values.debitosAtuais, values.debitosCorretos],
    ['Crédito Original Utilizado', values.creditoUsadoAtual, values.creditoUsadoCorreto],
    ['Saldo para a Próxima DCOMP', values.saldoProximaAtual, values.saldoProximaCorreto],
  ]
    .filter(([, current, correct]) =>
      hasMeaningfulDifference(current as number, correct as number),
    )
    .map(([label]) => label as string);
}

function getOperationalGuidance(status: OperationalStatus, hasDetailedFields: boolean): string {
  switch (status) {
    case 'A RETIFICAR':
      return hasDetailedFields
        ? 'Transmitir retificadora. Alterar os campos listados usando os valores dos cabeçalhos verdes.'
        : 'Transmitir retificadora após revisar a divergência registrada no snapshot.';
    case 'IGNORAR - NÃO VIGENTE':
      return 'Não retificar. Documento fora da cadeia vigente.';
    case 'REVISAR - BLOQUEADO':
      return 'Não transmitir retificadora sem revisão: documento bloqueado.';
    case 'TRANSMITIR NOVA PER/DCOMP':
      return 'Transmitir nova PER/DCOMP; não tratar como retificadora.';
    default:
      return 'Nenhuma retificação indicada.';
  }
}

function applyProjectionStatusStyles(
  worksheet: Worksheet,
  columns: ReportColumn[],
  rows: RowInput[],
): void {
  const statusColumn = columns.findIndex((column) => column.key === 'statusCascata') + 2;
  if (statusColumn < 2) return;

  const statusFills: Record<OperationalStatus, string> = {
    'A RETIFICAR': 'FFFFD966',
    'IGNORAR - NÃO VIGENTE': 'FFD9D9D9',
    'REVISAR - BLOQUEADO': 'FFF4B183',
    'TRANSMITIR NOVA PER/DCOMP': 'FF9DC3E6',
    'SEM RETIFICAÇÃO': 'FFC6E0B4',
  };

  rows.forEach((row, index) => {
    const status = row.statusCascata as OperationalStatus;
    const cell = worksheet.getCell(DATA_START_ROW + index, statusColumn);
    cell.font = { ...bodyFont, bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: statusFills[status] },
    };
  });
}

function premissa(
  categoria: string,
  simulacaoId: string,
  codigo: string,
  descricao: string,
  referencia: string,
): RowInput {
  return { categoria, simulacaoId, codigo, descricao, referencia };
}

function addFonteRows(
  rows: RowInput[],
  simulacaoId: string,
  dcompId: string,
  contextoFonte: string,
  fontes: FonteNormativa[] | undefined,
): void {
  for (const fonte of fontes ?? []) {
    rows.push({
      simulacaoId,
      tipoEvidencia: 'fonte_normativa',
      dcompId,
      campo: contextoFonte,
      rotulo: '',
      valor: null,
      origem: '',
      metodo: '',
      status: '',
      dadosAusentes: '',
      arquivo: fonte.arquivo ?? '',
      ato: fonte.ato ?? '',
      artigo: fonte.artigo ?? '',
      paginaSecao: fonte.paginaOuSecao ?? '',
      resumoFonte: fonte.resumo,
    });
  }
}


const BADGE_GLOSSARY: Record<string, string> = {
  RFB: 'Valor importado da Receita Federal do Brasil.',
  ECAC: 'Valor ou metadado proveniente do relatório de análise e-CAC.',
  CALC: 'Valor calculado pelo motor do B.Smart.',
  SELIC: 'Cálculo que utiliza atualização pela taxa SELIC.',
  NORM: 'Resultado classificado como normativo com dados suficientes.',
  SIM: 'Valor criado ou alterado em simulação do usuário.',
  EDIC: 'Registro afetado por edição manual.',
  FALL: 'Fallback operacional usado na ausência de dado normativo suficiente.',
  EST: 'Resultado tratado como estimativa histórica.',
  DADOS: 'Cálculo ou classificação com dados ausentes.',
  PARC: 'Resultado parcialmente normativo ou parcialmente rastreável.',
  CASC: 'Valor derivado da propagação da cascata de PER/DCOMPs.',
  DIV: 'Divergência identificada entre valores comparados.',
  HIP: 'Documento ou valor hipotético criado na simulação.',
  RAIZ: 'Valor replicado a partir do crédito raiz da cadeia.',
};
