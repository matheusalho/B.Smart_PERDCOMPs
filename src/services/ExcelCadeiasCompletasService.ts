import ExcelJS from 'exceljs';
import type { Workbook } from 'exceljs';

import type {
  CadeiaRelacional,
  Empresa,
  ImportQualityReport,
  SimulacaoSalva,
} from '../models/types';
import { buildDebitoColumns, buildDebitosRows } from './excel/cadeias/debitoColumns';
import {
  buildDocumentoColumns,
  buildDocumentoRow,
  type ModoRelatorio,
} from './excel/cadeias/documentoColumns';
import { buildLegendaColumns, buildLegendaRows } from './excel/cadeias/legenda';
import { buildQualidadeColumns, buildQualidadeRows } from './excel/cadeias/qualidadeImportacao';
import { buildResumoColumns, buildResumoRows } from './excel/cadeias/resumoCadeias';
import { buildSelicColumns, buildSelicRows } from './excel/cadeias/selicRastreabilidade';
import { reconstruirCadeiasOriginais, type ReconstrucaoECAC } from './excel/pristineChain';
import { createReportSheet, formatFileTimestamp, type RowInput } from './excel/workbookKit';

export type { ModoRelatorio };

export type CadeiasWorkbookInput = {
  cadeias: CadeiaRelacional[];
  empresa: Empresa | null;
  importQualityReport: ImportQualityReport | null;
  simulacoesSalvas: SimulacaoSalva[];
  modo: ModoRelatorio;
  emitidoEm: Date;
};

function prepararCadeias(input: CadeiasWorkbookInput): {
  cadeias: CadeiaRelacional[];
  reconstrucao: ReconstrucaoECAC | null;
} {
  if (input.modo !== 'ecac') return { cadeias: input.cadeias, reconstrucao: null };
  const reconstrucao = reconstruirCadeiasOriginais(input.cadeias);
  return { cadeias: reconstrucao.cadeias, reconstrucao };
}

function buildCascataRows(cadeias: CadeiaRelacional[], modo: ModoRelatorio): RowInput[] {
  return cadeias.flatMap((cadeia) =>
    cadeia.dcomps.map((dcomp, indice) => buildDocumentoRow(dcomp, cadeia, indice + 1, modo)),
  );
}

export function buildCadeiasWorkbook(input: CadeiasWorkbookInput): Workbook {
  const { cadeias, reconstrucao } = prepararCadeias(input);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'B.Smart PER/DCOMPs';
  workbook.company = input.empresa?.razaoSocial ?? 'B.Smart PER/DCOMPs';
  workbook.created = input.emitidoEm;
  workbook.modified = input.emitidoEm;
  workbook.calcProperties.fullCalcOnLoad = true;

  createReportSheet(
    workbook,
    'Cascata PER-DCOMP',
    buildDocumentoColumns(input.modo),
    buildCascataRows(cadeias, input.modo),
  );
  createReportSheet(
    workbook,
    'Débitos por Linha',
    buildDebitoColumns(input.modo),
    buildDebitosRows(cadeias, input.modo),
  );
  createReportSheet(
    workbook,
    'Resumo por Cadeia',
    buildResumoColumns(input.modo),
    buildResumoRows(cadeias, input.simulacoesSalvas, input.modo),
  );
  createReportSheet(workbook, 'SELIC e Rastreabilidade', buildSelicColumns(), buildSelicRows(cadeias));
  createReportSheet(
    workbook,
    'Qualidade da Importação',
    buildQualidadeColumns(),
    buildQualidadeRows(input.importQualityReport),
  );
  createReportSheet(
    workbook,
    'Legenda e Parâmetros',
    buildLegendaColumns(),
    buildLegendaRows({
      empresa: input.empresa,
      emitidoEm: input.emitidoEm,
      modo: input.modo,
      cadeias,
      reconstrucao,
    }),
  );

  return workbook;
}

export async function generateRelatorioCompletoExcel(
  input: Omit<CadeiasWorkbookInput, 'emitidoEm'>,
): Promise<void> {
  if (input.cadeias.length === 0) {
    throw new Error('Não há cadeias importadas para exportar.');
  }

  const emitidoEm = new Date();
  const workbook = buildCadeiasWorkbook({ ...input, emitidoEm });
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const prefixo = input.modo === 'ecac' ? 'Relatorio_eCAC_PERDCOMP' : 'Relatorio_Completo_PERDCOMP';

  link.href = url;
  link.download = `${prefixo}_${formatFileTimestamp(emitidoEm)}.xlsx`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
