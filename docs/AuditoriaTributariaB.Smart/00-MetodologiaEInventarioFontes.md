# Metodologia e Inventario de Fontes

## Finalidade

Definir como a auditoria tributaria sera conduzida e manter o inventario dos documentos oficiais usados como fonte.

## Metodo de Auditoria

Para cada objeto auditado:

1. Identificar o comportamento atual no codigo.
2. Identificar quais manuais oficiais da RFB tratam do tema.
3. Extrair a regra aplicavel em linguagem tecnica propria.
4. Registrar o ato normativo citado, quando houver.
5. Mapear a regra para campos do relatorio e-CAC e para campos do modelo TypeScript.
6. Comparar regra normativa contra comportamento implementado.
7. Registrar achados, riscos e possiveis solucoes.
8. Criar caso de validacao antes de implementar alteracao.
9. Revalidar lint, build, importacao, simulacao e relatorio.

## Principios

- Preservar os campos `...Original` como base importada e auditavel.
- Diferenciar valor original, valor calculado, valor simulado e valor exibido.
- Nao tratar comentario antigo como verdade normativa sem confirmar em manual oficial.
- Nao substituir valor da RFB por calculo local sem trilha de auditoria.
- Preferir regras por tipo de credito quando os manuais indicarem especificidade.
- Para Ressarcimento de IPI, limitar o escopo tecnico deste ciclo ao calculo da SELIC do credito. As demais regras operacionais do roteiro de IPI, como RAIPI, apuracao trimestral, estornos e preenchimento detalhado do PER, ficam registradas como contexto normativo, mas nao como objetivo de implementacao.

## Inventario Inicial de Fontes em `Knowledge/`

Observacao operacional: em 2026-06-07 o usuario informou que os PDFs foram convertidos para arquivos `.md` na pasta `Knowledge/`. A auditoria passa a usar os Markdown como fonte de leitura corrente, preservando a referencia aos roteiros oficiais originais e recorrendo ao PDF apenas quando for necessario confirmar paginacao, imagem ou layout.

| Fonte | Uso esperado na auditoria |
| --- | --- |
| `Selic_Acumulada_ate_06.2026.pdf` | Conferir tabela SELIC acumulada usada como referencia, escopo temporal e limites de aplicacao. |
| `per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf` | Auditar saldo negativo de IRPJ/CSLL, marco de atualizacao e informacao do credito. |
| `per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf` | Auditar pagamento indevido ou a maior e regras de informacao/compensacao. |
| `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf` | Auditar credito judicial, restricoes, habilitacao e atualizacao. |
| `per_dcomp-web_-retencao-previdenciaria-pessoa-juridica.pdf` | Auditar retencao previdenciaria PJ. |
| `per_dcomp-web_-salario-familia-e-salario-maternidade-pessoa-juridica.pdf` | Auditar salario-familia e salario-maternidade PJ. |
| `per_dcomp-web_ressarcimento-de-ipi.pdf` | Usar como contexto de ressarcimento de IPI, sem transformar todas as regras operacionais em requisitos da aplicacao. |
| `IN RFB n. 2.055/2021`, arts. 148 e seguintes; consulta oficial `https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/122002` | Auditar especificamente a SELIC/valoracao dos creditos, inclusive IPI. |
| `per_dcomp-web_-ressarcimento-de-pis_pasep-e-cofins-nao-cumulativos.pdf` | Auditar ressarcimento de PIS/Pasep e Cofins nao cumulativos. |
| `Orientações PERDCOMP Web - CPIM -PJ_31.05.25.pdf` | Auditar credito de contribuicao previdenciaria indevida ou a maior, pago por GPS e declarado e relacionado ao antigo Sistema SEFIP. |
| `meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf` | Montar matriz de meios permitidos por tipo de credito. |
| `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf` | Auditar vedacoes de creditos/debitos em DCOMP. |
| `per_dcomp-web_-informar-debitos-para-compensacao.pdf` | Auditar informacao de debitos, vencimento, principal, multa, juros e restricoes. |
| `per_dcomp-web_-como-informar-compensacao-de-debito-lancado-de-ofi.pdf` | Auditar compensacao de debito lancado de oficio. |
| `orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.pdf` | Contexto operacional do PER/DCOMP Web. |
| `Lista Completa de Códigos de Receita e suas Descrições.pdf` | Conferir codigos de receita e descricoes usadas na UI/modal. |

## Fontes Gerais Ja Analisadas

### `orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.pdf`

Traz o contexto operacional do PER/DCOMP Web: acesso via e-CAC, perfil de acesso, diferenca entre DCOMP, Pedido de Restituicao, Pedido de Ressarcimento, Pedido de Reembolso e Pedido de Cancelamento. Pontos relevantes para a auditoria:

- DCOMP e usada para quitar debitos com creditos; nao gera pagamento em conta de eventual saldo remanescente.
- PER e usado para recebimento em conta bancaria, variando entre restituicao, ressarcimento e reembolso conforme tipo de credito.
- Pedido de Ressarcimento e obrigatorio para certos creditos nao cumulativos antes de eventual compensacao.
- Pedido de Cancelamento e irreversivel e nao pode ser usado se o documento ja tiver sido analisado ou se o contribuinte tiver sido intimado.
- Para credito de pessoa juridica, o acesso ao PER/DCOMP Web deve ser feito pela matriz, mesmo que o credito tenha sido apurado por filial.
- Em sucessao, o acesso para requerer/utilizar credito deve ser pela sucessora, nao pelo perfil "sucessora atuando como sucedida".

### `meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf`

Traz matriz geral de canais permitidos por tipo de credito. A conclusao principal e que "tipo de credito" nao e apenas rotulo de UI; ele define o meio cabivel: PER/DCOMP Web, Programa PER/DCOMP, formulario/processo, Portal do Simples Nacional, eSocial Simplificado, ECF/EFD-Reinf/EFD-Contribuicoes ou inexistencia de compensacao.

### `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf`

Traz vedacoes transversais aplicaveis a declaracao de compensacao por qualquer meio. A auditoria deve transforma-las em matriz de validacao, especialmente para debitos inscritos em DAU, parcelados, estimativas de IRPJ/CSLL, Simples Nacional, reclamataria trabalhista e compensacao previdenciaria/nao previdenciaria antes/depois da DCTFWeb.

### `per_dcomp-web_-informar-debitos-para-compensacao.pdf`

Traz o funcionamento da etapa 2 da DCOMP: informar e ordenar debitos. Confirma que existem tres fluxos distintos de inclusao de debitos e que multa/juros em atraso sao calculados pelo PER/DCOMP Web com base na data de vencimento e na data de transmissao da DCOMP original, mas o proprio manual alerta que o sistema nao verifica impacto de dia nao util ou pagamento em quotas.

Detalhamento consolidado em `10-BaseGeralPERDCOMPWeb.md`.

## Fontes Especificas Ja Analisadas

### AUD-01 - SELIC e Atualizacao de Creditos

#### `per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf`

Roteiro v23/09/2025, analisado em 2026-06-06, com foco nas paginas 21 a 24. Pontos extraidos:

- credito de Saldo Negativo IRPJ/CSLL deve ser demonstrado na ECF;
- o valor original do credito inicial corresponde ao saldo negativo apurado na ECF;
- o credito original na data de entrega considera o valor original ainda nao utilizado em compensacoes anteriores;
- a SELIC da DCOMP incide desde o mes seguinte ao final do periodo de apuracao ate o mes anterior a entrega, mais 1% no mes corrente;
- nao ha atualizacao se a DCOMP original for apresentada no mesmo mes em que o periodo de apuracao foi finalizado;
- em retificacao, a data de transmissao da DCOMP original e a referencia;
- o credito original utilizado e calculado por divisao do total dos debitos por `(1 + taxa Selic)`.

Atos citados no roteiro: Lei n. 5.172/1966, art. 168, inciso I; IN RFB n. 2.055/2021, arts. 27 e 28; Lei n. 9.430/1996, art. 1, paragrafos 1 e 2; Lei n. 8.981/1995, art. 57.

#### `per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf`

Roteiro v31/05/2025, analisado em 2026-06-06, com foco nas paginas 10 a 12. Pontos extraidos:

- o roteiro trata pagamento indevido ou a maior em DARF e, para MEI, DAE/eSocial;
- o credito se extingue apos 5 anos contados da data de arrecadacao do pagamento;
- o valor original do credito inicial e o valor pago indevidamente ou a maior;
- multa e juros pagos indevidamente podem compor o credito inicial na mesma proporcao do principal indevido;
- a SELIC da DCOMP incide desde o mes seguinte a data do pagamento ate o mes anterior a entrega, mais 1% no mes corrente;
- nao ha atualizacao se a DCOMP original for apresentada no mesmo mes do pagamento;
- em retificacao, a data de transmissao da DCOMP original e a referencia;
- o credito original utilizado e calculado por divisao do total dos debitos por `(1 + taxa Selic)`.

Atos citados no roteiro: Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021; IN RFB n. 2.055/2021, Anexos I e IV, quando o roteiro remete a formulario/processo.

#### `Selic_Acumulada_ate_06.2026.pdf`

Tabela Sicalc emitida em 04/06/2026, analisada em 2026-06-06. Pontos extraidos:

- a tabela apresenta taxa de juros Selic acumulada para pagamento de fevereiro/1995 ate junho/2026;
- o proprio documento orienta usar a taxa correspondente ao mes e ano do vencimento do debito;
- por ser tabela de acrescimos legais para pagamento, seu uso como base tecnica para calculo de credito por subtracao de acumuladas deve ser validado antes de virar regra de producao.

#### `per_dcomp-web_-contribuicao-previdenciaria-indevida-ou-a-maior-pessoa-juridica.pdf`

Roteiro v31/05/2025, analisado em 2026-06-06, com foco nas paginas 9 e 11 a 14. Pontos extraidos:

- o roteiro trata pagamento indevido ou a maior em GPS por pessoa juridica;
- o credito se extingue apos 5 anos contados da data de arrecadacao do pagamento;
- a competencia da GPS e chave operacional: nao e possivel informar mais de uma competencia em um mesmo PER/DCOMP;
- se houve utilizacao parcial do credito em GFIP, deve ser informado o valor original compensado e o valor atualizado informado em GFIP;
- o valor original do credito disponivel corresponde ao credito inicial menos o credito original usado em compensacoes em GFIP;
- multa e juros pagos indevidamente podem compor o credito inicial na mesma proporcao do principal indevido;
- a SELIC da DCOMP incide desde o mes seguinte a data do pagamento ate o mes anterior a entrega, mais 1% no mes corrente;
- se houver mais de um termo inicial de incidencia da SELIC no mesmo PER/DCOMP, o contribuinte deve alterar a taxa se necessario;
- nao ha atualizacao se a DCOMP original for apresentada no mesmo mes do pagamento;
- em retificacao, a data de transmissao da DCOMP original e a referencia;
- o credito original utilizado e calculado por divisao do total dos debitos por `(1 + taxa Selic)`.

Atos citados no roteiro: Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021; IN RFB n. 2.055/2021, Anexos I e IV, quando o roteiro remete a formulario/processo.

#### `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`

Manual de 13/01/2026, analisado em 2026-06-06, com foco nas paginas 3, 4, 10 a 12, 22 a 24, 29, 33 a 34, 43, 46 a 49 e 51 a 52. Pontos extraidos:

- o credito judicial exige decisao transitada em julgado e habilitacao previa perante a RFB;
- PER administrativo e vedado; o caminho administrativo descrito e a DCOMP;
- a partir de 15/02/2025, o layout novo coleta componentes do credito judicial quando o consumo do credito se iniciou a partir dessa data;
- no layout antigo, o valor atualizado do credito inicial deve estar atualizado ate a transmissao original da DCOMP, e retificacao nao altera a data considerada;
- no layout novo, a atualizacao e por componente: pagamento/GPS, demais pagamentos, retencao, parcelamento ou demais parcelas;
- componentes podem ser atualizados pela SELIC, por outro indice ou sem atualizacao;
- pagamentos e parcelamentos atualizados pela SELIC usam mes seguinte a data de arrecadacao ate o mes anterior a entrega da DCOMP original, mais 1%;
- retencao previdenciaria usa o segundo mes seguinte ao mes da competencia; retencao nao previdenciaria usa o mes seguinte ao mes da retencao;
- demais parcelas usam o campo "Mes Inicial de Incidencia da Selic", conforme decisao judicial; se omissa, o manual remete aos arts. 149 a 152 da IN RFB n. 1.717/2017;
- o consumo e calculado por componente, na ordem do mais antigo para o mais recente, convertendo credito atualizado utilizado em credito original utilizado por proporcao entre valor original e valor atualizado;
- quando ha descarte do detalhamento, o total do credito original utilizado e calculado por `Credito Original na Data de Entrega / Credito Atualizado na Data de Entrega * Total dos Debitos`.

Atos citados no manual: Decreto n. 20.910/1932, art. 1; IN RFB n. 2.055/2021, art. 106; Parecer Normativo Cosit n. 11/2014; Lei n. 9.430/1996, art. 74-A; Portaria Normativa MF n. 14/2024; IN RFB n. 1.717/2017, arts. 149 a 152.

#### `per_dcomp-web_-retencao-previdenciaria-pessoa-juridica.pdf`

Roteiro v31/05/2025, analisado em 2026-06-06, com foco nas paginas 1, 6 a 12. Pontos extraidos:

- o roteiro trata retencao previdenciaria sofrida por pessoa juridica, Lei n. 9.711/1998;
- deve ser usado apenas para competencia de credito a partir de agosto/2018 e quando houver obrigatoriedade de EFD-Reinf na competencia;
- o credito pode ser solicitado ou compensado se houver saldo apos deducao nas contribuicoes previdenciarias devidas na competencia, deducao esta realizada diretamente na DCTFWeb ou informada em GFIP conforme periodo;
- o evento EFD-Reinf relevante e o R-2020, relativo a retencoes sofridas pelo prestador/contratado; o R-2010, de tomador/fonte pagadora, nao e o evento do credito tratado;
- nao e possivel informar mais de uma competencia em um mesmo PER/DCOMP;
- o valor original do credito inicial e a diferenca entre total das retencoes e total das deducoes;
- a SELIC da DCOMP incide desde o segundo mes seguinte ao da competencia ate o mes anterior a entrega, mais 1% no mes corrente;
- nao ha atualizacao se a DCOMP original for apresentada no mesmo mes ou no mes seguinte a competencia;
- em retificacao, a data de transmissao da DCOMP original e a referencia;
- o credito original utilizado e calculado por divisao do total dos debitos por `(1 + taxa Selic)`.

Atos citados no roteiro: Lei n. 9.711/1998; Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021.

#### `per_dcomp-web_-salario-familia-e-salario-maternidade-pessoa-juridica.pdf`

Roteiro v21/06/2024, analisado em 2026-06-06, com foco nas paginas 1, 5, 7 e 8. Pontos extraidos:

- o roteiro trata pessoas juridicas obrigadas a DCTFWeb que pagaram quotas de salario-familia ou salario-maternidade;
- apos deducao nas contribuicoes previdenciarias da competencia, eventual saldo credor e solicitado por Pedido de Reembolso;
- declaracao de compensacao e vedada para esse credito;
- e obrigatorio que tenha ocorrido envio previo do eSocial e da DCTFWeb com os valores pagos;
- nao e possivel informar mais de uma competencia em um mesmo PER/DCOMP;
- o credito passivel de reembolso e a soma dos saldos de salario-familia e salario-maternidade apurados pela diferenca entre valor do credito e valor da deducao;
- ha atualizacao do credito pela SELIC no reembolso, mas o valor atualizado nao e calculado pelo PER/DCOMP Web porque a atualizacao ocorre ate a data em que o valor for pago ao contribuinte, nao ate a transmissao do pedido.

Atos citados no roteiro: IN RFB n. 2.055/2021, art. 76, inciso XV; Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021.

#### `per_dcomp-web_-ressarcimento-de-pis_pasep-e-cofins-nao-cumulativos.pdf`

Roteiro convertido para Markdown, analisado em 2026-06-07, com foco nas etapas "Pedido de Ressarcimento x Declaracao de Compensacao" e "Demonstrativo do Credito". Pontos extraidos:

- o roteiro trata creditos de PIS/Pasep e Cofins nao cumulativos, instituidos pelas Leis n. 10.637/2002 e 10.833/2003;
- o fluxo exige distinguir Pedido de Ressarcimento de Declaracao de Compensacao;
- como regra, a DCOMP e transmitida apos pedido de ressarcimento anterior; ha excecoes para determinadas bases legais quando a DCOMP e apresentada antes do encerramento do trimestre do credito;
- o valor original na data de entrega da DCOMP posterior a PER corresponde ao valor do pedido de ressarcimento, na primeira DCOMP, ou ao saldo original remanescente apos compensacoes anteriores;
- a SELIC acumulada, em DCOMP posterior a PER, incide desde o mes seguinte ao do 361 dia contado da transmissao do pedido de ressarcimento original ate o mes anterior a data de entrega da DCOMP, mais 1%;
- em retificacao, permanece relevante a data de entrega da declaracao de compensacao original;
- o credito original utilizado e calculado por divisao do total dos debitos por `(1 + taxa Selic)`;
- em pedido de ressarcimento sem DCOMP, o roteiro indica atualizacao pela SELIC, mas o valor atualizado nao e calculado pelo PER/DCOMP Web na transmissao do pedido, pois depende da data de pagamento ao contribuinte.

Atos citados no roteiro: Leis n. 10.637/2002 e 10.833/2003; Lei n. 5.172/1966, art. 168, inciso I; Solucao de Consulta Cosit n. 125/2021; IN RFB n. 2.055/2021, Anexos I e IV, quando o roteiro remete a SCP/processo.

#### `per_dcomp-web_ressarcimento-de-ipi.pdf`

Roteiro convertido para Markdown, analisado em 2026-06-07, com foco nas secoes introdutorias, identificacao do credito, estorno de ressarcimento e demonstrativo. Pontos extraidos:

- creditos de IPI podem ser usados na escrita fiscal para deducao de debitos de IPI, mantidos para periodos subsequentes, transferidos em hipoteses especificas ou objeto de pedido de ressarcimento ao final do trimestre;
- para DCOMP de ressarcimento de IPI, o roteiro confirma a necessidade de pedido de ressarcimento previo;
- quando o estabelecimento for contribuinte do IPI, a EFD-ICMS/IPI deve estar transmitida antes do pedido de ressarcimento;
- o pedido de ressarcimento trabalha com tres periodos: trimestre do credito, periodo posterior ate o mes anterior ao PER original e mes corrente;
- para estabelecimento contribuinte, o credito passivel de ressarcimento equivale ao menor valor entre saldo credor RAIPI ajustado, saldo credor de IPI passivel de ressarcimento e menor saldo credor ajustado nos meses subsequentes;
- para estabelecimento nao contribuinte, o credito passivel de ressarcimento e informado pelo contribuinte e o valor do pedido fica limitado ao credito passivel e ao valor da sucessora, quando houver;
- os estornos de ressarcimento sao alocados ao periodo efetivo do pedido, nao necessariamente ao periodo de escrituracao informado;
- o roteiro de IPI nao deve ser tratado como lista integral de requisitos da aplicacao. Para este ciclo, seu uso e contextual: identificar que o credito e de ressarcimento de IPI e que ha PER previo; o calculo de SELIC sera auditado diretamente na IN RFB n. 2.055/2021, arts. 148 e seguintes.

Atos citados no roteiro: IN RFB n. 2.055/2021, arts. 40, 41, 42, 44, paragrafo 3, 45 e 67; Decreto n. 20.910/1932, art. 1; Leis n. 9.363/1996, 10.276/2001 e 9.440/1997; Decreto n. 7.819/2012; Portaria MF n. 134/1992; LC n. 123/2006, art. 23. Fonte complementar de SELIC indicada pelo usuario: IN RFB n. 2.055/2021, arts. 148 e seguintes, consulta oficial em `https://normasinternet2.receita.fazenda.gov.br/#/consulta/externa/122002`.

## Campos Minimos a Mapear por Regra

- Tipo de credito.
- Periodo de apuracao do credito.
- Data inicial de incidencia de SELIC.
- Data final ou marco de entrega/transmissao.
- Valor original do credito.
- Valor do credito na data da transmissao.
- Valor utilizado no PER/DCOMP.
- Debitos compensados: principal, multa, juros e total.
- Situacao, vigencia, retificacao e cancelamento.
- Numero do PER/DCOMP detalhador ou anterior.

## Resultado Esperado por Objeto

Cada arquivo de objeto deve terminar com:

- regra normativa confirmada;
- comportamento atual do codigo;
- divergencias ou lacunas;
- proposta tecnica;
- casos de teste recomendados;
- criterio de aceite.
