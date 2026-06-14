import type { DCOMP } from '../models/types';
import type { StatusProcessamentoClassificado } from '../services/normativo/statusRules';
import type { ResultadoAuditavel } from '../services/normativo/types';
import type { SelicRastreavelResult } from '../services/normativo/selicService';

const STATUS_MOTIVOS: Record<string, string> = {
  status_nao_classificado:
    'Status não classificado pelas regras atuais. Validar manualmente a situação no e-CAC/PER/DCOMP Web.',
  documento_nao_admitido:
    'Documento não admitido. Não deve ser tratado como declaração vigente para simulação de cascata.',
  cancelamento_deferido_irreversivel:
    'Pedido de cancelamento deferido. Documento tratado como não vigente e não editável.',
  documento_analisado_ou_em_discussao:
    'Documento vigente, mas bloqueado para edição por situação processual na RFB.',
  documento_em_analise_vigente_editavel:
    'PER/DCOMP em análise. Documento vigente e editável enquanto permanecer nessa situação.',
  documento_nao_vigente:
    'Documento não vigente por retificação/cancelamento posterior.',
};

const SELIC_ALERTAS: Record<string, string> = {
  resultado_estimado_nao_normativo:
    'Resultado estimado. O cálculo usa fator histórico identificado, não apuração normativa plena por tabela Selic.',
  credito_judicial_sem_componentes_importados:
    'Crédito judicial sem componentes importados suficientes para cálculo normativo seguro.',
  tipo_credito_nao_classificado:
    'Tipo de crédito não classificado para cálculo normativo de Selic.',
};

const HIPOTESES: Record<string, string> = {
  fallback_historico_nao_normativo_sem_tabela_selic_validada:
    'Fallback histórico usado por ausência de tabela Selic normativa validada para o período.',
};

const ORIGEM_VALOR: Record<string, string> = {
  importado_rfb: 'valor importado da RFB',
  calculado_motor: 'valor calculado pelo motor',
  simulado_usuario: 'valor simulado pelo usuário',
  replicado_credito_raiz: 'valor replicado do crédito raiz',
  fallback_operacional: 'fallback operacional',
  exibido_formatado: 'valor formatado para exibição',
};

export function formatarMotivoStatus(motivo: string): string {
  return STATUS_MOTIVOS[motivo] ?? 'Ponto de atenção consultiva pendente de classificação.';
}

export function formatarListaMotivosStatus(motivos: string[]): string {
  return motivos.map(formatarMotivoStatus).join(' ');
}

export function getTooltipStatusCascata(
  dcomp: DCOMP,
  statusClassificado: StatusProcessamentoClassificado,
  vigente: boolean,
  bloqueado: boolean,
): string {
  if (dcomp.statusCascata === 'EDITADO') {
    return 'Débitos alterados manualmente pelo usuário nesta simulação. Os valores originais importados seguem preservados.';
  }

  if (dcomp.statusCascata === 'EDITADO_E_RETIFICAR') {
    return 'Débitos alterados manualmente pelo usuário e simulação indica consumo de crédito acima do saldo disponível. Exige análise de retificação.';
  }

  if (dcomp.statusCascata === 'RETIFICAR') {
    return 'A simulação indica consumo de crédito acima do saldo disponível. Exige análise de retificação.';
  }

  if (dcomp.statusCascata === 'IMPACTADO_BLOQUEADO') {
    return 'Falta crédito após a simulação, mas a PER/DCOMP está bloqueada para retificação na RFB.';
  }

  if (!vigente) {
    return formatarListaMotivosStatus(statusClassificado.motivos);
  }

  if (bloqueado) {
    return 'Documento vigente, mas bloqueado para edição por situação processual na RFB. Os débitos podem ser visualizados sem alteração.';
  }

  return 'Documento vigente, editável e sem quebra de saldo na simulação atual.';
}

export function getTooltipPapelDocumento(dcomp: DCOMP): string {
  if (!dcomp.numeroDcompDetalhamento || dcomp.numeroDcompDetalhamento === dcomp.id) {
    return 'PER/DCOMP que detalha ou origina o crédito desta cadeia.';
  }

  return 'PER/DCOMP que consome crédito detalhado por outra declaração.';
}

export function getTooltipSelic(
  resultadoSelic: ResultadoAuditavel<SelicRastreavelResult>,
): string {
  const partes: string[] = [];

  if (resultadoSelic.statusCalculo === 'normativo') {
    partes.push('SELIC Exata: cálculo normativo verificado.');
  } else if (resultadoSelic.statusCalculo === 'estimativa_historica') {
    partes.push(
      'Estimativa histórica: cálculo por fator histórico importado/RFB; não é cálculo normativo pleno.',
    );
  } else if (resultadoSelic.statusCalculo === 'dados_insuficientes') {
    partes.push('Dados insuficientes para cálculo normativo seguro da SELIC.');
  } else {
    partes.push('Qualidade SELIC pendente de validação normativa.');
  }

  if (resultadoSelic.valor?.termoInicialMes && resultadoSelic.valor?.termoFinalMes) {
    partes.push(
      `Período Selic: ${resultadoSelic.valor.termoInicialMes} a ${resultadoSelic.valor.termoFinalMes}.`,
    );
  }

  partes.push(`Origem: ${ORIGEM_VALOR[resultadoSelic.origemValor] ?? 'origem auditável registrada'}.`);

  if (resultadoSelic.dadosAusentes.length > 0) {
    partes.push(`Dados ausentes: ${resultadoSelic.dadosAusentes.join(', ')}.`);
  }

  const alertas = resultadoSelic.alertas.map(formatarAlertaSelic);
  if (alertas.length > 0) {
    partes.push(`Alertas: ${alertas.join(' ')}`);
  }

  const hipoteses = resultadoSelic.hipoteses.map(formatarHipoteseSelic);
  if (hipoteses.length > 0) {
    partes.push(`Hipóteses: ${hipoteses.join(' ')}`);
  }

  return partes.join(' ');
}

function formatarAlertaSelic(alerta: string): string {
  return SELIC_ALERTAS[alerta] ?? 'Alerta consultivo de SELIC pendente de classificação.';
}

function formatarHipoteseSelic(hipotese: string): string {
  return HIPOTESES[hipotese] ?? 'Hipótese de cálculo registrada para auditoria.';
}
