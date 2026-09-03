# Relatório Excel Completo de Cadeias PER/DCOMP — Design

- **Data:** 03/09/2026
- **Branch:** `feat/relatorio-excel-completo`
- **Status:** desenho aprovado pelo usuário (aguardando revisão do spec escrito)

## 1. Problema

O `ExcelReportGeneratorService` atual só exporta **cadeias editadas cuja simulação foi salva**
(`if (simulacoes.length === 0) throw`). O parâmetro `_todasAsCadeias` já existe na assinatura, mas
está `void`-ado e nunca é usado.

O usuário precisa exportar **todas as cadeias presentes no Relatório de Análise e-CAC importado**,
enriquecidas com o que o B.Smart calcula, e precisa de uma aba em **granularidade de débito** — uma
linha por débito compensado, com os campos do documento repetidos.

## 2. Habilitador já existente

`processExcelBuffer` (`src/services/importPipeline.ts`) roda `recalcularCadeia` sobre **todas** as
cadeias no momento da importação. Portanto `store.cadeias` já contém, para o universo inteiro:
`saldoCreditoOriginalCalculado`, `saldoCreditoOriginalAnterior`, `statusCascata`, `resultadoSelic`,
`isDivergente`, `classificacaoCreditoConsultiva` e `statusProcessamentoConsultivo`.

O enriquecimento **já existe em memória**. O trabalho é materializá-lo em Excel — não recalculá-lo.

## 3. Arquitetura

### 3.1 Extração (movimento puro, sem mudança de comportamento)

`ExcelReportGeneratorService.ts` tem 1.009 linhas e concentra dois papéis: infraestrutura genérica de
planilha e as regras do relatório de simulações. A infraestrutura é extraída para reuso:

- **`src/services/excel/workbookKit.ts`** — `CellInput`, `RowInput`, `ColumnKind`, `ReportColumn`,
  `createReportSheet`, `applyHeaderStyle`, `applyBodyStyle`, `applySubtotals`, `numberFormatFor`,
  `normalizeCellValue`, `toCnpjNumber`, `toExcelDate`, `toExcelMonth`, `estimateWrappedLines`,
  `formatFileTimestamp`, `joinList`, `sum`, e as constantes `WIDTH`, cores e `ECAC_CURRENCY_FORMAT`.
- **`src/services/excel/dcompFacts.ts`** — `getProjectionValues`, `getVigencia`, `formatVigencia`,
  `hasManualDebitEdit`, `hasMeaningfulDifference`, `isHypothetical`, mais as derivações novas (§3.3)
  e a reconstrução pristina (§3.4).

`ExcelReportGeneratorService.ts` passa a importar do kit e mantém a API pública inalterada
(`buildExcelWorkbook`, `generateExcelReport`, `ECAC_CURRENCY_FORMAT`). O teste existente
`src/services/__tests__/ExcelReportGeneratorService.test.ts` é a prova de não-regressão: deve
continuar passando **sem nenhuma edição**.

### 3.2 Serviço novo

**`src/services/ExcelCadeiasCompletasService.ts`**

```ts
export type ModoRelatorio = 'completo' | 'ecac';

export type CadeiasWorkbookInput = {
  cadeias: CadeiaRelacional[];
  empresa: Empresa | null;
  importQualityReport: ImportQualityReport | null;
  simulacoesSalvas: SimulacaoSalva[];
  modo: ModoRelatorio;
  emitidoEm: Date;
};

export function buildCadeiasWorkbook(input: CadeiasWorkbookInput): Workbook;

export async function generateRelatorioCompletoExcel(
  input: Omit<CadeiasWorkbookInput, 'emitidoEm'>,
): Promise<void>;
```

Fonte de dados: `Object.values(store.cadeias)`. **Nenhuma âncora `...Original` é escrita.** O serviço
é puro em relação ao store — recebe os dados, não os muta.

### 3.3 Derivações novas em `dcompFacts.ts`

Cada uma reproduz literalmente o predicado equivalente da UI, para que o Excel e a tela nunca
divirjam:

| Função | Origem da regra | Saída |
|---|---|---|
| `getNatureza(dcomp)` | `isPedidoCancelamento` + `tipoDocumento` | `PER` \| `DCOMP` \| `Pedido de Cancelamento` |
| `getOrigemDocumento(dcomp)` | `TimelineCascata` (`indicadorCredito === '1' ? 'Original' : 'Retificador'`) | `Original` \| `Retificador` \| `Pedido de Cancelamento` |
| `getPapelDocumento(dcomp)` | `TimelineCascata` (`!numeroDcompDetalhamento \|\| === id`) | `Detalhador` \| `Consumidor` \| `—` |
| `getStatusCascataLabel(dcomp, vigente, bloqueado)` | ordem exata dos ramos do `<td>` de Situação | `OK` \| `A RETIFICAR` \| `EDITADO` \| `EDITADO E A RETIFICAR` \| `BLOQUEADO` \| `Não vigente` |
| `getAlertasStatus(dcomp)` | `classificarStatusProcessamento` menos `documento_analisado_ou_em_discussao` e `documento_nao_vigente` | `{ temAtencao: boolean; motivos: string }` |
| `getVinculoSubstituicao(dcomp, cadeia)` | `numeroRetificador` + `isPedidoCancelamento` da substituta | `{ tipo: 'Retificada por' \| 'Cancelada por' \| '—'; substituiPerdcomp: string }` |
| `getFiltrosCascata(dcomp)` | `TimelineCascata.dcompsFiltradas` | 5 booleanos (§5.7) |

`getVinculoSubstituicao` também resolve o inverso (coluna `Retifica/Cancela a PER/DCOMP nº`),
varrendo `cadeia.dcomps` por `x.numeroRetificador === dcomp.id`.

### 3.4 Reconstrução pristina (modo e-CAC)

**`reconstruirCadeiaOriginal(cadeia: CadeiaRelacional): CadeiaRelacional`**

1. Deep-copy da cadeia — nunca muta a original.
2. Descarta DCOMPs hipotéticas (`isHypothetical`) — não existem no relatório e-CAC.
3. Restaura, em cada DCOMP e cada débito, os valores mutáveis a partir das âncoras:
   `valorTotalCreditoDetalhado ← valorTotalCreditoDetalhadoOriginal`,
   `valorUtilizadoPerdcomp ← valorUtilizadoPerdcompOriginal`,
   `valorPrincipal/Multa/Juros/Total ← *Original`.
4. Limpa `isManuallyEdited`, `divergenciaDetalhes`, `statusCascata` e
   `saldoCreditoOriginalCalculado`.
5. Chama `recalcularCadeia` (`CalculoService`) sobre a cópia.

Se o passo 2 esvaziar a cadeia (caso-limite de cadeia composta só por documentos hipotéticos), ela é
omitida do relatório e contabilizada na Legenda junto às DCOMPs hipotéticas excluídas.

**Razão de existir:** no modo e-CAC não basta esconder colunas. Numa cadeia editada, o
`statusCascata`, o `saldoCreditoOriginalCalculado` e o `resultadoSelic` dos documentos **a jusante**
já carregam o efeito da simulação. Sem a reconstrução, valores simulados apareceriam rotulados como
originais.

**Invariante testável:** numa sessão sem nenhuma edição, `reconstruirCadeiaOriginal(c)` produz
valores idênticos aos da cadeia viva — logo o modo e-CAC bate célula a célula com as colunas
`— Original` do modo completo.

## 4. Modos de emissão

| | **Completo** | **e-CAC** |
|---|---|---|
| Valores monetários | 3 colunas: `— Original`, `— Atual`, `— Delta` | 1 coluna, sem sufixo |
| Fonte dos valores | âncoras `...Original` / valores vivos | cadeia reconstruída (§3.4) |
| DCOMPs hipotéticas | incluídas | **excluídas** (quantidade registrada na Legenda) |
| Colunas só de simulação | presentes | ausentes |
| Filtros, flags, vínculos, metadados | todas | todas |
| Calculadas (Saldo Próx. DCOMP, Status Cascata, SELIC) | presentes | presentes, recalculadas na cadeia pristina |
| Arquivo | `Relatorio_Completo_PERDCOMP_<AAAAMMDD-HHmm>.xlsx` | `Relatorio_eCAC_PERDCOMP_<AAAAMMDD-HHmm>.xlsx` |

**Colunas só de simulação** (ausentes no modo e-CAC): `Editado pelo Usuário`, `Hipotética`,
`Débito Editado`, `Tem Simulação Salva`, e todos os sufixos `— Atual` e `— Delta`.

O modo e-CAC continua sendo um relatório **enriquecido**: perde as colunas de simulação, não o
enriquecimento do motor.

## 5. Abas

Ordem fixa nos dois modos:

1. `Cascata PER-DCOMP`
2. `Débitos por Linha`
3. `Resumo por Cadeia`
4. `SELIC e Rastreabilidade`
5. `Qualidade da Importação`
6. `Legenda e Parâmetros`

Nomes de aba não podem conter `/` (restrição do Excel) — daí `PER-DCOMP`.

### 5.1 Aba ① `Cascata PER-DCOMP` — 1 linha por PER/DCOMP

66 colunas no modo completo, 54 no modo e-CAC. `[C]` = só no modo completo.

**A. Identificação (10):** ID Cadeia Relacional · PER/DCOMP Raiz da Cadeia · Ordem na Cadeia ·
PER/DCOMP · Tipo do Documento · Natureza · Origem · Data Transm. · Data Ref. ·
Data/Hora Transm. Importada

**B. Situação e vigência (8):** Situação (e-CAC) · Situação Detalhada · Vigência · Status Cascata ·
Editabilidade · Atenção (Status) · Motivos de Atenção · Divergente

**C. Vínculos (5):** Papel do Documento · Retific./Cancel. Por · Tipo do Vínculo ·
Retifica/Cancela a PER/DCOMP nº · Detalhamento

**D. Filtros e marcações (7 / 5):** Filtro: Vigentes e Editáveis · Filtro: OK · Filtro: A Retificar ·
Filtro: Impedido · Filtro: Apenas Detalhadores · `[C]` Editado pelo Usuário · `[C]` Hipotética

**E. Crédito (6):** Tipo de Crédito · Classificação do Crédito · Restrições / Vedações ·
Detentor do Crédito · PA do Crédito · Indicador de Crédito

**F. Valores (16 / 6):** Crédito Detalhado · Créd. Data Transm. · Débitos · Crédito Orig. Usado ·
Saldo Próx. DCOMP — cada um em `— Original` / `— Atual` / `— Delta` no modo completo, coluna única no
modo e-CAC — mais Qtde de Débitos.

Mapeamento dos valores, conforme `getProjectionValues`:

| Coluna | Original | Atual |
|---|---|---|
| Crédito Detalhado | `valorTotalCreditoDetalhadoOriginal` | `valorTotalCreditoDetalhado` |
| Créd. Data Transm. | `divergenciaDetalhes?.esperado ?? valorCreditoDataTransmissao` | `divergenciaDetalhes?.calculado ?? valorCreditoDataTransmissao` |
| Débitos | `Σ debito.valorTotalOriginal` | `Σ debito.valorTotal` |
| Crédito Orig. Usado | `valorUtilizadoPerdcompOriginal` | `valorUtilizadoPerdcomp` |
| Saldo Próx. DCOMP | `saldoCreditoOriginalAnterior` | `saldoCreditoOriginalCalculado` |

`Delta = Atual − Original`.

**G. Metadados do crédito importado (14):** CNPJ Origem · Data de Extração · Data de Arrecadação ·
Competência do Crédito · Tipo de Competência · Nº do Pagamento (DARF) · PA do DARF ·
Grupo de Tributo · Código da Receita (Crédito) · Processo Judicial · Processo de Habilitação ·
Processo Administrativo · Origem da Discussão · PER/DCOMP Anterior c/ Detalhamento

### 5.2 Aba ② `Débitos por Linha` — 1 linha por débito

105 colunas no modo completo, 84 no modo e-CAC. Repete **todos** os campos do documento (blocos A–G
da §5.1) em cada linha, e acrescenta:

**H. Identificação do débito (8):** Tem Débitos · Nº do Débito na PER/DCOMP · Código de Receita ·
Descrição do Código de Receita · Escrituração de Origem · PA do Débito · Periodicidade do Débito ·
Data de Vencimento

`Descrição do Código de Receita` e `Escrituração de Origem` vêm de `src/data/CodigosDeReceita.json`
(mesma fonte usada por `ModalEdicao`), por lookup em `codigoReceita`; ficam vazias quando o código
não consta na tabela.

**I. Valores do débito (13 / 4):** Principal · Multa · Juros · Total — em `— Original` / `— Atual` /
`— Delta` no modo completo, coluna única no modo e-CAC — mais `[C]` Débito Editado.

**J. Metadados do débito (18):** CNPJ Detentor do Débito · CNPJ Transmissor PER/DCOMP ·
Nome Empresarial · Apelido · CNPJ Detentor do Crédito · PA do Crédito (Débito) ·
Periodicidade do PA do Crédito · Início do PA do Crédito · Fim do PA do Crédito ·
Total Crédito Original Utilizado · CNPJ Prestador · CNO Obra · Débito Controlado em Processo ·
Nº do Recibo PER/DCOMP · Nº do Recibo de Transmissão DCTF · Categoria DCTF ·
Data de Transmissão DCTF · Débito Sucedida

**Regra do PER (e de qualquer documento sem débitos):** `debitos.length === 0` gera **exatamente uma
linha**, com todas as colunas dos blocos H, I e J vazias e `Tem Débitos = Não`.

**Contagem de linhas (asserção de teste):**
`linhas = Σ_documentos max(1, documento.debitos.length)`

**Subtotais:** `createReportSheet` aplica `SUBTOTAL(9;…)` a toda coluna `currency`. Na aba ② as
colunas monetárias **do documento** se repetem a cada débito e somá-las contaria em duplicidade.
Solução: `ReportColumn` ganha `subtotal?: boolean` (default `true`); as colunas dos blocos A–G na
aba ② recebem `subtotal: false`. Só o bloco I mantém subtotal. A regra é documentada na Legenda.

### 5.3 Aba ③ `Resumo por Cadeia` — 1 linha por cadeia

ID Cadeia · PER/DCOMP Raiz · Tipo de Crédito · PA do Crédito · Qtde de DCOMPs · Vigentes ·
Não Vigentes · Detalhadores · Qtde de Débitos · Crédito Detalhado (Orig./Atual/Delta) ·
Crédito Orig. Usado (Orig./Atual/Delta) · Saldo Final (Orig./Atual/Delta) · Docs A Retificar ·
Docs Bloqueados · `[C]` Docs Editados · Docs Divergentes · 1ª Transmissão · Última Transmissão ·
`[C]` Tem Simulação Salva

`Saldo Final` = saldo do último documento da cadeia (`cadeia.dcomps.at(-1)`), coerente com
`TimelineCascata`. `Tem Simulação Salva` cruza `simulacoesSalvas` por `cadeiaId`.

Os trios `(Orig./Atual/Delta)` desta aba seguem a mesma regra da §4: colapsam para coluna única no
modo e-CAC.

### 5.4 Aba ④ `SELIC e Rastreabilidade` — 1 linha por PER/DCOMP com `resultadoSelic`

Reaproveita a forma de `buildSelicRows`: ID Cadeia · PER/DCOMP · Status Cálculo · Método · Origem ·
Taxa SELIC · Termo Inicial · Termo Final · Data Entrega/Valoração · Crédito Atualizado ·
Crédito Original Utilizado · Saldo Original Calculado · Dados Usados · Dados Ausentes · Hipóteses ·
Alertas · Fontes Normativas.

No modo e-CAC os valores vêm do `resultadoSelic` da cadeia reconstruída.

### 5.5 Aba ⑤ `Qualidade da Importação`

Colunas: Categoria · PER/DCOMP · Motivo · Tipo de Crédito · Situação · Quantidade.

Primeiras linhas com `Categoria = Totalizador`, uma por métrica do `ImportQualityReport`
(`linhasProcessamento`, `linhasDebitos`, `dcompsCarregadas`, `cadeiasCarregadas`,
`debitosCarregados`). Em seguida, uma linha por item de `documentosIgnorados`, com
`Categoria = Documento ignorado` e o `motivo` traduzido para texto legível
(`sem_cadeia_relacional` → "Sem ID de Cadeia Relacional", etc.).

Quando `importQualityReport` for `null` — estado restaurado de sessão anterior, anterior à
introdução do relatório de qualidade — a aba é emitida com uma única linha informando a
indisponibilidade. Nunca é omitida, para não alterar a ordem das abas.

### 5.6 Aba ⑥ `Legenda e Parâmetros`

Colunas: Seção · Item · Descrição · Como usar / Referência. Conteúdo:

- **Emissão:** empresa, CNPJ, data/hora, modo do relatório, versão do motor de cálculo, fonte e
  cobertura da tabela SELIC, totais de cadeias/documentos/débitos e — no modo e-CAC — o número de
  DCOMPs hipotéticas excluídas.
- **Glossário:** Detalhador, Consumidor, Vigente, Não vigente, Retificador, Retific. Por,
  Detalhamento, Atenção (Status), A Retificar, Bloqueado, Divergente, Hipotética.
- **Filtros:** definição literal de cada coluna `Filtro:` (§5.7).
- **Semântica de valores:** Original / Atual / Delta, ou, no modo e-CAC, o aviso de que só os valores
  originais do relatório importado são apresentados.
- **Nota de subtotal:** por que as colunas monetárias do documento não somam na aba ②.

### 5.7 Colunas de filtro — predicados

Reproduzem literalmente `TimelineCascata.dcompsFiltradas`. Valores `Sim` / `Não`.

Com `vigente = isVigente(situacao, tipoDocumento, id)`,
`bloqueado = isBloqueado(situacao, tipoDocumento, id)` e
`aRetificar = statusCascata === 'RETIFICAR' || statusCascata === 'EDITADO_E_RETIFICAR'`:

| Coluna | Predicado |
|---|---|
| `Filtro: Vigentes e Editáveis` | `(vigente && !bloqueado) \|\| aRetificar` |
| `Filtro: OK` | `vigente && !bloqueado && (statusCascata === 'OK' \|\| statusCascata === 'EDITADO')` |
| `Filtro: A Retificar` | `aRetificar` |
| `Filtro: Impedido` | `!vigente \|\| bloqueado` |
| `Filtro: Apenas Detalhadores` | `!numeroDcompDetalhamento \|\| numeroDcompDetalhamento === id` |

São colunas booleanas independentes, e não um único campo categórico, porque as opções da tela **não
são mutuamente exclusivas** (um documento pode ser Impedido *e* A Retificar) e o AutoFiltro do Excel
não combina condições entre colunas com OR.

## 6. UI

Novo botão **`Excel Completo`** (ícone `FileSpreadsheet`) na topbar do `App.tsx`, visível sempre que
`temDados` — fora do bloco condicionado a `simulacoesSalvas.length > 0`.

O clique abre um menu de duas opções, no mesmo padrão de dropdown com `useRef` + click-outside já
usado em `DashboardCadeias.tsx`:

- **Completo — Original · Atual · Delta** — inclui as colunas de simulação.
- **Somente valores do e-CAC** — apenas os valores originais, todas as demais colunas mantidas.

O botão existente, hoje rotulado `Exportar Excel`, passa a `Excel das Simulações` para desambiguar.
É mudança apenas de rótulo; comportamento e serviço subjacente ficam intactos.

Estado de carregamento e toasts de sucesso/erro no mesmo padrão de `handleExportExcel`. Import
dinâmico do serviço, mantendo o `exceljs` em chunk próprio.

## 7. Desempenho

Planilha real de referência
(`Sheets/Relatório de Análise e-CAC - DASA - 05.21 a 06.26_22.06.2026.xlsx`): 1.507 linhas em
`Processamento PERDCOMP` e 4.658 em `PERDCOMP Débitos`.

A aba ② no modo completo fica em ~5.000 linhas × 105 colunas ≈ **525 mil células estilizadas**.
`applyBodyStyle` hoje aloca um objeto `alignment` novo por célula.

**Otimização:** `createReportSheet` passa a pré-computar, uma vez por coluna, o pacote de estilo
(`font`, `fill`, `alignment`, `border`, `numFmt`) e a atribuir a mesma referência a todas as células
daquela coluna. É refactor puro e beneficia também o relatório existente.

**Portão de decisão:** benchmark medido sobre a planilha DASA. Se a geração no modo completo passar
de **15 s**, a geração migra para Web Worker antes da entrega. O número medido é registrado em
`docs/PROJECT_STATE.md`.

## 8. Testes

`src/services/__tests__/ExcelCadeiasCompletasService.test.ts`, com fixture cobrindo: DCOMP com 2
débitos · PER sem débitos · retificada não vigente · pedido de cancelamento · detalhador vs.
consumidor · cadeia editada com delta ≠ 0 · DCOMP hipotética.

| # | Asserção |
|---|---|
| 1 | Ordem e nomes das 6 abas, nos dois modos |
| 2 | Aba ①: uma linha por documento |
| 3 | Aba ②: `linhas === Σ max(1, debitos.length)` |
| 4 | PER sem débitos: 1 linha, blocos H/I/J vazios, `Tem Débitos = Não` |
| 5 | Colunas `Filtro:` batem com o predicado de `TimelineCascata` para cada documento da fixture |
| 6 | `Delta === Atual − Original` em todas as colunas monetárias |
| 7 | Modo e-CAC não emite nenhuma coluna `— Atual`, `— Delta`, nem coluna só de simulação |
| 8 | Modo e-CAC exclui DCOMPs hipotéticas e registra a quantidade na Legenda |
| 9 | **Invariante:** sem edições na sessão, modo e-CAC ≡ colunas `— Original` do modo completo |
| 10 | Cadeia editada: modo e-CAC ignora a edição (valor = âncora); modo completo mostra o delta |
| 11 | Aba ②: colunas monetárias do documento sem fórmula de subtotal; as do débito, com |
| 12 | `Qualidade da Importação` emitida mesmo com `importQualityReport === null` |
| 13 | Nenhuma âncora `...Original` é mutada — deep-clone comparado antes/depois |

Teste de integração lendo de `Sheets/` (ou `BSMART_PERDCOMP_SHEETS_DIR`), **pulado quando a pasta não
existir**, conforme a convenção do repositório: conservação de linhas (planilha → relatório) e
registro do benchmark da §7.

`src/services/__tests__/ExcelReportGeneratorService.test.ts` continua passando sem edição.

## 9. Definição de Pronto

1. `npm run build` sem erros.
2. `npm run lint` limpo.
3. `npm test` verde, incluindo a suíte existente do relatório de simulações.
4. Relatório existente (`Excel das Simulações`) inalterado em conteúdo.
5. Benchmark da §7 medido e registrado; worker adotado se ultrapassar o limite.
6. Nenhuma escrita em `...Original`; nenhuma alteração em `getDepth` ou na lógica de linhagem do
   `ExcelParser.ts`.

## 10. Decisões registradas

| # | Decisão | Razão |
|---|---|---|
| D1 | Modo e-CAC reconstrói a cadeia pristina e reprocessa com `recalcularCadeia` | Esconder colunas deixaria valores simulados a jusante posando de originais |
| D2 | DCOMPs hipotéticas ficam fora do modo e-CAC | Não existem no relatório importado; a quantidade é registrada na Legenda |
| D3 | Colunas de filtro são booleanas independentes, não um campo categórico | As opções da tela não são mutuamente exclusivas e o AutoFiltro não faz OR entre colunas |
| D4 | Aba ② repete os 66 campos do documento em cada linha de débito | Pedido explícito do usuário; permite pivotar sem `PROCV` |
| D5 | Subtotal desligado nas colunas monetárias do documento na aba ② | A repetição por linha causaria dupla contagem |
| D6 | Botão novo separado; botão antigo apenas renomeado | Zero risco de regressão no fluxo de simulações já validado |
| D7 | Infraestrutura de planilha extraída para `excel/workbookKit.ts` | Evita duplicar ~400 linhas de estilo e formatação entre os dois relatórios |
