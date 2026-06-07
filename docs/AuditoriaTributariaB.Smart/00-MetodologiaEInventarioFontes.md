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

## Inventario Inicial de Fontes em `Knowledge/`

| Fonte | Uso esperado na auditoria |
| --- | --- |
| `Selic_Acumulada_ate_06.2026.pdf` | Conferir tabela SELIC acumulada usada como referencia, escopo temporal e limites de aplicacao. |
| `per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf` | Auditar saldo negativo de IRPJ/CSLL, marco de atualizacao e informacao do credito. |
| `per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf` | Auditar pagamento indevido ou a maior e regras de informacao/compensacao. |
| `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf` | Auditar credito judicial, restricoes, habilitacao e atualizacao. |
| `per_dcomp-web_-retencao-previdenciaria-pessoa-juridica.pdf` | Auditar retencao previdenciaria PJ. |
| `per_dcomp-web_-salario-familia-e-salario-maternidade-pessoa-juridica.pdf` | Auditar salario-familia e salario-maternidade PJ. |
| `per_dcomp-web_ressarcimento-de-ipi.pdf` | Auditar ressarcimento de IPI. |
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
