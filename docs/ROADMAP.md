# ROADMAP.md

## Alta Prioridade

1. **Rastreabilidade completa de valores em UI/PDF**
   - Expandir metadados de origem/metodo para valores importados, calculados, simulados, replicados e fallback.
   - Priorizar PDF e snapshots de simulacao antes de exportacao Excel.

2. **Auditoria normativa guiada por tipo de credito**
   - Continuar usando os manuais oficiais em `Knowledge/` e atos normativos citados.
   - Ampliar catalogos consultivos de meios, vedacoes, status processual, SELIC e qualidade de importacao.

3. **Versionamento do estado persistido**
   - Definir migracao/limpeza controlada para objetos em IndexedDB (`bsmart-perdcomp-storage`).
   - Evitar hidratacao silenciosa de snapshots antigos incompativeis.

## Media Prioridade

1. **Relatorio PDF**
   - O PDF ja possui bloco inicial de premissas/metodologia, mas ainda deve detalhar origem e status de calculo por documento/debito.
   - Validar fluxo "salvar simulacao -> relatorio consolidado" apos qualquer alteracao de calculo, UI ou snapshot.

2. **Tratamento de excecoes de importacao**
   - O upload possui fallback local quando o Worker falha.
   - Ainda falta fortalecer mensagens para colunas ausentes, datas invalidas, valores ausentes e zero importado.

3. **Performance**
   - Avaliar mover recalculo pos-edicao para Worker se aparecerem cadeias maiores que as planilhas reais atuais.

## Concluido Recentemente

- `npm test` passa com 15 arquivos e 62 testes.
- `npm run lint` passa.
- `npm run build` passa com avisos nao bloqueantes de chunk/plugin timing.
- Persistencia passou a usar IndexedDB via `idb-keyval`.
- Upload possui fallback local via `importPipeline`.
- UI ganhou `RastreabilidadePanel`, `StatusBadge` e tooltips consultivos.
- Regra consultiva `Em analise` foi implementada como vigente, editavel e cancelavel.
- Snapshots e PDF ganharam rastreabilidade de origem/metodo/status por valor.

## Backlog de Longo Prazo

- **Exportacao Excel (.xlsx) da simulacao:** abas minimas `Resumo`, `Premissas`, `Cascata`, `Debitos`, `SELIC`, `StatusVigencia` e `Evidencias`.
- **Backend opcional:** salvar sessoes de trabalho e simulacoes para compartilhamento controlado, sem perder a vantagem de processamento local de dados fiscais.
- **Code splitting:** reduzir chunks grandes ligados a PDF/importacao.

## Sequencia Recomendada de Trabalho

1. Ler `AGENTS.md` e `docs/AuditoriaTributariaB.Smart/13-RelatorioHandoffCheckpointB4C779A.md`.
2. Conferir `git status --short --branch`.
3. Antes de alterar comportamento, localizar a regra em `ExcelParser.ts`, `CalculoService.ts`, `store.ts`, UI e `services/normativo/`.
4. Nunca sobrescrever, recalcular ou contaminar campos `...Original`.
5. Para regra normativa, registrar fonte oficial, hipotese, impacto e caso de validacao.
6. Rodar `npm test`, `npm run lint` e `npm run build` antes de concluir alteracao comportamental.
