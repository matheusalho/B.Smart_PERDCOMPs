# ARCHITECTURE.md

## Visao Geral

A aplicacao e uma SPA React/TypeScript com Vite. O processamento principal roda no cliente: upload de planilhas, parsing, reconstrucao de cadeias, recalculo de cascata, rastreabilidade e emissao de PDF. Nao ha backend no estado atual.

O desenho preserva a separacao entre:

- dados importados da RFB;
- valores calculados pelo motor;
- simulacoes do usuario;
- valores apenas exibidos/formatados na UI;
- resultados consultivos/normativos com fonte, metodo, hipoteses e dados ausentes.

## Modulos Principais

- `src/App.tsx`: casca da aplicacao, tema claro/escuro e composicao das telas principais.
- `src/store.ts`: store Zustand persistida via `idb-keyval`/IndexedDB na chave `bsmart-perdcomp-storage`, com fallback em memoria. Mantem empresa, cadeias, cadeia selecionada, simulacoes salvas e `ImportQualityReport`.
- `src/services/ExcelParser.ts`: parse de planilhas e-CAC, montagem de cadeias, preservacao de metadados importados, classificacoes consultivas e relatorio de qualidade.
- `src/services/importPipeline.ts`: pipeline compartilhado entre Worker e fallback local de upload.
- `src/workers/excelWorker.ts`: executa o pipeline de importacao fora da main thread.
- `src/services/CalculoService.ts`: recalculo da cascata. Usa `calcularSelicRastreavel(...)` e `selicProvider` quando ha dados suficientes; preserva fallback historico quando nao ha resultado normativo.
- `src/services/normativo/`: camada consultiva/normativa pura para tipos de credito, status, datas, SELIC, cascata, vedacoes e guards de `...Original`.
- `src/services/ReportGeneratorService.ts`: geracao de PDF consolidado, incluindo premissas/metodologia, alertas, comparativos e simulacoes.
- `src/components/TimelineCascata.tsx`: superficie principal de leitura da cadeia, filtros, KPIs, tabela, selecao de DCOMP e integracao do painel de rastreabilidade.
- `src/components/RastreabilidadePanel.tsx`: painel de dados importados e rastreabilidade da PER/DCOMP selecionada.
- `src/components/StatusBadge.tsx`: badge padronizado com tons e tooltips.
- `src/components/ModalEdicao.tsx`: edicao/visualizacao de debitos e indicadores de qualidade SELIC.
- `src/components/ModalHipotetica.tsx`: criacao de PER/DCOMP hipotetica.

## Fluxo de Dados

1. O usuario faz upload de uma planilha `.xlsx` em `UploadComponent`.
2. A tela cria `excelWorker.ts` e envia o `ArrayBuffer`.
3. O Worker chama `processExcelBuffer(...)`, que executa parser e primeiro recalculo.
4. Se o Worker falhar, `UploadComponent` encerra o Worker e tenta o mesmo pipeline no thread principal.
5. O store recebe cadeias, empresa e `ImportQualityReport`, seleciona a primeira cadeia e persiste o estado em IndexedDB.
6. `TimelineCascata` renderiza KPIs, tabela, alertas, badges e `RastreabilidadePanel`.
7. Ao editar debitos ou criar DCOMP hipotetica, a store cria copia da cadeia e chama `recalcularCadeia`.
8. `CalculoService` preserva `...Original`, usa SELIC normativa apenas quando disponivel e identifica fallback/insuficiencia quando necessario.
9. Simulacoes salvas entram em `simulacoesSalvas`; o PDF e gerado a partir desses snapshots, nao do estado transitÃ³rio em edicao.

## Persistencia

Persistencia atual:

- chave: `bsmart-perdcomp-storage`;
- engine preferencial: IndexedDB via `idb-keyval`;
- fallback: memoria quando `globalThis.indexedDB` nao existe.

Limite ainda aberto: nao ha versionamento/migracao formal do schema persistido. Mudancas estruturais futuras devem prever migracao ou limpeza controlada.

## Decisoes Arquiteturais Relevantes

- **Client-side first:** evita upload de dados fiscais sensiveis para backend no MVP.
- **Zustand:** mantem store simples e de baixo boilerplate.
- **IndexedDB:** substitui dependencia pratica de `localStorage` para volumes grandes.
- **Web Worker com fallback local:** reduz bloqueio de UI sem transformar falha de Worker em falha fatal de importacao.
- **Camada normativa pura:** regras consultivas/normativas ficam em `src/services/normativo/`, nao em componentes React.
- **PDF por snapshot salvo:** exportacao reflete simulacoes explicitamente salvas pelo usuario.
- **Campos `...Original` imutaveis:** simulacoes e calculos usam campos separados.

## Riscos e Fronteiras

- Recalculo pos-edicao ainda roda na main thread.
- Catalogos consultivos nao sao bloqueios duros sem validacao normativa adicional.
- Credito judicial sem componentes segue como `dados_insuficientes` para calculo normativo.
- Exportacao Excel permanece fora do comportamento atual.
