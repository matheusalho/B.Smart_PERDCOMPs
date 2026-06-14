import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SimulacaoSalva } from '../../models/types';
import { generatePdfReport } from '../ReportGeneratorService';

const mocks = vi.hoisted(() => {
  const autoTableCalls: Array<Record<string, unknown>> = [];
  const doc = {
    internal: {
      pageSize: {
        getHeight: () => 297,
        getWidth: () => 210,
      },
    },
    lastAutoTable: { finalY: 20 },
    setFillColor: vi.fn(),
    rect: vi.fn(),
    addPage: vi.fn(function addPage(this: typeof doc) {
      return this;
    }),
    addImage: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    setDrawColor: vi.fn(),
    line: vi.fn(),
    save: vi.fn(),
  };

  return { autoTableCalls, doc };
});

vi.mock('jspdf', () => ({
  default: vi.fn(function MockJsPdf() {
    return mocks.doc;
  }),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn((doc: typeof mocks.doc, options: Record<string, unknown>) => {
    mocks.autoTableCalls.push(options);
    doc.lastAutoTable = { finalY: 40 };
  }),
}));

describe('ReportGeneratorService', () => {
  beforeEach(() => {
    mocks.autoTableCalls.length = 0;
    vi.clearAllMocks();
  });

  it('inclui origem, metodo e status nos valores exportados para o PDF', async () => {
    await generatePdfReport([criarSimulacaoComRastreabilidade()], 'light');

    const celulas = mocks.autoTableCalls
      .flatMap((call) => call.body as unknown[] | undefined ?? [])
      .flatMap((row) => Array.isArray(row) ? row : [])
      .map(String);

    expect(celulas.some((cell) => cell.includes('Origem: calculado_motor'))).toBe(true);
    expect(celulas.some((cell) => cell.includes('Metodo: selic_normativa_por_tipo_credito'))).toBe(true);
    expect(celulas.some((cell) => cell.includes('Status: normativo'))).toBe(true);
  });
});

function criarSimulacaoComRastreabilidade(): SimulacaoSalva {
  return {
    id: 'SIM-1',
    dataSalvamento: new Date('2026-06-14T12:00:00Z'),
    cadeiaId: 'CADEIA-TRACE',
    numeroDcompInicial: 'TRACE-001',
    tipoCredito: 'Pagamento Indevido ou a Maior',
    kpis: {
      saldoOriginalTotal: 100,
      saldoAtualizadoTotal: 100,
      economiaProjetada: 10,
      lastroOriginalDisponibilizado: 9.09,
      saldoOriginalRestanteAntigo: 50,
      saldoOriginalRestanteNovo: 60,
    },
    metadadosAuditoria: {
      versaoMotorCalculo: 'teste',
      statusCalculoGlobal: 'normativo',
      fontesNormativas: [],
      hipoteses: [],
      dadosAusentes: [],
    },
    rastreabilidadeValores: [
      {
        dcompId: 'TRACE-001',
        valores: [
          {
            campo: 'valorUtilizadoPerdcomp',
            rotulo: 'Cred. Orig. Usado',
            valor: 40,
            origemValor: 'calculado_motor',
            metodo: 'selic_normativa_por_tipo_credito',
            statusCalculo: 'normativo',
            dadosAusentes: [],
          },
        ],
      },
    ],
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
        isManuallyEdited: true,
        idCadeiaRelacional: 'CADEIA-TRACE',
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
