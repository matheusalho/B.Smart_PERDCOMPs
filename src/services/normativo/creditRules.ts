import type { FonteNormativa } from './types';

export type TipoCreditoId =
  | 'pagamento_indevido_maior'
  | 'pagamento_indevido_maior_esocial'
  | 'contribuicao_previdenciaria_indevida_maior'
  | 'saldo_negativo_irpj'
  | 'saldo_negativo_csll'
  | 'credito_judicial'
  | 'ressarcimento_ipi'
  | 'ressarcimento_pis_cofins'
  | 'retencao_previdenciaria_pj'
  | 'salario_familia_maternidade'
  | 'reintegra'
  | 'desconhecido';

export type MeioCabivel =
  | 'perdcomp_web'
  | 'programa_perdcomp'
  | 'formulario_processo'
  | 'portal_simples'
  | 'esocial_simplificado'
  | 'via_judicial'
  | 'orgao_externo'
  | 'vedado';

export type CreditoClassificado = {
  tipoCreditoOriginal: string;
  tipoCreditoId: TipoCreditoId;
  meiosCabiveis: MeioCabivel[];
  dcompAdmitida: boolean | 'depende';
  exigeHabilitacao?: boolean;
  exigePerOriginal?: boolean;
  exigeComponentesJudiciais?: boolean;
  exigePedidoPrevio?: boolean;
  exigeEscrituracaoPrevia?: boolean;
  fontesNormativas: FonteNormativa[];
  alertas: string[];
};

const fonteMeios = {
  arquivo: 'meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf',
  resumo: 'Manual geral da RFB para meios cabíveis por tipo de crédito.',
};

const fonteJudicial = {
  arquivo: 'per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf',
  resumo: 'Manual de crédito oriundo de ação judicial no PER/DCOMP Web.',
};

export function classificarTipoCredito(tipoCredito: string): CreditoClassificado {
  const normalizado = normalizarTexto(tipoCredito);

  if (normalizado.includes('pagamento indevido ou a maior esocial')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'pagamento_indevido_maior_esocial',
      meiosCabiveis: ['perdcomp_web', 'esocial_simplificado'],
      dcompAdmitida: 'depende',
      fontesNormativas: [fonteMeios],
      alertas: ['VERIFICAR: Compensação vedada para empregador doméstico (eSocial Simplificado).'],
    };
  }

  if (normalizado.includes('pagamento indevido ou a maior')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'pagamento_indevido_maior',
      meiosCabiveis: ['perdcomp_web', 'programa_perdcomp', 'formulario_processo'],
      dcompAdmitida: true,
      fontesNormativas: [fonteMeios],
      alertas: [],
    };
  }

  if (normalizado.includes('contribuicao previdenciaria indevida ou a maior')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'contribuicao_previdenciaria_indevida_maior',
      meiosCabiveis: ['perdcomp_web', 'formulario_processo'],
      dcompAdmitida: true,
      fontesNormativas: [fonteMeios],
      alertas: [],
    };
  }

  if (normalizado.includes('saldo negativo de irpj')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'saldo_negativo_irpj',
      meiosCabiveis: ['perdcomp_web', 'formulario_processo'],
      dcompAdmitida: true,
      exigeEscrituracaoPrevia: true,
      fontesNormativas: [fonteMeios],
      alertas: ['ATENÇÃO: Requer que as antecipações componham a ECF.'],
    };
  }

  if (normalizado.includes('saldo negativo de csll')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'saldo_negativo_csll',
      meiosCabiveis: ['perdcomp_web', 'formulario_processo'],
      dcompAdmitida: true,
      exigeEscrituracaoPrevia: true,
      fontesNormativas: [fonteMeios],
      alertas: ['ATENÇÃO: Requer que as antecipações componham a ECF.'],
    };
  }

  if (normalizado.includes('credito oriundo de acao judicial')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'credito_judicial',
      meiosCabiveis: ['perdcomp_web'],
      dcompAdmitida: 'depende',
      exigeHabilitacao: true,
      exigeComponentesJudiciais: true,
      fontesNormativas: [fonteMeios, fonteJudicial],
      alertas: [
        'VED-CRED-JUD-SEM-TJ: Exige trânsito em julgado e habilitação prévia.',
        'VED-CRED-JUD-LIMITE: Pode estar sujeito ao limite mensal do art. 74-A.',
      ],
    };
  }

  if (normalizado.includes('ressarcimento de ipi')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'ressarcimento_ipi',
      meiosCabiveis: ['programa_perdcomp', 'perdcomp_web'],
      dcompAdmitida: true,
      fontesNormativas: [fonteMeios],
      alertas: ['ATENÇÃO: PER via Programa, DCOMP via Web para IPI.'],
    };
  }

  if (normalizado.includes('ressarcimento de pis') || normalizado.includes('ressarcimento de cofins')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'ressarcimento_pis_cofins',
      meiosCabiveis: ['perdcomp_web', 'programa_perdcomp'],
      dcompAdmitida: true,
      fontesNormativas: [fonteMeios],
      alertas: [],
    };
  }

  if (normalizado.includes('retencao previdenciaria')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'retencao_previdenciaria_pj',
      meiosCabiveis: ['perdcomp_web', 'programa_perdcomp'],
      dcompAdmitida: true,
      fontesNormativas: [fonteMeios],
      alertas: ['ATENÇÃO: PER/DCOMP Web ou Programa depende da competência (EFD-Reinf).'],
    };
  }

  if (normalizado.includes('salario familia') || normalizado.includes('salario maternidade')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'salario_familia_maternidade',
      meiosCabiveis: ['perdcomp_web', 'programa_perdcomp', 'formulario_processo'],
      dcompAdmitida: false,
      fontesNormativas: [fonteMeios],
      alertas: ['VED-CRED-SALARIO: DCOMP vedada. Admite apenas Reembolso.'],
    };
  }

  if (normalizado.includes('reintegra')) {
    return {
      tipoCreditoOriginal: tipoCredito,
      tipoCreditoId: 'reintegra',
      meiosCabiveis: ['programa_perdcomp', 'perdcomp_web'],
      dcompAdmitida: true,
      fontesNormativas: [fonteMeios],
      alertas: [],
    };
  }

  return {
    tipoCreditoOriginal: tipoCredito,
    tipoCreditoId: 'desconhecido',
    meiosCabiveis: ['vedado'],
    dcompAdmitida: 'depende',
    fontesNormativas: [fonteMeios],
    alertas: ['TIPO DESCONHECIDO: Não classificado normativamente.'],
  };
}

function normalizarTexto(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
