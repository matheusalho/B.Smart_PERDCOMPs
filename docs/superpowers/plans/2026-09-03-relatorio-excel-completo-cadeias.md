# Relatório Excel Completo de Cadeias PER/DCOMP — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exportar em Excel **todas** as cadeias do Relatório de Análise e-CAC importado — não apenas as simulações salvas — com uma aba em granularidade de débito e colunas que replicam os filtros do simulador de cascata.

**Architecture:** A infraestrutura de planilha do `ExcelReportGeneratorService` é extraída para `src/services/excel/workbookKit.ts` e reusada por um serviço novo, `ExcelCadeiasCompletasService`, que lê `store.cadeias` (já recalculadas na importação por `processExcelBuffer`). Dois modos de emissão: `completo` (colunas Original/Atual/Delta) e `ecac` (apenas valores originais), este último operando sobre uma cópia pristina da cadeia reprocessada pelo `recalcularCadeia` existente.

**Tech Stack:** React 19 · TypeScript · Vite · ExcelJS 4.4 (escrita) · Vitest 4 · Zustand

**Spec:** `docs/superpowers/specs/2026-09-03-relatorio-excel-completo-cadeias-design.md`

## Global Constraints

- Trabalhe em **português** (código, comentários, mensagens de commit). Convenção do ecossistema B.Smart.
- **NUNCA** escreva em `valorPrincipalOriginal`, `valorMultaOriginal`, `valorJurosOriginal`, `valorTotalOriginal`, `valorTotalCreditoDetalhadoOriginal` ou `valorUtilizadoPerdcompOriginal` das estruturas recebidas. Toda reconstrução opera sobre deep-copy.
- **NÃO** altere `getDepth` nem a lógica de linhagem de `src/services/ExcelParser.ts`.
- **NÃO** altere o comportamento do relatório existente. `src/services/__tests__/ExcelReportGeneratorService.test.ts` deve continuar passando **sem nenhuma edição** — é a prova de não-regressão.
- **NÃO** instale bibliotecas novas. `exceljs` já é dependência; `xlsx` permanece exclusivo da importação.
- **NÃO** use Tailwind nem bibliotecas CSS. Estilo via `src/styles/index.css` e variáveis CSS.
- Comandos: `npm test` · `npm run lint` · `npm run build`. Rodar sempre a partir de `bsmart-perdcomp/`.
- Branch: `feat/relatorio-excel-completo`.
- Todo commit termina com:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Estrutura de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `src/services/excel/workbookKit.ts` | Infra genérica de planilha: tipos de coluna, estilos, formatos, `createReportSheet` | 1 |
| `src/services/excel/__tests__/workbookKit.test.ts` | Teste do flag `subtotal` | 1 |
| `src/services/excel/dcompFacts.ts` | Derivações por DCOMP (vigência, papel, status, filtros, vínculos) | 2 |
| `src/services/excel/__tests__/fixtures.ts` | Fábricas de DCOMP/débito/cadeia para os testes | 2 |
| `src/services/excel/__tests__/dcompFacts.test.ts` | Teste das derivações | 2 |
| `src/services/excel/pristineChain.ts` | Reconstrução da cadeia pristina (modo e-CAC) | 3 |
| `src/services/excel/__tests__/pristineChain.test.ts` | Teste da reconstrução | 3 |
| `src/services/excel/cadeias/documentoColumns.ts` | Blocos A–G: colunas e linha por PER/DCOMP | 4 |
| `src/services/ExcelCadeiasCompletasService.ts` | Orquestrador do workbook e download | 4–7 |
| `src/services/__tests__/ExcelCadeiasCompletasService.test.ts` | Suíte principal | 4–7 |
| `src/services/excel/cadeias/debitoColumns.ts` | Blocos H–J: colunas e linhas por débito | 5 |
| `src/services/excel/cadeias/resumoCadeias.ts` | Aba ③ | 6 |
| `src/services/excel/cadeias/selicRastreabilidade.ts` | Aba ④ | 6 |
| `src/services/excel/cadeias/qualidadeImportacao.ts` | Aba ⑤ | 7 |
| `src/services/excel/cadeias/legenda.ts` | Aba ⑥ | 7 |
| `src/App.tsx` | Botão `Excel Completo` + menu de modos | 8 |
| `src/services/__tests__/ExcelCadeiasCompletas.real.test.ts` | Integração com planilha real + benchmark | 9 |

## Desvio do spec registrado durante o planejamento

**Coluna `Divergente`.** O spec (§5.1, bloco B) previa a coluna sem fixar a fonte. `CalculoService.ts:275` faz `dcomp.isDivergente = false` incondicionalmente (comentário no código: *"Desativando essa logica antiga de divergencia detalhada por enquanto."*), portanto esse campo produziria "Não" em 100% das linhas. A coluna passa a derivar de `divergenciaDetalhes !== undefined` — que é o que realmente dispara o status `RETIFICAR` e o "NOVO:" na tela — e ganham-se duas colunas informativas, `Divergência — Esperado` e `Divergência — Calculado`. O bloco B passa de 8 para 10 colunas; a aba ① passa a **68** colunas no modo completo e **56** no modo e-CAC, e a aba ② a **107** e **86**.

---

### Task 1: Extrair `workbookKit.ts` e acrescentar o flag `subtotal`

**Files:**
- Create: `src/services/excel/workbookKit.ts`
- Create: `src/services/excel/__tests__/workbookKit.test.ts`
- Modify: `src/services/ExcelReportGeneratorService.ts` (remove o código movido, passa a importar)

**Interfaces:**
- Consumes: nada (primeira task).
- Produces:
  ```ts
  export type CellInput = string | number | boolean | Date | null | undefined;
  export type RowInput = Record<string, CellInput>;
  export type ColumnKind = 'text' | 'integer' | 'date' | 'datetime' | 'month' | 'currency' | 'percentage' | 'cnpj';
  export type ReportColumn = {
    key: string;
    header: string;
    kind?: ColumnKind;
    width: number;
    wrap?: boolean;
    align?: 'left' | 'center' | 'right';
    headerRole?: 'current' | 'correct';
    hidden?: boolean;
    subtotal?: boolean; // default true; só tem efeito em kind === 'currency'
  };
  export const WIDTH: { compact: 9.125; short: 14.875; medium: 18.25; date: 20.625; regular: 27.25; wide: 35; wider: 36.75; description: 39.625; maximum: 39.875 };
  export const ECAC_CURRENCY_FORMAT: string;
  export const HEADER_ROW = 4;
  export const DATA_START_ROW = 5;
  export function createReportSheet(workbook: Workbook, name: string, columns: ReportColumn[], rows: RowInput[]): Worksheet;
  export function toExcelDate(value: unknown, includeTime?: boolean): Date | string | null;
  export function toExcelMonth(value: unknown): Date | string | null;
  export function toCnpjNumber(value: CellInput): number | null;
  export function formatFileTimestamp(date: Date): string;
  export function joinList(values: string[] | undefined): string;
  export function joinFontes(fontes: FonteNormativa[] | undefined): string;
  export function sum(values: number[]): number;
  ```

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/services/excel/__tests__/workbookKit.test.ts`:

```ts
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { createReportSheet, WIDTH, type ReportColumn } from '../workbookKit';

const colunas: ReportColumn[] = [
  { key: 'documento', header: 'Doc', width: WIDTH.regular },
  { key: 'valorDocumento', header: 'Valor Documento', kind: 'currency', width: WIDTH.regular, subtotal: false },
  { key: 'valorDebito', header: 'Valor Débito', kind: 'currency', width: WIDTH.regular },
];

const linhas = [
  { documento: 'A', valorDocumento: 100, valorDebito: 40 },
  { documento: 'A', valorDocumento: 100, valorDebito: 60 },
];

describe('workbookKit.createReportSheet', () => {
  it('aplica SUBTOTAL apenas nas colunas monetarias que nao desligaram o subtotal', () => {
    const sheet = createReportSheet(new ExcelJS.Workbook(), 'Teste', colunas, linhas);

    // Coluna 2 = 'Doc', 3 = 'Valor Documento' (subtotal: false), 4 = 'Valor Débito'
    expect(sheet.getCell(2, 3).value).toBeNull();
    expect(sheet.getCell(2, 4).value).toMatchObject({
      formula: expect.stringContaining('SUBTOTAL(9,'),
    });
  });

  it('mantem o contrato visual e-CAC: cabecalho na linha 4, dados na 5, autofiltro e coluna-calha', () => {
    const sheet = createReportSheet(new ExcelJS.Workbook(), 'Teste', colunas, linhas);

    expect(sheet.getColumn(1).width).toBe(2.625);
    expect(sheet.getCell(4, 2).value).toBe('Doc');
    expect(sheet.getCell(5, 2).value).toBe('A');
    expect(sheet.autoFilter).toBeTruthy();
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npm test -- src/services/excel/__tests__/workbookKit.test.ts`
Expected: FAIL — `Failed to resolve import "../workbookKit"`.

- [ ] **Step 3: Criar `workbookKit.ts` movendo o código**

Criar `src/services/excel/workbookKit.ts` movendo **sem alteração de comportamento** de `src/services/ExcelReportGeneratorService.ts`:

- Constantes: `HEADER_ROW`, `DATA_START_ROW`, `LAST_EXCEL_ROW`, `HEADER_COLOR`, `CURRENT_HEADER_COLOR`, `CORRECT_HEADER_COLOR`, `WHITE`, `BLACK`, `ECAC_CURRENCY_FORMAT`, `DATE_FORMAT`, `DATE_TIME_FORMAT`, `MONTH_FORMAT`, `CNPJ_FORMAT`, `PERCENT_FORMAT`, `WIDTH`.
- Tipos: `CellInput`, `RowInput`, `ColumnKind`, `ReportColumn`.
- Estilos: `thinBlackBorder`, `allBorders`, `headerFont`, `bodyFont`, `headerFill`, `bodyFill`, `centered`.
- Funções: `createReportSheet`, `applySubtotals`, `applyHeaderStyle`, `applyBodyStyle`, `numberFormatFor`, `normalizeCellValue`, `toCnpjNumber`, `toExcelDate`, `toExcelMonth`, `estimateWrappedLines`, `formatFileTimestamp`, `joinList`, `joinFontes`, `sum`.

Exportar todas as funções e constantes acima (o `ExcelReportGeneratorService` e as tasks seguintes consomem).

Duas mudanças de comportamento — as únicas desta task:

**(a) `applySubtotals` respeita o flag:**

```ts
function applySubtotals(worksheet: Worksheet, columns: ReportColumn[]): void {
  columns.forEach((column, index) => {
    if (column.kind !== 'currency') return;
    if (column.subtotal === false) return;
    const columnNumber = index + 2;
    const columnLetter = worksheet.getColumn(columnNumber).letter;
    const cell = worksheet.getCell(2, columnNumber);
    cell.value = { formula: `SUBTOTAL(9,${columnLetter}${DATA_START_ROW}:${columnLetter}${LAST_EXCEL_ROW})` };
    cell.numFmt = ECAC_CURRENCY_FORMAT;
    applyHeaderStyle(cell, column.headerRole);
  });
  worksheet.getRow(2).height = 16.5;
}
```

**(b) Estilo pré-computado por coluna** — hoje `applyBodyStyle` aloca um objeto `alignment` novo por célula; no volume da aba de débitos (~530 mil células) isso pesa. Substituir `applyBodyStyle` por um pacote calculado uma vez por coluna:

```ts
type EstiloCorpo = {
  font: Partial<Font>;
  fill: Fill;
  alignment: Partial<Alignment>;
  border: typeof allBorders;
  numFmt: string;
};

function criarEstiloCorpo(column: ReportColumn): EstiloCorpo {
  return {
    font: bodyFont,
    fill: bodyFill,
    alignment: {
      horizontal: column.align ?? 'center',
      vertical: 'middle',
      wrapText: column.wrap ?? false,
    },
    border: allBorders,
    numFmt: numberFormatFor(column.kind),
  };
}

function aplicarEstiloCorpo(cell: Cell, estilo: EstiloCorpo): void {
  cell.font = estilo.font;
  cell.fill = estilo.fill;
  cell.alignment = estilo.alignment;
  cell.border = estilo.border;
  cell.numFmt = estilo.numFmt;
}
```

Em `createReportSheet`, computar `const estilos = columns.map(criarEstiloCorpo);` **antes** do laço de linhas e usar `aplicarEstiloCorpo(cell, estilos[columnOffset])` dentro dele. O resto de `createReportSheet` fica idêntico.

- [ ] **Step 4: Apontar `ExcelReportGeneratorService.ts` para o kit**

Remover do arquivo tudo que foi movido e importar do kit:

```ts
import {
  createReportSheet,
  formatFileTimestamp,
  joinFontes,
  joinList,
  sum,
  toExcelDate,
  toExcelMonth,
  WIDTH,
  ECAC_CURRENCY_FORMAT,
  type ReportColumn,
  type RowInput,
} from './excel/workbookKit';
```

Manter o re-export para não quebrar quem importa daqui:

```ts
export { ECAC_CURRENCY_FORMAT } from './excel/workbookKit';
```

Não tocar em `buildResumoRows`, `buildPremissasRows`, `buildProjectionRows`, `buildDebitosRows`, `buildSelicRows`, `buildStatusRows`, `buildEvidenciasRows`, `getProjectionValues`, `getVigencia`, `formatVigencia`, `hasManualDebitEdit`, `hasMeaningfulDifference`, `isHypothetical`, `getOperationalStatus`, `getChangedProjectionFields`, `getOperationalGuidance`, `applyProjectionStatusStyles`, `premissa`, `addFonteRows`, `BADGE_GLOSSARY` — permanecem neste arquivo (a Task 2 move só o subconjunto de fatos de DCOMP).

- [ ] **Step 5: Rodar os testes**

Run: `npm test -- src/services/excel/__tests__/workbookKit.test.ts src/services/__tests__/ExcelReportGeneratorService.test.ts`
Expected: PASS nos dois arquivos. A suíte antiga passa **sem edição** — é a prova de não-regressão.

- [ ] **Step 6: Lint e build**

Run: `npm run lint`
Run: `npm run build`
Expected: sem erros.

- [ ] **Step 7: Commit**

```bash
git add src/services/excel/workbookKit.ts src/services/excel/__tests__/workbookKit.test.ts src/services/ExcelReportGeneratorService.ts
git commit -m "refactor(excel): extrai workbookKit e adiciona flag subtotal por coluna

Move a infraestrutura generica de planilha do ExcelReportGeneratorService
para src/services/excel/workbookKit.ts, para reuso pelo relatorio completo
de cadeias. Acrescenta ReportColumn.subtotal (default true) e pre-computa o
pacote de estilo por coluna, reduzindo alocacao por celula.

A suite ExcelReportGeneratorService.test.ts passa sem edicao.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: `dcompFacts.ts` — derivações por documento

**Files:**
- Create: `src/services/excel/dcompFacts.ts`
- Create: `src/services/excel/__tests__/fixtures.ts`
- Create: `src/services/excel/__tests__/dcompFacts.test.ts`
- Modify: `src/services/ExcelReportGeneratorService.ts` (passa a importar as funções movidas)

**Interfaces:**
- Consumes: `ReportColumn`, `sum` de `workbookKit` (Task 1).
- Produces:
  ```ts
  export type ProjectionValues = {
    creditoInicialAtual: number; creditoInicialCorreto: number;
    creditoTransmissaoAtual: number; creditoTransmissaoCorreto: number;
    debitosAtuais: number; debitosCorretos: number;
    creditoUsadoAtual: number; creditoUsadoCorreto: number;
    saldoProximaAtual: number; saldoProximaCorreto: number;
  };
  export function getProjectionValues(dcomp: DCOMP): ProjectionValues;
  export function getVigencia(dcomp: DCOMP): 'vigente' | 'nao_vigente' | 'indeterminado';
  export function formatVigencia(v: ReturnType<typeof getVigencia>): string;
  export function hasManualDebitEdit(dcomp: DCOMP): boolean;
  export function hasMeaningfulDifference(a: number, b: number): boolean;
  export function isHypothetical(dcomp: DCOMP): boolean;
  export function getNatureza(dcomp: DCOMP): 'PER' | 'DCOMP' | 'Pedido de Cancelamento';
  export function getOrigemDocumento(dcomp: DCOMP): 'Original' | 'Retificador' | 'Pedido de Cancelamento';
  export function getPapelDocumento(dcomp: DCOMP): 'Detalhador' | 'Consumidor' | '—';
  export function isDetalhador(dcomp: DCOMP): boolean;
  export function getStatusCascataLabel(dcomp: DCOMP): string;
  export function getAlertasStatus(dcomp: DCOMP): { temAtencao: boolean; motivos: string };
  export function getVinculoSubstituicao(dcomp: DCOMP, cadeia: CadeiaRelacional): { tipo: string; substituiPerdcomp: string };
  export type FiltrosCascata = {
    vigentesEditaveis: boolean; ok: boolean; aRetificar: boolean; impedido: boolean; apenasDetalhadores: boolean;
  };
  export function getFiltrosCascata(dcomp: DCOMP): FiltrosCascata;
  export function simNao(valor: boolean): 'Sim' | 'Não';
  ```
  E de `fixtures.ts`:
  ```ts
  export function criarDebito(overrides?: Partial<DebitoOficial>): DebitoOficial;
  export function criarDcomp(overrides?: Partial<DCOMP>): DCOMP;
  export function criarCadeia(overrides?: Partial<CadeiaRelacional>): CadeiaRelacional;
  export function criarCadeiaCompleta(): CadeiaRelacional; // 6 documentos, cenários da §8 do spec
  ```

- [ ] **Step 1: Escrever as fábricas de fixture**

Criar `src/services/excel/__tests__/fixtures.ts`:

```ts
import type { CadeiaRelacional, DCOMP, DebitoOficial } from '../../../models/types';

export function criarDebito(overrides: Partial<DebitoOficial> = {}): DebitoOficial {
  const principal = overrides.valorPrincipalOriginal ?? 1000;
  const multa = overrides.valorMultaOriginal ?? 200;
  const juros = overrides.valorJurosOriginal ?? 100;

  return {
    id: 'deb_1',
    codigoReceita: '5952-07',
    periodoApuracao: '01/09/2024',
    dataVencimento: '20/10/2024',
    valorPrincipal: principal,
    valorMulta: multa,
    valorJuros: juros,
    valorTotal: principal + multa + juros,
    valorPrincipalOriginal: principal,
    valorMultaOriginal: multa,
    valorJurosOriginal: juros,
    valorTotalOriginal: principal + multa + juros,
    cnpjDebito: '12345678000199',
    cnpjTransmissorDcomp: '12345678000199',
    nomeEmpresarial: 'Empresa Teste Ltda.',
    numeroReciboPerDcomp: 'REC-0001',
    categoriaDctf: 'GERAL',
    ...overrides,
  };
}

export function criarDcomp(overrides: Partial<DCOMP> = {}): DCOMP {
  return {
    id: '00001.00001.010124.1.3.24-0001',
    dataTransmissaoOriginal: new Date(2024, 0, 1),
    dataTransmissao: new Date(2024, 0, 1),
    tipoDocumento: 'Declaração de Compensação',
    situacao: 'Pendente',
    indicadorCredito: '1',
    tipoCredito: 'Pagamento Indevido ou a Maior eSocial',
    detentorCredito: 'Empresa Teste Ltda.',
    periodoApuracaoCredito: '01/09/2024',
    valorTotalCreditoDetalhado: 10000,
    valorTotalCreditoDetalhadoOriginal: 10000,
    valorCreditoDataTransmissao: 10000,
    valorUtilizadoPerdcomp: 1300,
    valorUtilizadoPerdcompOriginal: 1300,
    idCadeiaRelacional: 'CADEIA-1',
    debitos: [criarDebito()],
    statusCascata: 'OK',
    saldoCreditoOriginalCalculado: 8700,
    saldoCreditoOriginalAnterior: 8700,
    ...overrides,
  };
}

export function criarCadeia(overrides: Partial<CadeiaRelacional> = {}): CadeiaRelacional {
  const dcomps = overrides.dcomps ?? [criarDcomp()];
  return {
    id: 'CADEIA-1',
    numeroDcompInicial: dcomps[0]?.id ?? '',
    tipoCredito: 'Pagamento Indevido ou a Maior eSocial',
    periodoApuracao: '01/09/2024',
    ...overrides,
    dcomps,
  };
}

/**
 * Cadeia com os seis cenarios exigidos pela §8 do spec:
 * DCOMP com 2 debitos · PER sem debitos · retificada nao vigente ·
 * pedido de cancelamento · consumidor (nao detalhador) · DCOMP hipotetica.
 */
export function criarCadeiaCompleta(): CadeiaRelacional {
  const doisDebitos = criarDcomp({
    id: '00001.00001.010124.1.3.24-0001',
    debitos: [
      criarDebito({ id: 'deb_1', codigoReceita: '5952-07' }),
      criarDebito({ id: 'deb_2', codigoReceita: '1138-01', valorPrincipalOriginal: 500, valorMultaOriginal: 0, valorJurosOriginal: 0 }),
    ],
  });

  const perSemDebitos = criarDcomp({
    id: '00002.00002.020124.1.1.01-0002',
    tipoDocumento: 'Pedido de Restituição',
    debitos: [],
    valorUtilizadoPerdcomp: 0,
    valorUtilizadoPerdcompOriginal: 0,
    dataTransmissao: new Date(2024, 1, 2),
    dataTransmissaoOriginal: new Date(2024, 1, 2),
  });

  const retificadaNaoVigente = criarDcomp({
    id: '00003.00003.030124.1.3.24-0003',
    situacao: 'Retificado',
    numeroRetificador: '00004.00004.040124.1.7.24-0004',
    dataTransmissao: new Date(2024, 2, 3),
    dataTransmissaoOriginal: new Date(2024, 2, 3),
  });

  const retificadora = criarDcomp({
    id: '00004.00004.040124.1.7.24-0004',
    indicadorCredito: '2',
    numeroDcompDetalhamento: '00001.00001.010124.1.3.24-0001',
    statusCascata: 'RETIFICAR',
    divergenciaDetalhes: { esperado: 9000, calculado: 8700 },
    dataTransmissao: new Date(2024, 3, 4),
    dataTransmissaoOriginal: new Date(2024, 2, 3),
  });

  const pedidoCancelamento = criarDcomp({
    id: '00005.00005.050124.1.8.02-0005',
    tipoDocumento: 'Pedido de Cancelamento',
    debitos: [],
    dataTransmissao: new Date(2024, 4, 5),
    dataTransmissaoOriginal: new Date(2024, 4, 5),
  });

  const hipotetica = criarDcomp({
    id: 'HIPOTETICA-1',
    indicadorCredito: 'Hipotético',
    isManuallyEdited: true,
    dataTransmissao: new Date(2024, 5, 6),
    dataTransmissaoOriginal: new Date(2024, 5, 6),
  });

  return criarCadeia({
    dcomps: [doisDebitos, perSemDebitos, retificadaNaoVigente, retificadora, pedidoCancelamento, hipotetica],
  });
}
```

- [ ] **Step 2: Escrever o teste que falha**

Criar `src/services/excel/__tests__/dcompFacts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { isBloqueado, isVigente } from '../../../utils/statusHelper';
import {
  getFiltrosCascata,
  getNatureza,
  getOrigemDocumento,
  getPapelDocumento,
  getStatusCascataLabel,
  getVinculoSubstituicao,
  simNao,
} from '../dcompFacts';
import { criarCadeiaCompleta, criarDcomp } from './fixtures';

describe('dcompFacts', () => {
  it('classifica natureza e origem do documento', () => {
    expect(getNatureza(criarDcomp())).toBe('DCOMP');
    expect(getNatureza(criarDcomp({ tipoDocumento: 'Pedido de Restituição', debitos: [] }))).toBe('PER');
    expect(getNatureza(criarDcomp({ id: '00005.00005.050124.1.8.02-0005' }))).toBe('Pedido de Cancelamento');

    expect(getOrigemDocumento(criarDcomp({ indicadorCredito: '1' }))).toBe('Original');
    expect(getOrigemDocumento(criarDcomp({ indicadorCredito: '2' }))).toBe('Retificador');
  });

  it('distingue detalhador de consumidor pela regra da TimelineCascata', () => {
    expect(getPapelDocumento(criarDcomp({ numeroDcompDetalhamento: undefined }))).toBe('Detalhador');
    expect(getPapelDocumento(criarDcomp({ id: 'X', numeroDcompDetalhamento: 'X' }))).toBe('Detalhador');
    expect(getPapelDocumento(criarDcomp({ id: 'X', numeroDcompDetalhamento: 'Y' }))).toBe('Consumidor');
    expect(getPapelDocumento(criarDcomp({ indicadorCredito: 'Hipotético' }))).toBe('—');
  });

  it('rotula o status da cascata na mesma ordem de precedencia da tela', () => {
    expect(getStatusCascataLabel(criarDcomp({ statusCascata: 'EDITADO_E_RETIFICAR' }))).toBe('EDITADO E A RETIFICAR');
    expect(getStatusCascataLabel(criarDcomp({ statusCascata: 'RETIFICAR' }))).toBe('A RETIFICAR');
    expect(getStatusCascataLabel(criarDcomp({ statusCascata: 'IMPACTADO_BLOQUEADO' }))).toBe('BLOQUEADO');
    expect(getStatusCascataLabel(criarDcomp({ statusCascata: 'EDITADO' }))).toBe('EDITADO');
    expect(getStatusCascataLabel(criarDcomp({ situacao: 'Retificado' }))).toBe('Não vigente');
    expect(getStatusCascataLabel(criarDcomp())).toBe('OK');
  });

  it('resolve os dois sentidos do vinculo de substituicao', () => {
    const cadeia = criarCadeiaCompleta();
    const retificada = cadeia.dcomps[2];
    const retificadora = cadeia.dcomps[3];

    expect(getVinculoSubstituicao(retificada, cadeia)).toEqual({
      tipo: 'Retificada por',
      substituiPerdcomp: '',
    });
    expect(getVinculoSubstituicao(retificadora, cadeia)).toEqual({
      tipo: '—',
      substituiPerdcomp: '00003.00003.030124.1.3.24-0003',
    });
  });

  it('reproduz literalmente os predicados de filtro da TimelineCascata', () => {
    for (const dcomp of criarCadeiaCompleta().dcomps) {
      const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
      const bloqueado = isBloqueado(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
      const aRetificar = dcomp.statusCascata === 'RETIFICAR' || dcomp.statusCascata === 'EDITADO_E_RETIFICAR';

      expect(getFiltrosCascata(dcomp)).toEqual({
        vigentesEditaveis: (vigente && !bloqueado) || aRetificar,
        ok: vigente && !bloqueado && (dcomp.statusCascata === 'OK' || dcomp.statusCascata === 'EDITADO'),
        aRetificar,
        impedido: !vigente || bloqueado,
        apenasDetalhadores: !dcomp.numeroDcompDetalhamento || dcomp.numeroDcompDetalhamento === dcomp.id,
      });
    }
  });

  it('formata booleano como Sim/Nao', () => {
    expect(simNao(true)).toBe('Sim');
    expect(simNao(false)).toBe('Não');
  });
});
```

- [ ] **Step 3: Rodar o teste e confirmar a falha**

Run: `npm test -- src/services/excel/__tests__/dcompFacts.test.ts`
Expected: FAIL — `Failed to resolve import "../dcompFacts"`.

- [ ] **Step 4: Criar `dcompFacts.ts`**

Mover de `ExcelReportGeneratorService.ts` (sem alterar comportamento): `ProjectionValues`, `getProjectionValues`, `getVigencia`, `formatVigencia`, `hasManualDebitEdit`, `hasMeaningfulDifference`, `isHypothetical`. Exportar todas. Acrescentar:

```ts
import type { CadeiaRelacional, DCOMP } from '../../models/types';
import { isBloqueado, isPedidoCancelamento, isVigente } from '../../utils/statusHelper';

export function simNao(valor: boolean): 'Sim' | 'Não' {
  return valor ? 'Sim' : 'Não';
}

export function getNatureza(dcomp: DCOMP): 'PER' | 'DCOMP' | 'Pedido de Cancelamento' {
  if (isPedidoCancelamento(dcomp.id, dcomp.tipoDocumento)) return 'Pedido de Cancelamento';
  return dcomp.tipoDocumento.toLocaleLowerCase('pt-BR').includes('pedido') ? 'PER' : 'DCOMP';
}

export function getOrigemDocumento(dcomp: DCOMP): 'Original' | 'Retificador' | 'Pedido de Cancelamento' {
  if (isPedidoCancelamento(dcomp.id, dcomp.tipoDocumento)) return 'Pedido de Cancelamento';
  return dcomp.indicadorCredito === '1' ? 'Original' : 'Retificador';
}

export function isDetalhador(dcomp: DCOMP): boolean {
  return !dcomp.numeroDcompDetalhamento || dcomp.numeroDcompDetalhamento === dcomp.id;
}

export function getPapelDocumento(dcomp: DCOMP): 'Detalhador' | 'Consumidor' | '—' {
  if (isHypothetical(dcomp)) return '—';
  return isDetalhador(dcomp) ? 'Detalhador' : 'Consumidor';
}

/** Mesma ordem de precedencia dos ramos do <td> de Situacao em TimelineCascata.tsx. */
export function getStatusCascataLabel(dcomp: DCOMP): string {
  const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
  const bloqueado = isBloqueado(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);

  if (dcomp.statusCascata === 'EDITADO_E_RETIFICAR') return 'EDITADO E A RETIFICAR';
  if (dcomp.statusCascata === 'RETIFICAR') return 'A RETIFICAR';
  if (dcomp.statusCascata === 'IMPACTADO_BLOQUEADO') return 'BLOQUEADO';
  if (dcomp.statusCascata === 'EDITADO') return 'EDITADO';
  if (!vigente) return 'Não vigente';
  if (bloqueado) return 'BLOQUEADO';
  return 'OK';
}

const MOTIVOS_NAO_ALERTA = new Set([
  'documento_analisado_ou_em_discussao',
  'documento_nao_vigente',
]);

export function getAlertasStatus(dcomp: DCOMP): { temAtencao: boolean; motivos: string } {
  const motivos = (dcomp.statusProcessamentoConsultivo?.motivos ?? [])
    .filter((motivo) => !MOTIVOS_NAO_ALERTA.has(motivo));
  return { temAtencao: motivos.length > 0, motivos: motivos.join('; ') };
}

export function getVinculoSubstituicao(
  dcomp: DCOMP,
  cadeia: CadeiaRelacional,
): { tipo: string; substituiPerdcomp: string } {
  const substituta = dcomp.numeroRetificador
    ? cadeia.dcomps.find((outro) => outro.id === dcomp.numeroRetificador)
    : undefined;

  const tipo = !dcomp.numeroRetificador
    ? '—'
    : substituta && isPedidoCancelamento(substituta.id, substituta.tipoDocumento)
      ? 'Cancelada por'
      : 'Retificada por';

  const substituida = cadeia.dcomps.find((outro) => outro.numeroRetificador === dcomp.id);

  return { tipo, substituiPerdcomp: substituida?.id ?? '' };
}

export type FiltrosCascata = {
  vigentesEditaveis: boolean;
  ok: boolean;
  aRetificar: boolean;
  impedido: boolean;
  apenasDetalhadores: boolean;
};

/** Predicados copiados de TimelineCascata.dcompsFiltradas. */
export function getFiltrosCascata(dcomp: DCOMP): FiltrosCascata {
  const vigente = isVigente(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
  const bloqueado = isBloqueado(dcomp.situacao, dcomp.tipoDocumento, dcomp.id);
  const aRetificar = dcomp.statusCascata === 'RETIFICAR' || dcomp.statusCascata === 'EDITADO_E_RETIFICAR';

  return {
    vigentesEditaveis: (vigente && !bloqueado) || aRetificar,
    ok: vigente && !bloqueado && (dcomp.statusCascata === 'OK' || dcomp.statusCascata === 'EDITADO'),
    aRetificar,
    impedido: !vigente || bloqueado,
    apenasDetalhadores: isDetalhador(dcomp),
  };
}
```

- [ ] **Step 5: Apontar `ExcelReportGeneratorService.ts` para `dcompFacts`**

Remover as funções movidas e importar:

```ts
import {
  getProjectionValues,
  getVigencia,
  formatVigencia,
  hasManualDebitEdit,
  hasMeaningfulDifference,
  isHypothetical,
  type ProjectionValues,
} from './excel/dcompFacts';
```

- [ ] **Step 6: Rodar os testes**

Run: `npm test -- src/services/excel src/services/__tests__/ExcelReportGeneratorService.test.ts`
Expected: PASS. A suíte antiga segue sem edição.

- [ ] **Step 7: Commit**

```bash
git add src/services/excel/dcompFacts.ts src/services/excel/__tests__/ src/services/ExcelReportGeneratorService.ts
git commit -m "refactor(excel): extrai dcompFacts e adiciona derivacoes da cascata

Move os fatos por DCOMP para src/services/excel/dcompFacts.ts e acrescenta
natureza, origem, papel (detalhador/consumidor), rotulo de status cascata,
alertas, vinculo de substituicao nos dois sentidos e os cinco predicados de
filtro copiados de TimelineCascata.dcompsFiltradas.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: `pristineChain.ts` — reconstrução da cadeia para o modo e-CAC

**Files:**
- Create: `src/services/excel/pristineChain.ts`
- Create: `src/services/excel/__tests__/pristineChain.test.ts`

**Interfaces:**
- Consumes: `isHypothetical` de `dcompFacts` (Task 2); `recalcularCadeia` de `../CalculoService`; `criarCadeiaCompleta` de `__tests__/fixtures` (Task 2).
- Produces:
  ```ts
  export type ReconstrucaoECAC = {
    cadeias: CadeiaRelacional[];
    dcompsHipoteticasExcluidas: number;
    cadeiasRemovidas: number;
  };
  export function reconstruirCadeiaOriginal(cadeia: CadeiaRelacional): CadeiaRelacional;
  export function reconstruirCadeiasOriginais(cadeias: CadeiaRelacional[]): ReconstrucaoECAC;
  ```

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/services/excel/__tests__/pristineChain.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { reconstruirCadeiaOriginal, reconstruirCadeiasOriginais } from '../pristineChain';
import { criarCadeia, criarCadeiaCompleta, criarDcomp, criarDebito } from './fixtures';

describe('pristineChain', () => {
  it('restaura os valores mutaveis a partir das ancoras Original', () => {
    const editada = criarCadeia({
      dcomps: [criarDcomp({
        isManuallyEdited: true,
        valorTotalCreditoDetalhado: 7000,
        valorTotalCreditoDetalhadoOriginal: 10000,
        valorUtilizadoPerdcomp: 900,
        valorUtilizadoPerdcompOriginal: 1300,
        debitos: [criarDebito({
          valorPrincipal: 600, valorPrincipalOriginal: 1000,
          valorMulta: 120, valorMultaOriginal: 200,
          valorJuros: 60, valorJurosOriginal: 100,
          valorTotal: 780, valorTotalOriginal: 1300,
        })],
      })],
    });

    const [documento] = reconstruirCadeiaOriginal(editada).dcomps;

    expect(documento.valorTotalCreditoDetalhado).toBe(10000);
    expect(documento.valorUtilizadoPerdcomp).toBe(1300);
    expect(documento.isManuallyEdited).toBe(false);
    expect(documento.divergenciaDetalhes).toBeUndefined();
    expect(documento.debitos[0].valorPrincipal).toBe(1000);
    expect(documento.debitos[0].valorMulta).toBe(200);
    expect(documento.debitos[0].valorJuros).toBe(100);
    expect(documento.debitos[0].valorTotal).toBe(1300);
  });

  it('nao muta a cadeia recebida', () => {
    const original = criarCadeia({
      dcomps: [criarDcomp({ valorTotalCreditoDetalhado: 7000, valorTotalCreditoDetalhadoOriginal: 10000 })],
    });
    const snapshot = JSON.stringify(original);

    reconstruirCadeiaOriginal(original);

    expect(JSON.stringify(original)).toBe(snapshot);
  });

  it('descarta DCOMPs hipoteticas e conta quantas sairam', () => {
    const resultado = reconstruirCadeiasOriginais([criarCadeiaCompleta()]);

    expect(resultado.dcompsHipoteticasExcluidas).toBe(1);
    expect(resultado.cadeias[0].dcomps.map((d) => d.id)).not.toContain('HIPOTETICA-1');
    expect(resultado.cadeias[0].dcomps).toHaveLength(5);
  });

  it('remove cadeia que fica vazia apos descartar as hipoteticas', () => {
    const soHipotetica = criarCadeia({
      id: 'CADEIA-HIP',
      dcomps: [criarDcomp({ id: 'HIP-1', indicadorCredito: 'Hipotético' })],
    });

    const resultado = reconstruirCadeiasOriginais([soHipotetica]);

    expect(resultado.cadeias).toHaveLength(0);
    expect(resultado.cadeiasRemovidas).toBe(1);
    expect(resultado.dcompsHipoteticasExcluidas).toBe(1);
  });

  it('em cadeia sem edicoes produz os mesmos valores da cadeia viva', () => {
    const intacta = criarCadeiaCompleta();
    intacta.dcomps = intacta.dcomps.filter((d) => d.indicadorCredito !== 'Hipotético');

    const reconstruida = reconstruirCadeiaOriginal(intacta);

    reconstruida.dcomps.forEach((documento, indice) => {
      expect(documento.valorTotalCreditoDetalhado).toBe(intacta.dcomps[indice].valorTotalCreditoDetalhadoOriginal);
      expect(documento.valorUtilizadoPerdcomp).toBe(intacta.dcomps[indice].valorUtilizadoPerdcompOriginal);
    });
  });
});
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npm test -- src/services/excel/__tests__/pristineChain.test.ts`
Expected: FAIL — `Failed to resolve import "../pristineChain"`.

- [ ] **Step 3: Implementar `pristineChain.ts`**

```ts
import type { CadeiaRelacional, DCOMP, DebitoOficial } from '../../models/types';
import { recalcularCadeia } from '../CalculoService';
import { isHypothetical } from './dcompFacts';

export type ReconstrucaoECAC = {
  cadeias: CadeiaRelacional[];
  dcompsHipoteticasExcluidas: number;
  cadeiasRemovidas: number;
};

function restaurarDebito(debito: DebitoOficial): DebitoOficial {
  return {
    ...debito,
    valorPrincipal: debito.valorPrincipalOriginal,
    valorMulta: debito.valorMultaOriginal,
    valorJuros: debito.valorJurosOriginal,
    valorTotal: debito.valorTotalOriginal,
  };
}

function restaurarDcomp(dcomp: DCOMP): DCOMP {
  return {
    ...dcomp,
    valorTotalCreditoDetalhado: dcomp.valorTotalCreditoDetalhadoOriginal,
    valorUtilizadoPerdcomp: dcomp.valorUtilizadoPerdcompOriginal,
    isManuallyEdited: false,
    divergenciaDetalhes: undefined,
    statusCascata: undefined,
    saldoCreditoOriginalCalculado: undefined,
    saldoCreditoOriginalAnterior: undefined,
    debitos: dcomp.debitos.map(restaurarDebito),
  };
}

/**
 * Devolve uma copia da cadeia com os valores restaurados as ancoras importadas
 * do e-CAC, sem DCOMPs hipoteticas, reprocessada pelo motor de cascata.
 * Nao muta a cadeia recebida.
 */
export function reconstruirCadeiaOriginal(cadeia: CadeiaRelacional): CadeiaRelacional {
  const dcomps = cadeia.dcomps
    .filter((dcomp) => !isHypothetical(dcomp))
    .map(restaurarDcomp);

  if (dcomps.length === 0) return { ...cadeia, dcomps };

  return recalcularCadeia({ ...cadeia, dcomps });
}

export function reconstruirCadeiasOriginais(cadeias: CadeiaRelacional[]): ReconstrucaoECAC {
  let dcompsHipoteticasExcluidas = 0;
  let cadeiasRemovidas = 0;
  const reconstruidas: CadeiaRelacional[] = [];

  for (const cadeia of cadeias) {
    dcompsHipoteticasExcluidas += cadeia.dcomps.filter(isHypothetical).length;
    const reconstruida = reconstruirCadeiaOriginal(cadeia);

    if (reconstruida.dcomps.length === 0) {
      cadeiasRemovidas += 1;
      continue;
    }
    reconstruidas.push(reconstruida);
  }

  return { cadeias: reconstruidas, dcompsHipoteticasExcluidas, cadeiasRemovidas };
}
```

- [ ] **Step 4: Rodar o teste**

Run: `npm test -- src/services/excel/__tests__/pristineChain.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/services/excel/pristineChain.ts src/services/excel/__tests__/pristineChain.test.ts
git commit -m "feat(excel): reconstrucao pristina de cadeia para o modo e-CAC

Restaura os valores mutaveis as ancoras ...Original, descarta DCOMPs
hipoteticas e reprocessa com recalcularCadeia, para que o modo e-CAC nao
exiba efeito de simulacao a jusante sob rotulo de valor original.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Aba ① `Cascata PER-DCOMP`

**Files:**
- Create: `src/services/excel/cadeias/documentoColumns.ts`
- Create: `src/services/ExcelCadeiasCompletasService.ts`
- Create: `src/services/__tests__/ExcelCadeiasCompletasService.test.ts`

**Interfaces:**
- Consumes: `createReportSheet`, `WIDTH`, `toExcelDate`, `toExcelMonth`, `ReportColumn`, `RowInput` (Task 1); todas as derivações de `dcompFacts` (Task 2); `reconstruirCadeiasOriginais` (Task 3); `criarCadeiaCompleta` (Task 2).
- Produces:
  ```ts
  // documentoColumns.ts
  export type ModoRelatorio = 'completo' | 'ecac';
  export function money(key: string, header: string, modo: ModoRelatorio): ReportColumn[];
  export function valores(key: string, original: number, atual: number, modo: ModoRelatorio): RowInput;
  export function semSubtotal(columns: ReportColumn[]): ReportColumn[];
  export function buildDocumentoColumns(modo: ModoRelatorio): ReportColumn[];
  export function buildDocumentoRow(dcomp: DCOMP, cadeia: CadeiaRelacional, ordem: number, modo: ModoRelatorio): RowInput;

  // ExcelCadeiasCompletasService.ts
  export type CadeiasWorkbookInput = {
    cadeias: CadeiaRelacional[];
    empresa: Empresa | null;
    importQualityReport: ImportQualityReport | null;
    simulacoesSalvas: SimulacaoSalva[];
    modo: ModoRelatorio;
    emitidoEm: Date;
  };
  export function buildCadeiasWorkbook(input: CadeiasWorkbookInput): Workbook;
  ```

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/services/__tests__/ExcelCadeiasCompletasService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { criarCadeiaCompleta } from '../excel/__tests__/fixtures';
import { buildCadeiasWorkbook } from '../ExcelCadeiasCompletasService';
import type { CadeiasWorkbookInput } from '../ExcelCadeiasCompletasService';

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

function colunaPorCabecalho(sheet: ReturnType<typeof montar>['worksheets'][number], cabecalho: string) {
  const row = sheet.getRow(4);
  for (let column = 2; column <= row.cellCount; column += 1) {
    if (row.getCell(column).value === cabecalho) return column;
  }
  throw new Error(`Cabeçalho não encontrado: ${cabecalho}`);
}

function valorPorCabecalho(sheet: ReturnType<typeof montar>['worksheets'][number], row: number, cabecalho: string) {
  return sheet.getCell(row, colunaPorCabecalho(sheet, cabecalho)).value;
}

function cabecalhos(sheet: ReturnType<typeof montar>['worksheets'][number]): string[] {
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
    cadeia.dcomps[0].valorTotalCreditoDetalhado = 7000; // simulacao
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
    // a DCOMP hipotetica sai do relatorio: 5 documentos
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
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npm test -- src/services/__tests__/ExcelCadeiasCompletasService.test.ts`
Expected: FAIL — `Failed to resolve import "../ExcelCadeiasCompletasService"`.

- [ ] **Step 3: Implementar `documentoColumns.ts`**

```ts
import type { CadeiaRelacional, DCOMP } from '../../../models/types';
import {
  toExcelDate,
  WIDTH,
  type ReportColumn,
  type RowInput,
} from '../workbookKit';
import {
  getAlertasStatus,
  getFiltrosCascata,
  getNatureza,
  getOrigemDocumento,
  getPapelDocumento,
  getProjectionValues,
  getStatusCascataLabel,
  getVigencia,
  formatVigencia,
  getVinculoSubstituicao,
  isHypothetical,
  simNao,
} from '../dcompFacts';

export type ModoRelatorio = 'completo' | 'ecac';

const txt = (key: string, header: string, width: number, wrap = false): ReportColumn =>
  ({ key, header, width, wrap });
const int = (key: string, header: string, width: number): ReportColumn =>
  ({ key, header, kind: 'integer', width });
const dat = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'date', width: WIDTH.date });
const dtm = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'datetime', width: WIDTH.date });
const cnpj = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'cnpj', width: WIDTH.date });
const cur = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'currency', width: WIDTH.regular });

/**
 * No modo completo expande em Original/Atual/Delta; no modo e-CAC devolve
 * uma unica coluna. A chave `<key>Original` existe nos dois modos, para que
 * o construtor de linha seja identico.
 */
export function money(key: string, header: string, modo: ModoRelatorio): ReportColumn[] {
  if (modo === 'ecac') {
    return [{ key: `${key}Original`, header, kind: 'currency', width: WIDTH.regular }];
  }
  return [
    { key: `${key}Original`, header: `${header} — Original`, kind: 'currency', width: WIDTH.regular, headerRole: 'current' },
    { key: `${key}Atual`, header: `${header} — Atual`, kind: 'currency', width: WIDTH.regular, headerRole: 'correct' },
    { key: `${key}Delta`, header: `${header} — Delta`, kind: 'currency', width: WIDTH.regular },
  ];
}

/** Desliga o SUBTOTAL das colunas monetarias — usado na aba de debitos. */
export function semSubtotal(columns: ReportColumn[]): ReportColumn[] {
  return columns.map((column) => (column.kind === 'currency' ? { ...column, subtotal: false } : column));
}

export function buildDocumentoColumns(modo: ModoRelatorio): ReportColumn[] {
  return [
    // A. Identificação
    txt('idCadeia', 'ID Cadeia Relacional', WIDTH.regular),
    txt('perdcompRaiz', 'PER/DCOMP Raiz da Cadeia', WIDTH.wide),
    int('ordemNaCadeia', 'Ordem na Cadeia', WIDTH.compact),
    txt('perdcomp', 'PER/DCOMP', WIDTH.wide),
    txt('tipoDocumento', 'Tipo do Documento', WIDTH.description, true),
    txt('natureza', 'Natureza', WIDTH.medium),
    txt('origemDocumento', 'Origem', WIDTH.medium),
    dat('dataTransmissao', 'Data Transm.'),
    dat('dataReferencia', 'Data Ref.'),
    dtm('dataHoraTransmissao', 'Data/Hora Transm. Importada'),
    // B. Situação e vigência
    txt('situacao', 'Situação (e-CAC)', WIDTH.regular, true),
    txt('situacaoDetalhada', 'Situação Detalhada', WIDTH.description, true),
    txt('vigencia', 'Vigência', WIDTH.medium),
    txt('statusCascata', 'Status Cascata', WIDTH.regular),
    txt('editabilidade', 'Editabilidade', WIDTH.medium),
    txt('atencaoStatus', 'Atenção (Status)', WIDTH.medium),
    txt('motivosAtencao', 'Motivos de Atenção', WIDTH.maximum, true),
    txt('divergente', 'Divergente', WIDTH.compact),
    cur('divergenciaEsperado', 'Divergência — Esperado'),
    cur('divergenciaCalculado', 'Divergência — Calculado'),
    // C. Vínculos
    txt('papelDocumento', 'Papel do Documento', WIDTH.medium),
    txt('retificadoPor', 'Retific./Cancel. Por', WIDTH.wide),
    txt('tipoVinculo', 'Tipo do Vínculo', WIDTH.medium),
    txt('substituiPerdcomp', 'Retifica/Cancela a PER/DCOMP nº', WIDTH.wide),
    txt('detalhamento', 'Detalhamento', WIDTH.wide),
    // D. Filtros e marcações
    txt('filtroVigentesEditaveis', 'Filtro: Vigentes e Editáveis', WIDTH.short),
    txt('filtroOk', 'Filtro: OK', WIDTH.compact),
    txt('filtroARetificar', 'Filtro: A Retificar', WIDTH.short),
    txt('filtroImpedido', 'Filtro: Impedido', WIDTH.short),
    txt('filtroDetalhadores', 'Filtro: Apenas Detalhadores', WIDTH.short),
    ...(modo === 'completo'
      ? [txt('editadoUsuario', 'Editado pelo Usuário', WIDTH.short), txt('hipotetica', 'Hipotética', WIDTH.compact)]
      : []),
    // E. Crédito
    txt('tipoCredito', 'Tipo de Crédito', WIDTH.maximum, true),
    txt('classificacaoCredito', 'Classificação do Crédito', WIDTH.regular),
    txt('restricoesCredito', 'Restrições / Vedações', WIDTH.maximum, true),
    txt('detentorCredito', 'Detentor do Crédito', WIDTH.regular),
    txt('paCredito', 'PA do Crédito', WIDTH.date),
    txt('indicadorCredito', 'Indicador de Crédito', WIDTH.medium),
    // F. Valores
    ...money('creditoDetalhado', 'Crédito Detalhado', modo),
    ...money('creditoDataTransmissao', 'Créd. Data Transm.', modo),
    ...money('debitos', 'Débitos', modo),
    ...money('creditoOrigUsado', 'Crédito Orig. Usado', modo),
    ...money('saldoProximaDcomp', 'Saldo Próx. DCOMP', modo),
    int('qtdeDebitos', 'Qtde de Débitos', WIDTH.short),
    // G. Metadados do crédito importado
    cnpj('cnpjOrigem', 'CNPJ Origem'),
    dat('dataExtracao', 'Data de Extração'),
    dat('dataArrecadacao', 'Data de Arrecadação'),
    txt('competenciaCredito', 'Competência do Crédito', WIDTH.medium),
    txt('tipoCompetencia', 'Tipo de Competência', WIDTH.medium),
    txt('numeroPagamentoDarf', 'Nº do Pagamento (DARF)', WIDTH.regular),
    txt('paDarf', 'PA do DARF', WIDTH.date),
    txt('grupoTributo', 'Grupo de Tributo', WIDTH.regular),
    txt('codigoReceitaCredito', 'Código da Receita (Crédito)', WIDTH.medium),
    txt('processoJudicial', 'Processo Judicial', WIDTH.regular),
    txt('processoHabilitacao', 'Processo de Habilitação', WIDTH.regular),
    txt('processoAdministrativo', 'Processo Administrativo', WIDTH.regular),
    txt('origemDiscussao', 'Origem da Discussão', WIDTH.regular),
    txt('perdcompAnteriorDetalhamento', 'PER/DCOMP Anterior c/ Detalhamento', WIDTH.wide),
  ];
}

/** Espelha `money`: uma chave no modo e-CAC, tres no modo completo. */
export function valores(key: string, original: number, atual: number, modo: ModoRelatorio): RowInput {
  if (modo === 'ecac') return { [`${key}Original`]: original };
  return {
    [`${key}Original`]: original,
    [`${key}Atual`]: atual,
    [`${key}Delta`]: atual - original,
  };
}

export function buildDocumentoRow(
  dcomp: DCOMP,
  cadeia: CadeiaRelacional,
  ordem: number,
  modo: ModoRelatorio,
): RowInput {
  const projecao = getProjectionValues(dcomp);
  const filtros = getFiltrosCascata(dcomp);
  const alertas = getAlertasStatus(dcomp);
  const vinculo = getVinculoSubstituicao(dcomp, cadeia);
  const metadados = dcomp.metadadosCreditoImportado;
  const statusConsultivo = dcomp.statusProcessamentoConsultivo;

  return {
    idCadeia: cadeia.id,
    perdcompRaiz: cadeia.numeroDcompInicial,
    ordemNaCadeia: ordem,
    perdcomp: dcomp.id,
    tipoDocumento: dcomp.tipoDocumento,
    natureza: getNatureza(dcomp),
    origemDocumento: getOrigemDocumento(dcomp),
    dataTransmissao: toExcelDate(dcomp.dataTransmissao),
    dataReferencia: toExcelDate(dcomp.dataTransmissaoOriginal),
    dataHoraTransmissao: toExcelDate(dcomp.dataHoraTransmissaoImportada, true),

    situacao: dcomp.situacao,
    situacaoDetalhada: dcomp.situacaoDetalhada ?? '',
    vigencia: formatVigencia(getVigencia(dcomp)),
    statusCascata: getStatusCascataLabel(dcomp),
    editabilidade: statusConsultivo?.editabilidadeSimulacao ?? '',
    atencaoStatus: simNao(alertas.temAtencao),
    motivosAtencao: alertas.motivos,
    divergente: simNao(dcomp.divergenciaDetalhes !== undefined),
    divergenciaEsperado: dcomp.divergenciaDetalhes?.esperado ?? null,
    divergenciaCalculado: dcomp.divergenciaDetalhes?.calculado ?? null,

    papelDocumento: getPapelDocumento(dcomp),
    retificadoPor: dcomp.numeroRetificador ?? '',
    tipoVinculo: vinculo.tipo,
    substituiPerdcomp: vinculo.substituiPerdcomp,
    detalhamento: dcomp.numeroDcompDetalhamento ?? '',

    filtroVigentesEditaveis: simNao(filtros.vigentesEditaveis),
    filtroOk: simNao(filtros.ok),
    filtroARetificar: simNao(filtros.aRetificar),
    filtroImpedido: simNao(filtros.impedido),
    filtroDetalhadores: simNao(filtros.apenasDetalhadores),
    ...(modo === 'completo'
      ? {
          editadoUsuario: simNao(Boolean(dcomp.isManuallyEdited)),
          hipotetica: simNao(isHypothetical(dcomp)),
        }
      : {}),

    tipoCredito: dcomp.tipoCredito,
    classificacaoCredito: dcomp.classificacaoCreditoConsultiva?.tipoCreditoId ?? '',
    restricoesCredito: (dcomp.classificacaoCreditoConsultiva?.alertas ?? []).join('; '),
    detentorCredito: dcomp.detentorCredito,
    paCredito: dcomp.periodoApuracaoCredito,
    indicadorCredito: dcomp.indicadorCredito,

    ...valores('creditoDetalhado', projecao.creditoInicialAtual, projecao.creditoInicialCorreto, modo),
    ...valores('creditoDataTransmissao', projecao.creditoTransmissaoAtual, projecao.creditoTransmissaoCorreto, modo),
    ...valores('debitos', projecao.debitosAtuais, projecao.debitosCorretos, modo),
    ...valores('creditoOrigUsado', projecao.creditoUsadoAtual, projecao.creditoUsadoCorreto, modo),
    ...valores('saldoProximaDcomp', projecao.saldoProximaAtual, projecao.saldoProximaCorreto, modo),
    qtdeDebitos: dcomp.debitos.length,

    cnpjOrigem: metadados?.cnpjOrigem ?? '',
    dataExtracao: toExcelDate(metadados?.dataExtracao),
    dataArrecadacao: toExcelDate(metadados?.dataArrecadacaoCredito),
    competenciaCredito: metadados?.competenciaCredito ?? '',
    tipoCompetencia: metadados?.tipoCompetenciaCredito ?? '',
    numeroPagamentoDarf: metadados?.numeroPagamento ?? '',
    paDarf: metadados?.periodoApuracaoDarf ?? '',
    grupoTributo: metadados?.grupoTributo ?? '',
    codigoReceitaCredito: metadados?.codigoReceitaCredito ?? '',
    processoJudicial: metadados?.processoJudicial ?? '',
    processoHabilitacao: metadados?.processoHabilitacao ?? '',
    processoAdministrativo: metadados?.processoAdministrativo ?? '',
    origemDiscussao: metadados?.origemDiscussao ?? '',
    perdcompAnteriorDetalhamento: metadados?.numeroPerOriginal ?? '',
  };
}
```

**Nota sobre a nomenclatura de `getProjectionValues`:** os campos `...Atual` daquele tipo carregam o valor **original** (é a convenção herdada do relatório de simulações, onde "Atual" = o que está declarado hoje na RFB) e os campos `...Correto` carregam o valor **recalculado/simulado**. Por isso o mapeamento acima é `Original ← projecao.*Atual` e `Atual ← projecao.*Correto`. Não inverta.

- [ ] **Step 4: Implementar o orquestrador com a aba ①**

Criar `src/services/ExcelCadeiasCompletasService.ts`:

```ts
import ExcelJS from 'exceljs';
import type { Workbook } from 'exceljs';

import type {
  CadeiaRelacional,
  Empresa,
  ImportQualityReport,
  SimulacaoSalva,
} from '../models/types';
import {
  buildDocumentoColumns,
  buildDocumentoRow,
  type ModoRelatorio,
} from './excel/cadeias/documentoColumns';
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
  const { cadeias } = prepararCadeias(input);

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
```

- [ ] **Step 5: Rodar o teste**

Run: `npm test -- src/services/__tests__/ExcelCadeiasCompletasService.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 6: Commit**

```bash
git add src/services/excel/cadeias/documentoColumns.ts src/services/ExcelCadeiasCompletasService.ts src/services/__tests__/ExcelCadeiasCompletasService.test.ts
git commit -m "feat(excel): aba Cascata PER-DCOMP do relatorio completo

Uma linha por PER/DCOMP com identificacao, vigencia, vinculos, colunas de
filtro que replicam TimelineCascata, valores em Original/Atual/Delta e os
metadados de credito importados. Modo e-CAC colapsa os trios e opera sobre
a cadeia reconstruida.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Aba ② `Débitos por Linha`

**Files:**
- Create: `src/services/excel/cadeias/debitoColumns.ts`
- Modify: `src/services/ExcelCadeiasCompletasService.ts` (registra a aba ②)
- Modify: `src/services/__tests__/ExcelCadeiasCompletasService.test.ts` (novo `describe`)

**Interfaces:**
- Consumes: `buildDocumentoColumns`, `buildDocumentoRow`, `money`, `semSubtotal`, `ModoRelatorio` (Task 4); `hasMeaningfulDifference` (Task 2); `src/data/CodigosDeReceita.json`.
- Produces:
  ```ts
  export function buildDebitoColumns(modo: ModoRelatorio): ReportColumn[];
  export function buildDebitosRows(cadeias: CadeiaRelacional[], modo: ModoRelatorio): RowInput[];
  ```

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao final de `src/services/__tests__/ExcelCadeiasCompletasService.test.ts`:

```ts
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
    // linha 7 = PER sem debitos (2 linhas do primeiro documento antes dele)
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
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npm test -- src/services/__tests__/ExcelCadeiasCompletasService.test.ts`
Expected: FAIL — `sheet` indefinido, porque `getWorksheet('Débitos por Linha')` devolve `undefined`.

- [ ] **Step 3: Implementar `debitoColumns.ts`**

```ts
import codigosReceitaData from '../../../data/CodigosDeReceita.json';
import type { CadeiaRelacional, DCOMP, DebitoOficial } from '../../../models/types';
import { hasMeaningfulDifference, simNao } from '../dcompFacts';
import { toExcelDate, toExcelMonth, WIDTH, type ReportColumn, type RowInput } from '../workbookKit';
import { buildDocumentoColumns, buildDocumentoRow, money, semSubtotal, valores, type ModoRelatorio } from './documentoColumns';

type CodigoReceita = {
  'Código de Receita': string;
  'Descrição': string;
  'Escrituração de Origem': string;
};

const CODIGOS_RECEITA = new Map<string, CodigoReceita>(
  (codigosReceitaData as CodigoReceita[]).map((item) => [item['Código de Receita'], item]),
);

const txt = (key: string, header: string, width: number, wrap = false): ReportColumn =>
  ({ key, header, width, wrap });
const int = (key: string, header: string, width: number): ReportColumn =>
  ({ key, header, kind: 'integer', width });
const dat = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'date', width: WIDTH.date });
const mes = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'month', width: WIDTH.date });
const cnpj = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'cnpj', width: WIDTH.date });
const cur = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'currency', width: WIDTH.regular });

export function buildDebitoColumns(modo: ModoRelatorio): ReportColumn[] {
  return [
    // Blocos A–G repetidos, sem subtotal para não contar em duplicidade
    ...semSubtotal(buildDocumentoColumns(modo)),
    // H. Identificação do débito
    txt('temDebitos', 'Tem Débitos', WIDTH.compact),
    int('numeroDebito', 'Nº do Débito na PER/DCOMP', WIDTH.short),
    txt('codigoReceita', 'Código de Receita', WIDTH.medium),
    txt('descricaoCodigoReceita', 'Descrição do Código de Receita', WIDTH.maximum, true),
    txt('escrituracaoOrigem', 'Escrituração de Origem', WIDTH.medium),
    mes('paDebito', 'PA do Débito'),
    txt('periodicidadeDebito', 'Periodicidade do Débito', WIDTH.medium),
    dat('dataVencimento', 'Data de Vencimento'),
    // I. Valores do débito
    ...money('debitoPrincipal', 'Principal', modo),
    ...money('debitoMulta', 'Multa', modo),
    ...money('debitoJuros', 'Juros', modo),
    ...money('debitoTotal', 'Total', modo),
    ...(modo === 'completo' ? [txt('debitoEditado', 'Débito Editado', WIDTH.short)] : []),
    // J. Metadados do débito
    cnpj('cnpjDetentorDebito', 'CNPJ Detentor do Débito'),
    cnpj('cnpjTransmissor', 'CNPJ Transmissor PER/DCOMP'),
    txt('nomeEmpresarial', 'Nome Empresarial', WIDTH.maximum, true),
    txt('apelido', 'Apelido', WIDTH.regular),
    cnpj('cnpjDetentorCredito', 'CNPJ Detentor do Crédito'),
    txt('paCreditoDebito', 'PA do Crédito (Débito)', WIDTH.date),
    txt('periodicidadeCredito', 'Periodicidade do PA do Crédito', WIDTH.medium),
    txt('inicioPaCredito', 'Início do PA do Crédito', WIDTH.date),
    txt('fimPaCredito', 'Fim do PA do Crédito', WIDTH.date),
    cur('totalCreditoOriginalUtilizado', 'Total Crédito Original Utilizado'),
    cnpj('cnpjPrestador', 'CNPJ Prestador'),
    txt('cnoObra', 'CNO Obra', WIDTH.regular),
    txt('debitoControladoProcesso', 'Débito Controlado em Processo', WIDTH.regular),
    txt('reciboPerdcomp', 'Nº do Recibo PER/DCOMP', WIDTH.wide),
    txt('reciboDctf', 'Nº do Recibo de Transmissão DCTF', WIDTH.wide),
    txt('categoriaDctf', 'Categoria DCTF', WIDTH.medium),
    txt('dataTransmissaoDctf', 'Data de Transmissão DCTF', WIDTH.date),
    txt('debitoSucedida', 'Débito Sucedida', WIDTH.regular),
  ];
}

function debitoEditado(debito: DebitoOficial): boolean {
  return (
    hasMeaningfulDifference(debito.valorPrincipalOriginal, debito.valorPrincipal) ||
    hasMeaningfulDifference(debito.valorMultaOriginal, debito.valorMulta) ||
    hasMeaningfulDifference(debito.valorJurosOriginal, debito.valorJuros) ||
    hasMeaningfulDifference(debito.valorTotalOriginal, debito.valorTotal)
  );
}

function buildDebitoRow(
  debito: DebitoOficial,
  numeroDebito: number,
  modo: ModoRelatorio,
): RowInput {
  const receita = CODIGOS_RECEITA.get(debito.codigoReceita);

  return {
    temDebitos: 'Sim',
    numeroDebito,
    codigoReceita: debito.codigoReceita,
    descricaoCodigoReceita: receita?.['Descrição'] ?? '',
    escrituracaoOrigem: receita?.['Escrituração de Origem'] ?? '',
    paDebito: toExcelMonth(debito.periodoApuracao),
    periodicidadeDebito: debito.periodicidadeDebito ?? '',
    dataVencimento: toExcelDate(debito.dataVencimento),

    ...valores('debitoPrincipal', debito.valorPrincipalOriginal, debito.valorPrincipal, modo),
    ...valores('debitoMulta', debito.valorMultaOriginal, debito.valorMulta, modo),
    ...valores('debitoJuros', debito.valorJurosOriginal, debito.valorJuros, modo),
    ...valores('debitoTotal', debito.valorTotalOriginal, debito.valorTotal, modo),
    ...(modo === 'completo' ? { debitoEditado: simNao(debitoEditado(debito)) } : {}),

    cnpjDetentorDebito: debito.cnpjDebito ?? '',
    cnpjTransmissor: debito.cnpjTransmissorDcomp ?? '',
    nomeEmpresarial: debito.nomeEmpresarial ?? '',
    apelido: debito.apelido ?? '',
    cnpjDetentorCredito: debito.cnpjDetentorCredito ?? '',
    paCreditoDebito: debito.periodoApuracaoCredito ?? '',
    periodicidadeCredito: debito.periodicidadeCredito ?? '',
    inicioPaCredito: debito.inicioPeriodoApuracaoCredito ?? '',
    fimPaCredito: debito.fimPeriodoApuracaoCredito ?? '',
    totalCreditoOriginalUtilizado: debito.totalCreditoOriginalUtilizado ?? null,
    cnpjPrestador: debito.cnpjPrestador ?? '',
    cnoObra: debito.cnoObra ?? '',
    debitoControladoProcesso: debito.debitoControladoEmProcesso ?? '',
    reciboPerdcomp: debito.numeroReciboPerDcomp ?? '',
    reciboDctf: debito.numeroReciboTransmissaoDctf ?? '',
    categoriaDctf: debito.categoriaDctf ?? '',
    dataTransmissaoDctf: debito.dataTransmissaoDctf ?? '',
    debitoSucedida: debito.debitoSucedida ?? '',
  };
}

function buildLinhasDoDocumento(
  dcomp: DCOMP,
  cadeia: CadeiaRelacional,
  ordem: number,
  modo: ModoRelatorio,
): RowInput[] {
  const documento = buildDocumentoRow(dcomp, cadeia, ordem, modo);

  // PER e qualquer documento sem débitos importados ocupam exatamente uma linha,
  // com os blocos H, I e J vazios.
  if (dcomp.debitos.length === 0) {
    return [{ ...documento, temDebitos: 'Não' }];
  }

  return dcomp.debitos.map((debito, indice) => ({
    ...documento,
    ...buildDebitoRow(debito, indice + 1, modo),
  }));
}

export function buildDebitosRows(cadeias: CadeiaRelacional[], modo: ModoRelatorio): RowInput[] {
  return cadeias.flatMap((cadeia) =>
    cadeia.dcomps.flatMap((dcomp, indice) => buildLinhasDoDocumento(dcomp, cadeia, indice + 1, modo)),
  );
}
```

- [ ] **Step 4: Registrar a aba no orquestrador**

Em `src/services/ExcelCadeiasCompletasService.ts`, importar e acrescentar após a aba ①:

```ts
import { buildDebitoColumns, buildDebitosRows } from './excel/cadeias/debitoColumns';

// dentro de buildCadeiasWorkbook, logo após createReportSheet('Cascata PER-DCOMP', ...):
createReportSheet(
  workbook,
  'Débitos por Linha',
  buildDebitoColumns(input.modo),
  buildDebitosRows(cadeias, input.modo),
);
```

- [ ] **Step 5: Rodar os testes**

Run: `npm test -- src/services/__tests__/ExcelCadeiasCompletasService.test.ts`
Expected: PASS (11 testes).

- [ ] **Step 6: Commit**

```bash
git add src/services/excel/cadeias/debitoColumns.ts src/services/ExcelCadeiasCompletasService.ts src/services/__tests__/ExcelCadeiasCompletasService.test.ts
git commit -m "feat(excel): aba Debitos por Linha em granularidade de debito

Uma linha por debito compensado, repetindo todos os campos do documento;
PER e documentos sem debitos ocupam uma linha com as colunas de debito
vazias. Codigo de receita enriquecido com descricao e escrituracao de
origem. SUBTOTAL desligado nas colunas monetarias do documento.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Abas ③ `Resumo por Cadeia` e ④ `SELIC e Rastreabilidade`

**Files:**
- Create: `src/services/excel/cadeias/resumoCadeias.ts`
- Create: `src/services/excel/cadeias/selicRastreabilidade.ts`
- Modify: `src/services/ExcelCadeiasCompletasService.ts`
- Modify: `src/services/__tests__/ExcelCadeiasCompletasService.test.ts`

**Interfaces:**
- Consumes: `WIDTH`, `toExcelDate`, `toExcelMonth`, `joinList`, `joinFontes`, `ReportColumn`, `RowInput` (Task 1); `getFiltrosCascata`, `getVigencia`, `isDetalhador` (Task 2); `money`, `ModoRelatorio` (Task 4).
- Produces:
  ```ts
  export function buildResumoColumns(modo: ModoRelatorio): ReportColumn[];
  export function buildResumoRows(cadeias: CadeiaRelacional[], simulacoesSalvas: SimulacaoSalva[], modo: ModoRelatorio): RowInput[];
  export function buildSelicColumns(): ReportColumn[];
  export function buildSelicRows(cadeias: CadeiaRelacional[]): RowInput[];
  ```

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `src/services/__tests__/ExcelCadeiasCompletasService.test.ts`:

```ts
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
          saldoOriginalTotal: 0, saldoAtualizadoTotal: 0, economiaProjetada: 0,
          lastroOriginalDisponibilizado: 0, saldoOriginalRestanteAntigo: 0, saldoOriginalRestanteNovo: 0,
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
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npm test -- src/services/__tests__/ExcelCadeiasCompletasService.test.ts`
Expected: FAIL — `getWorksheet('Resumo por Cadeia')` devolve `undefined`.

- [ ] **Step 3: Implementar `resumoCadeias.ts`**

```ts
import type { CadeiaRelacional, SimulacaoSalva } from '../../../models/types';
import { getFiltrosCascata, getVigencia, isDetalhador, simNao } from '../dcompFacts';
import { toExcelDate, WIDTH, type ReportColumn, type RowInput } from '../workbookKit';
import { money, valores, type ModoRelatorio } from './documentoColumns';

const txt = (key: string, header: string, width: number, wrap = false): ReportColumn =>
  ({ key, header, width, wrap });
const int = (key: string, header: string, width: number): ReportColumn =>
  ({ key, header, kind: 'integer', width });
const dat = (key: string, header: string): ReportColumn =>
  ({ key, header, kind: 'date', width: WIDTH.date });

export function buildResumoColumns(modo: ModoRelatorio): ReportColumn[] {
  return [
    txt('idCadeia', 'ID Cadeia Relacional', WIDTH.regular),
    txt('perdcompRaiz', 'PER/DCOMP Raiz', WIDTH.wide),
    txt('tipoCredito', 'Tipo de Crédito', WIDTH.maximum, true),
    txt('paCredito', 'PA do Crédito', WIDTH.date),
    int('qtdeDcomps', 'Qtde de DCOMPs', WIDTH.short),
    int('qtdeVigentes', 'Vigentes', WIDTH.short),
    int('qtdeNaoVigentes', 'Não Vigentes', WIDTH.short),
    int('qtdeDetalhadores', 'Detalhadores', WIDTH.short),
    int('qtdeDebitos', 'Qtde de Débitos', WIDTH.short),
    ...money('creditoDetalhado', 'Crédito Detalhado', modo),
    ...money('creditoOrigUsado', 'Crédito Orig. Usado', modo),
    ...money('saldoFinal', 'Saldo Final', modo),
    int('docsARetificar', 'Docs A Retificar', WIDTH.short),
    int('docsBloqueados', 'Docs Bloqueados', WIDTH.short),
    ...(modo === 'completo' ? [int('docsEditados', 'Docs Editados', WIDTH.short)] : []),
    int('docsDivergentes', 'Docs Divergentes', WIDTH.short),
    dat('primeiraTransmissao', '1ª Transmissão'),
    dat('ultimaTransmissao', 'Última Transmissão'),
    ...(modo === 'completo' ? [txt('temSimulacaoSalva', 'Tem Simulação Salva', WIDTH.short)] : []),
  ];
}

export function buildResumoRows(
  cadeias: CadeiaRelacional[],
  simulacoesSalvas: SimulacaoSalva[],
  modo: ModoRelatorio,
): RowInput[] {
  const cadeiasSimuladas = new Set(simulacoesSalvas.map((simulacao) => simulacao.cadeiaId));

  return cadeias.map((cadeia) => {
    const ultimo = cadeia.dcomps[cadeia.dcomps.length - 1];
    const datas = cadeia.dcomps.map((dcomp) => new Date(dcomp.dataTransmissao).getTime());

    const creditoDetalhadoOriginal = cadeia.dcomps
      .filter((dcomp) => isDetalhador(dcomp) && getVigencia(dcomp) !== 'nao_vigente')
      .reduce((total, dcomp) => total + dcomp.valorTotalCreditoDetalhadoOriginal, 0);
    const creditoDetalhadoAtual = cadeia.dcomps
      .filter((dcomp) => isDetalhador(dcomp) && getVigencia(dcomp) !== 'nao_vigente')
      .reduce((total, dcomp) => total + dcomp.valorTotalCreditoDetalhado, 0);

    return {
      idCadeia: cadeia.id,
      perdcompRaiz: cadeia.numeroDcompInicial,
      tipoCredito: cadeia.tipoCredito,
      paCredito: cadeia.periodoApuracao,
      qtdeDcomps: cadeia.dcomps.length,
      qtdeVigentes: cadeia.dcomps.filter((dcomp) => getVigencia(dcomp) !== 'nao_vigente').length,
      qtdeNaoVigentes: cadeia.dcomps.filter((dcomp) => getVigencia(dcomp) === 'nao_vigente').length,
      qtdeDetalhadores: cadeia.dcomps.filter(isDetalhador).length,
      qtdeDebitos: cadeia.dcomps.reduce((total, dcomp) => total + dcomp.debitos.length, 0),
      ...valores('creditoDetalhado', creditoDetalhadoOriginal, creditoDetalhadoAtual, modo),
      ...valores(
        'creditoOrigUsado',
        cadeia.dcomps.reduce((total, dcomp) => total + dcomp.valorUtilizadoPerdcompOriginal, 0),
        cadeia.dcomps.reduce((total, dcomp) => total + dcomp.valorUtilizadoPerdcomp, 0),
        modo,
      ),
      ...valores(
        'saldoFinal',
        ultimo?.saldoCreditoOriginalAnterior ?? 0,
        ultimo?.saldoCreditoOriginalCalculado ?? 0,
        modo,
      ),
      docsARetificar: cadeia.dcomps.filter((dcomp) => getFiltrosCascata(dcomp).aRetificar).length,
      docsBloqueados: cadeia.dcomps.filter((dcomp) => getFiltrosCascata(dcomp).impedido).length,
      ...(modo === 'completo'
        ? { docsEditados: cadeia.dcomps.filter((dcomp) => dcomp.isManuallyEdited).length }
        : {}),
      docsDivergentes: cadeia.dcomps.filter((dcomp) => dcomp.divergenciaDetalhes !== undefined).length,
      primeiraTransmissao: toExcelDate(datas.length ? new Date(Math.min(...datas)) : undefined),
      ultimaTransmissao: toExcelDate(datas.length ? new Date(Math.max(...datas)) : undefined),
      ...(modo === 'completo' ? { temSimulacaoSalva: simNao(cadeiasSimuladas.has(cadeia.id)) } : {}),
    };
  });
}
```

- [ ] **Step 4: Implementar `selicRastreabilidade.ts`**

```ts
import type { CadeiaRelacional } from '../../../models/types';
import {
  joinFontes,
  joinList,
  toExcelDate,
  toExcelMonth,
  WIDTH,
  type ReportColumn,
  type RowInput,
} from '../workbookKit';

export function buildSelicColumns(): ReportColumn[] {
  return [
    { key: 'idCadeia', header: 'ID Cadeia Relacional', width: WIDTH.regular },
    { key: 'perdcomp', header: 'PER/DCOMP', width: WIDTH.wide },
    { key: 'statusCalculo', header: 'Status Cálculo', width: WIDTH.regular },
    { key: 'metodo', header: 'Método', width: WIDTH.maximum, wrap: true },
    { key: 'origem', header: 'Origem', width: WIDTH.regular },
    { key: 'taxaSelic', header: 'Taxa SELIC', kind: 'percentage', width: WIDTH.medium },
    { key: 'termoInicial', header: 'Termo Inicial', kind: 'month', width: WIDTH.date },
    { key: 'termoFinal', header: 'Termo Final', kind: 'month', width: WIDTH.date },
    { key: 'dataEntrega', header: 'Data Entrega / Valoração', kind: 'date', width: WIDTH.date },
    { key: 'creditoAtualizado', header: 'Crédito Atualizado', kind: 'currency', width: WIDTH.regular },
    { key: 'creditoUtilizado', header: 'Crédito Original Utilizado', kind: 'currency', width: WIDTH.regular },
    { key: 'saldoCalculado', header: 'Saldo Original Calculado', kind: 'currency', width: WIDTH.regular },
    { key: 'dadosUsados', header: 'Dados Usados', width: WIDTH.maximum, wrap: true },
    { key: 'dadosAusentes', header: 'Dados Ausentes', width: WIDTH.maximum, wrap: true },
    { key: 'hipoteses', header: 'Hipóteses', width: WIDTH.maximum, wrap: true },
    { key: 'alertas', header: 'Alertas', width: WIDTH.maximum, wrap: true },
    { key: 'fontes', header: 'Fontes Normativas', width: WIDTH.maximum, wrap: true },
  ];
}

export function buildSelicRows(cadeias: CadeiaRelacional[]): RowInput[] {
  return cadeias.flatMap((cadeia) =>
    cadeia.dcomps.map((dcomp) => {
      const resultado = dcomp.resultadoSelic;
      return {
        idCadeia: cadeia.id,
        perdcomp: dcomp.id,
        statusCalculo: resultado?.statusCalculo ?? '',
        metodo: resultado?.metodo ?? '',
        origem: resultado?.origemValor ?? '',
        taxaSelic: resultado?.valor?.taxaSelicDecimal ?? null,
        termoInicial: toExcelMonth(resultado?.valor?.termoInicialMes),
        termoFinal: toExcelMonth(resultado?.valor?.termoFinalMes),
        dataEntrega: toExcelDate(resultado?.valor?.dataEntregaValoracao),
        creditoAtualizado: resultado?.valor?.valorCreditoAtualizado ?? null,
        creditoUtilizado: resultado?.valor?.creditoOriginalUtilizadoCalculado ?? null,
        saldoCalculado: resultado?.valor?.saldoCreditoOriginalCalculado ?? null,
        dadosUsados: joinList(resultado?.dadosUsados),
        dadosAusentes: joinList(resultado?.dadosAusentes),
        hipoteses: joinList(resultado?.hipoteses),
        alertas: joinList(resultado?.alertas),
        fontes: joinFontes(resultado?.fontesNormativas),
      };
    }),
  );
}
```

- [ ] **Step 5: Registrar as abas no orquestrador**

Em `src/services/ExcelCadeiasCompletasService.ts`, após a aba ②:

```ts
import { buildResumoColumns, buildResumoRows } from './excel/cadeias/resumoCadeias';
import { buildSelicColumns, buildSelicRows } from './excel/cadeias/selicRastreabilidade';

createReportSheet(
  workbook,
  'Resumo por Cadeia',
  buildResumoColumns(input.modo),
  buildResumoRows(cadeias, input.simulacoesSalvas, input.modo),
);
createReportSheet(workbook, 'SELIC e Rastreabilidade', buildSelicColumns(), buildSelicRows(cadeias));
```

- [ ] **Step 6: Rodar os testes**

Run: `npm test -- src/services/__tests__/ExcelCadeiasCompletasService.test.ts`
Expected: PASS (14 testes).

- [ ] **Step 7: Commit**

```bash
git add src/services/excel/cadeias/resumoCadeias.ts src/services/excel/cadeias/selicRastreabilidade.ts src/services/ExcelCadeiasCompletasService.ts src/services/__tests__/ExcelCadeiasCompletasService.test.ts
git commit -m "feat(excel): abas Resumo por Cadeia e SELIC e Rastreabilidade

Resumo com contagens por vigencia e papel, saldos em Original/Atual/Delta
e marcacao de simulacao salva. SELIC com status do calculo, taxa, termos,
dados ausentes, hipoteses e fontes normativas por PER/DCOMP.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Abas ⑤ `Qualidade da Importação` e ⑥ `Legenda e Parâmetros`

**Files:**
- Create: `src/services/excel/cadeias/qualidadeImportacao.ts`
- Create: `src/services/excel/cadeias/legenda.ts`
- Modify: `src/services/ExcelCadeiasCompletasService.ts`
- Modify: `src/services/__tests__/ExcelCadeiasCompletasService.test.ts`

**Interfaces:**
- Consumes: `WIDTH`, `ReportColumn`, `RowInput` (Task 1); `ReconstrucaoECAC` (Task 3); `ModoRelatorio` (Task 4).
- Produces:
  ```ts
  export function buildQualidadeColumns(): ReportColumn[];
  export function buildQualidadeRows(relatorio: ImportQualityReport | null): RowInput[];
  export function buildLegendaColumns(): ReportColumn[];
  export function buildLegendaRows(input: {
    empresa: Empresa | null;
    emitidoEm: Date;
    modo: ModoRelatorio;
    cadeias: CadeiaRelacional[];
    reconstrucao: ReconstrucaoECAC | null;
  }): RowInput[];
  ```

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar a `src/services/__tests__/ExcelCadeiasCompletasService.test.ts`:

```ts
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

    const itens = (sheet: typeof completo) => {
      const lista: string[] = [];
      for (let linha = 5; linha <= sheet.rowCount; linha += 1) {
        const valor = sheet.getCell(linha, colunaPorCabecalho(sheet, 'Item')).value;
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
```

- [ ] **Step 2: Rodar o teste e confirmar a falha**

Run: `npm test -- src/services/__tests__/ExcelCadeiasCompletasService.test.ts`
Expected: FAIL — `getWorksheet('Qualidade da Importação')` devolve `undefined`.

- [ ] **Step 3: Implementar `qualidadeImportacao.ts`**

```ts
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

  const totalizadores: RowInput[] = [
    ['Linhas lidas em "Processamento PERDCOMP"', relatorio.linhasProcessamento],
    ['Linhas lidas em "PERDCOMP Débitos"', relatorio.linhasDebitos],
    ['PER/DCOMPs carregadas', relatorio.dcompsCarregadas],
    ['Cadeias relacionais carregadas', relatorio.cadeiasCarregadas],
    ['Débitos carregados', relatorio.debitosCarregados],
  ].map(([motivo, quantidade]) => ({
    categoria: 'Totalizador',
    perdcomp: '',
    motivo: motivo as string,
    tipoCredito: '',
    situacao: '',
    quantidade: quantidade as number,
  }));

  const ignorados: RowInput[] = relatorio.documentosIgnorados.map((documento) => ({
    categoria: 'Documento ignorado',
    perdcomp: documento.numeroPerdcomp,
    motivo: MOTIVOS[documento.motivo] ?? documento.motivo,
    tipoCredito: documento.tipoCredito ?? '',
    situacao: documento.situacao ?? '',
    quantidade: 1,
  }));

  return [...totalizadores, ...ignorados];
}
```

- [ ] **Step 4: Implementar `legenda.ts`**

```ts
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
    rows.push(linha('Filtros', item, predicado, 'Aplique o AutoFiltro nesta coluna para reproduzir o filtro equivalente do Simulador de Cascata.'));
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
```

- [ ] **Step 5: Registrar as abas no orquestrador**

Em `src/services/ExcelCadeiasCompletasService.ts`, ajustar `buildCadeiasWorkbook` para capturar a reconstrução e emitir as duas últimas abas:

```ts
import { buildLegendaColumns, buildLegendaRows } from './excel/cadeias/legenda';
import { buildQualidadeColumns, buildQualidadeRows } from './excel/cadeias/qualidadeImportacao';

// no início de buildCadeiasWorkbook:
const { cadeias, reconstrucao } = prepararCadeias(input);

// após a aba SELIC:
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
```

- [ ] **Step 6: Rodar toda a suíte**

Run: `npm test`
Expected: PASS em tudo, incluindo `ExcelReportGeneratorService.test.ts` sem edição.

- [ ] **Step 7: Lint e build**

Run: `npm run lint`
Run: `npm run build`
Expected: sem erros.

- [ ] **Step 8: Commit**

```bash
git add src/services/excel/cadeias/qualidadeImportacao.ts src/services/excel/cadeias/legenda.ts src/services/ExcelCadeiasCompletasService.ts src/services/__tests__/ExcelCadeiasCompletasService.test.ts
git commit -m "feat(excel): abas Qualidade da Importacao e Legenda e Parametros

Qualidade lista totalizadores e documentos descartados na carga com motivo
legivel, e e emitida mesmo sem relatorio de qualidade na sessao. Legenda
traz metadados de emissao, glossario das flags, o predicado literal de cada
coluna de filtro e a nota de subtotal da aba de debitos.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: UI — botão `Excel Completo` com menu de modos

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `generateRelatorioCompletoExcel`, `ModoRelatorio` (Task 4).
- Produces: nada consumido por outras tasks.

- [ ] **Step 1: Acrescentar estado e handler**

Em `src/App.tsx`, após `const [isExportingExcel, setIsExportingExcel] = useState(false);`:

```tsx
const importQualityReport = useStore(state => state.importQualityReport);
const [isExportingCompleto, setIsExportingCompleto] = useState(false);
const [isMenuCompletoOpen, setIsMenuCompletoOpen] = useState(false);
const menuCompletoRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuCompletoRef.current && !menuCompletoRef.current.contains(event.target as Node)) {
      setIsMenuCompletoOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);

const handleExportCompleto = async (modo: 'completo' | 'ecac') => {
  if (isExportingCompleto) return;

  setIsMenuCompletoOpen(false);
  setIsExportingCompleto(true);
  try {
    const { generateRelatorioCompletoExcel } = await import('./services/ExcelCadeiasCompletasService');
    await generateRelatorioCompletoExcel({
      cadeias: Object.values(cadeias),
      empresa,
      importQualityReport,
      simulacoesSalvas,
      modo,
    });
    toast.success(
      modo === 'ecac'
        ? 'Relatório Excel (somente e-CAC) exportado.'
        : 'Relatório Excel completo exportado.',
    );
  } catch (error) {
    console.error('Falha ao exportar o relatório Excel completo:', error);
    toast.error('Não foi possível exportar o relatório Excel completo.');
  } finally {
    setIsExportingCompleto(false);
  }
};
```

Acrescentar `useRef` ao import do React:

```tsx
import { useState, useEffect, useMemo, useRef } from 'react';
```

- [ ] **Step 2: Renomear o botão existente**

Trocar o rótulo do botão de simulações (mantendo `onClick`, `disabled` e `title`):

```tsx
<FileSpreadsheet size={16} /> {isExportingExcel ? 'Gerando...' : 'Excel das Simulações'}
```

E o `title`:

```tsx
title="Exportar Excel apenas com as simulações salvas"
```

- [ ] **Step 3: Inserir o botão novo**

No bloco `{temDados && ( ... )}`, **antes** do botão "Nova Simulação":

```tsx
<div ref={menuCompletoRef} style={{ position: 'relative' }}>
  <button
    className="btn btn-outline"
    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
    onClick={() => setIsMenuCompletoOpen(prev => !prev)}
    disabled={isExportingCompleto}
    title="Exportar todas as cadeias do Relatório de Análise e-CAC importado"
    aria-haspopup="menu"
    aria-expanded={isMenuCompletoOpen}
  >
    <FileSpreadsheet size={16} /> {isExportingCompleto ? 'Gerando...' : 'Excel Completo'}
  </button>

  {isMenuCompletoOpen && (
    <div
      role="menu"
      className="card-glass"
      style={{
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        right: 0,
        zIndex: 20,
        minWidth: '320px',
        padding: '0.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}
    >
      <button
        role="menuitem"
        className="btn btn-ghost"
        style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.6rem 0.75rem' }}
        onClick={() => handleExportCompleto('completo')}
      >
        <div>
          <div style={{ fontWeight: 600 }}>Completo — Original · Atual · Delta</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Inclui as colunas de simulação da sessão.
          </div>
        </div>
      </button>
      <button
        role="menuitem"
        className="btn btn-ghost"
        style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '0.6rem 0.75rem' }}
        onClick={() => handleExportCompleto('ecac')}
      >
        <div>
          <div style={{ fontWeight: 600 }}>Somente valores do e-CAC</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Apenas os valores originais importados; demais colunas mantidas.
          </div>
        </div>
      </button>
    </div>
  )}
</div>
```

- [ ] **Step 4: Verificar no navegador**

Subir o dev server e conferir: com planilha importada o botão `Excel Completo` aparece; o menu abre, fecha ao clicar fora; cada opção baixa um arquivo com o prefixo correto; o botão `Excel das Simulações` só aparece quando há simulação salva. Conferir nos temas claro e escuro.

Run: `npm run dev` (porta 5173)

- [ ] **Step 5: Lint e build**

Run: `npm run lint`
Run: `npm run build`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx
git commit -m "feat(ui): botao Excel Completo com escolha de modo na topbar

Novo botao visivel sempre que houver planilha importada, com menu de duas
opcoes (completo e somente e-CAC). O botao anterior passa a se chamar
'Excel das Simulacoes' para desambiguar; comportamento inalterado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Integração com planilha real, benchmark e documentação

**Files:**
- Create: `src/services/__tests__/ExcelCadeiasCompletas.real.test.ts`
- Modify: `docs/PROJECT_STATE.md`
- Modify: `docs/ROADMAP.md`

**Interfaces:**
- Consumes: `parseExcelFile` de `../ExcelParser`; `recalcularCadeia` de `../CalculoService`; `buildCadeiasWorkbook` (Task 4).
- Produces: nada.

- [ ] **Step 1: Escrever o teste de integração**

Criar `src/services/__tests__/ExcelCadeiasCompletas.real.test.ts`:

```ts
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

import { recalcularCadeia } from '../CalculoService';
import { parseExcelFile } from '../ExcelParser';
import { buildCadeiasWorkbook } from '../ExcelCadeiasCompletasService';
import type { CadeiaRelacional } from '../../models/types';

// Planilhas reais ficam fora do repo (Sheets/ do workspace ou BSMART_PERDCOMP_SHEETS_DIR);
// na ausência delas (repo isolado) esta suíte é pulada.
const sheetsDir = process.env.BSMART_PERDCOMP_SHEETS_DIR ?? resolve(process.cwd(), '..', 'Sheets');
const hasRealSheets = existsSync(sheetsDir);

let cadeias: CadeiaRelacional[];
let importQualityReport: ReturnType<typeof parseExcelFile>['importQualityReport'];
let empresa: ReturnType<typeof parseExcelFile>['empresa'];

function planilhaMaisRecente(): string {
  const arquivos = readdirSync(sheetsDir)
    .filter((nome) => /an[áa]lise.*e-?cac/i.test(nome) && nome.endsWith('.xlsx'))
    .map((nome) => resolve(sheetsDir, nome))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (arquivos.length === 0) throw new Error('Nenhum Relatório de Análise e-CAC encontrado em Sheets/.');
  return arquivos[0];
}

describe.skipIf(!hasRealSheets)('ExcelCadeiasCompletasService - planilha real', () => {
  beforeAll(() => {
    const arquivo = readFileSync(planilhaMaisRecente());
    const buffer = arquivo.buffer.slice(arquivo.byteOffset, arquivo.byteOffset + arquivo.byteLength);
    const resultado = parseExcelFile(buffer as ArrayBuffer);
    cadeias = resultado.cadeias.map(recalcularCadeia);
    importQualityReport = resultado.importQualityReport;
    empresa = resultado.empresa;
  });

  it('conserva as linhas: uma por PER/DCOMP na cascata, Σ max(1, débitos) nos débitos', () => {
    const workbook = buildCadeiasWorkbook({
      cadeias, empresa, importQualityReport, simulacoesSalvas: [],
      modo: 'completo', emitidoEm: new Date(2026, 8, 3),
    });

    const documentos = cadeias.reduce((total, cadeia) => total + cadeia.dcomps.length, 0);
    const linhasDebito = cadeias.reduce(
      (total, cadeia) => total + cadeia.dcomps.reduce((soma, d) => soma + Math.max(1, d.debitos.length), 0),
      0,
    );

    expect(workbook.getWorksheet('Cascata PER-DCOMP')!.rowCount).toBe(4 + documentos);
    expect(workbook.getWorksheet('Débitos por Linha')!.rowCount).toBe(4 + linhasDebito);
    expect(documentos).toBe(importQualityReport.dcompsCarregadas);
  });

  it('sem edicoes na sessao, o modo e-CAC bate com as colunas Original do modo completo', () => {
    const comum = { cadeias, empresa, importQualityReport, simulacoesSalvas: [], emitidoEm: new Date(2026, 8, 3) };
    const completo = buildCadeiasWorkbook({ ...comum, modo: 'completo' }).getWorksheet('Cascata PER-DCOMP')!;
    const ecac = buildCadeiasWorkbook({ ...comum, modo: 'ecac' }).getWorksheet('Cascata PER-DCOMP')!;

    const coluna = (sheet: typeof completo, cabecalho: string) => {
      const row = sheet.getRow(4);
      for (let c = 2; c <= row.cellCount; c += 1) if (row.getCell(c).value === cabecalho) return c;
      throw new Error(`Cabeçalho não encontrado: ${cabecalho}`);
    };

    const colCompleto = coluna(completo, 'Crédito Orig. Usado — Original');
    const colEcac = coluna(ecac, 'Crédito Orig. Usado');

    for (let linha = 5; linha <= Math.min(ecac.rowCount, 200); linha += 1) {
      expect(ecac.getCell(linha, colEcac).value).toEqual(completo.getCell(linha, colCompleto).value);
    }
  });

  it('gera o workbook completo dentro do limite de 15 s', () => {
    const inicio = performance.now();
    buildCadeiasWorkbook({
      cadeias, empresa, importQualityReport, simulacoesSalvas: [],
      modo: 'completo', emitidoEm: new Date(2026, 8, 3),
    });
    const decorrido = performance.now() - inicio;

    console.log(`[benchmark] buildCadeiasWorkbook completo: ${decorrido.toFixed(0)} ms`);
    expect(decorrido).toBeLessThan(15_000);
  }, 60_000);
});
```

- [ ] **Step 2: Rodar o teste de integração**

Run: `npm test -- src/services/__tests__/ExcelCadeiasCompletas.real.test.ts`
Expected: PASS com as planilhas em `../Sheets`; SKIP quando ausentes. Anotar o número impresso pelo `[benchmark]`.

**Se o benchmark passar de 15 s** — mesmo que o teste ainda passe por margem estreita — pare aqui e informe o usuário antes de prosseguir: o spec (§7) prevê migrar a geração para Web Worker nesse cenário, e isso é uma decisão de escopo, não um ajuste.

- [ ] **Step 3: Registrar o resultado na documentação**

Em `docs/PROJECT_STATE.md`, acrescentar ao final da seção de estado atual:

```markdown
- Relatorio Excel Completo de cadeias (`ExcelCadeiasCompletasService`) exporta todas as cadeias do
  Relatorio de Analise e-CAC importado em seis abas, com aba em granularidade de debito e colunas de
  filtro que replicam o Simulador de Cascata. Dois modos: completo (Original/Atual/Delta) e somente
  e-CAC (cadeia reconstruida antes de reprocessar). Benchmark medido na planilha DASA
  (1.507 documentos / 4.658 debitos): <PREENCHER> ms para o modo completo, limite de 15.000 ms.
```

Substituir `<PREENCHER>` pelo número observado no Step 2.

Em `docs/ROADMAP.md`, inserir uma linha logo **abaixo** da linha existente que começa com
`- Exportacao Excel consolidada foi implementada com sete abas auditaveis`:

```markdown
- Exportacao Excel completa de cadeias (`ExcelCadeiasCompletasService`) cobre todas as cadeias do
  Relatorio de Analise e-CAC importado, em seis abas, com granularidade de debito e colunas de filtro
  equivalentes as do Simulador de Cascata. Dois modos: completo e somente e-CAC.
```

- [ ] **Step 4: Rodar tudo**

Run: `npm test`
Run: `npm run lint`
Run: `npm run build`
Expected: tudo verde.

- [ ] **Step 5: Commit**

```bash
git add src/services/__tests__/ExcelCadeiasCompletas.real.test.ts docs/PROJECT_STATE.md docs/ROADMAP.md
git commit -m "test(excel): integracao com planilha real e benchmark do relatorio completo

Valida conservacao de linhas (planilha -> relatorio), o invariante de que o
modo e-CAC bate com as colunas Original do modo completo em sessao sem
edicoes, e o limite de 15 s para gerar o workbook. Suite pulada quando
Sheets/ nao existir.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## Verificação final (após a Task 9)

- [ ] `npm test` verde, incluindo `ExcelReportGeneratorService.test.ts` **sem nenhuma edição**.
- [ ] `npm run lint` limpo.
- [ ] `npm run build` sem erros.
- [ ] Abrir os dois arquivos gerados no Excel: AutoFiltro ativo na linha 4, painéis congelados, SUBTOTAL presente só nas colunas monetárias do débito na aba ②.
- [ ] Filtrar `Filtro: A Retificar = Sim` na aba ① e conferir que o conjunto bate com o dropdown "A Retificar" do Simulador de Cascata para a mesma planilha.
- [ ] Conferir que nenhum documento sumiu: `Qtde de PER/DCOMPs` da aba Legenda == `PER/DCOMPs carregadas` da aba Qualidade.
