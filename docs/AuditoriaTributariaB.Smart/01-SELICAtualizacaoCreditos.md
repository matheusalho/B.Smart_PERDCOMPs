# AUD-01 - SELIC e Atualizacao de Creditos

## Descricao do Objeto

Auditar como a aplicacao calcula ou infere a atualizacao pela SELIC em creditos compensaveis, incluindo marco inicial, marco final, acrescimo de 1% do mes corrente, diferencas por tipo de credito e uso de tabela acumulada.

## Criticidade

Critica.

## Por que este objeto e sensivel

A SELIC influencia diretamente quanto de credito original e consumido quando um debito atualizado e reduzido ou simulado. Um erro de marco temporal, taxa ou regra especifica por tipo de credito pode alterar o saldo original restante e a indicacao de retificacao em cascata.

## Fontes Normativas a Analisar

- `Knowledge/Selic_Acumulada_ate_06.2026.pdf`
- `Knowledge/per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf`
- `Knowledge/per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf`
- `Knowledge/per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`
- `Knowledge/Orientações PERDCOMP Web - CPIM -PJ_31.05.25.pdf`
- Demais manuais por tipo de credito, se trouxerem regra propria.

## Comportamento Atual do Codigo

Arquivo principal: `src/services/CalculoService.ts`

Achado inicial:

- A funcao `calcularSelicAcumulada(dataInicioIncidencia, dataTransmissaoOriginal)` implementa uma regra simplificada:
  - busca taxa acumulada do mes inicial em `src/selic.json`;
  - busca taxa acumulada do mes da transmissao;
  - calcula `taxaAcumuladaInicio - taxaAcumuladaTransmissao`;
  - zera se o resultado for negativo;
  - soma `1%`.
- Essa funcao parece nao ser chamada pelo fluxo ativo.
- A funcao `aplicarAtualizacaoSelic` tambem parece nao ser chamada pelo fluxo ativo.
- O fluxo ativo esta em `recalcularCadeia`.

Uso efetivo no fluxo ativo:

- DCOMPs reais nao editadas preservam `valorUtilizadoPerdcompOriginal`.
- DCOMPs reais editadas usam fator empirico:
  - `fatorSelic = totalDebitosOriginal / valorUtilizadoPerdcompOriginal`;
  - novo credito original consumido = novo total atualizado dos debitos / `fatorSelic`.
- DCOMPs hipoteticas usam fator da ultima DCOMP real e adicionam `getSelicMensal` do mes da ultima transmissao.

## Fragilidades Possiveis

- A simulacao pode inferir consumo de credito por aproximacao, nao por regra normativa.
- A regra pode variar conforme tipo de credito e nao ha motor separado por tipo.
- A tabela `selic.json` e usada como acumulada, mas o escopo exato e o metodo de subtracao precisam ser validados.
- DCOMP hipotetica nao parece calcular periodo futuro/proprio da data hipotetica.
- Comentarios antigos podem induzir manutencao incorreta se nao forem reconciliados com o codigo ativo.

## Achados e Inconsistencias

### ACH-001 - Simplificacao de SELIC em simulacoes

Status: Aberto.

O app preserva valores importados da RFB para DCOMPs reais sem edicao, mas usa aproximacoes para recalcular o consumo de credito original em cenarios simulados.

Impacto:

- Alto risco em cenarios de reducao de debitos e inclusao de DCOMP hipotetica.
- Risco menor na simples visualizacao de dados reais importados, pois os valores originais sao preservados.

### ACH-005 - Marco inicial da SELIC varia por tipo de credito

Status: Aberto.

Fontes desta rodada:

- `Knowledge/per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf`, v23/09/2025, paginas 21 a 24.
- `Knowledge/per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf`, v31/05/2025, paginas 10 a 12.
- `Knowledge/Selic_Acumulada_ate_06.2026.pdf`, emitido em 04/06/2026, paginas 1 a 4.

Regra normativa confirmada, em linguagem tecnica:

- Para Saldo Negativo de IRPJ/CSLL, a taxa SELIC da DCOMP incide desde o mes seguinte ao final do periodo de apuracao do credito, ate o mes anterior a data de entrega da declaracao de compensacao, com acrescimo de 1% relativo ao mes corrente.
- Para Pagamento Indevido ou a Maior PJ, a taxa SELIC da DCOMP incide desde o mes seguinte a data do pagamento, ate o mes anterior a data de entrega da declaracao de compensacao, com acrescimo de 1% relativo ao mes corrente.
- Para ambos os manuais, se a DCOMP original for apresentada no mesmo mes do marco inicial material (final do periodo de apuracao, no saldo negativo; pagamento, no pagamento indevido), nao cabe atualizacao do credito.
- Em retificacao, a data de referencia para calculo da SELIC e a data de transmissao da declaracao de compensacao original, nao a data da retificadora.
- O "Credito Atualizado" e obtido aplicando a taxa SELIC ao "Credito Original na Data de Entrega".
- O "Total do Credito Original Utilizado neste Documento" e calculado por descapitalizacao: divide-se o "Total dos Debitos deste Documento" por `(1 + taxa Selic em formato decimal)`.
- O "Saldo do Credito Original" corresponde ao "Credito Original na Data de Entrega" menos o credito original utilizado no documento.

Atos normativos citados nos manuais lidos:

- Saldo Negativo IRPJ/CSLL: Lei n. 5.172/1966, art. 168, inciso I; IN RFB n. 2.055/2021, art. 27, incisos I a III; IN RFB n. 2.055/2021, art. 28; Lei n. 9.430/1996, art. 1, paragrafos 1 e 2; Lei n. 8.981/1995, art. 57.
- Pagamento Indevido ou a Maior PJ: Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021; IN RFB n. 2.055/2021, Anexos I e IV, quando o roteiro remete a formulario/processo.

Impacto no codigo atual:

- `CalculoService.ts` possui `calcularSelicAcumulada`, mas a funcao nao e usada pelo fluxo ativo de `recalcularCadeia`.
- O fluxo ativo de DCOMP real nao editada preserva o valor importado `valorUtilizadoPerdcompOriginal`, o que esta correto para rastreabilidade da base RFB.
- O fluxo ativo de DCOMP editada descapitaliza por fator historico (`totalDebitosOriginal / valorUtilizadoPerdcompOriginal`) e nao por taxa SELIC calculada a partir do tipo de credito, marco inicial e transmissao original.
- O fluxo ativo de DCOMP hipotetica deriva fator da ultima DCOMP real e soma taxa acumulada do mes da ultima transmissao, sem usar a data hipotetica nem o marco inicial normativo do tipo de credito.
- A tabela `Selic_Acumulada_ate_06.2026.pdf` e uma tabela do Sicalc para acrescimos legais ate junho/2026 e instrui uso pela competencia de vencimento do debito. Seu uso como base para credito por subtracao de acumuladas precisa ser tratado como hipotese tecnica a validar, nao como regra normativa final isolada.

Classificacao:

- Criticidade: Critica para simulacoes e DCOMP hipotetica.
- Risco residual na visualizacao/importacao: menor, desde que os valores importados da RFB continuem preservados e claramente identificados.

## Perguntas de Auditoria

- Para cada tipo de credito, qual e o marco inicial da SELIC?
- O marco final e sempre o mes anterior a transmissao mais 1% no mes da entrega?
- Ha tipos de credito sem atualizacao, com atualizacao limitada ou com regra especial?
- A tabela acumulada deve ser usada por subtracao de acumuladas ou por soma mensal das taxas aplicaveis?
- Como tratar DCOMP hipotetica com data posterior a tabela disponivel?
- Como registrar no relatorio que determinado valor foi estimado por regra historica enquanto a regra normativa ainda nao esta implementada?

## Proposta Tecnica Inicial

Criar uma camada de calculo de SELIC auditavel, sem sobrescrever campos `...Original`:

- `SelicService`: utilitario puro para obter taxa mensal/acumulada e calcular intervalos.
- `CreditoRulesService`: regras por tipo de credito, definindo marco inicial, marco final e excecoes.
- `SelicCalculationInput`: tipo explicito com `tipoCredito`, `valorCreditoOriginalNaDataEntrega`, `periodoApuracaoCredito`, `dataPagamento`, `dataTransmissaoOriginal`, `isRetificadora` e `fonteValorOriginal`.
- `SelicCalculationResult`: tipo explicito com `taxaSelicDecimal`, `valorCreditoAtualizado`, `creditoOriginalUtilizado`, `saldoCreditoOriginal`, `metodo`, `fonteNormativa` e `hipoteses`.
- Campos calculados separados para simulacao, por exemplo:
  - `valorUtilizadoPerdcompCalculado`
  - `metodoCalculoSelic`
  - `evidenciaCalculoSelic`
- UI e PDF devem indicar quando o valor e importado, calculado normativamente ou estimado.
- Enquanto a engine normativa nao for implementada, a UI/PDF devem tratar os fatores historicos de simulacao como estimativa operacional, nao como SELIC validada.

## Casos de Teste Recomendados

- Saldo negativo IRPJ/CSLL com PA anual e DCOMP transmitida em mes posterior: marco inicial no mes seguinte ao encerramento do periodo de apuracao; transmissao original como marco final.
- Saldo negativo IRPJ/CSLL com transmissao no mesmo mes do encerramento do periodo de apuracao: taxa igual a zero.
- Pagamento indevido ou a maior com pagamento e transmissao no mesmo mes: taxa igual a zero.
- Pagamento indevido ou a maior com pagamento em mes anterior a transmissao: marco inicial no mes seguinte ao pagamento.
- Retificadora: manter data de transmissao da DCOMP original para calculo da taxa.
- Descapitalizacao: `creditoOriginalUtilizado = totalDebitosDocumento / (1 + taxaSelicDecimal)`.
- Credito judicial com regra propria e possivel restricao de habilitacao.
- DCOMP editada com reducao parcial do principal.
- DCOMP hipotetica em data posterior a ultima DCOMP real.

## Criterios de Aceite

- Regra de SELIC documentada por tipo de credito.
- Nenhum campo `...Original` alterado pelo calculo.
- DCOMPs reais importadas continuam preservando valores da RFB.
- Simulacoes indicam metodologia usada.
- Casos de teste cobrem pelo menos um tipo de credito critico.
