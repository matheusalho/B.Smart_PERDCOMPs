import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToString } from 'react-dom/server';

import { RastreabilidadePanel } from '../RastreabilidadePanel';
import { parseExcelFile } from '../../services/ExcelParser';
import { recalcularCadeia } from '../../services/CalculoService';
import type { CadeiaRelacional, DCOMP } from '../../models/types';

const sheetsDir = resolve(process.cwd(), '..', 'Sheets');

describe('RastreabilidadePanel', () => {
  it('renderiza documentos importados da planilha real sem quebrar por metadados ausentes', () => {
    const result = parseExcelFile(readRealSheet(latestSheetFile()));
    const cadeias = result.cadeias.map((cadeia) => recalcularCadeia(cadeia));

    for (const cadeia of cadeias) {
      for (const dcomp of cadeia.dcomps) {
        expect(() =>
          renderToString(
            <RastreabilidadePanel
              cadeia={cadeia}
              dcomp={dcomp}
              empresa={result.empresa}
            />,
          ),
        ).not.toThrow();
      }
    }
  }, 15000);

  it('renderiza snapshot antigo mesmo quando campos opcionais vierem ausentes', () => {
    const result = parseExcelFile(readRealSheet(latestSheetFile()));
    const cadeia = recalcularCadeia(result.cadeias[0]);
    const dcomp = {
      ...cadeia.dcomps[0],
      debitos: undefined,
      detentorCredito: undefined,
    } as unknown as DCOMP;
    const cadeiaComSnapshotAntigo = {
      ...cadeia,
      dcomps: [dcomp],
    } as CadeiaRelacional;

    expect(() =>
      renderToString(
        <RastreabilidadePanel
          cadeia={cadeiaComSnapshotAntigo}
          dcomp={dcomp}
          empresa={result.empresa}
        />,
      ),
    ).not.toThrow();
  });
});

function readRealSheet(fileName: string): ArrayBuffer {
  const buffer = readFileSync(resolve(sheetsDir, fileName));

  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

function latestSheetFile(): string {
  return readdirSync(sheetsDir)
    .filter((file) => file.toLowerCase().endsWith('.xlsx') && !file.startsWith('~$'))
    .map((file) => ({
      file,
      mtime: statSync(resolve(sheetsDir, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;
}
