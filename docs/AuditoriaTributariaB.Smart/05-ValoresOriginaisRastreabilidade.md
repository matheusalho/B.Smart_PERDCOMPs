# AUD-05 - Valores Originais e Rastreabilidade

## Descricao do Objeto

Auditar a preservacao dos valores importados da RFB e a separacao entre valores originais, calculados, simulados e exibidos.

## Criticidade

Critica.

## Invariante Central

Campos com sufixo `...Original` nao podem ser alterados por simulacao, recalculo, exportacao ou normalizacao posterior ao parse. Eles representam a base importada e auditavel.

## Campos a Mapear

- `valorPrincipalOriginal`
- `valorMultaOriginal`
- `valorJurosOriginal`
- `valorTotalOriginal`
- `valorTotalCreditoDetalhadoOriginal`
- `valorUtilizadoPerdcompOriginal`
- `dataTransmissaoOriginal`
- outros campos que venham a receber sufixo `...Original`

## Rodada AUD-05 em 2026-06-07 - Matriz de Rastreabilidade para SELIC

Fontes tecnicas lidas:

- `src/models/types.ts`
- `src/services/ExcelParser.ts`
- `src/store.ts`
- `src/services/CalculoService.ts`
- Cabecalhos da planilha real `Sheets/relatorio.xlsx`.

### Matriz atual de origem e mutabilidade

| Campo atual | Origem | Mutabilidade | Uso atual | Risco para SELIC |
| --- | --- | --- | --- | --- |
| `DebitoOficial.valorPrincipalOriginal` | Aba `PERDCOMP Debitos`, coluna `Valor Principal` | Imutavel apos parse | Evidencia do debito importado | Deve permanecer base RFB; simulacao altera `valorPrincipal`, nao o original. |
| `DebitoOficial.valorMultaOriginal` | Aba `PERDCOMP Debitos`, coluna `Valor Multa` | Imutavel apos parse | Evidencia de multa importada | Nao usar para recalculo normativo de acrescimos sem fonte. |
| `DebitoOficial.valorJurosOriginal` | Aba `PERDCOMP Debitos`, coluna `Valor Juros` | Imutavel apos parse | Evidencia de juros importados | Nao confundir juros do debito com SELIC do credito. |
| `DebitoOficial.valorTotalOriginal` | Aba `PERDCOMP Debitos`, coluna `Valor Total` | Imutavel apos parse | Total atualizado dos debitos importado | E a base para descapitalizacao historica quando nao editado. |
| `DCOMP.valorTotalCreditoDetalhadoOriginal` | Aba `Processamento PERDCOMP`, coluna `Valor Total do Credito Detalhado` ou `Valor Total do Credito` | Imutavel apos parse | Valor original/base do credito detalhado | Para IPI/PIS/Cofins, deve ser base importada/informada, nao recalculada por RAIPI. |
| `DCOMP.valorUtilizadoPerdcompOriginal` | Aba `Processamento PERDCOMP`, coluna `Valor Utilizado no Perdcomp` | Imutavel apos parse | Credito original usado conforme RFB | DCOMPs reais nao editadas devem preservar este valor. |
| `DCOMP.dataTransmissaoOriginal` | Inferida da linhagem: data da DCOMP ancestral original | Imutavel conceitual apos parse/linhagem | Cronologia e referencia de retificacao | Precisa de ajuste art. 157 em camada calculada, sem alterar a data importada. |
| `DCOMP.dataTransmissao` | Aba `Processamento PERDCOMP`, data real da linha | Imutavel apos parse | Ordenacao/retificadora | Nao deve substituir a referencia original em retificacao. |
| `DCOMP.valorCreditoDataTransmissao` | Aba `Processamento PERDCOMP`, coluna `Valor do Credito na Data de Transmissao` | Importado, mas hoje pode ser alterado em DCOMP hipotetica | Saldo/valor de entrada exibido | Separar `importado` de `calculado` para evitar mistura em simulacao. |
| `DCOMP.valorTotalCreditoDetalhado` | Importado inicialmente; pode ser alterado por `editarCreditoOriginal` | Mutavel | Simulacao/ajuste do usuario | Nome induz mistura com original; precisa metadado de origem. |
| `DCOMP.valorUtilizadoPerdcomp` | Importado inicialmente; recalculado em cascata | Mutavel calculado/simulado | Consumo recalculado | Deve ganhar metodologia (`historico`, `normativo`, `indisponivel`). |

### Campos existentes na planilha, mas ausentes no modelo

| Dado da planilha | Coluna e-CAC | Relevancia normativa | Diretriz |
| --- | --- | --- | --- |
| Data de arrecadacao do credito | `Data de Arrecadacao` | Termo inicial para pagamento indevido/maior e CPIM/GPS | Criar campo importado opcional, sem sufixo `Original` se for metadado de data, mas com origem RFB registrada. |
| Competencia do credito | `Competencia do Credito` ou `Competencia` | Termo inicial para retencao previdenciaria e alguns creditos previdenciarios | Criar campo importado opcional e parsing estruturado. |
| Tipo de competencia | `Tipo Competencia` | Interpreta competencia/periodicidade | Persistir como metadado importado. |
| Numero do pagamento | `Numero do Pagamento - DARF` | Evidencia do pagamento que gerou credito | Persistir para rastreabilidade. |
| Periodo de apuracao DARF | `Periodo de Apuracao do DARF` | Pode apoiar validacao de pagamentos | Persistir como metadado. |
| Processo judicial/habilitacao | `Processo Judicial`, `Processo de Habilitacao` | Pre-requisito e rastreabilidade de credito judicial | Persistir, mas nao inferir componentes judiciais. |
| Processo administrativo | `Processo Administrativo` | Pode indicar formalizacao/processo | Persistir como evidencia. |
| Inicio/fim do PA do credito | Aba `PERDCOMP Debitos`, `Inicio/Fim do Periodo de Apuracao do Credito` | Estruturar PA para saldo negativo | Considerar cruzamento por PER/DCOMP. |
| Total credito original utilizado por debito | Aba `PERDCOMP Debitos`, `Total Credito Original Utilizado` | Pode validar `valorUtilizadoPerdcompOriginal` e rateios | Auditar antes de usar; nao substituir valor principal sem reconciliacao. |

### Campos calculados recomendados

| Campo recomendado | Natureza | Finalidade |
| --- | --- | --- |
| `selicCalculo.status` | Calculado | `normativo`, `estimativa_historica`, `dados_insuficientes`, `vedado`. |
| `selicCalculo.taxaDecimal` | Calculado | Taxa normativa aplicada. |
| `selicCalculo.valorCreditoAtualizado` | Calculado | Valor atualizado pela SELIC. |
| `selicCalculo.creditoOriginalUtilizadoCalculado` | Calculado | Resultado da descapitalizacao normativa. |
| `selicCalculo.fonteNormativa` | Evidencia | Manual/IN/artigo usado. |
| `selicCalculo.hipoteses` | Evidencia | Hipoteses adotadas, como data de PER original resolvida por linhagem. |
| `selicCalculo.dadosAusentes` | Evidencia | Lista objetiva de dados faltantes para nao calcular por aproximacao silenciosa. |
| `selicCalculo.dataEntregaValoracao` | Calculado | Data ajustada pelo art. 157, sem alterar `dataTransmissaoOriginal`. |

### Diretriz de mutabilidade

- Campo importado da RFB pode ser normalizado no parse, mas nao recalculado depois.
- Campo com sufixo `...Original` so pode ser atribuido no parse inicial ou na criacao de artefato hipotetico claramente marcado como simulado.
- Ajuste de dia nao util do art. 157 deve gerar campo calculado separado; nao deve alterar `dataTransmissaoOriginal`.
- Quando dado normativo estiver ausente, registrar `dadosAusentes` e manter calculo como `dados_insuficientes`.

## Fragilidades Possiveis

- Sobrescrever campo original durante edicao manual.
- Usar campo original como fallback e perder distincao entre importado e calculado.
- Relatorio nao explicar quando um valor e simulado.
- Persistencia em `localStorage` hidratar estruturas antigas sem schema versionado.
- Novos campos de SELIC serem adicionados sem distinguir origem RFB, dado complementar do usuario e resultado calculado.
- Aplicar art. 157 sobrescrevendo data importada, em vez de criar data calculada de valoracao.

## Perguntas de Auditoria

- Qual e a origem de cada campo original?
- Quais campos podem ser alterados pelo usuario?
- Quais campos sao calculados pelo motor?
- Quais campos devem ser exportados como evidencia?
- Como diferenciar alteracao de credito raiz de valor importado original?

## Possiveis Solucoes

- Criar matriz de mutabilidade por campo.
- Adicionar camada de metadados de calculo.
- Versionar schema persistido.
- Validar no lint/teste que campos `...Original` nao sao atribuidos fora do parser/criacao de hipotetica.
- Criar tipo dedicado para metadados de importacao e outro para resultado de SELIC, evitando espalhar campos soltos em `DCOMP`.

## Criterios de Aceite

- Tabela de campos e mutabilidade completa.
- Nenhum ajuste tecnico futuro viola a preservacao dos originais.
- Relatorio mostra claramente original, novo e delta.
- Toda DCOMP com SELIC calculada possui status, fonte normativa, dados usados e dados ausentes.
