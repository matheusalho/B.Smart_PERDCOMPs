# ROADMAP.md

## Alta Prioridade

1. **Rastreabilidade completa de valores em UI/PDF/Excel**
   - Expandir metadados de origem/metodo para valores importados, calculados, simulados, replicados e fallback.
   - PDF, snapshots e Excel ja compartilham o contrato atual; falta ampliar casos de DCOMP hipotetica e metadados ainda nao preservados.

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

- `npm test` passa com 16 arquivos e 82 testes.
- `npm run lint` passa.
- `npm run build` passa com avisos nao bloqueantes de chunk/plugin timing.
- Persistencia passou a usar IndexedDB via `idb-keyval`.
- Upload possui fallback local via `importPipeline`.
- UI ganhou `RastreabilidadePanel`, `StatusBadge` e tooltips consultivos.
- Regra consultiva `Em analise` foi implementada como vigente, editavel e cancelavel.
- Snapshots e PDF ganharam rastreabilidade de origem/metodo/status por valor.
- Exportacao Excel consolidada foi implementada com sete abas auditaveis e perfil visual do relatorio e-CAC; a primeira aba e um roteiro de retificacoes com valores atuais/corretos, causa e orientacao por PER/DCOMP.
- `exceljs` e carregado dinamicamente em chunk proprio; `xlsx` permanece exclusivo da importacao.
- Ordenacao de cadeias passou a usar hora, minuto e segundo da aba `PERDCOMP Débitos` como desempate seguro, preservando linhagem e ordem de importacao como fallback.

## Backlog de Longo Prazo

- **Backend opcional:** salvar sessoes de trabalho e simulacoes para compartilhamento controlado, sem perder a vantagem de processamento local de dados fiscais.
- **Code splitting:** reduzir chunks grandes ligados a PDF, importacao e Excel.

## Sequencia Recomendada de Trabalho

1. Ler `AGENTS.md` e `docs/AuditoriaTributariaB.Smart/13-RelatorioHandoffCheckpointB4C779A.md`.
2. Conferir `git status --short --branch`.
3. Antes de alterar comportamento, localizar a regra em `ExcelParser.ts`, `CalculoService.ts`, `store.ts`, UI e `services/normativo/`.
4. Nunca sobrescrever, recalcular ou contaminar campos `...Original`.
5. Para regra normativa, registrar fonte oficial, hipotese, impacto e caso de validacao.
6. Rodar `npm test`, `npm run lint` e `npm run build` antes de concluir alteracao comportamental.
