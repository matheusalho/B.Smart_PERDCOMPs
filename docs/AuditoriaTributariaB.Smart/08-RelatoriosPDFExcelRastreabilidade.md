# AUD-08 - Relatorios PDF/Excel e Rastreabilidade

## Descricao do Objeto

Auditar a capacidade dos relatorios de demonstrar, com clareza e rastreabilidade, os valores originais importados, valores simulados, deltas, status da cascata, impactos colaterais e premissas de calculo.

## Criticidade

Alta.

## Estado Atual

- Relatorio PDF consolidado implementado.
- PDF ja possui bloco inicial de premissas/metodologia e alertas globais.
- Relatorio Excel consolidado implementado com sete abas auditaveis e formatacao visual baseada no relatorio e-CAC.

### Rodada de Auditoria de 2026-06-07

Fontes tecnicas verificadas:

- `src/services/ReportGeneratorService.ts`, linhas 122 a 205, 247 a 275, 285 a 405 e 410 a 540.
- `src/components/TimelineCascata.tsx`, linhas 90 a 105, 211 a 221 e 360 a 378.
- `src/store.ts`, linhas 96 a 115 e 156 a 172.
- `src/models/types.ts`, linhas 81 a 98.

Leitura tecnica:

- O PDF gera capa, visao executiva, KPIs por simulacao, secoes de edicoes manuais, espelho de modificacoes colaterais e DCOMPs hipoteticas.
- O PDF compara valores anteriores e novos para credito detalhado, credito na data de transmissao, debitos compensados, credito original usado e saldo para proxima DCOMP.
- O snapshot de KPIs salvo em `SimulacaoSalva` armazena apenas numeros agregados, sem metodologia, fontes, hipoteses, dados ausentes ou versao da regra.
- A UI salva KPIs no momento do salvamento, mas nao persiste metadados de origem dos valores.
- `ReportGeneratorService.ts` usa rotulos como `Valores Anteriores (Originais)` e `Novos Valores Corretos`.
- Os campos "anteriores" misturam valores importados (`valorTotalCreditoDetalhadoOriginal`, `valorUtilizadoPerdcompOriginal`, debitos `...Original`) com valores calculados pelo motor (`saldoCreditoOriginalAnterior`) e valores esperados de divergencia (`divergenciaDetalhes?.esperado`).
- Os campos "novos" misturam valor simulado pelo usuario, valor recalculado pela cascata e, no estado atual, estimativa operacional de SELIC/fator historico, sem distinguir a metodologia.
- O relatorio nao inclui fonte normativa, status de calculo (`normativo`, `estimativa_historica`, `dados_insuficientes`, `vedado`), nem justificativa de status/bloqueio.
- DCOMPs hipoteticas aparecem em secao propria, mas sem declarar que o consumo atual e calculado por aproximacao operacional enquanto a engine SELIC normativa nao esta implementada.

### Atualizacao de Estado - 2026-06-14

O checkpoint `b4c779a` alterou parte do estado acima:

- `ReportGeneratorService.ts` ja adiciona uma "Declaracao de Premissas e Metodologia" ao PDF.
- O PDF ja consolida alertas globais de vedacao e indica quando ha estimativas/dados insuficientes em metadados de auditoria.
- O servico ja diferencia algumas informacoes de SELIC por `resultadoSelic`.

Ainda permanecem validos como lacuna:

- distincao completa entre importado, calculado, simulado, replicado e fallback;
- snapshot com versao de regra/tabela/fonte em granularidade suficiente;
- Excel auditavel.

### Atualizacao de Estado - Passo 1 de 2026-06-14

Implementado:

- `SimulacaoSalva.rastreabilidadeValores` registra valores por DCOMP em metadado separado.
- O PDF usa essa rastreabilidade para imprimir origem/metodo/status nas celulas de valores dos comparativos.
- `src/services/valueTraceability.ts` centraliza a classificacao de origem/metodo dos principais campos monetarios.

Lacunas remanescentes:

- Revisar ergonomia visual do PDF em cadeias grandes, pois as celulas passam a ser mais densas.
- Ampliar granularidade para todos os metadados de simulacao quando DCOMP hipotetica ganhar data auditavel completa.

### Atualizacao de Estado - Excel de 2026-06-22

Implementado:

- `src/services/ExcelReportGeneratorService.ts` gera o workbook exclusivamente a partir de `simulacoesSalvas`, sem recalcular valores tributarios.
- O arquivo possui as abas `Projeção Retificações Cadeias`, `Resumo`, `Premissas`, `Debitos`, `SELIC`, `StatusVigencia` e `Evidencias`, nessa ordem.
- `Projeção Retificações Cadeias` e o roteiro operacional: cada campo monetario tem coluna `Atual` e `Correto`, o status informa a acao, e as colunas de campos, motivo e orientacao explicam o que transmitir.
- Valores atuais usam cabecalho cinza `#C8C8C8`; valores corretos usam cabecalho verde `#64C864`.
- Indicador de credito, status tecnico e IDs internos permanecem no workbook para auditoria, mas ficam ocultos por padrao na primeira aba para reduzir ruido operacional.
- Documentos nao vigentes recebem `IGNORAR - NÃO VIGENTE` antes de qualquer classificacao de retificacao. `Recálculo em Cascata` permanece motivo de `A RETIFICAR` mesmo sem edicao manual quando o snapshot registra a divergencia.
- Datas, competencias, moedas, percentuais, CNPJ e identificadores sao gravados como tipos Excel apropriados.
- O perfil visual codifica o padrao de `Sheets/Relatorio de Analise eCAC_06.06.26.xlsx`: Segoe UI 11, margem em A, totais `SUBTOTAL` na linha 2, cabecalho azul na linha 4, dados na linha 5, filtros, bordas, gridlines ocultas e congelamento em `B5`.
- `exceljs` e carregado dinamicamente apenas quando o usuario aciona `Exportar Excel`; `xlsx` permanece exclusivo da importacao.
- Snapshots antigos sem SELIC, status consultivo ou `rastreabilidadeValores` continuam exportaveis, com campos indisponiveis em branco e evidencia explicita da ausencia.

## Codigo Relacionado

- `src/services/ReportGeneratorService.ts`
- `src/services/ExcelReportGeneratorService.ts`
- `src/components/TimelineCascata.tsx`
- `src/components/CascataKpis.tsx`
- `src/App.tsx`

## Fragilidades Possiveis

- Relatorio pode omitir metodologia de calculo.
- Pode haver confusao entre saldo original restante anterior e novo.
- Snapshots antigos podem gerar lacunas em SELIC, status e evidencias; o relatorio deve manter essas ausencias explicitas, sem inferir dados.
- DCOMPs hipoteticas precisam ser claramente identificadas.

## Achados da Rodada

### ACH-016 - PDF ganhou granularidade inicial de metodologia, fonte normativa e status do calculo

- Objeto relacionado: AUD-01, AUD-04, AUD-05, AUD-07, AUD-08, AUD-09.
- Criticidade: Alta.
- Evidencia tecnica:
  - `ReportGeneratorService.ts`, linhas 196 a 205, 247 a 261, 285 a 405 e 410 a 540.
  - `TimelineCascata.tsx`, linhas 90 a 105.
- Descricao:
  - O PDF possui bloco global de premissas/metodologia e, desde o Passo 1, passa a imprimir origem/metodo/status por valor quando o snapshot possui `rastreabilidadeValores`.
- Risco:
  - O usuario pode interpretar uma estimativa operacional como calculo SELIC normativo.
  - O relatorio pode ser usado sem evidenciar premissas, fontes, dados ausentes ou risco residual.
- Diretriz:
  - Criar secao obrigatoria de "Premissas e Metodologia" por relatorio e por cadeia.
  - Exibir `statusCalculo`, `metodo`, `fonteNormativa`, `hipoteses`, `dadosAusentes` e versao da regra quando disponiveis.

### ACH-017 - Rotulos do PDF misturam valor importado, calculado e simulado

- Objeto relacionado: AUD-04, AUD-05, AUD-08.
- Criticidade: Alta.
- Evidencia tecnica:
  - `ReportGeneratorService.ts`, linhas 326 a 358 e 432 a 463.
  - `CalculoService.ts`, linhas 152 a 207, conforme AUD-04.
- Descricao:
  - A secao `Valores Anteriores (Originais)` inclui valores de natureza distinta: importados, calculados historicos e valores esperados/calculados de divergencia.
  - A secao `Novos Valores Corretos` atribui certeza normativa a resultados que podem decorrer de simulacao do usuario, replicacao para UI ou fator historico de SELIC.
- Risco:
  - Perda de auditabilidade por nomenclatura imprecisa.
  - Confusao entre base RFB e resultado do motor.
- Diretriz:
  - Trocar a matriz conceitual para quatro classes de valor:
    - `Importado da RFB`;
    - `Calculado pelo motor`;
    - `Simulado pelo usuario`;
    - `Exibido/formatado na UI`.
  - Evitar o rotulo `Correto` quando o metodo for estimativo ou pendente de validacao normativa.

### ACH-018 - Snapshot salvo nao preserva contexto de auditoria da simulacao

- Objeto relacionado: AUD-07, AUD-08, AUD-09.
- Criticidade: Media.
- Evidencia tecnica:
  - `models/types.ts`, linhas 81 a 98.
  - `TimelineCascata.tsx`, linhas 90 a 105.
- Descricao:
  - `KpiSnapshot` e `SimulacaoSalva` guardam valores e DCOMPs, mas nao registram versao de regra, data da tabela SELIC, fontes normativas, hipoteses nem dados ausentes.
- Risco:
  - Uma simulacao salva antes da implementacao normativa pode ser confundida com uma simulacao gerada por regra posterior.
  - O PDF pode perder a capacidade de explicar por que determinado valor foi calculado de certa forma.
- Diretriz:
  - Adicionar no futuro bloco `auditoriaCalculo` ou `metadadosRelatorio`, preservado no snapshot da simulacao salva.

### ACH-026 - Excel consolidado preserva snapshots e rastreabilidade sem recalculo

- Objeto relacionado: AUD-05, AUD-08, AUD-09.
- Criticidade: Alta.
- Evidencia tecnica:
  - `src/services/ExcelReportGeneratorService.ts`.
  - `src/services/__tests__/ExcelReportGeneratorService.test.ts`.
  - `src/App.tsx`.
- Descricao:
  - O exportador consolida simulacoes salvas em sete abas e nao consulta o estado transitivo das cadeias para substituir os snapshots.
  - Valores originais, recalculados e deltas permanecem em colunas separadas; evidencias registram rastreabilidade por valor e fontes normativas disponiveis.
  - O perfil visual e-CAC e os formatos Excel sao validados por teste automatizado.
- Risco residual:
  - Snapshots antigos podem nao conter metadados opcionais criados em versoes posteriores.
- Diretriz:
  - Manter compatibilidade defensiva e nao reconstruir retroativamente dados ausentes.

### ACH-027 - Roteiro operacional explicita o campo, o valor correto e a causa da retificacao

- Objeto relacionado: AUD-04, AUD-05, AUD-06, AUD-08, AUD-09.
- Criticidade: Alta.
- Evidencia tecnica:
  - `src/services/ExcelReportGeneratorService.ts`.
  - `src/services/__tests__/ExcelReportGeneratorService.test.ts`.
- Descricao:
  - A antiga aba `Cascata` nao evidenciava a divergencia real em simulacoes sem edicao manual porque exportava o mesmo valor mutavel como original e recalculado.
  - A primeira aba agora usa `divergenciaDetalhes.esperado/calculado`, campos `...Original` e saldos historico/calculado ja preservados no snapshot para formar pares `Atual`/`Correto`.
  - O status operacional separa `A RETIFICAR`, `IGNORAR - NÃO VIGENTE`, bloqueios, hipoteticas e documentos sem retificacao.
- Diretriz:
  - Nao criar regra tributaria dentro do Excel; o roteiro deve somente traduzir o snapshot salvo em instrucao operacional rastreavel.

## Perguntas de Auditoria

- Quais campos sao indispensaveis para uso por advogado tributarista?
- O relatorio deve declarar se o calculo e normativo validado ou estimativa?
- Como evidenciar fonte normativa por tipo de credito?
- Quais novos metadados de DCOMP hipotetica devem ser preservados em snapshots futuros?

## Possiveis Solucoes

- Criar secao de premissas e metodologia no PDF.
- Incluir legenda de tipos de valor: importado, calculado, simulado.
- Manter o Excel com sete abas auditaveis e a primeira aba orientada a retificacoes; ampliar colunas somente quando o snapshot passar a preservar novo metadado.
- Gerar identificadores de caso de auditoria para rastrear simulacoes.

## Desenho Tecnico Proposto

### PDF

Complementar o bloco ja existente de premissas/metodologia com:

- legenda de classes de valor;
- aviso de que, ate a implementacao de `SelicService`, DCOMPs editadas/hipoteticas usam estimativa operacional quando nao houver calculo normativo;
- fontes normativas relevantes por tipo de credito;
- dados ausentes que impediram calculo normativo;
- versao/data da tabela SELIC usada, quando houver;
- lista de documentos nao vigentes/bloqueados e motivo classificado por `StatusRulesService`.

Renomear secoes conceituais:

- `Valores importados/anteriores e calculados historicos`, em vez de `Valores Anteriores (Originais)`, quando a tabela misturar campos importados e calculados.
- `Valores simulados/recalculados`, em vez de `Novos Valores Corretos`, ate que cada resultado traga `statusCalculo = normativo`.

### Excel implementado

Exportacao implementada com abas minimas:

| Aba | Conteudo | Observacao de auditoria |
| --- | --- | --- |
| `Projeção Retificações Cadeias` | status operacional, campos a retificar, motivo, orientacao e pares atual/correto por PER/DCOMP | `A RETIFICAR` exige retificadora; nao vigente deve ser ignorada. |
| `Resumo` | empresa, cadeias exportadas, data de emissao, versao da regra, status geral | Deve indicar se ha estimativas ou dados insuficientes. |
| `Premissas` | fontes normativas, tabela SELIC, hipoteses, escopo negativo de IPI, status de calculo | Nao pode ser opcional. |
| `Debitos` | debitos originais, simulados, deltas, principal/multa/juros | Preservar `...Original`. |
| `SELIC` | tipo de credito, termo inicial/final, taxa, dados usados, dados ausentes | So preencher como normativo se regra e dados estiverem completos. |
| `StatusVigencia` | classificacao de vigencia, bloqueio, cancelabilidade e vedacao normativa | Deve usar o mesmo catalogo da UI/PDF. |
| `Evidencias` | referencias a manuais, atos normativos, casos CT/FX aplicaveis | Facilita revisao por advogado tributarista. |

### Snapshot de simulacao

Adicionar futuramente metadados no snapshot:

```ts
type MetadadosAuditoriaRelatorio = {
  versaoMotorCalculo: string;
  statusCalculoGlobal: 'normativo' | 'estimativa_historica' | 'parcial' | 'dados_insuficientes';
  fontesNormativas: FonteNormativa[];
  tabelaSelic?: {
    fonte: string;
    emitidaEm?: string;
    coberturaAte?: string;
  };
  hipoteses: string[];
  dadosAusentes: string[];
};
```

## Criterios de Aceite

- PDF continua passando no fluxo funcional.
- Exportacao Excel preserva campos originais e deltas.
- Relatorio explica qualquer estimativa ou regra nao validada.
- No roteiro Excel, `Correto` identifica o valor esperado preservado no snapshot; status, premissas e evidencias devem explicitar quando o metodo for estimativo ou tiver dados insuficientes.
- Cada valor recalculado informa origem/metodo ou aponta explicitamente que o metadado ainda nao existe.
- DCOMP hipotetica aparece como simulada e estimada, salvo quando houver calculo normativo completo.
