import type { ImportQualityReport } from '../../../models/types';
import { WIDTH, type ReportColumn, type RowInput } from '../workbookKit';

const MOTIVOS: Record<string, string> = {
  sem_cadeia_relacional: 'Sem ID de Cadeia Relacional',
  sem_numero_perdcomp: 'Sem número de PER/DCOMP',
  linha_invalida: 'Linha inválida na planilha',
};

export function buildQualidadeColumns(): ReportColumn[] {
  return [
    { key: 'categoria', header: 'Categoria', width: WIDTH.regular },
    { key: 'perdcomp', header: 'PER/DCOMP', width: WIDTH.wide },
    { key: 'motivo', header: 'Motivo', width: WIDTH.description, wrap: true },
    { key: 'tipoCredito', header: 'Tipo de Crédito', width: WIDTH.maximum, wrap: true },
    { key: 'situacao', header: 'Situação', width: WIDTH.regular, wrap: true },
    { key: 'quantidade', header: 'Quantidade', kind: 'integer', width: WIDTH.short },
  ];
}

export function buildQualidadeRows(relatorio: ImportQualityReport | null): RowInput[] {
  if (!relatorio) {
    return [{
      categoria: 'Indisponível',
      perdcomp: '',
      motivo: 'O relatório de qualidade da importação não está disponível nesta sessão. Reimporte o Relatório de Análise e-CAC para gerá-lo.',
      tipoCredito: '',
      situacao: '',
      quantidade: null,
    }];
  }

  const totalizadores: Array<[string, number]> = [
    ['Linhas lidas em "Processamento PERDCOMP"', relatorio.linhasProcessamento],
    ['Linhas lidas em "PERDCOMP Débitos"', relatorio.linhasDebitos],
    ['PER/DCOMPs carregadas', relatorio.dcompsCarregadas],
    ['Cadeias relacionais carregadas', relatorio.cadeiasCarregadas],
    ['Débitos carregados', relatorio.debitosCarregados],
  ];

  return [
    ...totalizadores.map(([motivo, quantidade]) => ({
      categoria: 'Totalizador',
      perdcomp: '',
      motivo,
      tipoCredito: '',
      situacao: '',
      quantidade,
    })),
    ...relatorio.documentosIgnorados.map((documento) => ({
      categoria: 'Documento ignorado',
      perdcomp: documento.numeroPerdcomp,
      motivo: MOTIVOS[documento.motivo] ?? documento.motivo,
      tipoCredito: documento.tipoCredito ?? '',
      situacao: documento.situacao ?? '',
      quantidade: 1,
    })),
  ];
}
