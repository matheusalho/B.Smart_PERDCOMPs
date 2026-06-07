import type { StatusCalculo } from './types';

export type FixtureSelicNormativa = {
  id:
    | 'FX-SEL-001'
    | 'FX-SEL-002'
    | 'FX-SEL-003'
    | 'FX-SEL-004'
    | 'FX-SEL-005'
    | 'FX-SEL-006'
    | 'FX-SEL-007'
    | 'FX-SEL-008';
  casoBase: string;
  tipoCredito: string;
  dadosMinimos: string[];
  resultadoEsperado: {
    statusCalculo: StatusCalculo;
    termoInicial?: string;
    dadosAusentes: string[];
  };
  escopoNegativo: string[];
};

export const fixturesSelicNormativas: FixtureSelicNormativa[] = [
  {
    id: 'FX-SEL-001',
    casoBase: 'CT-SEL-002',
    tipoCredito: 'Pagamento Indevido ou a Maior',
    dadosMinimos: [
      'dataArrecadacaoCredito',
      'valorCreditoOriginalNaDataEntrega',
      'totalDebitosDocumento',
      'dataTransmissaoOriginal',
      'taxaSelicDecimal',
    ],
    resultadoEsperado: {
      statusCalculo: 'normativo',
      termoInicial: 'mes_subsequente_pagamento',
      dadosAusentes: [],
    },
    escopoNegativo: [],
  },
  {
    id: 'FX-SEL-002',
    casoBase: 'CT-SEL-001',
    tipoCredito: 'Saldo Negativo de IRPJ/CSLL',
    dadosMinimos: [
      'fimPeriodoApuracao',
      'valorCreditoOriginalNaDataEntrega',
      'totalDebitosDocumento',
      'dataTransmissaoOriginal',
      'taxaSelicDecimal',
    ],
    resultadoEsperado: {
      statusCalculo: 'normativo',
      termoInicial: 'mes_subsequente_fim_periodo_apuracao',
      dadosAusentes: [],
    },
    escopoNegativo: [],
  },
  {
    id: 'FX-SEL-003',
    casoBase: 'CT-SEL-007',
    tipoCredito: 'Retencao Previdenciaria PJ',
    dadosMinimos: [
      'competenciaCredito',
      'valorCreditoOriginalNaDataEntrega',
      'totalDebitosDocumento',
      'dataTransmissaoOriginal',
      'taxaSelicDecimal',
    ],
    resultadoEsperado: {
      statusCalculo: 'normativo',
      termoInicial: 'segundo_mes_subsequente_competencia',
      dadosAusentes: [],
    },
    escopoNegativo: [],
  },
  {
    id: 'FX-SEL-004',
    casoBase: 'CT-SEL-014',
    tipoCredito: 'Ressarcimento de PIS/Pasep e Cofins nao cumulativos',
    dadosMinimos: [
      'dataProtocoloPerOriginal',
      'valorCreditoOriginalNaDataEntrega',
      'totalDebitosDocumento',
      'dataTransmissaoOriginal',
      'taxaSelicDecimal',
    ],
    resultadoEsperado: {
      statusCalculo: 'normativo',
      termoInicial: 'mes_subsequente_361_dia_per_original',
      dadosAusentes: [],
    },
    escopoNegativo: ['nao_aplicar_fluxo_sem_per_previo_por_analogia'],
  },
  {
    id: 'FX-SEL-005',
    casoBase: 'CT-SEL-016',
    tipoCredito: 'Ressarcimento de IPI',
    dadosMinimos: [
      'dataProtocoloPerOriginal',
      'valorCreditoOriginalNaDataEntrega',
      'totalDebitosDocumento',
      'dataTransmissaoOriginal',
      'taxaSelicDecimal',
    ],
    resultadoEsperado: {
      statusCalculo: 'normativo',
      termoInicial: 'mes_subsequente_361_dia_per_original',
      dadosAusentes: [],
    },
    escopoNegativo: [
      'nao_implementar_raipi',
      'nao_implementar_apuracao_operacional_ipi',
    ],
  },
  {
    id: 'FX-SEL-006',
    casoBase: 'CT-SEL-010',
    tipoCredito: 'Credito Oriundo de Acao Judicial',
    dadosMinimos: [
      'componentesCreditoJudicial',
      'formaAtualizacao',
      'valorOriginalComponente',
      'valorAtualizadoComponente',
      'dataTransmissaoOriginal',
    ],
    resultadoEsperado: {
      statusCalculo: 'normativo',
      termoInicial: 'por_componente_judicial',
      dadosAusentes: [],
    },
    escopoNegativo: ['nao_aplicar_selic_unica_por_dcomp'],
  },
  {
    id: 'FX-SEL-007',
    casoBase: 'CT-SEL-014',
    tipoCredito: 'Ressarcimento sujeito ao art. 152 sem PER original',
    dadosMinimos: [
      'valorCreditoOriginalNaDataEntrega',
      'totalDebitosDocumento',
      'dataTransmissaoOriginal',
    ],
    resultadoEsperado: {
      statusCalculo: 'dados_insuficientes',
      dadosAusentes: ['dataProtocoloPerOriginal'],
    },
    escopoNegativo: ['nao_usar_data_dcomp_por_analogia'],
  },
  {
    id: 'FX-SEL-008',
    casoBase: 'CT-SEL-017',
    tipoCredito: 'Qualquer tipo com regra SELIC confirmada',
    dadosMinimos: [
      'dataTransmissaoOriginal',
      'dataEntregaValoracao',
      'calendarioDiaUtil',
    ],
    resultadoEsperado: {
      statusCalculo: 'normativo',
      termoInicial: 'conforme_tipo_credito_com_art_157',
      dadosAusentes: [],
    },
    escopoNegativo: ['nao_alterar_data_transmissao_original'],
  },
];
