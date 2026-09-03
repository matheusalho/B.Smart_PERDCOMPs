import type { CadeiaRelacional, DCOMP } from '../../models/types';
import { isBloqueado, isPedidoCancelamento, isVigente } from '../../utils/statusHelper';
import { sum } from './workbookKit';

export type ProjectionValues = {
  creditoInicialAtual: number;
  creditoInicialCorreto: number;
  creditoTransmissaoAtual: number;
  creditoTransmissaoCorreto: number;
  debitosAtuais: number;
  debitosCorretos: number;
  creditoUsadoAtual: number;
  creditoUsadoCorreto: number;
  saldoProximaAtual: number;
  saldoProximaCorreto: number;
};

/**
 * ATENÇÃO à nomenclatura herdada do relatório de simulações: os campos
 * `...Atual` carregam o valor ORIGINAL (o que está declarado hoje na RFB) e os
 * campos `...Correto` carregam o valor recalculado/simulado.
 */
export function getProjectionValues(dcomp: DCOMP): ProjectionValues {
  const creditoTransmissaoAtual = dcomp.divergenciaDetalhes?.esperado ??
    dcomp.valorCreditoDataTransmissao;
  const creditoTransmissaoCorreto = dcomp.divergenciaDetalhes?.calculado ??
    dcomp.valorCreditoDataTransmissao;
  const debitosAtuais = sum(dcomp.debitos.map((debito) => debito.valorTotalOriginal));
  const debitosCorretos = sum(dcomp.debitos.map((debito) => debito.valorTotal));
  const creditoUsadoAtual = dcomp.valorUtilizadoPerdcompOriginal;
  const creditoUsadoCorreto = dcomp.valorUtilizadoPerdcomp;

  return {
    creditoInicialAtual: dcomp.valorTotalCreditoDetalhadoOriginal,
    creditoInicialCorreto: dcomp.valorTotalCreditoDetalhado,
    creditoTransmissaoAtual,
    creditoTransmissaoCorreto,
    debitosAtuais,
    debitosCorretos,
    creditoUsadoAtual,
    creditoUsadoCorreto,
    saldoProximaAtual: dcomp.saldoCreditoOriginalAnterior ??
      creditoTransmissaoAtual - creditoUsadoAtual,
    saldoProximaCorreto: dcomp.saldoCreditoOriginalCalculado ??
      creditoTransmissaoCorreto - creditoUsadoCorreto,
  };
}

export function getVigencia(dcomp: DCOMP): 'vigente' | 'nao_vigente' | 'indeterminado' {
  const registrada = dcomp.statusProcessamentoConsultivo?.vigenciaCascata;
  if (registrada === 'vigente' || registrada === 'nao_vigente' || registrada === 'indeterminado') {
    return registrada;
  }
  return isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id)
    ? 'vigente'
    : 'nao_vigente';
}

export function formatVigencia(vigencia: ReturnType<typeof getVigencia>): string {
  if (vigencia === 'nao_vigente') return 'Não vigente';
  if (vigencia === 'indeterminado') return 'Indeterminada';
  return 'Vigente';
}

export function hasMeaningfulDifference(current: number, correct: number): boolean {
  return Math.abs(current - correct) > 0.05;
}

export function hasManualDebitEdit(dcomp: DCOMP): boolean {
  return dcomp.debitos.some((debito) =>
    hasMeaningfulDifference(debito.valorPrincipalOriginal, debito.valorPrincipal) ||
    hasMeaningfulDifference(debito.valorMultaOriginal, debito.valorMulta) ||
    hasMeaningfulDifference(debito.valorJurosOriginal, debito.valorJuros) ||
    hasMeaningfulDifference(debito.valorTotalOriginal, debito.valorTotal),
  );
}

export function isHypothetical(dcomp: DCOMP): boolean {
  return dcomp.indicadorCredito.toLocaleLowerCase('pt-BR').includes('hipot');
}

export function simNao(valor: boolean): 'Sim' | 'Não' {
  return valor ? 'Sim' : 'Não';
}

export function getNatureza(dcomp: DCOMP): 'PER' | 'DCOMP' | 'Pedido de Cancelamento' {
  if (isPedidoCancelamento(dcomp.id, dcomp.tipoDocumento)) return 'Pedido de Cancelamento';
  return dcomp.tipoDocumento.toLocaleLowerCase('pt-BR').includes('pedido') ? 'PER' : 'DCOMP';
}

export function getOrigemDocumento(dcomp: DCOMP): 'Original' | 'Retificador' | 'Pedido de Cancelamento' {
  if (isPedidoCancelamento(dcomp.id, dcomp.tipoDocumento)) return 'Pedido de Cancelamento';
  return dcomp.indicadorCredito === '1' ? 'Original' : 'Retificador';
}

export function isDetalhador(dcomp: DCOMP): boolean {
  return !dcomp.numeroDcompDetalhamento || dcomp.numeroDcompDetalhamento === dcomp.id;
}

export function getPapelDocumento(dcomp: DCOMP): 'Detalhador' | 'Consumidor' | '—' {
  if (isHypothetical(dcomp)) return '—';
  return isDetalhador(dcomp) ? 'Detalhador' : 'Consumidor';
}

/** Mesma ordem de precedência dos ramos do <td> de Situação em TimelineCascata.tsx. */
export function getStatusCascataLabel(dcomp: DCOMP): string {
  const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
  const bloqueado = isBloqueado(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);

  if (dcomp.statusCascata === 'EDITADO_E_RETIFICAR') return 'EDITADO E A RETIFICAR';
  if (dcomp.statusCascata === 'RETIFICAR') return 'A RETIFICAR';
  if (dcomp.statusCascata === 'IMPACTADO_BLOQUEADO') return 'BLOQUEADO';
  if (dcomp.statusCascata === 'EDITADO') return 'EDITADO';
  if (!vigente) return 'Não vigente';
  if (bloqueado) return 'BLOQUEADO';
  return 'OK';
}

const MOTIVOS_NAO_ALERTA = new Set([
  'documento_analisado_ou_em_discussao',
  'documento_nao_vigente',
]);

export function getAlertasStatus(dcomp: DCOMP): { temAtencao: boolean; motivos: string } {
  const motivos = (dcomp.statusProcessamentoConsultivo?.motivos ?? [])
    .filter((motivo) => !MOTIVOS_NAO_ALERTA.has(motivo));
  return { temAtencao: motivos.length > 0, motivos: motivos.join('; ') };
}

export function getVinculoSubstituicao(
  dcomp: DCOMP,
  cadeia: CadeiaRelacional,
): { tipo: string; substituiPerdcomp: string } {
  const substituta = dcomp.numeroRetificador
    ? cadeia.dcomps.find((outro) => outro.id === dcomp.numeroRetificador)
    : undefined;

  const tipo = !dcomp.numeroRetificador
    ? '—'
    : substituta && isPedidoCancelamento(substituta.id, substituta.tipoDocumento)
      ? 'Cancelada por'
      : 'Retificada por';

  const substituida = cadeia.dcomps.find((outro) => outro.numeroRetificador === dcomp.id);

  return { tipo, substituiPerdcomp: substituida?.id ?? '' };
}

export type FiltrosCascata = {
  vigentesEditaveis: boolean;
  ok: boolean;
  aRetificar: boolean;
  impedido: boolean;
  apenasDetalhadores: boolean;
};

/** Predicados copiados de TimelineCascata.dcompsFiltradas. */
export function getFiltrosCascata(dcomp: DCOMP): FiltrosCascata {
  const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
  const bloqueado = isBloqueado(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
  const aRetificar = dcomp.statusCascata === 'RETIFICAR' || dcomp.statusCascata === 'EDITADO_E_RETIFICAR';

  return {
    vigentesEditaveis: (vigente && !bloqueado) || aRetificar,
    ok: vigente && !bloqueado && (dcomp.statusCascata === 'OK' || dcomp.statusCascata === 'EDITADO'),
    aRetificar,
    impedido: !vigente || bloqueado,
    apenasDetalhadores: isDetalhador(dcomp),
  };
}
