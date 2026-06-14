import { describe, expect, it } from 'vitest';

import { useStore } from '../store';
import type { CadeiaRelacional, Empresa, ImportQualityReport, KpiSnapshot } from '../models/types';

describe('store import quality report', () => {
  it('preserva ImportQualityReport no estado sem recalcular quando dados ja vieram recalculados', () => {
    const report: ImportQualityReport = {
      linhasProcessamento: 2,
      linhasDebitos: 1,
      dcompsCarregadas: 1,
      cadeiasCarregadas: 1,
      debitosCarregados: 1,
      documentosIgnorados: [
        {
          numeroPerdcomp: '22222.22222.010124.1.3.01-2222',
          motivo: 'sem_cadeia_relacional',
          tipoCredito: 'Pagamento Indevido ou a Maior eSocial',
          situacao: 'Em análise',
        },
      ],
    };

    useStore.getState().limparDados();
    useStore.getState().importarDados([criarCadeiaMinima()], criarEmpresa(), true, report);

    expect(useStore.getState().importQualityReport).toEqual(report);
  });

  it('salva snapshot com rastreabilidade de origem e metodo por valor', () => {
    useStore.getState().limparDados();
    useStore.getState().importarDados([criarCadeiaComSelicNormativa()], criarEmpresa(), true);

    useStore.getState().salvarSimulacaoCadeia('CADEIA-TRACE', criarKpisMinimos(), {
      versaoMotorCalculo: 'teste',
      statusCalculoGlobal: 'normativo',
      fontesNormativas: [],
      hipoteses: [],
      dadosAusentes: [],
    });

    const [simulacao] = useStore.getState().simulacoesSalvas;

    expect(simulacao.rastreabilidadeValores).toEqual([
      expect.objectContaining({
        dcompId: 'TRACE-001',
        valores: expect.arrayContaining([
          expect.objectContaining({
            campo: 'valorUtilizadoPerdcomp',
            origemValor: 'calculado_motor',
            metodo: 'selic_normativa_por_tipo_credito',
            statusCalculo: 'normativo',
          }),
          expect.objectContaining({
            campo: 'valorTotalCreditoDetalhadoOriginal',
            origemValor: 'importado_rfb',
            metodo: 'importado_eCAC',
          }),
        ]),
      }),
    ]);
  });
});

function criarEmpresa(): Empresa {
  return {
    cnpj: '00.000.000/0001-00',
    razaoSocial: 'Empresa Teste',
  };
}

function criarCadeiaMinima(): CadeiaRelacional {
  return {
    id: 'CADEIA-1',
    numeroDcompInicial: '11111.11111.010124.1.3.01-1111',
    tipoCredito: 'Pagamento Indevido ou a Maior',
    periodoApuracao: '01/2024',
    dcomps: [
      {
        id: '11111.11111.010124.1.3.01-1111',
        dataTransmissaoOriginal: new Date('2024-02-10T00:00:00Z'),
        dataTransmissao: new Date('2024-02-10T00:00:00Z'),
        tipoDocumento: 'Decl. Compensação',
        situacao: 'Homologado',
        indicadorCredito: '1',
        tipoCredito: 'Pagamento Indevido ou a Maior',
        detentorCredito: 'Empresa Teste',
        periodoApuracaoCredito: '01/2024',
        valorTotalCreditoDetalhado: 100,
        valorTotalCreditoDetalhadoOriginal: 100,
        valorCreditoDataTransmissao: 100,
        valorUtilizadoPerdcomp: 50,
        valorUtilizadoPerdcompOriginal: 50,
        idCadeiaRelacional: 'CADEIA-1',
        debitos: [],
      },
    ],
  };
}

function criarKpisMinimos(): KpiSnapshot {
  return {
    saldoOriginalTotal: 100,
    saldoAtualizadoTotal: 100,
    economiaProjetada: 10,
    lastroOriginalDisponibilizado: 9.09,
    saldoOriginalRestanteAntigo: 50,
    saldoOriginalRestanteNovo: 40,
  };
}

function criarCadeiaComSelicNormativa(): CadeiaRelacional {
  return {
    id: 'CADEIA-TRACE',
    numeroDcompInicial: 'TRACE-001',
    tipoCredito: 'Pagamento Indevido ou a Maior',
    periodoApuracao: '01/2024',
    dcomps: [
      {
        id: 'TRACE-001',
        dataTransmissaoOriginal: new Date('2024-02-10T00:00:00Z'),
        dataTransmissao: new Date('2024-02-10T00:00:00Z'),
        tipoDocumento: 'Decl. Compensacao',
        situacao: 'Em analise',
        indicadorCredito: '1',
        tipoCredito: 'Pagamento Indevido ou a Maior',
        detentorCredito: 'Empresa Teste',
        periodoApuracaoCredito: '01/2024',
        valorTotalCreditoDetalhado: 100,
        valorTotalCreditoDetalhadoOriginal: 100,
        valorCreditoDataTransmissao: 110,
        valorUtilizadoPerdcomp: 40,
        valorUtilizadoPerdcompOriginal: 50,
        saldoCreditoOriginalCalculado: 60,
        saldoCreditoOriginalAnterior: 50,
        idCadeiaRelacional: 'CADEIA-TRACE',
        isManuallyEdited: true,
        resultadoSelic: {
          statusCalculo: 'normativo',
          metodo: 'selic_normativa_por_tipo_credito',
          origemValor: 'calculado_motor',
          fontesNormativas: [],
          dadosUsados: ['tipoCredito'],
          dadosAusentes: [],
          hipoteses: [],
          alertas: [],
          valor: {
            taxaSelicDecimal: 0.1,
            valorCreditoAtualizado: 110,
            creditoOriginalUtilizadoCalculado: 40,
            saldoCreditoOriginalCalculado: 60,
            tipoCreditoId: 'pagamento_indevido_maior',
            termoInicialMes: '2024-01',
            termoFinalMes: '2024-02',
            dataEntregaValoracao: new Date('2024-02-10T00:00:00Z'),
          },
        },
        debitos: [
          {
            id: 'DEB-1',
            codigoReceita: '1234',
            periodoApuracao: '01/2024',
            dataVencimento: '20/02/2024',
            valorPrincipal: 40,
            valorMulta: 0,
            valorJuros: 0,
            valorTotal: 40,
            valorPrincipalOriginal: 50,
            valorMultaOriginal: 0,
            valorJurosOriginal: 0,
            valorTotalOriginal: 50,
          },
        ],
      },
    ],
  };
}
