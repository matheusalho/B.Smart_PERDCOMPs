import type {
  DCOMP,
  RastreabilidadeDcompSnapshot,
  RastreabilidadeValorSnapshot,
  SimulacaoSalva,
} from '../models/types';
import type { OrigemValor, StatusCalculo } from './normativo/types';

export function criarRastreabilidadeValoresSimulacao(
  dcomps: DCOMP[],
): RastreabilidadeDcompSnapshot[] {
  return dcomps.map(criarRastreabilidadeValoresDcomp);
}

export function criarRastreabilidadeValoresDcomp(
  dcomp: DCOMP,
): RastreabilidadeDcompSnapshot {
  const totalDebitosOriginal = somarDebitos(dcomp, 'original');
  const totalDebitosAtual = somarDebitos(dcomp, 'atual');
  const creditoDataTransmissaoOriginal =
    dcomp.divergenciaDetalhes?.esperado ?? dcomp.valorCreditoDataTransmissao;
  const creditoDataTransmissaoAtual =
    dcomp.divergenciaDetalhes?.calculado ?? dcomp.valorCreditoDataTransmissao;
  const saldoOriginalHistorico =
    dcomp.saldoCreditoOriginalAnterior ??
    creditoDataTransmissaoOriginal - dcomp.valorUtilizadoPerdcompOriginal;

  return {
    dcompId: dcomp.id,
    valores: [
      criarValor(
        'valorTotalCreditoDetalhadoOriginal',
        'Valor Credito Inicial Original',
        dcomp.valorTotalCreditoDetalhadoOriginal,
        'importado_rfb',
        'importado_eCAC',
      ),
      criarValor(
        'valorCreditoDataTransmissaoOriginal',
        'Credito Data Transmissao Original',
        creditoDataTransmissaoOriginal,
        dcomp.divergenciaDetalhes?.esperado !== undefined
          ? 'calculado_motor'
          : 'importado_rfb',
        dcomp.divergenciaDetalhes?.esperado !== undefined
          ? 'divergencia_esperada_calculada'
          : 'importado_eCAC',
      ),
      criarValor(
        'debitosTotalOriginal',
        'Debitos Compensados Originais',
        totalDebitosOriginal,
        isDcompHipotetica(dcomp) ? 'simulado_usuario' : 'importado_rfb',
        isDcompHipotetica(dcomp) ? 'baseline_simulado_usuario' : 'importado_eCAC',
      ),
      criarValor(
        'valorUtilizadoPerdcompOriginal',
        'Credito Original Usado Original',
        dcomp.valorUtilizadoPerdcompOriginal,
        isDcompHipotetica(dcomp) ? 'simulado_usuario' : 'importado_rfb',
        isDcompHipotetica(dcomp) ? 'baseline_simulado_usuario' : 'importado_eCAC',
      ),
      criarValor(
        'saldoProximaDcompOriginal',
        'Saldo Proxima DCOMP Historico',
        saldoOriginalHistorico,
        'calculado_motor',
        'cascata_historica_sem_edicao',
      ),
      criarValorTotalCreditoDetalhadoAtual(dcomp),
      criarValor(
        'valorCreditoDataTransmissao',
        'Credito Data Transmissao Recalculado',
        creditoDataTransmissaoAtual,
        dcomp.divergenciaDetalhes?.calculado !== undefined
          ? 'calculado_motor'
          : 'importado_rfb',
        dcomp.divergenciaDetalhes?.calculado !== undefined
          ? 'divergencia_recalculada'
          : 'importado_eCAC',
      ),
      criarValor(
        'debitosTotal',
        'Debitos Compensados Atuais',
        totalDebitosAtual,
        totalDebitosAtual !== totalDebitosOriginal || isDcompHipotetica(dcomp)
          ? 'simulado_usuario'
          : 'importado_rfb',
        totalDebitosAtual !== totalDebitosOriginal || isDcompHipotetica(dcomp)
          ? 'edicao_usuario'
          : 'importado_eCAC',
      ),
      criarValorUtilizadoAtual(dcomp),
      criarValor(
        'saldoCreditoOriginalCalculado',
        'Saldo Proxima DCOMP Recalculado',
        dcomp.saldoCreditoOriginalCalculado ?? 0,
        'calculado_motor',
        'cascata_recalculada',
      ),
    ],
  };
}

export function buscarRastreabilidadeValor(
  simulacao: Pick<SimulacaoSalva, 'rastreabilidadeValores'>,
  dcompId: string,
  campo: string,
): RastreabilidadeValorSnapshot | undefined {
  return simulacao.rastreabilidadeValores
    ?.find((item) => item.dcompId === dcompId)
    ?.valores.find((valor) => valor.campo === campo);
}

export function formatarResumoRastreabilidadeValor(
  rastreabilidade?: RastreabilidadeValorSnapshot,
): string {
  if (!rastreabilidade) return '';

  const partes = [
    `Origem: ${rastreabilidade.origemValor}`,
    `Metodo: ${rastreabilidade.metodo}`,
  ];

  if (rastreabilidade.statusCalculo) {
    partes.push(`Status: ${rastreabilidade.statusCalculo}`);
  }

  if (rastreabilidade.dadosAusentes.length > 0) {
    partes.push(`Dados ausentes: ${rastreabilidade.dadosAusentes.join(', ')}`);
  }

  return partes.join('; ');
}

function criarValor(
  campo: string,
  rotulo: string,
  valor: number,
  origemValor: OrigemValor,
  metodo: string,
  statusCalculo?: StatusCalculo,
  dadosAusentes: string[] = [],
): RastreabilidadeValorSnapshot {
  return {
    campo,
    rotulo,
    valor,
    origemValor,
    metodo,
    statusCalculo,
    dadosAusentes,
  };
}

function criarValorTotalCreditoDetalhadoAtual(dcomp: DCOMP) {
  if (isDcompHipotetica(dcomp)) {
    return criarValor(
      'valorTotalCreditoDetalhado',
      'Valor Credito Inicial Atual',
      dcomp.valorTotalCreditoDetalhado,
      'simulado_usuario',
      'dcomp_hipotetica',
    );
  }

  if (dcomp.valorTotalCreditoDetalhado !== dcomp.valorTotalCreditoDetalhadoOriginal) {
    return criarValor(
      'valorTotalCreditoDetalhado',
      'Valor Credito Inicial Atual',
      dcomp.valorTotalCreditoDetalhado,
      'replicado_credito_raiz',
      'credito_raiz_replicado_para_exibicao',
    );
  }

  return criarValor(
    'valorTotalCreditoDetalhado',
    'Valor Credito Inicial Atual',
    dcomp.valorTotalCreditoDetalhado,
    'importado_rfb',
    'importado_eCAC',
  );
}

function criarValorUtilizadoAtual(dcomp: DCOMP) {
  if (isDcompHipotetica(dcomp)) {
    return criarValor(
      'valorUtilizadoPerdcomp',
      'Credito Original Usado Atual',
      dcomp.valorUtilizadoPerdcomp,
      'fallback_operacional',
      'estimativa_dcomp_hipotetica',
    );
  }

  if (dcomp.isManuallyEdited && dcomp.resultadoSelic) {
    return criarValor(
      'valorUtilizadoPerdcomp',
      'Credito Original Usado Atual',
      dcomp.valorUtilizadoPerdcomp,
      dcomp.resultadoSelic.origemValor,
      dcomp.resultadoSelic.metodo,
      dcomp.resultadoSelic.statusCalculo,
      dcomp.resultadoSelic.dadosAusentes,
    );
  }

  if (dcomp.isManuallyEdited) {
    return criarValor(
      'valorUtilizadoPerdcomp',
      'Credito Original Usado Atual',
      dcomp.valorUtilizadoPerdcomp,
      'fallback_operacional',
      'fator_historico_identificado',
    );
  }

  return criarValor(
    'valorUtilizadoPerdcomp',
    'Credito Original Usado Atual',
    dcomp.valorUtilizadoPerdcomp,
    'importado_rfb',
    'importado_eCAC',
  );
}

function somarDebitos(dcomp: DCOMP, modo: 'original' | 'atual') {
  return dcomp.debitos.reduce(
    (acc, debito) =>
      acc + (modo === 'original' ? debito.valorTotalOriginal : debito.valorTotal),
    0,
  );
}

function isDcompHipotetica(dcomp: DCOMP) {
  return dcomp.indicadorCredito.toLowerCase().includes('hipot');
}
