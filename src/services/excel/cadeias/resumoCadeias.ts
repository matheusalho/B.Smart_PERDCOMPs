import type { CadeiaRelacional, SimulacaoSalva } from '../../../models/types';
import { getFiltrosCascata, getVigencia, isDetalhador, simNao } from '../dcompFacts';
import { toExcelDate, WIDTH, type ReportColumn, type RowInput } from '../workbookKit';
import { money, valores, type ModoRelatorio } from './documentoColumns';

const txt = (key: string, header: string, width: number, wrap = false): ReportColumn =>
  ({ key, header, width, wrap });
const int = (key: string, header: string, width: number): ReportColumn =>
  ({ key, header, kind: 'integer', width });
const dat = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'date', width: WIDTH.date });

export function buildResumoColumns(modo: ModoRelatorio): ReportColumn[] {
  return [
    txt('idCadeia', 'ID Cadeia Relacional', WIDTH.regular),
    txt('perdcompRaiz', 'PER/DCOMP Raiz', WIDTH.wide),
    txt('tipoCredito', 'Tipo de Crédito', WIDTH.maximum, true),
    txt('paCredito', 'PA do Crédito', WIDTH.date),
    int('qtdeDcomps', 'Qtde de DCOMPs', WIDTH.short),
    int('qtdeVigentes', 'Vigentes', WIDTH.short),
    int('qtdeNaoVigentes', 'Não Vigentes', WIDTH.short),
    int('qtdeDetalhadores', 'Detalhadores', WIDTH.short),
    int('qtdeDebitos', 'Qtde de Débitos', WIDTH.short),
    ...money('creditoDetalhado', 'Crédito Detalhado', modo),
    ...money('creditoOrigUsado', 'Crédito Orig. Usado', modo),
    ...money('saldoFinal', 'Saldo Final', modo),
    int('docsARetificar', 'Docs A Retificar', WIDTH.short),
    int('docsBloqueados', 'Docs Bloqueados', WIDTH.short),
    ...(modo === 'completo' ? [int('docsEditados', 'Docs Editados', WIDTH.short)] : []),
    int('docsDivergentes', 'Docs Divergentes', WIDTH.short),
    dat('primeiraTransmissao', '1ª Transmissão'),
    dat('ultimaTransmissao', 'Última Transmissão'),
    ...(modo === 'completo' ? [txt('temSimulacaoSalva', 'Tem Simulação Salva', WIDTH.short)] : []),
  ];
}

export function buildResumoRows(
  cadeias: CadeiaRelacional[],
  simulacoesSalvas: SimulacaoSalva[],
  modo: ModoRelatorio,
): RowInput[] {
  const cadeiasSimuladas = new Set(simulacoesSalvas.map((simulacao) => simulacao.cadeiaId));

  return cadeias.map((cadeia) => {
    const ultimo = cadeia.dcomps[cadeia.dcomps.length - 1];
    const datas = cadeia.dcomps.map((dcomp) => new Date(dcomp.dataTransmissao).getTime());
    const detalhadoresVigentes = cadeia.dcomps.filter(
      (dcomp) => isDetalhador(dcomp) && getVigencia(dcomp) !== 'nao_vigente',
    );

    return {
      idCadeia: cadeia.id,
      perdcompRaiz: cadeia.numeroDcompInicial,
      tipoCredito: cadeia.tipoCredito,
      paCredito: cadeia.periodoApuracao,
      qtdeDcomps: cadeia.dcomps.length,
      qtdeVigentes: cadeia.dcomps.filter((dcomp) => getVigencia(dcomp) !== 'nao_vigente').length,
      qtdeNaoVigentes: cadeia.dcomps.filter((dcomp) => getVigencia(dcomp) === 'nao_vigente').length,
      qtdeDetalhadores: cadeia.dcomps.filter(isDetalhador).length,
      qtdeDebitos: cadeia.dcomps.reduce((total, dcomp) => total + dcomp.debitos.length, 0),
      ...valores(
        'creditoDetalhado',
        detalhadoresVigentes.reduce((total, dcomp) => total + dcomp.valorTotalCreditoDetalhadoOriginal, 0),
        detalhadoresVigentes.reduce((total, dcomp) => total + dcomp.valorTotalCreditoDetalhado, 0),
        modo,
      ),
      ...valores(
        'creditoOrigUsado',
        cadeia.dcomps.reduce((total, dcomp) => total + dcomp.valorUtilizadoPerdcompOriginal, 0),
        cadeia.dcomps.reduce((total, dcomp) => total + dcomp.valorUtilizadoPerdcomp, 0),
        modo,
      ),
      ...valores(
        'saldoFinal',
        ultimo?.saldoCreditoOriginalAnterior ?? 0,
        ultimo?.saldoCreditoOriginalCalculado ?? 0,
        modo,
      ),
      docsARetificar: cadeia.dcomps.filter((dcomp) => getFiltrosCascata(dcomp).aRetificar).length,
      docsBloqueados: cadeia.dcomps.filter((dcomp) => getFiltrosCascata(dcomp).impedido).length,
      ...(modo === 'completo'
        ? { docsEditados: cadeia.dcomps.filter((dcomp) => dcomp.isManuallyEdited).length }
        : {}),
      docsDivergentes: cadeia.dcomps.filter((dcomp) => dcomp.divergenciaDetalhes !== undefined).length,
      primeiraTransmissao: toExcelDate(datas.length ? new Date(Math.min(...datas)) : undefined),
      ultimaTransmissao: toExcelDate(datas.length ? new Date(Math.max(...datas)) : undefined),
      ...(modo === 'completo' ? { temSimulacaoSalva: simNao(cadeiasSimuladas.has(cadeia.id)) } : {}),
    };
  });
}
