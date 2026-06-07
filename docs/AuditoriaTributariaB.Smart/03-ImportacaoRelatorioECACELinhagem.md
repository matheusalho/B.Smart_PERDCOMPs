# AUD-03 - Importacao do Relatorio e-CAC e Linhagem

## Descricao do Objeto

Auditar a importacao da planilha extraida do e-CAC, incluindo abas esperadas, colunas, normalizacao de datas e numeros, agrupamento por cadeia relacional, retificacoes, cancelamentos e ordenacao de linhagens.

## Criticidade

Alta.

## Fontes a Analisar

- Relatorio real `Sheets/relatorio.xlsx`
- `src/services/ExcelParser.ts`
- Manuais operacionais da RFB que expliquem campos e relacoes do PER/DCOMP.

## Comportamento Atual do Codigo

O parser:

- le abas de processamento e debitos;
- converte datas e valores;
- cria DCOMPs e debitos;
- agrupa por `IDs da Cadeia Relacional`;
- reconstrui linhagens por retificacao/cancelamento;
- preserva valores importados em campos `...Original`.

## Rodada AUD-03 em 2026-06-07 - Dados para SELIC Normativa

Fontes tecnicas lidas:

- `src/services/ExcelParser.ts`
- `src/models/types.ts`
- `src/services/CalculoService.ts`
- `src/store.ts`
- Planilha real `Sheets/relatorio.xlsx`, com cabecalhos extraidos via biblioteca `xlsx`.
- Execucao local de `parseExcelFile` sobre `Sheets/relatorio.xlsx`.

### Abas e colunas relevantes encontradas em `Sheets/relatorio.xlsx`

A planilha real contem as abas:

- `DARFs Desmembramentos Originais`
- `DCTF Vinculacoes`
- `DCTF Deducoes`
- `PERDCOMP Debitos`
- `Processamento PERDCOMP`

Na aba `Processamento PERDCOMP`, ha colunas relevantes para SELIC normativa que o parser ainda nao consome integralmente:

- `Numero Perdcomp`
- `Retificado ou Cancelado Por`
- `Perdcomp Anterior com Detalhamento de Credito`
- `Data Transmissao`
- `Tipo de Credito`
- `Tipo do Documento`
- `Situacao`
- `Detentor do Credito`
- `Periodo de Apuracao do Credito`
- `Competencia do Credito`
- `Tipo Competencia`
- `Numero do Pagamento - DARF`
- `Data de Arrecadacao`
- `Grupo de Tributo`
- `Codigo da Receita`
- `Periodo de Apuracao do DARF`
- `Processo Judicial`
- `Processo de Habilitacao`
- `Origem da Discussao`
- `Processo Administrativo`
- `Valor Total do Credito Detalhado`
- `Valor do Credito na Data de Transmissao`
- `Valor Utilizado no Perdcomp`
- `Data de Transmissao do Perdcomp`
- `IDs da Cadeia Relacional`

Na aba `PERDCOMP Debitos`, ha colunas relevantes:

- `Numero do PER/DCOMP`
- `Data de Transmissao`
- `Periodo de Apuracao do Credito`
- `Inicio do Periodo de Apuracao do Credito`
- `Fim do Periodo de Apuracao do Credito`
- `Total Credito Original Utilizado`
- `Periodo de Apuracao do Debito`
- `Codigo de Receita`
- `Data de Vencimento Tributo Quota`
- `Valor Principal`
- `Valor Multa`
- `Valor Juros`
- `Valor Total`
- `Numero do Recibo PER/DCOMP`
- `ID da Cadeia Relacional`

### Mapeamento atual do parser

O parser mapeia atualmente:

| Dado | Coluna(s) e-CAC | Campo atual | Status |
| --- | --- | --- | --- |
| Numero do PER/DCOMP | `Numero Perdcomp`, `Numero do PER/DCOMP` | `DCOMP.id` | Mapeado |
| Data de transmissao original/referencia | `Data Transmissao`, `Data de Transmissao do Perdcomp` | `dataTransmissaoOriginal`, depois herdada da DCOMP ancestral na linhagem | Mapeado, mas sem regra de dia nao util |
| Data real de transmissao | `Data de Transmissao do Perdcomp`, `Data Transmissao` | `dataTransmissao` | Mapeado |
| Tipo de credito | `Tipo de Credito` | `tipoCredito` | Mapeado |
| Periodo de apuracao do credito | `Periodo de Apuracao do Credito`, `Periodo de Apuracao` | `periodoApuracaoCredito` | Mapeado como string; sem inicio/fim estruturados |
| Valor total do credito detalhado | `Valor Total do Credito Detalhado`, `Valor Total do Credito` | `valorTotalCreditoDetalhado` e `valorTotalCreditoDetalhadoOriginal` | Mapeado |
| Credito na data de transmissao | `Valor do Credito na Data de Transmissao` | `valorCreditoDataTransmissao` | Mapeado |
| Valor utilizado no PER/DCOMP | `Valor Utilizado no Perdcomp`, `Valor Utilizado na Perdcomp` | `valorUtilizadoPerdcomp` e `valorUtilizadoPerdcompOriginal` | Mapeado |
| DCOMP/PER de detalhamento anterior | `Perdcomp Anterior com Detalhamento de Credito`, `Detalhado Perdcomp Anterior` | `numeroDcompDetalhamento` | Mapeado |
| Retificador/cancelador | `Retificado ou Cancelado Por`, `Numero Retificador` | `numeroRetificador` | Mapeado |
| Debitos: PA, vencimento e valores | `Periodo de Apuracao do Debito`, `Data de Vencimento Tributo Quota`, `Valor Principal`, `Valor Multa`, `Valor Juros`, `Valor Total` | `DebitoOficial` e campos `...Original` | Mapeado |

### Resultado observado com a planilha real

Execucao local de `parseExcelFile` sobre `Sheets/relatorio.xlsx`:

| Indicador | Resultado |
| --- | ---: |
| Linhas uteis observadas na aba `Processamento PERDCOMP` por leitura matricial | 1472 |
| DCOMPs carregadas pelo parser | 1443 |
| Cadeias carregadas pelo parser | 565 |
| Debitos carregados pelo parser | 4641 |
| Linhas com numero de PER/DCOMP presentes na aba, mas nao carregadas | 29 |

As 29 linhas nao carregadas possuem `IDs da Cadeia Relacional` vazio. Exemplos:

| PER/DCOMP | Tipo de credito | Situacao | Observacao |
| --- | --- | --- | --- |
| `20412.42534.150526.1.3.24-5753` | Pagamento Indevido ou a Maior eSocial | Em analise | Sem `IDs da Cadeia Relacional`. |
| `39762.69755.150526.1.3.24-8761` | Pagamento Indevido ou a Maior eSocial | Em analise | Sem `IDs da Cadeia Relacional`. |
| `15110.01245.091116.1.3.02-9855` | Saldo Negativo de IRPJ | Homologado | Sem `IDs da Cadeia Relacional`. |

Distribuicao das 29 linhas nao carregadas por tipo/situacao:

| Tipo/situacao | Linhas |
| --- | ---: |
| Pagamento Indevido ou a Maior eSocial - Em analise | 7 |
| Credito Oriundo de Acao Judicial - Homologado | 4 |
| Saldo Negativo de CSLL - Homologado | 3 |
| Saldo Negativo de IRPJ - Homologado | 2 |
| Saldo Negativo de IRPJ - Despacho Decisorio Emitido | 2 |
| Credito Oriundo de Acao Judicial - Em analise | 2 |
| Saldo Negativo de IRPJ - Analise concluida | 2 |
| Pagamento Indevido ou a Maior - Homologado | 2 |
| Saldo Negativo de CSLL - Despacho Decisorio Emitido | 2 |
| Pagamento Indevido ou a Maior - Em discussao administrativa - CARF | 1 |
| Pagamento Indevido ou a Maior - Retificado | 1 |
| Saldo Negativo de IRPJ - Retificado | 1 |

Decisao de auditoria:

- Para cascata relacional, documento sem `IDs da Cadeia Relacional` pode nao ser processavel na mesma logica.
- Para auditoria/importacao, a linha nao deve desaparecer silenciosamente.
- O importador futuro deve registrar documentos orfaos/sem cadeia em relatorio de qualidade, com status `sem_cadeia_relacional`, e permitir que o usuario saiba que nao entraram no motor de cascata.

### Dados necessarios para SELIC normativa

| Regra SELIC | Dados necessarios | Disponibilidade na planilha | Status no parser/modelo | Decisao de auditoria |
| --- | --- | --- | --- | --- |
| Pagamento indevido ou a maior | Tipo de credito, data de pagamento/arrecadacao, valor original disponivel, DCOMP original | `Data de Arrecadacao`, `Numero do Pagamento - DARF`, `Valor Total do Credito Detalhado`, datas de transmissao | Disponivel na planilha, mas `Data de Arrecadacao` e numero de pagamento nao estao no modelo | Exigir ampliacao do modelo antes de calculo normativo. |
| Contribuicao previdenciaria indevida/maior em GPS | Data de pagamento, competencia, eventuais usos em GFIP, valor original disponivel | `Data de Arrecadacao`, `Competencia do Credito`, `Tipo Competencia`; usos GFIP nao confirmados nesta planilha | Parcial; competencia e data de arrecadacao nao mapeadas | Calculo normativo depende de campos adicionais e, se houver GFIP anterior, dado complementar. |
| Saldo negativo IRPJ/CSLL | Periodo de apuracao, valor original na data de entrega, data da DCOMP original | `Periodo de Apuracao do Credito`; na aba de debitos ha inicio/fim do PA do credito | Parcial; periodo esta como string e inicio/fim nao sao mapeados | Implementar parsing estruturado de PA ou regra de derivacao validada. |
| Retencao previdenciaria PJ | Competencia, valor original, deducoes, DCOMP original | `Competencia do Credito`, `Tipo Competencia`; DCTF/Deducoes trazem retencao/deducao | Parcial; competencia/deducoes nao entram no modelo DCOMP | Exigir dados complementares ou cruzamento com abas DCTF antes de calcular. |
| Ressarcimento IPI/PIS/Cofins/Reintegra com PER | Data de protocolo/transmissao do PER original, valor original/base, DCOMP original | `Perdcomp Anterior com Detalhamento de Credito` e datas permitem inferencia se o PER estiver na cadeia; nao ha campo explicito "protocolo PER original" | Parcial; parser guarda numero de detalhamento, mas nao resolve nem persiste `dataProtocoloPerOriginal` | Nao calcular se o PER original referenciado nao estiver importado/resolvido. |
| Credito judicial | Componentes, forma de atualizacao, datas por componente, valores original/atualizado por componente | Planilha traz processos judicial/habilitacao, mas nao componentes | Insuficiente | Marcar calculo normativo como dependente de dado complementar. |
| Art. 157 - dia nao util | Data de entrega/transmissao e calendario de dia util | Data existe; calendario/ajuste nao existe | Ausente | Criar regra/calendario antes de aplicar mes final. |

### Achados de importacao

#### ACH-007 - Relatorio e-CAC contem marcos de SELIC nao mapeados pelo modelo

- Objeto relacionado: AUD-01, AUD-03, AUD-05.
- Criticidade: Alta.
- Evidencia:
  - A aba `Processamento PERDCOMP` contem `Data de Arrecadacao`, `Competencia do Credito`, `Numero do Pagamento - DARF`, `Processo Judicial` e `Processo de Habilitacao`.
  - `ExcelParser.ts` nao persiste esses campos em `DCOMP`.
- Risco:
  - A futura engine SELIC poderia considerar dados "ausentes" quando eles ja estao disponiveis no relatorio, ou calcular por aproximacao desnecessariamente.
- Diretriz:
  - Antes de implementar `SelicService`, ampliar o contrato de importacao e o modelo calculado/rastreavel para carregar esses marcos sem alterar `...Original`.

#### ACH-008 - Data de PER original para ressarcimento e parcialmente inferivel, mas nao garantida

- Objeto relacionado: AUD-01, AUD-03, AUD-04.
- Criticidade: Alta.
- Evidencia:
  - O parser mapeia `numeroDcompDetalhamento`, mas nao resolve/persiste uma data propria de protocolo/transmissao do PER original.
  - O art. 152 exige contar 360/361 dias do protocolo do pedido de ressarcimento original.
- Risco:
  - PIS/Cofins, IPI e Reintegra podem ser calculados com data errada se a engine usar a DCOMP atual ou a cadeia errada.
- Diretriz:
  - Resolver `dataProtocoloPerOriginal` apenas quando o PER original estiver presente e identificado; caso contrario, marcar `dadoComplementarExigido`.

#### ACH-023 - Linhas sem cadeia relacional sao descartadas sem relatorio de qualidade

- Objeto relacionado: AUD-03, AUD-04, AUD-08.
- Criticidade: Alta.
- Evidencia tecnica:
  - `ExcelParser.ts`, linhas 151 a 153: se `IDs da Cadeia Relacional` estiver vazio, a linha retorna sem criar DCOMP.
  - Execucao sobre `Sheets/relatorio.xlsx`: 29 linhas com numero de PER/DCOMP nao foram carregadas por ausencia de cadeia.
- Risco:
  - O usuario pode acreditar que todos os documentos do e-CAC foram considerados, quando documentos sem cadeia ficaram fora da cascata.
  - Relatorio e KPIs podem omitir documentos relevantes para contexto tributario.
- Diretriz:
  - Criar `ImportQualityReport` com contagem de linhas lidas, carregadas, ignoradas e motivo.
  - Preservar lista de documentos sem cadeia como evidencia, mesmo que fora do motor de cascata.

#### ACH-024 - Datas/valores ausentes usam fallback silencioso

- Objeto relacionado: AUD-01, AUD-03, AUD-05.
- Criticidade: Alta.
- Evidencia tecnica:
  - `ExcelParser.ts`, linhas 20 a 47.
- Descricao:
  - `toNumberValue` retorna `0` para valor ausente.
  - `parseExcelDate` retorna `new Date()` para data ausente ou formato nao tratado.
- Risco:
  - Dado ausente pode virar zero ou data atual, contaminando regra de SELIC, status de importacao ou relatorio.
- Diretriz:
  - Para campos normativos, distinguir `ausente`, `zero_importado` e `data_invalida`.
  - O parser deve registrar erro/alerta de qualidade, nao preencher data normativa com data atual.

## Fragilidades Possiveis

- Mudanca de nome de coluna pela RFB.
- Ambiguidade entre `Data Transmissao` e `Data de Transmissao do Perdcomp`.
- Datas Excel serializadas com fuso/offset.
- Colunas ausentes ou valores monetarios formatados como texto.
- Ordenacao incorreta de retificacoes com mesma data.
- Parser deixar de carregar marcos normativos que ja existem na planilha real.
- Engine normativa usar inferencia quando a planilha nao trouxer o dado necessario.

## Perguntas de Auditoria

- Quais colunas sao obrigatorias por aba?
- Quais colunas possuem aliases aceitos?
- Quais campos definem a cadeia e a linhagem?
- Quais campos sao importados como base auditavel?
- Como reportar erro ao usuario sem quebrar a aplicacao?

## Possiveis Solucoes

- Criar contrato de importacao documentado.
- Criar validador de colunas antes do parse.
- Gerar relatorio de qualidade da importacao.
- Transformar aliases de coluna em tabela central.
- Adicionar campos opcionais, preservados e rastreaveis, para `dataArrecadacaoCredito`, `competenciaCredito`, `numeroPagamento`, `processoJudicial`, `processoHabilitacao`, `processoAdministrativo`, `dataProtocoloPerOriginal`, `dadosSelicAusentes`.

## Contrato de Importacao Proposto

### `ImportQualityReport`

```ts
type ImportQualityReport = {
  linhasProcessamentoLidas: number;
  dcompsCarregadas: number;
  debitosCarregados: number;
  cadeiasCarregadas: number;
  documentosIgnorados: Array<{
    numeroPerdcomp?: string;
    motivo: 'sem_cadeia_relacional' | 'sem_numero_perdcomp' | 'linha_invalida';
    tipoCredito?: string;
    situacao?: string;
  }>;
  camposAusentesPorDocumento: Array<{
    numeroPerdcomp: string;
    campos: string[];
  }>;
  alertas: string[];
};
```

### Dados importados opcionais para `DCOMP`

```ts
type MetadadosCreditoImportado = {
  dataArrecadacaoCredito?: Date;
  competenciaCredito?: string;
  tipoCompetenciaCredito?: string;
  numeroPagamento?: string;
  grupoTributo?: string;
  codigoReceitaCredito?: string;
  periodoApuracaoDarf?: string;
  processoJudicial?: string;
  processoHabilitacao?: string;
  origemDiscussao?: string;
  processoAdministrativo?: string;
  periodoApuracaoCreditoInicio?: Date;
  periodoApuracaoCreditoFim?: Date;
  totalCreditoOriginalUtilizadoAbaDebitos?: number;
};
```

Regras:

- Campo ausente deve permanecer ausente.
- Campo monetario ausente nao deve ser confundido com zero importado.
- Documento sem cadeia deve ser relatado, nao necessariamente processado em cascata.
- Qualquer dado complementar informado pelo usuario deve ter origem separada de dado importado.

## Criterios de Aceite

- Matriz de colunas obrigatorias e opcionais.
- Reproducao do parse com a planilha real.
- Casos de teste para datas, valores e retificacoes.
- Para cada CT-SEL minimo, saber se os dados necessarios vieram do e-CAC, foram informados pelo usuario ou estao indisponiveis.
- Relatorio de qualidade da importacao mostra documentos sem cadeia e campos ausentes.
- Datas ausentes/invalidas nao viram data atual em regra normativa.
- Valores ausentes nao viram zero normativo sem alerta.
