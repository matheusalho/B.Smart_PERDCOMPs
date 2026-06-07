import type { ResultadoAuditavel } from './types';

type TermoInicialResult = {
  termoInicialMes: string;
};

type EntregaArt157Result = {
  dataTransmissaoOriginal: Date;
  dataEntregaValoracao: Date;
  ajusteArt157Aplicado: boolean;
};

export type TermoFinalResult = {
  termoFinalMes: string;
  dataEntregaValoracao: Date;
};

const fonteArt148 = {
  ato: 'IN RFB n. 2.055/2021',
  artigo: 'art. 148',
  resumo: 'Regra geral de valoracao e juros SELIC em pedidos e compensacoes.',
};

const fonteArt152 = {
  ato: 'IN RFB n. 2.055/2021',
  artigo: 'art. 152',
  resumo: 'SELIC em ressarcimentos nao efetuados no prazo de 360 dias.',
};

const fonteArt157 = {
  ato: 'IN RFB n. 2.055/2021',
  artigo: 'art. 157',
  resumo: 'Documento transmitido em dia nao util e considerado entregue no primeiro dia util subsequente.',
};

export function calcularTermoInicialPagamento(
  dataArrecadacaoCredito?: Date,
): ResultadoAuditavel<TermoInicialResult> {
  if (!dataArrecadacaoCredito) {
    return resultadoDataInsuficiente('dataArrecadacaoCredito');
  }

  return resultadoTermoInicial(
    mesRelativo(dataArrecadacaoCredito, 1),
    ['dataArrecadacaoCredito'],
  );
}

export function calcularTermoInicialSaldoNegativo(
  fimPeriodoApuracao?: Date,
): ResultadoAuditavel<TermoInicialResult> {
  if (!fimPeriodoApuracao) {
    return resultadoDataInsuficiente('fimPeriodoApuracao');
  }

  return resultadoTermoInicial(
    mesRelativo(fimPeriodoApuracao, 1),
    ['fimPeriodoApuracao'],
  );
}

export function calcularTermoInicialRetencaoPrevidenciaria(
  competenciaCredito?: string,
): ResultadoAuditavel<TermoInicialResult> {
  const competencia = parseCompetencia(competenciaCredito);

  if (!competencia) {
    return resultadoDataInsuficiente('competenciaCredito');
  }

  return resultadoTermoInicial(
    formatarMes(competencia.ano, competencia.mes + 2),
    ['competenciaCredito'],
  );
}

export function calcularTermoInicialArt152(
  dataProtocoloPerOriginal?: Date,
): ResultadoAuditavel<TermoInicialResult> {
  if (!dataProtocoloPerOriginal) {
    return {
      ...resultadoDataInsuficiente('dataProtocoloPerOriginal'),
      fontesNormativas: [fonteArt152],
    };
  }

  const dia361 = somarDias(dataProtocoloPerOriginal, 360);

  return {
    ...resultadoTermoInicial(
      mesRelativo(dia361, 1),
      ['dataProtocoloPerOriginal'],
    ),
    fontesNormativas: [fonteArt152],
    hipoteses: ['contagem_calendario_pendente_validacao_usuario'],
  };
}

export function ajustarEntregaArt157(
  dataTransmissaoOriginal: Date,
): ResultadoAuditavel<EntregaArt157Result> {
  const dataEntregaValoracao = primeiroDiaUtilSubsequenteSeNecessario(
    dataTransmissaoOriginal,
  );

  return {
    statusCalculo: 'normativo',
    valor: {
      dataTransmissaoOriginal,
      dataEntregaValoracao,
      ajusteArt157Aplicado:
        dataEntregaValoracao.getTime() !== dataTransmissaoOriginal.getTime(),
    },
    metodo: 'ajuste_art_157_fim_de_semana',
    origemValor: 'calculado_motor',
    fontesNormativas: [fonteArt157],
    dadosUsados: ['dataTransmissaoOriginal'],
    dadosAusentes: [],
    hipoteses: ['calendario_inicial_considera_sabado_domingo'],
    alertas: [],
  };
}

export function calcularTermoFinalDcompOriginal(
  dataTransmissaoOriginal: Date,
): ResultadoAuditavel<TermoFinalResult> {
  const entrega = ajustarEntregaArt157(dataTransmissaoOriginal);

  if (!entrega.valor) {
    return {
      statusCalculo: 'dados_insuficientes',
      metodo: 'termo_final_selic',
      origemValor: 'calculado_motor',
      fontesNormativas: [fonteArt148, fonteArt157],
      dadosUsados: [],
      dadosAusentes: ['dataTransmissaoOriginal'],
      hipoteses: [],
      alertas: [],
    };
  }

  return {
    statusCalculo: 'normativo',
    valor: {
      termoFinalMes: mesRelativo(entrega.valor.dataEntregaValoracao, -1),
      dataEntregaValoracao: entrega.valor.dataEntregaValoracao,
    },
    metodo: 'termo_final_mes_anterior_entrega_mais_um_por_cento_mes_corrente',
    origemValor: 'calculado_motor',
    fontesNormativas: [fonteArt148, fonteArt157],
    dadosUsados: ['dataTransmissaoOriginal'],
    dadosAusentes: [],
    hipoteses: entrega.hipoteses,
    alertas: [],
  };
}

export function extrairFimPeriodoApuracaoCredito(
  periodoApuracaoCredito?: string,
): Date | undefined {
  const match = periodoApuracaoCredito?.match(
    /A\s+(\d{2})\/(\d{2})\/(\d{4})/i,
  );

  if (!match) {
    return undefined;
  }

  return new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00Z`);
}

function resultadoTermoInicial(
  termoInicialMes: string,
  dadosUsados: string[],
): ResultadoAuditavel<TermoInicialResult> {
  return {
    statusCalculo: 'normativo',
    valor: { termoInicialMes },
    metodo: 'termo_inicial_selic',
    origemValor: 'calculado_motor',
    fontesNormativas: [fonteArt148],
    dadosUsados,
    dadosAusentes: [],
    hipoteses: [],
    alertas: [],
  };
}

function resultadoDataInsuficiente(
  campo: string,
): ResultadoAuditavel<TermoInicialResult> {
  return {
    statusCalculo: 'dados_insuficientes',
    metodo: 'termo_inicial_selic',
    origemValor: 'calculado_motor',
    fontesNormativas: [fonteArt148],
    dadosUsados: [],
    dadosAusentes: [campo],
    hipoteses: [],
    alertas: [],
  };
}

function mesRelativo(date: Date, deltaMeses: number): string {
  return formatarMes(date.getFullYear(), date.getMonth() + deltaMeses);
}

function formatarMes(ano: number, mesZeroBased: number): string {
  const date = new Date(ano, mesZeroBased, 1);
  const mes = String(date.getMonth() + 1).padStart(2, '0');

  return `${date.getFullYear()}-${mes}`;
}

function parseCompetencia(competencia?: string): { ano: number; mes: number } | undefined {
  const match = competencia?.match(/^(\d{4})-(\d{2})$/);

  if (!match) {
    return undefined;
  }

  const ano = Number(match[1]);
  const mes = Number(match[2]);

  if (mes < 1 || mes > 12) {
    return undefined;
  }

  return { ano, mes: mes - 1 };
}

function somarDias(date: Date, dias: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + dias);

  return result;
}

function primeiroDiaUtilSubsequenteSeNecessario(date: Date): Date {
  const result = new Date(date);

  while (result.getDay() === 0 || result.getDay() === 6) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}
