import type { ResultadoAuditavel } from './types';

export type SelicMathInput = {
  valorCreditoOriginalNaDataEntrega: number;
  totalDebitosDocumento: number;
  taxaSelicDecimal?: number;
  fonteTabelaSelic?: string;
};

export type SelicMathResult = {
  taxaSelicDecimal: number;
  valorCreditoAtualizado: number;
  creditoOriginalUtilizadoCalculado: number;
  saldoCreditoOriginalCalculado: number;
};

export function calcularSelicComTaxaInjetada(
  input: SelicMathInput,
): ResultadoAuditavel<SelicMathResult> {
  if (input.taxaSelicDecimal === undefined) {
    return {
      statusCalculo: 'dados_insuficientes',
      metodo: 'taxa_selic_injetada',
      origemValor: 'calculado_motor',
      fontesNormativas: [],
      dadosUsados: [
        'valorCreditoOriginalNaDataEntrega',
        'totalDebitosDocumento',
      ],
      dadosAusentes: ['taxaSelicDecimal'],
      hipoteses: [],
      alertas: [],
    };
  }

  const fatorAtualizacao = 1 + input.taxaSelicDecimal;
  const valorCreditoAtualizado =
    input.valorCreditoOriginalNaDataEntrega * fatorAtualizacao;
  const creditoOriginalUtilizadoCalculado =
    input.totalDebitosDocumento / fatorAtualizacao;
  const saldoCreditoOriginalCalculado =
    input.valorCreditoOriginalNaDataEntrega -
    creditoOriginalUtilizadoCalculado;

  return {
    statusCalculo: 'normativo',
    valor: {
      taxaSelicDecimal: input.taxaSelicDecimal,
      valorCreditoAtualizado,
      creditoOriginalUtilizadoCalculado,
      saldoCreditoOriginalCalculado,
    },
    metodo: 'taxa_selic_injetada',
    origemValor: 'calculado_motor',
    fontesNormativas: input.fonteTabelaSelic
      ? [{ arquivo: input.fonteTabelaSelic, resumo: 'Taxa SELIC informada na entrada de teste.' }]
      : [],
    dadosUsados: [
      'valorCreditoOriginalNaDataEntrega',
      'totalDebitosDocumento',
      'taxaSelicDecimal',
    ],
    dadosAusentes: [],
    hipoteses: ['Taxa SELIC recebida como entrada validada; este helper nao busca tabela.'],
    alertas: [],
  };
}
