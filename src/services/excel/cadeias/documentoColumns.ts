import type { CadeiaRelacional, DCOMP } from '../../../models/types';
import {
  formatVigencia,
  getAlertasStatus,
  getFiltrosCascata,
  getNatureza,
  getOrigemDocumento,
  getPapelDocumento,
  getProjectionValues,
  getStatusCascataLabel,
  getVigencia,
  getVinculoSubstituicao,
  isHypothetical,
  simNao,
} from '../dcompFacts';
import type { VigenteIndex } from '../vigenteIndex';
import { toExcelDate, WIDTH, type ReportColumn, type RowInput } from '../workbookKit';

export type ModoRelatorio = 'completo' | 'ecac';

const txt = (key: string, header: string, width: number, wrap = false): ReportColumn =>
  ({ key, header, width, wrap });
const int = (key: string, header: string, width: number): ReportColumn =>
  ({ key, header, kind: 'integer', width });
const dat = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'date', width: WIDTH.date });
const dtm = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'datetime', width: WIDTH.date });
const cnpj = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'cnpj', width: WIDTH.date });
const cur = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'currency', width: WIDTH.regular });

/**
 * No modo completo expande em Original/Atual/Delta; no modo e-CAC devolve uma
 * única coluna. A chave `<key>Original` existe nos dois modos, para que o
 * construtor de linha seja idêntico.
 */
export function money(key: string, header: string, modo: ModoRelatorio): ReportColumn[] {
  if (modo === 'ecac') {
    return [{ key: `${key}Original`, header, kind: 'currency', width: WIDTH.regular }];
  }
  return [
    { key: `${key}Original`, header: `${header} — Original`, kind: 'currency', width: WIDTH.regular, headerRole: 'current' },
    { key: `${key}Atual`, header: `${header} — Atual`, kind: 'currency', width: WIDTH.regular, headerRole: 'correct' },
    { key: `${key}Delta`, header: `${header} — Delta`, kind: 'currency', width: WIDTH.regular },
  ];
}

/** Espelha `money`: uma chave no modo e-CAC, três no modo completo. */
export function valores(key: string, original: number, atual: number, modo: ModoRelatorio): RowInput {
  if (modo === 'ecac') return { [`${key}Original`]: original };
  return {
    [`${key}Original`]: original,
    [`${key}Atual`]: atual,
    [`${key}Delta`]: atual - original,
  };
}

/** Desliga o SUBTOTAL das colunas monetárias — usado na aba de débitos. */
export function semSubtotal(columns: ReportColumn[]): ReportColumn[] {
  return columns.map((column) => (column.kind === 'currency' ? { ...column, subtotal: false } : column));
}

export function buildDocumentoColumns(modo: ModoRelatorio): ReportColumn[] {
  return [
    // A. Identificação
    txt('idCadeia', 'ID Cadeia Relacional', WIDTH.regular),
    txt('perdcompRaiz', 'PER/DCOMP Raiz da Cadeia', WIDTH.wide),
    txt('perdcompRaizVigente', 'PER/DCOMP Raiz — Vigente', WIDTH.wide),
    int('ordemNaCadeia', 'Ordem na Cadeia', WIDTH.compact),
    txt('perdcomp', 'PER/DCOMP', WIDTH.wide),
    txt('perdcompVigente', 'PER/DCOMP Vigente', WIDTH.wide),
    txt('tipoDocumento', 'Tipo do Documento', WIDTH.description, true),
    txt('natureza', 'Natureza', WIDTH.medium),
    txt('origemDocumento', 'Origem', WIDTH.medium),
    dat('dataTransmissao', 'Data Transm.'),
    dat('dataReferencia', 'Data Ref.'),
    dtm('dataHoraTransmissao', 'Data/Hora Transm. Importada'),
    // B. Situação e vigência
    txt('situacao', 'Situação (e-CAC)', WIDTH.regular, true),
    txt('situacaoDetalhada', 'Situação Detalhada', WIDTH.description, true),
    txt('vigencia', 'Vigência', WIDTH.medium),
    txt('statusCascata', 'Status Cascata', WIDTH.regular),
    txt('editabilidade', 'Editabilidade', WIDTH.medium),
    txt('atencaoStatus', 'Atenção (Status)', WIDTH.medium),
    txt('motivosAtencao', 'Motivos de Atenção', WIDTH.maximum, true),
    txt('divergente', 'Divergente', WIDTH.compact),
    cur('divergenciaEsperado', 'Divergência — Esperado'),
    cur('divergenciaCalculado', 'Divergência — Calculado'),
    // C. Vínculos
    txt('papelDocumento', 'Papel do Documento', WIDTH.medium),
    txt('retificadoPor', 'Retific./Cancel. Por', WIDTH.wide),
    txt('retificadoPorVigente', 'Retific./Cancel. Por — Vigente', WIDTH.wide),
    txt('tipoVinculo', 'Tipo do Vínculo', WIDTH.medium),
    txt('substituiPerdcomp', 'Retifica/Cancela a PER/DCOMP nº', WIDTH.wide),
    txt('substituiPerdcompVigente', 'Retifica/Cancela — Vigente', WIDTH.wide),
    txt('detalhamento', 'Detalhamento', WIDTH.wide),
    txt('detalhamentoVigente', 'Detalhamento — Vigente', WIDTH.wide),
    // D. Filtros e marcações
    txt('filtroVigentesEditaveis', 'Filtro: Vigentes e Editáveis', WIDTH.short),
    txt('filtroOk', 'Filtro: OK', WIDTH.compact),
    txt('filtroARetificar', 'Filtro: A Retificar', WIDTH.short),
    txt('filtroImpedido', 'Filtro: Impedido', WIDTH.short),
    txt('filtroDetalhadores', 'Filtro: Apenas Detalhadores', WIDTH.short),
    ...(modo === 'completo'
      ? [txt('editadoUsuario', 'Editado pelo Usuário', WIDTH.short), txt('hipotetica', 'Hipotética', WIDTH.compact)]
      : []),
    // E. Crédito
    txt('tipoCredito', 'Tipo de Crédito', WIDTH.maximum, true),
    txt('classificacaoCredito', 'Classificação do Crédito', WIDTH.regular),
    txt('restricoesCredito', 'Restrições / Vedações', WIDTH.maximum, true),
    txt('detentorCredito', 'Detentor do Crédito', WIDTH.regular),
    txt('paCredito', 'PA do Crédito', WIDTH.date),
    txt('indicadorCredito', 'Indicador de Crédito', WIDTH.medium),
    // F. Valores
    ...money('creditoDetalhado', 'Crédito Detalhado', modo),
    ...money('creditoDataTransmissao', 'Créd. Data Transm.', modo),
    ...money('debitos', 'Débitos', modo),
    ...money('creditoOrigUsado', 'Crédito Orig. Usado', modo),
    ...money('saldoProximaDcomp', 'Saldo Próx. DCOMP', modo),
    int('qtdeDebitos', 'Qtde de Débitos', WIDTH.short),
    // G. Metadados do crédito importado
    cnpj('cnpjOrigem', 'CNPJ Origem'),
    dat('dataExtracao', 'Data de Extração'),
    dat('dataArrecadacao', 'Data de Arrecadação'),
    txt('competenciaCredito', 'Competência do Crédito', WIDTH.medium),
    txt('tipoCompetencia', 'Tipo de Competência', WIDTH.medium),
    txt('numeroPagamentoDarf', 'Nº do Pagamento (DARF)', WIDTH.regular),
    txt('paDarf', 'PA do DARF', WIDTH.date),
    txt('grupoTributo', 'Grupo de Tributo', WIDTH.regular),
    txt('codigoReceitaCredito', 'Código da Receita (Crédito)', WIDTH.medium),
    txt('processoJudicial', 'Processo Judicial', WIDTH.regular),
    txt('processoHabilitacao', 'Processo de Habilitação', WIDTH.regular),
    txt('processoAdministrativo', 'Processo Administrativo', WIDTH.regular),
    txt('origemDiscussao', 'Origem da Discussão', WIDTH.regular),
    txt('perdcompAnteriorDetalhamento', 'PER/DCOMP Anterior c/ Detalhamento', WIDTH.wide),
    txt('perdcompAnteriorDetalhamentoVigente', 'PER/DCOMP Anterior — Vigente', WIDTH.wide),
  ];
}

export function buildDocumentoRow(
  dcomp: DCOMP,
  cadeia: CadeiaRelacional,
  ordem: number,
  modo: ModoRelatorio,
  vigentes: VigenteIndex,
): RowInput {
  const projecao = getProjectionValues(dcomp);
  const filtros = getFiltrosCascata(dcomp);
  const alertas = getAlertasStatus(dcomp);
  const vinculo = getVinculoSubstituicao(dcomp, cadeia);
  const metadados = dcomp.metadadosCreditoImportado;
  const statusConsultivo = dcomp.statusProcessamentoConsultivo;

  return {
    idCadeia: cadeia.id,
    perdcompRaiz: cadeia.numeroDcompInicial,
    perdcompRaizVigente: vigentes.resolver(cadeia.numeroDcompInicial),
    ordemNaCadeia: ordem,
    perdcomp: dcomp.id,
    perdcompVigente: vigentes.resolver(dcomp.id),
    tipoDocumento: dcomp.tipoDocumento,
    natureza: getNatureza(dcomp),
    origemDocumento: getOrigemDocumento(dcomp),
    dataTransmissao: toExcelDate(dcomp.dataTransmissao),
    dataReferencia: toExcelDate(dcomp.dataTransmissaoOriginal),
    dataHoraTransmissao: toExcelDate(dcomp.dataHoraTransmissaoImportada, true),

    situacao: dcomp.situacao,
    situacaoDetalhada: dcomp.situacaoDetalhada ?? '',
    vigencia: formatVigencia(getVigencia(dcomp)),
    statusCascata: getStatusCascataLabel(dcomp),
    editabilidade: statusConsultivo?.editabilidadeSimulacao ?? '',
    atencaoStatus: simNao(alertas.temAtencao),
    motivosAtencao: alertas.motivos,
    // `isDivergente` está desativado no CalculoService (sempre false); a
    // divergência viva é `divergenciaDetalhes`.
    divergente: simNao(dcomp.divergenciaDetalhes !== undefined),
    divergenciaEsperado: dcomp.divergenciaDetalhes?.esperado ?? null,
    divergenciaCalculado: dcomp.divergenciaDetalhes?.calculado ?? null,

    papelDocumento: getPapelDocumento(dcomp),
    retificadoPor: dcomp.numeroRetificador ?? '',
    retificadoPorVigente: vigentes.resolver(dcomp.numeroRetificador),
    tipoVinculo: vinculo.tipo,
    substituiPerdcomp: vinculo.substituiPerdcomp,
    substituiPerdcompVigente: vigentes.resolver(vinculo.substituiPerdcomp),
    detalhamento: dcomp.numeroDcompDetalhamento ?? '',
    detalhamentoVigente: vigentes.resolver(dcomp.numeroDcompDetalhamento),

    filtroVigentesEditaveis: simNao(filtros.vigentesEditaveis),
    filtroOk: simNao(filtros.ok),
    filtroARetificar: simNao(filtros.aRetificar),
    filtroImpedido: simNao(filtros.impedido),
    filtroDetalhadores: simNao(filtros.apenasDetalhadores),
    ...(modo === 'completo'
      ? {
          editadoUsuario: simNao(Boolean(dcomp.isManuallyEdited)),
          hipotetica: simNao(isHypothetical(dcomp)),
        }
      : {}),

    tipoCredito: dcomp.tipoCredito,
    classificacaoCredito: dcomp.classificacaoCreditoConsultiva?.tipoCreditoId ?? '',
    restricoesCredito: (dcomp.classificacaoCreditoConsultiva?.alertas ?? []).join('; '),
    detentorCredito: dcomp.detentorCredito,
    paCredito: dcomp.periodoApuracaoCredito,
    indicadorCredito: dcomp.indicadorCredito,

    ...valores('creditoDetalhado', projecao.creditoInicialAtual, projecao.creditoInicialCorreto, modo),
    ...valores('creditoDataTransmissao', projecao.creditoTransmissaoAtual, projecao.creditoTransmissaoCorreto, modo),
    ...valores('debitos', projecao.debitosAtuais, projecao.debitosCorretos, modo),
    ...valores('creditoOrigUsado', projecao.creditoUsadoAtual, projecao.creditoUsadoCorreto, modo),
    ...valores('saldoProximaDcomp', projecao.saldoProximaAtual, projecao.saldoProximaCorreto, modo),
    qtdeDebitos: dcomp.debitos.length,

    cnpjOrigem: metadados?.cnpjOrigem ?? '',
    dataExtracao: toExcelDate(metadados?.dataExtracao),
    dataArrecadacao: toExcelDate(metadados?.dataArrecadacaoCredito),
    competenciaCredito: metadados?.competenciaCredito ?? '',
    tipoCompetencia: metadados?.tipoCompetenciaCredito ?? '',
    numeroPagamentoDarf: metadados?.numeroPagamento ?? '',
    paDarf: metadados?.periodoApuracaoDarf ?? '',
    grupoTributo: metadados?.grupoTributo ?? '',
    codigoReceitaCredito: metadados?.codigoReceitaCredito ?? '',
    processoJudicial: metadados?.processoJudicial ?? '',
    processoHabilitacao: metadados?.processoHabilitacao ?? '',
    processoAdministrativo: metadados?.processoAdministrativo ?? '',
    origemDiscussao: metadados?.origemDiscussao ?? '',
    perdcompAnteriorDetalhamento: metadados?.numeroPerOriginal ?? '',
    perdcompAnteriorDetalhamentoVigente: vigentes.resolver(metadados?.numeroPerOriginal),
  };
}
