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
- `Knowledge/per_dcomp-web_-contribuicao-previdenciaria-indevida-ou-a-maior-pessoa-juridica.pdf`, v31/05/2025, paginas 9 e 11 a 14.
- `Knowledge/per_dcomp-web_-retencao-previdenciaria-pessoa-juridica.pdf`, v31/05/2025, paginas 1, 6 a 12.
- `Knowledge/per_dcomp-web_-salario-familia-e-salario-maternidade-pessoa-juridica.pdf`, v21/06/2024, paginas 1, 5, 7 e 8.
- `Knowledge/per_dcomp-web_-ressarcimento-de-pis_pasep-e-cofins-nao-cumulativos.md`, v02/06/2025, secoes "Identificar Documento" e "Demonstrativo do Credito".
- `Knowledge/per_dcomp-web_ressarcimento-de-ipi.md`, Brasilia/DF, 06/02/2026, secoes 1, 2, 3, 4 e 9.
- `IN RFB n. 2.055/2021`, arts. 148 e seguintes, consulta oficial informada pelo usuario: `https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/122002`.
- Consulta textual complementar da IN RFB n. 2.055/2021 em LegisWeb, usada apenas para leitura do texto consolidado dos arts. 148 a 153, pois a consulta oficial da RFB e uma aplicacao dinamica.
- `Knowledge/Selic_Acumulada_ate_06.2026.pdf`, emitido em 04/06/2026, paginas 1 a 4.

Premissa de escopo para IPI:

- O roteiro de Ressarcimento de IPI possui numerosas regras operacionais de apuracao, RAIPI, preenchimento, estorno e demonstrativo. Essas regras nao serao implementadas pela aplicacao neste ciclo.
- Para IPI, o objetivo da aplicacao e somente calcular a SELIC do credito quando houver dados suficientes, com base na IN RFB n. 2.055/2021, arts. 148 e seguintes, mantendo a apuracao do credito original como dado importado ou informado e preservando campos `...Original`.

Regra normativa confirmada, em linguagem tecnica:

- Para Saldo Negativo de IRPJ/CSLL, a taxa SELIC da DCOMP incide desde o mes seguinte ao final do periodo de apuracao do credito, ate o mes anterior a data de entrega da declaracao de compensacao, com acrescimo de 1% relativo ao mes corrente.
- Para Pagamento Indevido ou a Maior PJ, a taxa SELIC da DCOMP incide desde o mes seguinte a data do pagamento, ate o mes anterior a data de entrega da declaracao de compensacao, com acrescimo de 1% relativo ao mes corrente.
- Para Contribuicao Previdenciaria Indevida ou a Maior PJ em GPS, a taxa SELIC tambem incide desde o mes seguinte a data do pagamento ate o mes anterior a entrega da DCOMP, mais 1%, mas o manual alerta que, havendo mais de um termo inicial de SELIC no mesmo PER/DCOMP, cabe ao contribuinte alterar a taxa se necessario.
- Para Retencao Previdenciaria PJ - Lei n. 9.711/1998, a taxa SELIC da DCOMP incide desde o segundo mes seguinte ao da competencia, ate o mes anterior a entrega da declaracao de compensacao, mais 1%.
- Para Salario-Familia e Salario-Maternidade PJ, declaracao de compensacao e vedada. O credito e objeto de Pedido de Reembolso; ha atualizacao pela SELIC, mas o valor atualizado nao e calculado no PER/DCOMP Web porque a atualizacao ocorre ate a data de pagamento ao contribuinte, nao ate a data de transmissao do pedido.
- Para Ressarcimento de PIS/Pasep e Cofins nao cumulativos, em DCOMP, a SELIC incide desde o mes seguinte ao do 361 dia contado da transmissao do pedido de ressarcimento original ate o mes anterior a data de entrega da declaracao de compensacao, mais 1%.
- Para Ressarcimento de IPI, a regra de SELIC segue a regra geral de ressarcimento do art. 152 da IN RFB n. 2.055/2021: se nao houver ressarcimento no prazo de 360 dias da data do protocolo do pedido de ressarcimento, aplica-se SELIC a parcela do credito nao ressarcida ou nao compensada. O termo inicial e o mes subsequente ao do 361 dia contado da data do protocolo do pedido de ressarcimento original.
- Para Ressarcimento de IPI, PIS/Pasep, Cofins e Reintegra, o art. 152, paragrafo 2, fixa termo final por modalidade: no ressarcimento, disponibilizacao da quantia; na compensacao declarada, entrega da DCOMP original; na compensacao de oficio, momento em que considerada efetuada.
- Para Saldo Negativo, Pagamento Indevido e Contribuicao Previdenciaria Indevida, se a DCOMP original for apresentada no mesmo mes do marco inicial material, nao cabe atualizacao do credito. Para Retencao Previdenciaria PJ, tambem nao ha atualizacao se a DCOMP original for apresentada no mesmo mes ou no mes seguinte a competencia.
- O art. 151 confirma hipoteses de nao incidencia de juros compensatorios, incluindo compensacao declarada/oficio quando a data de valoracao ocorre no mesmo mes da origem do direito crediticio e, para IPI/PIS/Cofins/Reintegra, ressalva a aplicacao especifica do art. 152.
- O art. 157 determina que, se a DCOMP formalizada por PER/DCOMP for transmitida em dia nao util, o documento e considerado entregue no primeiro dia util subsequente para fins dos arts. 148 e correlatos. Esse ponto precisa virar regra de data antes de implementacao.
- Em retificacao, a data de referencia para calculo da SELIC e a data de transmissao da declaracao de compensacao original, nao a data da retificadora.
- O "Credito Atualizado" e obtido aplicando a taxa SELIC ao "Credito Original na Data de Entrega".
- O "Total do Credito Original Utilizado neste Documento" e calculado por descapitalizacao: divide-se o "Total dos Debitos deste Documento" por `(1 + taxa Selic em formato decimal)`.
- O "Saldo do Credito Original" corresponde ao "Credito Original na Data de Entrega" menos o credito original utilizado no documento.

Atos normativos citados nos manuais lidos:

- Saldo Negativo IRPJ/CSLL: Lei n. 5.172/1966, art. 168, inciso I; IN RFB n. 2.055/2021, art. 27, incisos I a III; IN RFB n. 2.055/2021, art. 28; Lei n. 9.430/1996, art. 1, paragrafos 1 e 2; Lei n. 8.981/1995, art. 57.
- Pagamento Indevido ou a Maior PJ: Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021; IN RFB n. 2.055/2021, Anexos I e IV, quando o roteiro remete a formulario/processo.
- Contribuicao Previdenciaria Indevida ou a Maior PJ: Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021; IN RFB n. 2.055/2021, Anexos I e IV, quando o roteiro remete a formulario/processo.
- Retencao Previdenciaria PJ: Lei n. 9.711/1998; Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021.
- Salario-Familia e Salario-Maternidade PJ: IN RFB n. 2.055/2021, art. 76, inciso XV; Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021.
- Ressarcimento de PIS/Pasep e Cofins nao cumulativos: Leis n. 10.637/2002 e 10.833/2003; Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021; IN RFB n. 2.055/2021, Anexos I e IV, para SCP/processo quando o roteiro remete.
- Ressarcimento de IPI: para elegibilidade operacional contextual, IN RFB n. 2.055/2021, arts. 40, 41, 42, 44, paragrafo 3, 45 e 67; para SELIC/valoracao do credito, IN RFB n. 2.055/2021, arts. 148, 151, 152 e 157; demais atos do roteiro de IPI permanecem fora do escopo de implementacao neste ciclo.

Impacto no codigo atual:

- `CalculoService.ts` possui `calcularSelicAcumulada`, mas a funcao nao e usada pelo fluxo ativo de `recalcularCadeia`.
- O fluxo ativo de DCOMP real nao editada preserva o valor importado `valorUtilizadoPerdcompOriginal`, o que esta correto para rastreabilidade da base RFB.
- O fluxo ativo de DCOMP editada descapitaliza por fator historico (`totalDebitosOriginal / valorUtilizadoPerdcompOriginal`) e nao por taxa SELIC calculada a partir do tipo de credito, marco inicial e transmissao original.
- O fluxo ativo de DCOMP hipotetica deriva fator da ultima DCOMP real e soma taxa acumulada do mes da ultima transmissao, sem usar a data hipotetica nem o marco inicial normativo do tipo de credito.
- A tabela `Selic_Acumulada_ate_06.2026.pdf` e uma tabela do Sicalc para acrescimos legais ate junho/2026 e instrui uso pela competencia de vencimento do debito. Seu uso como base para credito por subtracao de acumuladas precisa ser tratado como hipotese tecnica a validar, nao como regra normativa final isolada.
- Salario-Familia e Salario-Maternidade PJ nao devem entrar na engine de DCOMP como compensacao simulavel; se aparecerem no relatorio, devem ser tratados como reembolso e/ou alerta de vedacao de DCOMP.
- Ressarcimento de PIS/Cofins exige distinguir DCOMP sem PER previo, quando admitida por bases legais e prazo, de DCOMP posterior a PER. O marco de 361 dias depende da transmissao do pedido de ressarcimento original, nao do periodo de apuracao do credito.
- Ressarcimento de IPI nao deve levar a engine a implementar a apuracao operacional completa do roteiro. A engine deve aceitar valor original/base importada ou informada e calcular apenas a SELIC do tipo de credito: art. 152, com termo inicial no mes subsequente ao 361 dia do protocolo do PER original e termo final conforme modalidade.

Classificacao:

- Criticidade: Critica para simulacoes e DCOMP hipotetica.
- Risco residual na visualizacao/importacao: menor, desde que os valores importados da RFB continuem preservados e claramente identificados.

## Rodada de Implementacao Fase 3 Expandida - 2026-06-07

Escopo executado:

- criado `src/services/normativo/selicService.ts`;
- ampliado `src/services/normativo/dateRules.ts` com:
  - `calcularTermoFinalDcompOriginal`;
  - `extrairFimPeriodoApuracaoCredito`;
- criado teste real `src/services/normativo/__tests__/selicService.real.test.ts`;
- `SelicService` permanece fora do fluxo ativo de `CalculoService.ts`.

Comportamento implementado:

- resultado `normativo` somente quando tipo de credito, termo inicial, termo final, total de debitos e `taxaSelicDecimal` estao disponiveis;
- para saldo negativo IRPJ/CSLL, o termo inicial e derivado do fim do periodo de apuracao importado;
- termo final usa a data de transmissao original da linhagem, aplicando a regra de mes anterior a entrega;
- credito judicial real sem componentes importados retorna `dados_insuficientes` com `dadosAusentes = componentesCreditoJudicial`;
- quando a taxa SELIC normativa nao esta disponivel, o servico pode retornar `estimativa_historica` com `metodo = fator_historico_identificado`, sem declarar resultado normativo.

Evidencia real usada:

- DCOMP real `06251.86776.210720.1.7.02-1771` (saldo negativo IRPJ);
- DCOMP real `17339.63413.191224.1.3.03-0151` (saldo negativo CSLL);
- DCOMP real `04545.00403.181224.1.3.04-9218` (pagamento indevido a maior);
- DCOMP real `37701.32986.170423.1.3.16-2407` (CPIM);
- DCOMP real `09896.37478.250424.1.3.24-6461` (pagamento indevido eSocial);
- DCOMP real `32552.06818.210225.1.3.57-2529` (credito judicial sem componentes).

Limites preservados:

- nenhum valor importado foi alterado;
- nenhum campo `...Original` foi recalculado;
- `CalculoService.ts` nao foi integrado nesta rodada;
- a taxa foi injetada em teste como fixture validada, nao obtida por inferencia da tabela Sicalc.

Gates executados:

- `npm run test`: aprovado, 10 arquivos de teste, 44 testes;
- `npm run lint`: aprovado;
- `npm run build`: aprovado.

Proximo passo recomendado:

- testar art. 152 com dados complementares quando disponiveis; depois preparar Fase 4 de integracao controlada com `CalculoService`.

### ACH-006 - Credito judicial exige regra por componente e forma de atualizacao

Status: Aberto.

Fonte desta rodada:

- `Knowledge/per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`, Brasilia/DF, 13/01/2026, paginas 3, 4, 10 a 12, 22 a 24, 29, 33 a 34, 43, 46 a 49 e 51 a 52.

Regra normativa confirmada, em linguagem tecnica:

- O credito oriundo de acao judicial exige decisao judicial transitada em julgado e habilitacao previa perante a RFB antes da DCOMP.
- O pedido de restituicao, ressarcimento ou reembolso e vedado na via administrativa para esse credito; o uso administrativo cabivel e DCOMP.
- A partir de 15/02/2025, o manual distingue layout novo, com detalhamento dos componentes do credito, e layout antigo, sem detalhamento. O layout novo e aplicavel a creditos cujo consumo se iniciou a partir dessa data.
- No layout antigo, o valor atualizado inicial deve equivaler ao montante total do credito atualizado ate a transmissao original da DCOMP; em retificacao, nao se atualizam campos pela data da retificadora.
- No layout novo, a atualizacao e calculada por componente de credito. Pagamento/GPS, pagamento por demais documentos e parcelamentos usam, quando marcada atualizacao pela SELIC, o mes seguinte a data de arrecadacao ate o mes anterior a entrega da DCOMP original, mais 1%.
- Retencao judicial tem regra distinta: retencao previdenciaria usa SELIC a partir do segundo mes seguinte ao mes da competencia; retencao nao previdenciaria usa SELIC a partir do mes seguinte ao mes da retencao.
- "Demais parcelas" exige campo proprio "Mes Inicial de Incidencia da Selic"; esse marco deve observar a decisao judicial e, se a decisao for omissa, os arts. 149 a 152 da IN RFB n. 1.717/2017.
- O manual admite tres formas de atualizacao por componente: SELIC, outro indice ou sem atualizacao. Se parte do credito for atualizada pela SELIC e parte nao, o contribuinte deve usar "Atualizacao por Outro Indice" e informar manualmente indices aplicaveis, inclusive zero.
- O credito utilizado original de cada componente e calculado pela proporcao `Credito na Data de Entrega - Original / Credito na Data de Entrega - Atualizado * Credito Utilizado nesta DCOMP - Atualizado`.
- Quando ha descarte do detalhamento, o "Total do Credito Original Utilizado neste Documento" e calculado por `Credito Original na Data de Entrega / Credito Atualizado na Data de Entrega * Total dos Debitos deste Documento`, com verificacao/edicao pelo contribuinte.
- O PER/DCOMP Web ordena componentes de credito do mais antigo para o mais recente para consumir o credito atualizado.

Atos normativos citados no manual lido:

- Decreto n. 20.910/1932, art. 1.
- IN RFB n. 2.055/2021, art. 106.
- Parecer Normativo Cosit n. 11/2014.
- Lei n. 9.430/1996, art. 74-A.
- Portaria Normativa MF n. 14/2024.
- IN RFB n. 1.717/2017, arts. 149 a 152, para marcos iniciais quando a decisao judicial for omissa em "Demais Parcelas".

Impacto no codigo atual:

- Uma regra unica baseada apenas em `tipoCredito` nao sera suficiente para credito judicial. O motor futuro precisa reconhecer, no minimo, layout, componente, forma de atualizacao, marco inicial, valor original, valor atualizado e ordem de consumo.
- O relatorio e a UI devem distinguir credito judicial calculado por SELIC, por outro indice informado pelo contribuinte ou sem atualizacao.
- Se o relatorio e-CAC importado nao trouxer componentes do credito judicial, o app deve tratar o calculo normativo completo como indisponivel ou dependente de dado complementar, preservando a base importada.

Classificacao:

- Criticidade: Critica para credito judicial e para qualquer DCOMP hipotetica que tente consumir esse tipo de credito.
- Risco residual na visualizacao/importacao: menor, desde que os valores da RFB sejam mantidos como importados e as lacunas de componente/indice sejam explicitadas.

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
- `CreditoRulesService`: regras por tipo de credito, definindo marco inicial, marco final, excecoes e granularidade de componente quando aplicavel.
- `SelicCalculationInput`: tipo explicito com `tipoCredito`, `valorCreditoOriginalNaDataEntrega`, `periodoApuracaoCredito`, `dataPagamento`, `dataTransmissaoOriginal`, `isRetificadora` e `fonteValorOriginal`.
- `SelicCalculationResult`: tipo explicito com `taxaSelicDecimal`, `valorCreditoAtualizado`, `creditoOriginalUtilizado`, `saldoCreditoOriginal`, `metodo`, `fonteNormativa` e `hipoteses`.
- Para credito judicial, criar entrada propria por componente, por exemplo `ComponenteCreditoJudicialInput`, com `tipoComponente`, `formaAtualizacao`, `mesInicialSelic`, `dataArrecadacao`, `mesCompetenciaRetencao`, `valorOriginalNaDataEntrega`, `valorAtualizadoNaDataEntrega`, `indiceManual`, `fonteDecisaoJudicial` e `ordemConsumo`.
- Campos calculados separados para simulacao, por exemplo:
  - `valorUtilizadoPerdcompCalculado`
  - `metodoCalculoSelic`
  - `evidenciaCalculoSelic`
- UI e PDF devem indicar quando o valor e importado, calculado normativamente ou estimado.
- Enquanto a engine normativa nao for implementada, a UI/PDF devem tratar os fatores historicos de simulacao como estimativa operacional, nao como SELIC validada.

## Desenho Tecnico Preliminar

Sem implementar codigo neste momento, a arquitetura recomendada para a primeira entrega normativa e:

### 1. Camada de metadados importados

Adicionar ao modelo um bloco opcional, por exemplo `metadadosCredito`, com dados vindos da RFB ou resolvidos por linhagem:

- `dataArrecadacaoCredito`
- `competenciaCredito`
- `tipoCompetenciaCredito`
- `numeroPagamento`
- `periodoApuracaoDarf`
- `processoJudicial`
- `processoHabilitacao`
- `processoAdministrativo`
- `dataProtocoloPerOriginal`
- `numeroPerOriginal`
- `origemDataProtocoloPerOriginal`: `importada`, `resolvida_por_linhagem`, `informada_usuario`

Esses campos sao metadados de importacao/evidencia. Eles nao substituem campos `...Original` e nao representam resultado calculado.

### 2. `CreditoRulesService`

Responsavel por classificar o tipo de credito e produzir uma regra aplicavel:

- `classificarTipoCredito(tipoCredito: string)`;
- `obterRegraSelic(tipoCreditoClassificado, metadadosCredito)`;
- `validarDadosMinimos(regra, dcomp)`.

Saidas esperadas:

- tipo de regra: `pagamento`, `saldo_negativo`, `retencao_previdenciaria`, `ressarcimento_art_152`, `judicial_componente`, `vedado`, `indisponivel`;
- fonte normativa;
- lista de dados obrigatorios;
- funcao/descritor de termo inicial;
- funcao/descritor de termo final;
- excecoes de taxa zero.

### 3. `DateRulesService`

Responsavel por datas normativas:

- converter periodo/competencia em mes de referencia;
- aplicar art. 157 para DCOMP transmitida em dia nao util;
- calcular 361 dia do PER original para art. 152;
- retornar `dataEntregaValoracao` sem alterar `dataTransmissaoOriginal`.

### 4. `SelicService`

Responsavel apenas por taxa e formulas:

- calcular intervalo mensal aplicavel;
- obter taxa SELIC a partir da fonte de tabela validada;
- aplicar `+1%` do mes da entrega/valoracao quando cabivel;
- calcular `creditoAtualizado`, `creditoOriginalUtilizado` e `saldoCreditoOriginal`.

Entrada conceitual:

- valor original/base;
- total dos debitos;
- termo inicial;
- termo final;
- data de entrega/valoracao;
- fonte da tabela SELIC;
- regra normativa.

Saida conceitual:

- `statusCalculo`: `normativo`, `estimativa_historica`, `dados_insuficientes`, `vedado`;
- `taxaSelicDecimal`;
- `creditoAtualizado`;
- `creditoOriginalUtilizadoCalculado`;
- `saldoCreditoOriginalCalculado`;
- `fonteNormativa`;
- `dadosUtilizados`;
- `dadosAusentes`;
- `hipoteses`.

### 5. Integracao com `CalculoService`

`CalculoService` nao deve conter a regra normativa espalhada. Ele deve:

- pedir a `CreditoRulesService` a regra aplicavel;
- pedir a `SelicService` o resultado calculado;
- usar resultado normativo apenas quando `statusCalculo = normativo`;
- manter o fator historico atual como fallback identificado por `statusCalculo = estimativa_historica`;
- nunca alterar campos `...Original`.

### 6. UI e relatorio

Todo valor recalculado deve exibir metodologia:

- `Importado da RFB`;
- `Calculado normativamente`;
- `Estimativa historica`;
- `Dados insuficientes`;
- `Vedado/fora de DCOMP`.

O relatorio deve listar fonte normativa, taxa, datas usadas e dados ausentes quando o calculo nao puder ser normativo.

## Matriz Minima Implementavel de SELIC

Esta matriz limita a primeira implementacao normativa aos tipos de credito e dados ja documentados. Onde faltar dado importado, o resultado deve ser "calculo normativo indisponivel" e nao uma inferencia silenciosa.

| Grupo de regra | Tipos de credito | Termo inicial | Termo final para DCOMP | Dados minimos exigidos | Observacao de implementacao |
| --- | --- | --- | --- | --- | --- |
| Pagamento indevido ou a maior | Pagamento indevido/maior PJ; contribuicao previdenciaria indevida/maior em GPS | Mes subsequente ao pagamento | Mes anterior a entrega da DCOMP original, com 1% no mes da entrega | Data de pagamento/arrecadacao; valor original disponivel; data de entrega/transmissao original | Se houver multiplos termos iniciais em CPIM/GPS, exigir taxa por termo ou dado complementar. |
| Saldo negativo | Saldo negativo IRPJ/CSLL | Mes subsequente ao encerramento do periodo de apuracao | Mes anterior a entrega da DCOMP original, com 1% no mes da entrega | Periodo de apuracao; valor original na data de entrega; data de entrega/transmissao original | Sem atualizacao se a DCOMP original ocorrer no mesmo mes do encerramento do periodo. |
| Retencao previdenciaria | Retencao Lei n. 9.711/1998 | Segundo mes subsequente a competencia | Mes anterior a entrega da DCOMP original, com 1% no mes da entrega | Competencia; valor original; deducoes; data de entrega/transmissao original | Sem atualizacao se a DCOMP original ocorrer no mesmo mes ou no mes seguinte a competencia. |
| Ressarcimento com PER | IPI; PIS/Pasep; Cofins; Reintegra, quando aplicavel | Mes subsequente ao 361 dia contado do protocolo/transmissao do PER original | Mes anterior a entrega da DCOMP original, com 1% no mes da entrega | Data de protocolo/transmissao do PER original; valor original/base disponivel; data de entrega/transmissao original | Art. 152 da IN RFB n. 2.055/2021. Nao implementar RAIPI/apuracao operacional de IPI. |
| Credito judicial por componente | Componentes judiciais com forma SELIC | Conforme tipo de componente: pagamento, retencao previdenciaria, retencao nao previdenciaria ou demais parcelas | Mes anterior a entrega da DCOMP original, com 1% no mes da entrega | Componentes; forma de atualizacao; datas/marcos; valores original e atualizado; ordem de consumo | Se componentes nao vierem no e-CAC, marcar como dependente de dado complementar. |
| Vedado ou fora de DCOMP | Salario-familia e salario-maternidade PJ | Nao aplicavel para DCOMP | Nao aplicavel para DCOMP | Tipo de credito | Tratar como reembolso/vedacao, nao como DCOMP compensavel. |

Formula comum quando houver taxa normativa validada:

- `creditoAtualizado = creditoOriginalNaDataEntrega * (1 + taxaSelicDecimal)`.
- `creditoOriginalUtilizado = totalDebitosDocumento / (1 + taxaSelicDecimal)`.
- `saldoCreditoOriginal = creditoOriginalNaDataEntrega - creditoOriginalUtilizado`.

Invariantes:

- Nunca sobrescrever `valorUtilizadoPerdcompOriginal`, `valorTotalCreditoDetalhadoOriginal`, `valorPrincipalOriginal`, `valorMultaOriginal`, `valorJurosOriginal` ou `valorTotalOriginal`.
- Persistir o resultado calculado em campos separados, com `metodo`, `fonteNormativa`, `hipoteses`, `dadosAusentes` e `statusCalculo`.
- Tratar transmissao em dia nao util conforme art. 157 antes de calcular o mes de valoracao.

## Pre-Requisito Tecnico de Importacao

Auditoria de `ExcelParser.ts`, `types.ts` e `Sheets/relatorio.xlsx` em 2026-06-07 mostrou que a planilha e-CAC contem marcos de SELIC que o modelo ainda nao persiste:

- `Data de Arrecadacao`;
- `Competencia do Credito`;
- `Tipo Competencia`;
- `Numero do Pagamento - DARF`;
- `Periodo de Apuracao do DARF`;
- `Processo Judicial`;
- `Processo de Habilitacao`;
- `Processo Administrativo`;
- `Inicio do Periodo de Apuracao do Credito` e `Fim do Periodo de Apuracao do Credito`, na aba de debitos;
- `Total Credito Original Utilizado`, na aba de debitos.

Consequencia:

- Antes de implementar `SelicService`, e necessario ampliar o contrato de importacao e o modelo `DCOMP` com metadados opcionais de origem RFB.
- Se o dado necessario nao estiver importado ou resolvido por linhagem, a engine deve retornar `dados_insuficientes`.
- Para ressarcimentos do art. 152, `dataProtocoloPerOriginal` so pode ser preenchida se o PER original estiver presente/identificado na cadeia ou se o usuario fornecer dado complementar rastreavel.
- Para credito judicial, a planilha traz processos judicial/habilitacao, mas nao componentes de credito; portanto, componente judicial segue como dado complementar exigido.

## Casos de Teste Recomendados

Os casos CT-SEL foram transformados em fixtures normativas detalhadas em `09-CasosTesteMatrizEvidencias.md`, secao "Rodada de Especificacao de Fixtures SELIC - 2026-06-07". A especificacao separa teste de marco/intervalo normativo, teste de formula com taxa injetada e teste de dados insuficientes, evitando tratar a tabela Sicalc de debitos como taxa numerica definitiva de credito sem validacao adicional.

- Saldo negativo IRPJ/CSLL com PA anual e DCOMP transmitida em mes posterior: marco inicial no mes seguinte ao encerramento do periodo de apuracao; transmissao original como marco final.
- Saldo negativo IRPJ/CSLL com transmissao no mesmo mes do encerramento do periodo de apuracao: taxa igual a zero.
- Pagamento indevido ou a maior com pagamento e transmissao no mesmo mes: taxa igual a zero.
- Pagamento indevido ou a maior com pagamento em mes anterior a transmissao: marco inicial no mes seguinte ao pagamento.
- Contribuicao Previdenciaria Indevida ou a Maior PJ com uma GPS: marco inicial no mes seguinte a data de pagamento.
- Contribuicao Previdenciaria Indevida ou a Maior PJ com multiplas GPS/termos iniciais: regra deve exigir taxa por termo inicial ou marcacao de ajuste manual, nao taxa unica cega.
- Retificadora: manter data de transmissao da DCOMP original para calculo da taxa.
- Descapitalizacao: `creditoOriginalUtilizado = totalDebitosDocumento / (1 + taxaSelicDecimal)`.
- Retencao Previdenciaria PJ - Lei n. 9.711/1998: marco inicial no segundo mes seguinte ao da competencia; sem atualizacao se DCOMP original for apresentada no mesmo mes ou no mes seguinte a competencia.
- Salario-Familia e Salario-Maternidade PJ: validar que declaracao de compensacao e vedada e que eventual atualizacao em reembolso nao e calculada pelo PER/DCOMP Web na transmissao.
- Ressarcimento de PIS/Pasep e Cofins nao cumulativos: DCOMP com PER previo e marco inicial no mes seguinte ao do 361 dia contado da transmissao do PER original.
- Ressarcimento de PIS/Pasep e Cofins nao cumulativos: DCOMP sem PER previo nas bases legais admitidas e antes do encerramento do trimestre, com necessidade de confirmar se o campo SELIC fica inaplicavel ou se ha regra distinta no fluxo real.
- Ressarcimento de IPI: validar SELIC conforme IN RFB n. 2.055/2021, art. 152, com termo inicial no mes subsequente ao 361 dia do PER original e termo final da DCOMP original; nao implementar as demais regras operacionais do roteiro de IPI.
- Transmissao em dia nao util: validar que a data considerada para fins do art. 148 segue o primeiro dia util subsequente quando aplicavel.
- Credito judicial layout novo, componente pagamento: SELIC desde o mes seguinte a data de arrecadacao.
- Credito judicial layout novo, retencao previdenciaria: SELIC desde o segundo mes seguinte ao mes da competencia.
- Credito judicial layout novo, demais parcelas: usar `Mes Inicial de Incidencia da Selic` conforme decisao judicial ou arts. 149 a 152 da IN RFB n. 1.717/2017 se omissa.
- Credito judicial com "Atualizacao por Outro Indice" ou "Sem Atualizacao": nao aplicar motor SELIC automaticamente.
- DCOMP editada com reducao parcial do principal.
- DCOMP hipotetica em data posterior a ultima DCOMP real.

## Criterios de Aceite

- Regra de SELIC documentada por tipo de credito.
- Nenhum campo `...Original` alterado pelo calculo.
- DCOMPs reais importadas continuam preservando valores da RFB.
- Simulacoes indicam metodologia usada.
- Casos de teste cobrem pelo menos um tipo de credito critico.
