import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToString } from 'react-dom/server';

import { RastreabilidadePanel } from '../RastreabilidadePanel';
import { parseExcelFile } from '../../services/ExcelParser';
import { recalcularCadeia } from '../../services/CalculoService';
import type { CadeiaRelacional, DCOMP } from '../../models/types';

const sheetsDir = resolve(process.cwd(), '..', 'Sheets');
let fixture: {
  result: ReturnType<typeof parseExcelFile>;
  cadeias: CadeiaRelacional[];
};

describe('RastreabilidadePanel', () => {
  beforeAll(() => {
    const result = parseExcelFile(readRealSheet(latestSheetFile()));
    fixture = {
      result,
      cadeias: result.cadeias.map((cadeia) => recalcularCadeia(cadeia)),
    };
  }, 15000);

  it('renderiza amostra representativa da planilha real sem quebrar por metadados ausentes', () => {
    for (const { cadeia, dcomp } of selecionarDocumentosRepresentativos(fixture.cadeias)) {
      expect(() =>
        renderToString(
          <RastreabilidadePanel
            cadeia={cadeia}
            dcomp={dcomp}
            empresa={fixture.result.empresa}
          />,
        ),
      ).not.toThrow();
    }
  }, 15000);

  it('renderiza snapshot antigo mesmo quando campos opcionais vierem ausentes', () => {
    const cadeia = fixture.cadeias[0];
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
          empresa={fixture.result.empresa}
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
    .filter(isEcacFixture)
    .map((file) => ({
      file,
      mtime: statSync(resolve(sheetsDir, file)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime)[0].file;
}

function isEcacFixture(fileName: string): boolean {
  const normalized = fileName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const isEcacReport = normalized === 'relatorio.xlsx' ||
    normalized.startsWith('relatorio de analise ecac') ||
    normalized.startsWith('relatorio de analise e-cac');
  return isEcacReport && normalized.endsWith('.xlsx') && !fileName.startsWith('~$');
}

function selecionarDocumentosRepresentativos(cadeias: CadeiaRelacional[]) {
  const todos = cadeias.flatMap((cadeia) =>
    cadeia.dcomps.map((dcomp) => ({ cadeia, dcomp })),
  );

  const candidatos = [
    todos[0],
    todos.find(({ dcomp }) => !dcomp.metadadosCreditoImportado),
    todos.find(({ dcomp }) => (dcomp.resultadoSelic?.dadosAusentes.length ?? 0) > 0),
    todos.find(({ dcomp }) => dcomp.debitos.length > 0),
    todos.find(({ dcomp }) => dcomp.situacao.toLowerCase().includes('anal')),
    todos.find(({ dcomp }) => Boolean(dcomp.metadadosCreditoImportado?.processoJudicial)),
    ...todos.slice(0, 25),
  ].filter((item): item is { cadeia: CadeiaRelacional; dcomp: DCOMP } => Boolean(item));

  return Array.from(
    new Map(candidatos.map((item) => [`${item.cadeia.id}:${item.dcomp.id}`, item])).values(),
  );
}
