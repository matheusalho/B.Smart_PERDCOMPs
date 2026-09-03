import type { Worksheet } from 'exceljs';
import { describe, expect, it } from 'vitest';

import { criarCadeiaCompleta } from '../excel/__tests__/fixtures';
import { buildCadeiasWorkbook, type CadeiasWorkbookInput } from '../ExcelCadeiasCompletasService';

function montar(overrides: Partial<CadeiasWorkbookInput> = {}) {
  return buildCadeiasWorkbook({
    cadeias: [criarCadeiaCompleta()],
    empresa: { cnpj: '12345678000199', razaoSocial: 'Empresa Teste Ltda.' },
    importQualityReport: null,
    simulacoesSalvas: [],
    modo: 'completo',
    emitidoEm: new Date(2026, 8, 3, 10, 30),
    ...overrides,
  });
}

function colunaPorCabecalho(sheet: Worksheet, cabecalho: string): number {
  const row = sheet.getRow(4);
  for (let column = 2; column <= row.cellCount; column += 1) {
    if (row.getCell(column).value === cabecalho) return column;
  }
  throw new Error(`Cabeçalho não encontrado: ${cabecalho}`);
}

function valorPorCabecalho(sheet: Worksheet, row: number, cabecalho: string) {
  return sheet.getCell(row, colunaPorCabecalho(sheet, cabecalho)).value;
}

function cabecalhos(sheet: Worksheet): string[] {
  const row = sheet.getRow(4);
  const lista: string[] = [];
  for (let column = 2; column <= row.cellCount; column += 1) {
    const valor = row.getCell(column).value;
    if (typeof valor === 'string') lista.push(valor);
  }
  return lista;
}

describe('ExcelCadeiasCompletasService - aba Cascata PER-DCOMP', () => {
  it('emite uma linha por PER/DCOMP da cadeia', () => {
    const sheet = montar().getWorksheet('Cascata PER-DCOMP')!;

    // 6 documentos na fixture; dados começam na linha 5
    expect(sheet.rowCount).toBe(10);
    expect(valorPorCabecalho(sheet, 5, 'PER/DCOMP')).toBe('00001.00001.010124.1.3.24-0001');
    expect(valorPorCabecalho(sheet, 5, 'Ordem na Cadeia')).toBe(1);
  });

  it('preenche flags, papel e vinculo conforme a tela', () => {
    const sheet = montar().getWorksheet('Cascata PER-DCOMP')!;

    expect(valorPorCabecalho(sheet, 5, 'Papel do Documento')).toBe('Detalhador');
    expect(valorPorCabecalho(sheet, 5, 'Natureza')).toBe('DCOMP');
    expect(valorPorCabecalho(sheet, 5, 'Origem')).toBe('Original');
    expect(valorPorCabecalho(sheet, 6, 'Natureza')).toBe('PER');
    expect(valorPorCabecalho(sheet, 7, 'Vigência')).toBe('Não vigente');
    expect(valorPorCabecalho(sheet, 7, 'Retific./Cancel. Por')).toBe('00004.00004.040124.1.7.24-0004');
    expect(valorPorCabecalho(sheet, 7, 'Tipo do Vínculo')).toBe('Retificada por');
    expect(valorPorCabecalho(sheet, 8, 'Papel do Documento')).toBe('Consumidor');
    expect(valorPorCabecalho(sheet, 8, 'Status Cascata')).toBe('A RETIFICAR');
    expect(valorPorCabecalho(sheet, 8, 'Filtro: A Retificar')).toBe('Sim');
    expect(valorPorCabecalho(sheet, 8, 'Divergente')).toBe('Sim');
    expect(valorPorCabecalho(sheet, 8, 'Divergência — Esperado')).toBe(9000);
    expect(valorPorCabecalho(sheet, 8, 'Divergência — Calculado')).toBe(8700);
  });

  it('no modo completo escreve Original, Atual e Delta coerentes', () => {
    const cadeia = criarCadeiaCompleta();
    cadeia.dcomps[0].valorTotalCreditoDetalhado = 7000; // simulação
    const sheet = montar({ cadeias: [cadeia] }).getWorksheet('Cascata PER-DCOMP')!;

    expect(valorPorCabecalho(sheet, 5, 'Crédito Detalhado — Original')).toBe(10000);
    expect(valorPorCabecalho(sheet, 5, 'Crédito Detalhado — Atual')).toBe(7000);
    expect(valorPorCabecalho(sheet, 5, 'Crédito Detalhado — Delta')).toBe(-3000);
  });

  it('no modo e-CAC colapsa os trios e remove as colunas de simulacao', () => {
    const sheet = montar({ modo: 'ecac' }).getWorksheet('Cascata PER-DCOMP')!;
    const lista = cabecalhos(sheet);

    expect(lista).toContain('Crédito Detalhado');
    expect(lista.some((c) => c.includes('— Atual') || c.includes('— Delta'))).toBe(false);
    expect(lista).not.toContain('Editado pelo Usuário');
    expect(lista).not.toContain('Hipotética');
    // a DCOMP hipotética sai do relatório: 5 documentos
    expect(sheet.rowCount).toBe(9);
  });

  it('no modo e-CAC ignora a edicao da sessao e reporta a ancora', () => {
    const cadeia = criarCadeiaCompleta();
    cadeia.dcomps[0].valorTotalCreditoDetalhado = 7000;
    cadeia.dcomps[0].isManuallyEdited = true;

    const sheet = montar({ cadeias: [cadeia], modo: 'ecac' }).getWorksheet('Cascata PER-DCOMP')!;

    expect(valorPorCabecalho(sheet, 5, 'Crédito Detalhado')).toBe(10000);
  });
});

describe('ExcelCadeiasCompletasService - aba Débitos por Linha', () => {
  it('emite uma linha por debito e uma linha unica para documento sem debitos', () => {
    const cadeia = criarCadeiaCompleta();
    const sheet = montar({ cadeias: [cadeia] }).getWorksheet('Débitos por Linha')!;

    const esperado = cadeia.dcomps.reduce((total, d) => total + Math.max(1, d.debitos.length), 0);
    expect(sheet.rowCount).toBe(4 + esperado);
  });

  it('repete os campos do documento em cada linha de debito', () => {
    const sheet = montar().getWorksheet('Débitos por Linha')!;

    expect(valorPorCabecalho(sheet, 5, 'PER/DCOMP')).toBe('00001.00001.010124.1.3.24-0001');
    expect(valorPorCabecalho(sheet, 6, 'PER/DCOMP')).toBe('00001.00001.010124.1.3.24-0001');
    expect(valorPorCabecalho(sheet, 5, 'Nº do Débito na PER/DCOMP')).toBe(1);
    expect(valorPorCabecalho(sheet, 6, 'Nº do Débito na PER/DCOMP')).toBe(2);
    expect(valorPorCabecalho(sheet, 5, 'Código de Receita')).toBe('5952-07');
    expect(valorPorCabecalho(sheet, 6, 'Código de Receita')).toBe('1138-01');
  });

  it('deixa as colunas de debito vazias no PER sem debitos', () => {
    const sheet = montar().getWorksheet('Débitos por Linha')!;

    // linha 7 = PER sem débitos (2 linhas do primeiro documento antes dele)
    expect(valorPorCabecalho(sheet, 7, 'PER/DCOMP')).toBe('00002.00002.020124.1.1.01-0002');
    expect(valorPorCabecalho(sheet, 7, 'Tem Débitos')).toBe('Não');
    expect(valorPorCabecalho(sheet, 7, 'Nº do Débito na PER/DCOMP')).toBeNull();
    expect(valorPorCabecalho(sheet, 7, 'Código de Receita')).toBeNull();
    expect(valorPorCabecalho(sheet, 7, 'Total — Original')).toBeNull();
  });

  it('enriquece o codigo de receita com descricao e escrituracao de origem', () => {
    const sheet = montar().getWorksheet('Débitos por Linha')!;
    expect(String(valorPorCabecalho(sheet, 5, 'Descrição do Código de Receita'))).not.toBe('');
  });

  it('nao aplica SUBTOTAL nas colunas monetarias do documento, mas aplica nas do debito', () => {
    const sheet = montar().getWorksheet('Débitos por Linha')!;

    expect(sheet.getCell(2, colunaPorCabecalho(sheet, 'Crédito Detalhado — Original')).value).toBeNull();
    expect(sheet.getCell(2, colunaPorCabecalho(sheet, 'Total — Original')).value).toMatchObject({
      formula: expect.stringContaining('SUBTOTAL(9,'),
    });
  });

  it('no modo e-CAC reduz as colunas de valor do debito a uma por componente', () => {
    const sheet = montar({ modo: 'ecac' }).getWorksheet('Débitos por Linha')!;
    const lista = cabecalhos(sheet);

    expect(lista).toContain('Principal');
    expect(lista).toContain('Total');
    expect(lista).not.toContain('Total — Delta');
    expect(lista).not.toContain('Débito Editado');
  });
});

describe('ExcelCadeiasCompletasService - abas Resumo e SELIC', () => {
  it('resume a cadeia com contagens e saldos', () => {
    const sheet = montar().getWorksheet('Resumo por Cadeia')!;

    expect(sheet.rowCount).toBe(5); // cabeçalho na 4, uma cadeia na 5
    expect(valorPorCabecalho(sheet, 5, 'ID Cadeia Relacional')).toBe('CADEIA-1');
    expect(valorPorCabecalho(sheet, 5, 'Qtde de DCOMPs')).toBe(6);
    // 2 (dois débitos) + 0 (PER) + 1 + 1 + 0 (cancelamento) + 1 (hipotética) = 5
    expect(valorPorCabecalho(sheet, 5, 'Qtde de Débitos')).toBe(5);
    expect(valorPorCabecalho(sheet, 5, 'Docs A Retificar')).toBe(1);
  });

  it('marca cadeia com simulacao salva apenas no modo completo', () => {
    const comSimulacao = montar({
      simulacoesSalvas: [{
        id: 'SIM-1',
        dataSalvamento: new Date(2026, 8, 3),
        cadeiaId: 'CADEIA-1',
        numeroDcompInicial: '00001.00001.010124.1.3.24-0001',
        tipoCredito: 'Pagamento Indevido ou a Maior eSocial',
        kpis: {
          saldoOriginalTotal: 0,
          saldoAtualizadoTotal: 0,
          economiaProjetada: 0,
          lastroOriginalDisponibilizado: 0,
          saldoOriginalRestanteAntigo: 0,
          saldoOriginalRestanteNovo: 0,
        },
        dcomps: [],
      }],
    }).getWorksheet('Resumo por Cadeia')!;

    expect(valorPorCabecalho(comSimulacao, 5, 'Tem Simulação Salva')).toBe('Sim');
    expect(cabecalhos(montar({ modo: 'ecac' }).getWorksheet('Resumo por Cadeia')!))
      .not.toContain('Tem Simulação Salva');
  });

  it('emite uma linha por PER/DCOMP na aba SELIC', () => {
    const sheet = montar().getWorksheet('SELIC e Rastreabilidade')!;

    expect(sheet.rowCount).toBe(10);
    expect(valorPorCabecalho(sheet, 5, 'PER/DCOMP')).toBe('00001.00001.010124.1.3.24-0001');
  });
});

describe('ExcelCadeiasCompletasService - abas Qualidade e Legenda', () => {
  it('emite as seis abas na ordem contratada, nos dois modos', () => {
    const esperado = [
      'Cascata PER-DCOMP',
      'Débitos por Linha',
      'Resumo por Cadeia',
      'SELIC e Rastreabilidade',
      'Qualidade da Importação',
      'Legenda e Parâmetros',
    ];

    expect(montar().worksheets.map((s) => s.name)).toEqual(esperado);
    expect(montar({ modo: 'ecac' }).worksheets.map((s) => s.name)).toEqual(esperado);
  });

  it('emite a aba de qualidade mesmo sem relatorio de importacao', () => {
    const sheet = montar({ importQualityReport: null }).getWorksheet('Qualidade da Importação')!;

    expect(sheet.rowCount).toBe(5);
    expect(valorPorCabecalho(sheet, 5, 'Categoria')).toBe('Indisponível');
  });

  it('lista totalizadores e documentos ignorados com motivo legivel', () => {
    const sheet = montar({
      importQualityReport: {
        linhasProcessamento: 1507,
        linhasDebitos: 4658,
        dcompsCarregadas: 1500,
        cadeiasCarregadas: 300,
        debitosCarregados: 4650,
        documentosIgnorados: [
          { numeroPerdcomp: '999', motivo: 'sem_cadeia_relacional', tipoCredito: 'X', situacao: 'Pendente' },
        ],
      },
    }).getWorksheet('Qualidade da Importação')!;

    expect(valorPorCabecalho(sheet, 5, 'Categoria')).toBe('Totalizador');
    expect(valorPorCabecalho(sheet, 10, 'Categoria')).toBe('Documento ignorado');
    expect(valorPorCabecalho(sheet, 10, 'Motivo')).toBe('Sem ID de Cadeia Relacional');
  });

  it('registra na legenda o modo e as DCOMPs hipoteticas excluidas', () => {
    const completo = montar().getWorksheet('Legenda e Parâmetros')!;
    const ecac = montar({ modo: 'ecac' }).getWorksheet('Legenda e Parâmetros')!;

    const itens = (sheet: Worksheet) => {
      const lista: string[] = [];
      const coluna = colunaPorCabecalho(sheet, 'Item');
      for (let l = 5; l <= sheet.rowCount; l += 1) {
        const valor = sheet.getCell(l, coluna).value;
        if (typeof valor === 'string') lista.push(valor);
      }
      return lista;
    };

    expect(itens(completo)).toContain('Modo do relatório');
    expect(itens(ecac)).toContain('DCOMPs hipotéticas excluídas');
    expect(itens(completo)).not.toContain('DCOMPs hipotéticas excluídas');
    expect(itens(completo)).toContain('Filtro: Vigentes e Editáveis');
  });
});
