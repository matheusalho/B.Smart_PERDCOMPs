import type { DCOMP } from '../../models/types';
import type { TipoCreditoId } from './creditRules';
import type { ResultadoAuditavel } from './types';
import {
  calcularSelicComTaxaInjetada,
  type SelicMathResult,
} from './selicMath';
import {
  calcularTermoFinalDcompOriginal,
  calcularTermoInicialArt152,
  calcularTermoInicialPagamento,
  calcularTermoInicialSaldoNegativo,
  extrairFimPeriodoApuracaoCredito,
} from './dateRules';

export type SelicRastreavelInput = {
  dcomp: DCOMP;
  totalDebitosDocumento: number;
  taxaSelicDecimal?: number;
  taxaSelicProvider?: (termoInicialMes: string, termoFinalMes: string) => number | undefined;
  fonteTabelaSelic?: string;
  fatorHistorico?: number;
};

export type SelicRastreavelResult = SelicMathResult & {
  tipoCreditoId: TipoCreditoId;
  termoInicialMes: string;
  termoFinalMes: string;
  dataEntregaValoracao: Date;
};

export function calcularSelicRastreavel(
  input: SelicRastreavelInput,
): ResultadoAuditavel<SelicRastreavelResult> {
  const tipoCreditoId =
    input.dcomp.classificacaoCreditoConsultiva?.tipoCreditoId ?? 'desconhecido';

  if (tipoCreditoId === 'credito_judicial') {
    return {
      statusCalculo: 'dados_insuficientes',
      metodo: 'selic_normativa_por_componente_judicial',
      origemValor: 'calculado_motor',
      fontesNormativas:
        input.dcomp.classificacaoCreditoConsultiva?.fontesNormativas ?? [],
      dadosUsados: ['tipoCredito'],
      dadosAusentes: ['componentesCreditoJudicial'],
      hipoteses: [],
      alertas: ['credito_judicial_sem_componentes_importados'],
    };
  }

  const termoInicial = calcularTermoInicialPorTipo(input.dcomp, tipoCreditoId);
  const termoFinal = calcularTermoFinalDcompOriginal(
    input.dcomp.dataTransmissaoOriginal,
  );
  const dadosAusentes = [
    ...termoInicial.dadosAusentes,
    ...termoFinal.dadosAusentes,
  ];

  let taxaAUsar = input.taxaSelicDecimal;

  if (taxaAUsar === undefined && input.taxaSelicProvider && termoInicial.valor && termoFinal.valor) {
    taxaAUsar = input.taxaSelicProvider(
      termoInicial.valor.termoInicialMes,
      termoFinal.valor.termoFinalMes,
    );
  }

  if (taxaAUsar === undefined) {
    return calcularFallbackOuDadosInsuficientes(input, tipoCreditoId, {
      dadosAusentes: [...dadosAusentes, 'taxaSelicDecimal'],
      dadosUsados: [
        ...termoInicial.dadosUsados,
        ...termoFinal.dadosUsados,
        'tipoCredito',
      ],
      hipoteses: [...termoInicial.hipoteses, ...termoFinal.hipoteses],
    });
  }

  if (!termoInicial.valor || !termoFinal.valor || dadosAusentes.length > 0) {
    return {
      statusCalculo: 'dados_insuficientes',
      metodo: 'selic_normativa_por_tipo_credito',
      origemValor: 'calculado_motor',
      fontesNormativas: [
        ...termoInicial.fontesNormativas,
        ...termoFinal.fontesNormativas,
      ],
      dadosUsados: [
        ...termoInicial.dadosUsados,
        ...termoFinal.dadosUsados,
        'tipoCredito',
      ],
      dadosAusentes,
      hipoteses: [...termoInicial.hipoteses, ...termoFinal.hipoteses],
      alertas: [],
    };
  }

  const calculo = calcularSelicComTaxaInjetada({
    valorCreditoOriginalNaDataEntrega:
      input.dcomp.valorTotalCreditoDetalhadoOriginal,
    totalDebitosDocumento: input.totalDebitosDocumento,
    taxaSelicDecimal: taxaAUsar,
    fonteTabelaSelic: input.fonteTabelaSelic,
  });

  if (!calculo.valor) {
    return {
      statusCalculo: 'dados_insuficientes',
      metodo: 'selic_normativa_por_tipo_credito',
      origemValor: 'calculado_motor',
      fontesNormativas: calculo.fontesNormativas,
      dadosUsados: calculo.dadosUsados,
      dadosAusentes: [...dadosAusentes, ...calculo.dadosAusentes],
      hipoteses: calculo.hipoteses,
      alertas: calculo.alertas,
    };
  }

  return {
    statusCalculo: 'normativo',
    valor: {
      ...calculo.valor,
      tipoCreditoId,
      termoInicialMes: termoInicial.valor.termoInicialMes,
      termoFinalMes: termoFinal.valor.termoFinalMes,
      dataEntregaValoracao: termoFinal.valor.dataEntregaValoracao,
    },
    metodo: 'selic_normativa_por_tipo_credito',
    origemValor: 'calculado_motor',
    fontesNormativas: [
      ...termoInicial.fontesNormativas,
      ...termoFinal.fontesNormativas,
      ...calculo.fontesNormativas,
    ],
    dadosUsados: [
      ...termoInicial.dadosUsados,
      ...termoFinal.dadosUsados,
      ...calculo.dadosUsados,
      'tipoCredito',
    ],
    dadosAusentes: [],
    hipoteses: [
      ...termoInicial.hipoteses,
      ...termoFinal.hipoteses,
      ...calculo.hipoteses,
    ],
    alertas: [],
  };
}

function calcularTermoInicialPorTipo(dcomp: DCOMP, tipoCreditoId: TipoCreditoId) {
  if (
    tipoCreditoId === 'pagamento_indevido_maior' ||
    tipoCreditoId === 'pagamento_indevido_maior_esocial' ||
    tipoCreditoId === 'contribuicao_previdenciaria_indevida_maior'
  ) {
    return calcularTermoInicialPagamento(
      dcomp.metadadosCreditoImportado?.dataArrecadacaoCredito,
    );
  }

  if (
    tipoCreditoId === 'saldo_negativo_irpj' ||
    tipoCreditoId === 'saldo_negativo_csll'
  ) {
    const result = calcularTermoInicialSaldoNegativo(
      extrairFimPeriodoApuracaoCredito(dcomp.periodoApuracaoCredito),
    );

    return {
      ...result,
      dadosUsados:
        result.dadosAusentes.length === 0
          ? ['periodoApuracaoCredito', ...result.dadosUsados]
          : result.dadosUsados,
    };
  }

  if (tipoCreditoId === 'ressarcimento_ipi' || tipoCreditoId === 'ressarcimento_pis_cofins') {
    return calcularTermoInicialArt152(
      dcomp.metadadosCreditoImportado?.dataProtocoloPerOriginal,
    );
  }

  return {
    statusCalculo: 'tipo_nao_classificado' as const,
    metodo: 'termo_inicial_selic',
    origemValor: 'calculado_motor' as const,
    fontesNormativas: [],
    dadosUsados: ['tipoCredito'],
    dadosAusentes: ['tipoCreditoClassificado'],
    hipoteses: [],
    alertas: ['tipo_credito_nao_classificado'],
  };
}

function calcularFallbackOuDadosInsuficientes(
  input: SelicRastreavelInput,
  tipoCreditoId: TipoCreditoId,
  contexto: {
    dadosAusentes: string[];
    dadosUsados: string[];
    hipoteses: string[];
  },
): ResultadoAuditavel<SelicRastreavelResult> {
  if (input.fatorHistorico === undefined) {
    return {
      statusCalculo: 'dados_insuficientes',
      metodo: 'selic_normativa_por_tipo_credito',
      origemValor: 'calculado_motor',
      fontesNormativas: [],
      dadosUsados: contexto.dadosUsados,
      dadosAusentes: contexto.dadosAusentes,
      hipoteses: contexto.hipoteses,
      alertas: [],
    };
  }

  return {
    statusCalculo: 'estimativa_historica',
    valor: {
      tipoCreditoId,
      termoInicialMes: '',
      termoFinalMes: '',
      dataEntregaValoracao: input.dcomp.dataTransmissaoOriginal,
      taxaSelicDecimal: input.fatorHistorico - 1,
      valorCreditoAtualizado:
        input.dcomp.valorTotalCreditoDetalhadoOriginal * input.fatorHistorico,
      creditoOriginalUtilizadoCalculado:
        input.totalDebitosDocumento / input.fatorHistorico,
      saldoCreditoOriginalCalculado:
        input.dcomp.valorTotalCreditoDetalhadoOriginal -
        input.totalDebitosDocumento / input.fatorHistorico,
    },
    metodo: 'fator_historico_identificado',
    origemValor: 'fallback_operacional',
    fontesNormativas: [],
    dadosUsados: [...contexto.dadosUsados, 'fatorHistorico'],
    dadosAusentes: contexto.dadosAusentes,
    hipoteses: [
      ...contexto.hipoteses,
      'fallback_historico_nao_normativo_sem_tabela_selic_validada',
    ],
    alertas: ['resultado_estimado_nao_normativo'],
  };
}
