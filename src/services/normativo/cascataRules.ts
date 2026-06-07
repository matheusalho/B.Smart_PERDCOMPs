import type { FonteNormativa } from './types';
import type { TipoCreditoId } from './creditRules';

export type CascataRule = {
  tipoCreditoId: TipoCreditoId;
  estrategiaSaldoInicial:
    | 'pool_detalhadores_vigentes'
    | 'credito_raiz_replicado'
    | 'componentes_credito_judicial'
    | 'dados_insuficientes';
  permiteMultiplosDetalhamentos: boolean;
  fontes: FonteNormativa[];
  alertas: string[];
};

const fonteAuditoriaCascata = {
  arquivo: '04-ConsumoCreditoOriginalECascata.md',
  resumo: 'Auditoria tecnica da estrategia de consumo de credito original e cascata.',
};

export function obterCascataRule(tipoCreditoId: TipoCreditoId): CascataRule {
  if (
    tipoCreditoId === 'pagamento_indevido_maior_esocial' ||
    tipoCreditoId === 'contribuicao_previdenciaria_indevida_maior'
  ) {
    return {
      tipoCreditoId,
      estrategiaSaldoInicial: 'pool_detalhadores_vigentes',
      permiteMultiplosDetalhamentos: true,
      fontes: [fonteAuditoriaCascata],
      alertas: [],
    };
  }

  if (
    tipoCreditoId === 'saldo_negativo_irpj' ||
    tipoCreditoId === 'saldo_negativo_csll'
  ) {
    return {
      tipoCreditoId,
      estrategiaSaldoInicial: 'credito_raiz_replicado',
      permiteMultiplosDetalhamentos: false,
      fontes: [fonteAuditoriaCascata],
      alertas: ['valor_replicado_deve_ter_origem_explicita'],
    };
  }

  if (tipoCreditoId === 'credito_judicial') {
    return {
      tipoCreditoId,
      estrategiaSaldoInicial: 'componentes_credito_judicial',
      permiteMultiplosDetalhamentos: true,
      fontes: [fonteAuditoriaCascata],
      alertas: ['componentes_credito_judicial_exigidos'],
    };
  }

  return {
    tipoCreditoId,
    estrategiaSaldoInicial: 'dados_insuficientes',
    permiteMultiplosDetalhamentos: false,
    fontes: [fonteAuditoriaCascata],
    alertas: ['tipo_credito_nao_classificado'],
  };
}
