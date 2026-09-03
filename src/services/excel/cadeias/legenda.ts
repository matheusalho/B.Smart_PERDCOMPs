import type { CadeiaRelacional, Empresa } from '../../../models/types';
import type { ReconstrucaoECAC } from '../pristineChain';
import { WIDTH, type ReportColumn, type RowInput } from '../workbookKit';
import type { ModoRelatorio } from './documentoColumns';

export function buildLegendaColumns(): ReportColumn[] {
  return [
    { key: 'secao', header: 'Seção', width: WIDTH.regular },
    { key: 'item', header: 'Item', width: WIDTH.description },
    { key: 'descricao', header: 'Descrição', width: WIDTH.maximum, wrap: true, align: 'left' },
    { key: 'referencia', header: 'Como usar / Referência', width: WIDTH.maximum, wrap: true, align: 'left' },
  ];
}

const linha = (secao: string, item: string, descricao: string, referencia = ''): RowInput =>
  ({ secao, item, descricao, referencia });

const GLOSSARIO: Array<[string, string]> = [
  ['Detalhador', 'PER/DCOMP que detalha o crédito — não possui "Perdcomp Anterior com Detalhamento de Crédito", ou aponta para si mesma. É ela que aporta lastro à cadeia.'],
  ['Consumidor', 'PER/DCOMP que consome crédito detalhado por outro documento.'],
  ['Vigente', 'Documento que produz efeitos na cascata. Situação não classificada como "não vigente" e que não é Pedido de Cancelamento.'],
  ['Não vigente', 'Documento retificado, cancelado ou substituído; não consome crédito na cascata.'],
  ['Retificador', 'Documento com Indicador de Crédito diferente de "1" — retifica um documento anterior.'],
  ['Retific./Cancel. Por', 'Número do documento que retificou ou cancelou esta PER/DCOMP.'],
  ['Detalhamento', 'Número da PER/DCOMP que detalhou o crédito usado por este documento.'],
  ['Atenção (Status)', 'A situação processual na RFB tem motivo que exige análise (fora "documento analisado ou em discussão" e "documento não vigente").'],
  ['A Retificar', 'O crédito que entra no documento diverge do que a cascata calcula — há sobra ou falta a corrigir por retificação.'],
  ['Bloqueado', 'Situação processual na RFB impede edição/retificação (ex.: Despacho Decisório Emitido, Homologado, discussão administrativa).'],
  ['Divergente', 'Há diferença entre o crédito declarado na transmissão e o calculado pela cascata. Ver "Divergência — Esperado" e "Divergência — Calculado".'],
  ['Hipotética', 'PER/DCOMP criada pelo usuário na simulação; não existe no Relatório de Análise e-CAC.'],
];

const FILTROS: Array<[string, string]> = [
  ['Filtro: Vigentes e Editáveis', '(vigente E não bloqueado) OU a retificar'],
  ['Filtro: OK', 'vigente E não bloqueado E status da cascata OK ou EDITADO'],
  ['Filtro: A Retificar', 'status da cascata RETIFICAR ou EDITADO_E_RETIFICAR'],
  ['Filtro: Impedido', 'não vigente OU bloqueado'],
  ['Filtro: Apenas Detalhadores', 'sem "Detalhamento", ou apontando para si mesma'],
];

export function buildLegendaRows(input: {
  empresa: Empresa | null;
  emitidoEm: Date;
  modo: ModoRelatorio;
  cadeias: CadeiaRelacional[];
  reconstrucao: ReconstrucaoECAC | null;
}): RowInput[] {
  const documentos = input.cadeias.reduce((total, cadeia) => total + cadeia.dcomps.length, 0);
  const debitos = input.cadeias.reduce(
    (total, cadeia) => total + cadeia.dcomps.reduce((soma, dcomp) => soma + dcomp.debitos.length, 0),
    0,
  );

  const rows: RowInput[] = [
    linha('Emissão', 'Empresa', input.empresa?.razaoSocial ?? 'Não informada'),
    linha('Emissão', 'CNPJ', input.empresa?.cnpj ?? 'Não informado'),
    linha('Emissão', 'Data/hora', input.emitidoEm.toLocaleString('pt-BR')),
    linha(
      'Emissão',
      'Modo do relatório',
      input.modo === 'ecac'
        ? 'Somente valores do e-CAC — apresenta apenas os valores originais do relatório importado.'
        : 'Completo — cada valor em Original (e-CAC), Atual (após simulação) e Delta.',
    ),
    linha('Emissão', 'Cadeias relacionais', String(input.cadeias.length)),
    linha('Emissão', 'PER/DCOMPs', String(documentos)),
    linha('Emissão', 'Débitos', String(debitos)),
  ];

  if (input.modo === 'ecac' && input.reconstrucao) {
    rows.push(
      linha(
        'Emissão',
        'DCOMPs hipotéticas excluídas',
        String(input.reconstrucao.dcompsHipoteticasExcluidas),
        'Documentos criados na simulação não existem no Relatório de Análise e-CAC.',
      ),
      linha(
        'Emissão',
        'Cadeias removidas por ficarem vazias',
        String(input.reconstrucao.cadeiasRemovidas),
      ),
    );
  }

  for (const [item, descricao] of GLOSSARIO) {
    rows.push(linha('Glossário', item, descricao));
  }
  for (const [item, predicado] of FILTROS) {
    rows.push(linha(
      'Filtros',
      item,
      predicado,
      'Aplique o AutoFiltro nesta coluna para reproduzir o filtro equivalente do Simulador de Cascata.',
    ));
  }

  rows.push(
    linha(
      'Valores',
      'Original / Atual / Delta',
      input.modo === 'ecac'
        ? 'Neste modo há uma coluna por valor, com o valor original importado do e-CAC. As colunas de simulação não são emitidas.'
        : 'Original = valor importado do e-CAC (âncora preservada). Atual = valor após a simulação da sessão. Delta = Atual − Original.',
    ),
    linha(
      'Subtotais',
      'Aba "Débitos por Linha"',
      'As colunas monetárias do documento se repetem em cada linha de débito; somá-las contaria em duplicidade. Por isso apenas as colunas monetárias do débito têm SUBTOTAL na linha 2.',
    ),
  );

  return rows;
}
