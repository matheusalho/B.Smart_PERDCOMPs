import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SimulacaoSalva } from '../../models/types';
import { generatePdfReport } from '../ReportGeneratorService';

const mocks = vi.hoisted(() => {
  const autoTableCalls: Array<Record<string, unknown>> = [];
  const jsPdfConstructor = vi.fn();
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

  return { autoTableCalls, doc, jsPdfConstructor };
});

vi.mock('jspdf', () => ({
  default: vi.fn(function MockJsPdf(options: Record<string, unknown>) {
    mocks.jsPdfConstructor(options);
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

  it('gera o PDF em orientacao paisagem para acomodar tabelas rastreadas', async () => {
    await generatePdfReport([criarSimulacaoComRastreabilidade()], 'light');

    expect(mocks.jsPdfConstructor).toHaveBeenCalledWith(
      expect.objectContaining({ orientation: 'landscape' }),
    );
  });

  it('move origem, metodo e status para coluna propria de indicadores compactos', async () => {
    await generatePdfReport([criarSimulacaoComRastreabilidade()], 'light');

    const tabelaRecalculada = mocks.autoTableCalls.find((call) => {
      const head = call.head as unknown[][];
      const body = call.body as unknown[][] | undefined;
      return head?.some((row) => row.includes('Indicadores')) &&
        head.some((row) => row.includes('Créd. Orig. Usado')) &&
        body?.some((row) => String(row.at(-1)).includes('SELIC'));
    });

    expect(tabelaRecalculada).toBeDefined();

    const head = tabelaRecalculada?.head as unknown[][];
    expect(head[0]).toContain('Indicadores');

    const celulasMonetarias = (tabelaRecalculada?.body as unknown[][])
      .flatMap((row) => row.slice(1, -1))
      .map(String);

    expect(celulasMonetarias.some((cell) => cell.includes('Origem:'))).toBe(false);
    expect(celulasMonetarias.some((cell) => cell.includes('Metodo:'))).toBe(false);
    expect(celulasMonetarias.some((cell) => cell.includes('Status:'))).toBe(false);

    const indicadores = (tabelaRecalculada?.body as unknown[][])
      .map((row) => String(row.at(-1)));

    expect(indicadores.some((cell) => cell.includes('CALC'))).toBe(true);
    expect(indicadores.some((cell) => cell.includes('SELIC'))).toBe(true);
    expect(indicadores.some((cell) => cell.includes('NORM'))).toBe(true);

    const todasCelulas = mocks.autoTableCalls
      .flatMap((call) => call.body as unknown[] | undefined ?? [])
      .flatMap((row) => Array.isArray(row) ? row : [])
      .map(String);

    expect(todasCelulas.some((cell) => cell.includes('Origem: calculado_motor'))).toBe(false);
    expect(todasCelulas.some((cell) => cell.includes('Metodo: selic_normativa_por_tipo_credito'))).toBe(false);
  });

  it('omite status metodologico textual abaixo do numero da PER/DCOMP nas tabelas rastreadas', async () => {
    await generatePdfReport([criarSimulacaoComRastreabilidade()], 'light');

    const tabelasRastreadas = mocks.autoTableCalls.filter((call) => {
      const head = call.head as unknown[][];
      return head?.some((row) => row.includes('Indicadores')) &&
        head.some((row) => row.includes('PER/DCOMP'));
    });

    expect(tabelasRastreadas.length).toBeGreaterThan(0);

    const celulasPerDcomp = tabelasRastreadas
      .flatMap((call) => call.body as unknown[][])
      .map((row) => String(row[0]));

    expect(celulasPerDcomp).toContain('TRACE-001');
    expect(celulasPerDcomp.some((cell) => cell.includes('\nNormativo'))).toBe(false);
    expect(celulasPerDcomp.some((cell) => cell.includes('\nEstimativa'))).toBe(false);
    expect(celulasPerDcomp.some((cell) => cell.includes('\nDados Insuf.'))).toBe(false);
  });

  it('evita dividir linhas das tabelas rastreadas entre paginas', async () => {
    await generatePdfReport([criarSimulacaoComRastreabilidade()], 'light');

    const tabelasRastreadas = mocks.autoTableCalls.filter((call) => {
      const head = call.head as unknown[][];
      return head?.some((row) => row.includes('Indicadores')) &&
        head.some((row) => row.includes('PER/DCOMP'));
    });

    expect(tabelasRastreadas.length).toBeGreaterThan(0);
    expect(tabelasRastreadas.every((call) => call.rowPageBreak === 'avoid')).toBe(true);
  });

  it('inclui glossario das badges de rastreabilidade na declaracao de premissas e metodologia', async () => {
    await generatePdfReport([criarSimulacaoComRastreabilidade()], 'light');

    expect(mocks.doc.text).toHaveBeenCalledWith(
      'Declaração de Premissas e Metodologia',
      14,
      expect.any(Number),
    );

    const glossario = mocks.autoTableCalls.find((call) => {
      const head = call.head as unknown[][];
      return head?.some((row) => row.includes('Badge') && row.includes('Significado'));
    });

    expect(glossario).toBeDefined();

    const linhas = glossario?.body as unknown[][];
    const badgesDocumentadas = linhas.map((row) => String(row[0]));

    expect(badgesDocumentadas).toEqual(
      expect.arrayContaining([
        'RFB',
        'ECAC',
        'CALC',
        'SELIC',
        'NORM',
        'SIM',
        'EDIC',
        'FALL',
        'EST',
        'DADOS',
        'PARC',
        'CASC',
        'DIV',
        'HIP',
        'RAIZ',
      ]),
    );

    expect(linhas.some((row) => String(row[1]).includes('Receita Federal'))).toBe(true);
    expect(linhas.some((row) => String(row[1]).includes('cálculo normativo'))).toBe(true);
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
