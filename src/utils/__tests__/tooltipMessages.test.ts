import { describe, expect, it } from 'vitest';
import type { ResultadoAuditavel } from '../../services/normativo/types';
import type { SelicRastreavelResult } from '../../services/normativo/selicService';
import type { DCOMP } from '../../models/types';
import {
  formatarMotivoStatus,
  getTooltipPapelDocumento,
  getTooltipSelic,
  getTooltipStatusCascata,
} from '../tooltipMessages';

describe('tooltipMessages', () => {
  it('traduz motivos internos de status para mensagens consultivas de usuario', () => {
    expect(formatarMotivoStatus('status_nao_classificado')).toBe(
      'Status não classificado pelas regras atuais. Validar manualmente a situação no e-CAC/PER/DCOMP Web.',
    );

    expect(formatarMotivoStatus('cancelamento_deferido_irreversivel')).toBe(
      'Pedido de cancelamento deferido. Documento tratado como não vigente e não editável.',
    );
  });

  it('explica nao vigencia pela causa classificada, sem mensagem fixa de retificacao', () => {
    const dcomp = criarDcomp({ statusCascata: 'OK', situacao: 'Pedido de Cancelamento Deferido' });

    expect(
      getTooltipStatusCascata(dcomp, {
        statusOriginal: 'Pedido de Cancelamento Deferido',
        statusNormalizado: 'pedido de cancelamento deferido',
        tipoDocumentoOriginal: 'Pedido de Cancelamento',
        tipoDocumentoNormalizado: 'pedido de cancelamento',
        vigenciaCascata: 'nao_vigente',
        editabilidadeSimulacao: 'bloqueado',
        cancelabilidade: 'nao_cancelavel',
        motivos: ['cancelamento_deferido_irreversivel'],
        fontesNormativas: [],
      }, false, true),
    ).toContain('Pedido de cancelamento deferido');
  });

  it('explica o papel de detalhador e consumidor', () => {
    expect(getTooltipPapelDocumento(criarDcomp({ id: 'A', numeroDcompDetalhamento: 'A' }))).toBe(
      'PER/DCOMP que detalha ou origina o crédito desta cadeia.',
    );

    expect(getTooltipPapelDocumento(criarDcomp({ id: 'B', numeroDcompDetalhamento: 'A' }))).toBe(
      'PER/DCOMP que consome crédito detalhado por outra declaração.',
    );
  });

  it('resume a qualidade SELIC usando dados auditaveis disponiveis', () => {
    const resultado: ResultadoAuditavel<SelicRastreavelResult> = {
      statusCalculo: 'estimativa_historica',
      metodo: 'fator_historico_identificado',
      origemValor: 'fallback_operacional',
      fontesNormativas: [],
      dadosUsados: ['tipoCredito', 'fatorHistorico'],
      dadosAusentes: ['taxaSelicDecimal'],
      hipoteses: ['fallback_historico_nao_normativo_sem_tabela_selic_validada'],
      alertas: ['resultado_estimado_nao_normativo'],
      valor: {
        tipoCreditoId: 'saldo_negativo_irpj',
        termoInicialMes: '',
        termoFinalMes: '',
        dataEntregaValoracao: new Date('2024-02-15T00:00:00'),
        taxaSelicDecimal: 0.12,
        valorCreditoAtualizado: 112,
        creditoOriginalUtilizadoCalculado: 100,
        saldoCreditoOriginalCalculado: 12,
      },
    };

    const tooltip = getTooltipSelic(resultado);

    expect(tooltip).toContain('Estimativa histórica');
    expect(tooltip).toContain('fator histórico importado/RFB');
    expect(tooltip).toContain('Dados ausentes: taxaSelicDecimal');
    expect(tooltip).not.toContain('resultado_estimado_nao_normativo');
  });
  it('traduz motivo consultivo de PER/DCOMP em analise vigente e editavel', () => {
    expect(formatarMotivoStatus('documento_em_analise_vigente_editavel')).toBe(
      'PER/DCOMP em análise. Documento vigente e editável enquanto permanecer nessa situação.',
    );
  });
});

function criarDcomp(overrides: Partial<DCOMP>): DCOMP {
  return {
    id: '123',
    dataTransmissaoOriginal: new Date('2024-01-15T00:00:00'),
    dataTransmissao: new Date('2024-01-15T00:00:00'),
    tipoDocumento: 'Declaracao de Compensacao',
    situacao: 'Pendente',
    indicadorCredito: '1',
    tipoCredito: 'Saldo Negativo de IRPJ',
    detentorCredito: 'Empresa',
    periodoApuracaoCredito: '2023',
    valorTotalCreditoDetalhado: 100,
    valorTotalCreditoDetalhadoOriginal: 100,
    valorCreditoDataTransmissao: 110,
    valorUtilizadoPerdcomp: 50,
    valorUtilizadoPerdcompOriginal: 50,
    idCadeiaRelacional: 'cadeia',
    debitos: [],
    ...overrides,
  };
}
