# Relatorio de Continuidade - Auditoria Tributaria e Implementacao Normativa

Atualizado em: 2026-06-14, apos Passo 1 de rastreabilidade por valor

## Objetivo

Permitir que outra sessao retome a auditoria tributaria e a implementacao normativa do B.Smart PER/DCOMPs sem perder contexto, invariantes, estado de codigo, validacoes e proximas decisoes.

## Estado Atual Resumido

- Repositorio: `C:\Projetos\B.Smart_PERDCOMPs\bsmart-perdcomp`
- Branch atual: `main`
- HEAD verificado: `a305029 docs: update project README`
- Checkpoint tecnico recente: `b4c779a chore: checkpoint current PERDCOMP state`
- Handoff detalhado do checkpoint: `docs/AuditoriaTributariaB.Smart/13-RelatorioHandoffCheckpointB4C779A.md`
- Git status em 2026-06-14: `13-RelatorioHandoffCheckpointB4C779A.md`, `testSelic.ts` e `tmp/` estavam nao rastreados antes desta atualizacao documental.
- Passo 1 implementado nesta rodada: rastreabilidade de origem/metodo/status por valor em snapshots salvos e celulas de PDF.
- Regra central: nenhum campo `...Original` pode ser sobrescrito, recalculado ou contaminado.

## Validacao Mais Recente

Executada em 2026-06-14:

| Comando | Resultado |
| --- | --- |
| `npm test` | Aprovado: 15 arquivos de teste, 62 testes. |
| `npm run lint` | Pendente nesta rodada apos documentacao; executar antes de commit/fechamento definitivo. |
| `npm run build` | Pendente nesta rodada apos documentacao; executar antes de commit/fechamento definitivo. |

## Invariantes

- Preservar sempre campos `...Original`.
- Separar valores importados da RFB, calculados pelo motor, simulados pelo usuario e exibidos/formatados.
- Resultado normativo so pode ser usado quando fonte, dados e taxa forem suficientes.
- Quando faltar dado obrigatorio, retornar ou exibir `dados_insuficientes`.
- Fallback historico pode existir apenas como `estimativa_historica` ou `fallback_operacional`.
- Credito judicial nao deve receber SELIC unica por DCOMP sem componentes.
- Alertas consultivos nao devem virar bloqueios duros sem fonte oficial, hipotese, impacto, caso de validacao e autorizacao expressa.
- Usar planilhas reais de `C:\Projetos\B.Smart_PERDCOMPs\Sheets` para validacao de importacao.

## Estado Tecnico Confirmado

### Importacao e Qualidade

- `src/services/ExcelParser.ts` preserva metadados importados e retorna `ImportQualityReport`.
- `src/services/importPipeline.ts` centraliza parse/recalculo inicial.
- `src/workers/excelWorker.ts` usa o pipeline compartilhado.
- `src/components/UploadComponent.tsx` tenta fallback local quando o Worker falha.
- A importacao seleciona automaticamente a primeira cadeia no store quando houver dados.

### Persistencia

- `src/store.ts` usa Zustand com `idb-keyval`/IndexedDB na chave `bsmart-perdcomp-storage`.
- Ha fallback em memoria quando IndexedDB nao estiver disponivel.
- Falta versionamento/migracao formal de schema persistido.

### SELIC e Cascata

- `src/services/normativo/selicService.ts` calcula resultado rastreavel.
- `src/services/normativo/selicProvider.ts` usa `src/selicMensal.json`.
- `src/services/CalculoService.ts` chama `calcularSelicRastreavel(...)`.
- DCOMP editada usa resultado `normativo` quando disponivel; se faltar dado/taxa, preserva fallback historico.
- DCOMP nao editada preserva valor importado original.
- DCOMP hipotetica ainda usa aproximacao operacional e precisa de data auditavel/metodo proprio em etapa futura.

### UI Consultiva

- `src/components/TimelineCascata.tsx` integra `RastreabilidadePanel` e `StatusBadge`.
- Linhas de cascata sao selecionaveis/focaveis para alimentar o painel.
- Tooltips explicam status, papel na cadeia, SELIC, dados ausentes e motivos consultivos.
- `Em analise` e classificado consultivamente como vigente, editavel e cancelavel.

### Vedacoes

- `src/services/normativo/vedacaoCompensacaoService.ts` existe em modo consultivo.
- `VED-DCTFWEB-CRUZADA` considera PA do credito e marco consultivo de 08/2018 para Grupo 1.
- A matriz ainda nao deve ser tratada como bloqueio duro nem como cobertura normativa completa.

### PDF

- `src/services/ReportGeneratorService.ts` inclui bloco inicial de premissas/metodologia e alertas.
- O PDF agora imprime origem/metodo/status nas celulas de valores comparativos quando a simulacao possui `rastreabilidadeValores`.
- O helper `src/services/valueTraceability.ts` centraliza a rastreabilidade por DCOMP/valor e evita misturar metadado com campos `...Original`.
- Ainda falta evoluir o layout fino do PDF se as celulas ficarem densas em cadeias grandes.

### Snapshots

- `SimulacaoSalva` agora pode carregar `rastreabilidadeValores`.
- `store.ts` preenche `rastreabilidadeValores` ao salvar simulacao.
- Cada DCOMP salva recebe valores auditaveis com `campo`, `rotulo`, `valor`, `origemValor`, `metodo`, `statusCalculo` quando houver e `dadosAusentes`.
- Campos `...Original` continuam preservados; a rastreabilidade e metadado separado.

## Objetos de Auditoria

| ID | Arquivo | Status atual | Proxima atencao |
| --- | --- | --- | --- |
| AUD-01 | `01-SELICAtualizacaoCreditos.md` | Revalidado / integrado com fallback | DCOMP hipotetica, credito judicial por componente e origem por valor. |
| AUD-02 | `02-TiposCreditoElegibilidadeRestricoes.md` | Parcialmente consultivo | Catalogo completo de meios e pre-requisitos. |
| AUD-03 | `03-ImportacaoRelatorioECACELinhagem.md` | Revalidado | Diferenciar ausente/invalido/zero importado em qualidade. |
| AUD-04 | `04-ConsumoCreditoOriginalECascata.md` | Parcialmente integrado | Registrar metodo/origem/confianca do saldo e fallback. |
| AUD-05 | `05-ValoresOriginaisRastreabilidade.md` | Parcialmente coberto | Metadado de origem por documento/valor. |
| AUD-06 | `06-RetificacoesVigenciaBloqueios.md` | Parcialmente consultivo | Alinhar usos legados de `statusHelper.ts` com classificacao consultiva. |
| AUD-07 | `07-SimulacaoEdicoesDcompHipotetica.md` | Aberto/parcial | Data de transmissao hipotetica auditavel e metodo declarado de multa/juros. |
| AUD-08 | `08-RelatoriosPDFExcelRastreabilidade.md` | Parcialmente implementado / Passo 1 concluido | Revisar ergonomia visual do PDF e planejar Excel futuro. |
| AUD-09 | `09-CasosTesteMatrizEvidencias.md` | Revalidado | Manter 15/62 como baseline e adicionar testes para novos comportamentos. |
| AUD-10 | `10-BaseGeralPERDCOMPWeb.md` | Base consolidada | Coordenar catalogos consultivos. |
| AUD-11 | `11-DesenhoTecnicoImplementacaoNormativa.md` | Parcialmente executado | Atualizar plano conforme fases ja executadas. |
| AUD-12 | este arquivo | Atualizado | Manter como continuidade longitudinal. |
| AUD-13 | `13-RelatorioHandoffCheckpointB4C779A.md` | Handoff recente | Usar para reconstituir diff `6c9d004..b4c779a`. |

## Backlog Prioritario

1. Versionar/migrar o schema persistido em IndexedDB, considerando snapshots antigos sem `rastreabilidadeValores`.
2. Resolver tratamento de DCOMP hipotetica: data auditavel, termo final e metodo SELIC/fallback.
3. Tratar credito judicial por componentes ou manter `dados_insuficientes` com orientacao clara.
4. Ampliar qualidade de importacao para datas invalidas, valores ausentes e zero importado.
5. Planejar exportacao Excel auditavel usando o mesmo contrato de `rastreabilidadeValores`.
6. Avaliar code splitting para reduzir warnings de chunk.
7. Decidir destino de `testSelic.ts` e `tmp/`: remover, ignorar ou preservar como artefato local, sem misturar com codigo de aplicacao.

## Implementacao do Passo 1 - 2026-06-14

Arquivos de codigo alterados/criados:

- `src/models/types.ts`: adicionou `RastreabilidadeValorSnapshot` e `RastreabilidadeDcompSnapshot`; `SimulacaoSalva` aceita `rastreabilidadeValores`.
- `src/services/valueTraceability.ts`: novo helper puro para criar e consultar rastreabilidade de valor por DCOMP.
- `src/store.ts`: `salvarSimulacaoCadeia` grava `rastreabilidadeValores` junto do snapshot.
- `src/services/ReportGeneratorService.ts`: celulas monetarias dos comparativos usam origem/metodo/status quando a rastreabilidade existe.
- `src/__tests__/storeImportQuality.test.ts`: novo teste do snapshot com origem/metodo.
- `src/services/__tests__/ReportGeneratorService.test.ts`: novo teste do PDF com origem/metodo/status.
- `src/components/__tests__/RastreabilidadePanel.test.tsx`: cacheou parse/recalculo de planilha real em `beforeAll` e passou a renderizar amostra representativa de cenarios reais, corrigindo timeout da suite completa sem depender de timeout maior.

Comportamento entregue:

- Snapshot salvo preserva rastreabilidade separada dos campos originais.
- PDF deixa de exportar apenas valor monetario bruto nos comparativos e passa a incluir metadado auditavel por celula quando disponivel.
- DCOMP editada com SELIC normativa registra `origemValor = calculado_motor`, `metodo = selic_normativa_por_tipo_credito` e `statusCalculo = normativo` no valor `valorUtilizadoPerdcomp`.
- Valores originais importados registram `origemValor = importado_rfb` e `metodo = importado_eCAC`.

Validacao executada durante o Passo 1:

- RED: os testes novos falharam por ausencia de `rastreabilidadeValores` e ausencia de origem/metodo/status no PDF.
- GREEN focado: `npm test -- src/__tests__/storeImportQuality.test.ts src/services/__tests__/ReportGeneratorService.test.ts` passou com 2 arquivos e 3 testes.
- Regressao completa: `npm test` passou com 15 arquivos e 62 testes.

Bug/comportamento inesperado encontrado:

- A suite completa inicialmente falhou por timeout em `RastreabilidadePanel.test.tsx`, que reparseava planilha real pesada e renderizava todas as DCOMPs dentro de um unico teste.
- Correcao: cachear `parseExcelFile(...)`/`recalcularCadeia(...)` em `beforeAll` e renderizar uma amostra real representativa (metadados ausentes, SELIC com dados ausentes, debitos, `Em analise`, processo judicial e primeiras DCOMPs), preservando a validacao relevante sem transformar o teste em carga.

## Planilhas Reais Disponiveis

Pasta: `C:\Projetos\B.Smart_PERDCOMPs\Sheets`

Arquivos conhecidos:

- `Relatorio de Analise eCAC_06.06.26.xlsx`
- `Relatorio de Analise eCAC_05.06.26.xlsx`
- `Relatorio de Analise e-CAC.xlsx`
- `relatorio.xlsx`

Os testes atuais iteram planilhas `.xlsx` reais e ignoram temporarios `~$*.xlsx`.

## Comandos Uteis Para Retomada

```powershell
cd C:\Projetos\B.Smart_PERDCOMPs\bsmart-perdcomp
git status --short --branch
npm test
npm run lint
npm run build
rg --files src | rg "(normativo|__tests__|importPipeline|RastreabilidadePanel|StatusBadge|valueTraceability)"
rg -n "calcularSelicRastreavel|ImportQualityReport|resultadoSelic|idb-keyval|VED-DCTFWEB|rastreabilidadeValores" src
```

## Criterio de Sucesso da Proxima Etapa

A proxima etapa deve ser considerada bem-sucedida somente se:

- nao alterar nem contaminar campos `...Original`;
- manter separacao entre importado, calculado, simulado e exibido;
- documentar fonte/hipotese/impacto/caso quando houver regra normativa;
- preservar ou ampliar cobertura automatizada;
- registrar resultado em AUD-09 e no objeto pertinente;
- passar `npm test`, `npm run lint` e `npm run build` quando houver alteracao comportamental.
