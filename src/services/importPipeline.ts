import type { CadeiaRelacional, Empresa, ImportQualityReport } from '../models/types';
import { recalcularCadeia } from './CalculoService';
import { parseExcelFile } from './ExcelParser';

export type ImportPipelineResult = {
  cadeias: CadeiaRelacional[];
  empresa: Empresa;
  importQualityReport: ImportQualityReport;
};

export function processExcelBuffer(buffer: ArrayBuffer): ImportPipelineResult {
  const { cadeias, empresa, importQualityReport } = parseExcelFile(buffer);

  return {
    cadeias: cadeias.map((cadeia) => recalcularCadeia(cadeia)),
    empresa,
    importQualityReport,
  };
}
