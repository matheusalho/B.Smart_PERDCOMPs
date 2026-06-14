# DECISIONS.md

Este documento registra decisoes arquiteturais relevantes. Nao reverta estas decisoes sem justificativa tecnica e nova validacao.

## 1. Tratamento e Ordenacao da Cadeia Relacional

- **Contexto:** DCOMPs retificadoras substituem originais, e a RFB pode trazer documentos com mesma data de transmissao.
- **Decisao:** Calcular profundidade de linhagem por mapa de retificacao/cancelamento, mantendo predecessores antes de sucessores.
- **Consequencia:** A tabela de cascata preserva ordem familiar/contabil mais robusta que uma ordenacao simples por data.

## 2. Tratamento de Documentos Bloqueados

- **Contexto:** Documentos com situacao fechada ou bloqueada nao devem ser tratados como livremente editaveis.
- **Decisao:** Usar helpers de status e classificacao consultiva para separar vigencia, bloqueio, cancelabilidade e status de cascata.
- **Consequencia:** A UI pode permitir leitura, bloquear edicao e explicar o motivo sem excluir o documento do historico.

## 3. Parsing e Formatacao de Datas do Excel

- **Contexto:** Relatorios e-CAC podem trazer datas como serial Excel ou texto.
- **Decisao:** Converter periodos/datas no parser e em pontos de exibicao quando necessario.
- **Consequencia:** Reduz exibicao de numeros seriais e problemas de timezone, mas datas normativas ainda devem preservar origem e ausencia.

## 4. CSS Proprio em Vez de Framework Pesado

- **Contexto:** O projeto segue paleta visual propria e ja possui `index.css`.
- **Decisao:** Manter CSS proprio com variaveis e componentes locais, sem Tailwind/Material UI.
- **Consequencia:** Menor acoplamento visual e menor risco de inflar a UI com dependencias de design.

## 5. Recalculo Baseado em Valores Originais

- **Contexto:** Edicoes de debitos podem acumular erros se recalculadas sobre valores ja mutados.
- **Decisao:** Recalcular proporcoes a partir de campos `...Original` e manter resultados simulados/calculados em campos separados.
- **Consequencia:** Comparativos antes/depois permanecem auditaveis.

## 6. Filtros Visuais na Tabela

- **Contexto:** Filtros como OK, a retificar e impedido misturam estado tecnico e capacidade de edicao.
- **Decisao:** Filtrar pela combinacao de status de cascata, vigencia e bloqueio, nao apenas pelo texto bruto da situacao.
- **Consequencia:** A UI fica mais proxima da leitura operacional do usuario.

## 7. Preservacao dos Campos `...Original`

- **Contexto:** O projeto depende de prova da base importada do e-CAC.
- **Decisao:** Campos com sufixo `...Original` nao devem ser sobrescritos por simulacoes, recalculos, fallback ou exibicao.
- **Consequencia:** Toda regra nova deve escrever em campos separados e declarar origem/metodo.

## 8. Relatorio PDF por Simulacoes Salvas

- **Contexto:** O usuario precisa consolidar cadeias selecionadas, nao necessariamente o estado transitÃ³rio da tela.
- **Decisao:** Gerar PDF a partir de `simulacoesSalvas`.
- **Consequencia:** O relatorio reflete intencao explicita de exportacao.

## 9. Exportacao Excel Adiada

- **Contexto:** PDF cobre o fluxo atual, enquanto Excel exige desenho proprio de abas, colunas e rastreabilidade.
- **Decisao:** Manter exportacao Excel no backlog.
- **Consequencia:** Quando implementada, deve seguir abas minimas `Resumo`, `Premissas`, `Cascata`, `Debitos`, `SELIC`, `StatusVigencia` e `Evidencias`.

## 10. Persistencia Local em IndexedDB

- **Contexto:** O volume de cadeias, debitos e metadados pode exceder o limite pratico de `localStorage`.
- **Decisao:** Persistir Zustand via `idb-keyval`/IndexedDB na chave `bsmart-perdcomp-storage`, com fallback em memoria quando IndexedDB nao existir.
- **Consequencia:** Reduz risco de cota, mas exige planejar versionamento/migracao de schema.

## 11. Pipeline Compartilhado de Importacao

- **Contexto:** Falhas de Worker eram pouco acionaveis.
- **Decisao:** Centralizar parse e primeiro recalculo em `src/services/importPipeline.ts`, usado pelo Worker e pelo fallback local.
- **Consequencia:** Falha de Worker nao bloqueia automaticamente o upload quando o processamento local ainda e possivel.

## 12. SELIC Rastreavel com Fallback

- **Contexto:** O motor precisava separar calculo normativo, estimativa historica e dados insuficientes.
- **Decisao:** `CalculoService.ts` chama `calcularSelicRastreavel(...)`; usa resultado normativo quando disponivel e preserva fallback historico identificado quando nao houver dados/taxa suficientes.
- **Consequencia:** A cascata pode usar SELIC normativa em cenarios cobertos sem contaminar `...Original` nem declarar conclusao normativa em caso incompleto.

## 13. Rastreabilidade e Badges Padronizados

- **Contexto:** A UI precisava explicar status, SELIC, papel na cadeia, vedacoes e dados ausentes de modo consistente.
- **Decisao:** Usar `RastreabilidadePanel`, `StatusBadge` e mensagens centralizadas em `tooltipMessages.ts`.
- **Consequencia:** Novos alertas devem reaproveitar esses componentes/utilitarios.
