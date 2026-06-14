# PROJECT_STATE.md

## Resumo Executivo

O **B.Smart PER/DCOMPs** esta em evolucao ativa sobre a branch `main`. A aplicacao importa arquivos `.xlsx` reais do e-CAC, reconstrui cadeias relacionais, preserva valores `...Original`, executa simulacoes de debitos, exibe rastreabilidade por PER/DCOMP e usa uma camada normativa consultiva para status, SELIC e vedacoes.

Estado verificado em 2026-06-14:

- `npm test`: aprovado, 15 arquivos de teste e 62 testes.
- `npm run lint`: aprovado.
- `npm run build`: aprovado, com avisos nao bloqueantes de plugin timing e chunk acima de 500 kB.

## O Que Ja Esta Implementado e Funcional

- **Importacao de planilha:** leitura de `.xlsx` do e-CAC nas abas de processamento e debitos, usando `xlsx`.
- **Processamento em Web Worker:** `UploadComponent.tsx` delega parse e primeiro recalculo para `src/workers/excelWorker.ts`.
- **Fallback local de importacao:** se o Worker falhar, o upload tenta `src/services/importPipeline.ts` no thread principal e retorna mensagem mais acionavel.
- **Motor de linhagem:** `ExcelParser.ts` forma cadeias relacionais e preserva metadados importados, classificacoes consultivas e `ImportQualityReport`.
- **Recalculo em cascata:** `CalculoService.ts` recalcula saldos, chama `calcularSelicRastreavel(...)` quando aplicavel e usa fallback historico quando faltam dados normativos suficientes.
- **Classificacao consultiva:** `src/services/normativo/` contem regras de credito, status, cascata, datas, SELIC, vedacoes e guards de `...Original`.
- **Rastreabilidade na UI:** `TimelineCascata.tsx` integra `RastreabilidadePanel` e `StatusBadge`, com tooltips de status, papel na cadeia, SELIC, origem e dados ausentes.
- **Modal de debitos:** permite edicao controlada de debitos vigentes/editaveis e visualizacao somente leitura para documentos bloqueados ou nao vigentes.
- **Persistencia local:** Zustand persiste cadeias, empresa, simulacoes e qualidade de importacao via `idb-keyval`/IndexedDB na chave `bsmart-perdcomp-storage`; ha fallback em memoria quando IndexedDB nao existe.
- **Relatorio PDF:** `ReportGeneratorService.ts` gera PDF consolidado com capa, KPIs, premissas/metodologia, alertas, edicoes manuais, efeitos colaterais, DCOMPs hipoteticas e origem/metodo/status por valor quando o snapshot possui rastreabilidade.
- **Testes automatizados:** Vitest cobre servicos normativos, parser com planilhas reais, store de qualidade de importacao, rastreabilidade, PDF e tooltips.

## Parcialmente Implementado

- **Exportacao de resultados:** PDF existe e foi ampliado com premissas/metodologia; exportacao Excel continua no backlog.
- **SELIC normativa:** `SelicService` esta integrado ao recalc de DCOMPs editadas quando `statusCalculo = normativo`; casos com dados ausentes ou taxa indisponivel continuam como `dados_insuficientes` ou `estimativa_historica`.
- **Vedacoes:** `VedacaoCompensacaoService` existe em modo consultivo, incluindo alerta DCTFWeb/previdenciario por PA do credito, mas nao deve ser tratado como matriz normativa completa.
- **Rastreabilidade de valores:** snapshots salvos carregam `rastreabilidadeValores` por DCOMP; ainda falta expandir o contrato para Excel futuro e refinar a ergonomia visual do PDF.

## Ainda Nao Iniciado

- **Exportacao Excel:** gerar `.xlsx` com abas `Resumo`, `Premissas`, `Cascata`, `Debitos`, `SELIC`, `StatusVigencia` e `Evidencias`.
- **Backend/sincronizacao:** nao ha backend, multiusuario ou sincronizacao entre maquinas.
- **Versionamento de schema persistido:** IndexedDB reduziu o risco de cota, mas ainda falta migracao/versionamento formal de objetos persistidos.

## Bugs Conhecidos e Limitacoes Atuais

- Nenhum bug funcional bloqueante conhecido apos a validacao de 2026-06-14.
- O estado continua local ao navegador/dispositivo; limpar dados do site, trocar de navegador/maquina ou mudar schema sem migracao pode exigir reimportacao.
- Recalculos pos-edicao ainda podem percorrer cadeias inteiras no thread principal.
- Credito judicial sem componentes continua exigindo dado complementar para resultado normativo.
- PDF melhorou a metodologia, mas ainda precisa expandir origem de valor e status de calculo por documento/debito.

## Riscos Tecnicos e Dividas

- **Performance:** planilhas muito maiores que as reais atuais podem exigir mover recalculo pos-edicao para Worker.
- **Schema persistido:** objetos antigos em IndexedDB podem ficar incompativeis se o modelo mudar sem migracao.
- **Tipagens em `xlsx`:** a biblioteca converte linhas em estruturas flexiveis; mudancas de cabecalho da RFB podem exigir mapeamento mais defensivo.
- **Bundle de relatorio:** `jspdf`, `html2canvas` e pipeline de importacao geram chunks grandes; o build passa, mas Vite alerta sobre chunk acima de 500 kB.
- **Normativo:** catalogos consultivos ainda nao equivalem a bloqueios duros; qualquer endurecimento exige fonte oficial, hipotese, impacto e caso de validacao.

## Proximos Passos Recomendados

1. Definir versionamento/migracao do schema persistido em IndexedDB, considerando snapshots antigos sem `rastreabilidadeValores`.
2. Planejar exportacao Excel auditavel usando o contrato de rastreabilidade por valor.
3. Refinar ergonomia visual do PDF se as celulas ficarem densas em cadeias grandes.
4. Avaliar code splitting para reduzir warnings de chunk.
