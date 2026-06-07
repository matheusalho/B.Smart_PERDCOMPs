# Base Geral PER/DCOMP Web, Meios Permitidos e Vedacoes

Atualizado em: 2026-06-06

## Fontes Lidas Nesta Rodada

| Fonte | Data/versao informada no PDF | Uso na auditoria |
| --- | --- | --- |
| `Knowledge/orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.pdf` | v23/12/2025 | Contexto operacional do PER/DCOMP Web, perfis de acesso, tipos de documento e cancelamento. |
| `Knowledge/meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf` | v25/07/2024 | Matriz de meios permitidos por tipo de credito. |
| `Knowledge/creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf` | v21/07/2025 | Vedacoes legais de creditos/debitos em declaracao de compensacao e tabela pratica de compensacao unificada. |
| `Knowledge/per_dcomp-web_-informar-debitos-para-compensacao.pdf` | Brasilia/DF, 10/06/2025 | Regras operacionais da etapa de informacao e ordenacao de debitos na DCOMP. |

## Conclusoes Gerais

1. PER/DCOMP Web nao e sinonimo de todo o universo PER/DCOMP. A RFB distribui os procedimentos entre PER/DCOMP Web, Programa PER/DCOMP, formulario/processo, Portal do Simples Nacional, eSocial Simplificado e outros caminhos.
2. O tipo de credito define o meio cabivel e pode exigir etapas anteriores, como habilitacao judicial, pedido de ressarcimento ou informacao em ECF/EFD.
3. A DCOMP usa credito para quitar debito; ela nao paga saldo remanescente em conta bancaria.
4. O Pedido de Cancelamento e irreversivel e nao substitui automaticamente a retificacao.
5. A etapa de debitos no PER/DCOMP Web possui tres fluxos distintos: importar debitos em cobranca, importar debitos DCTFWeb e informar debito manualmente.
6. O PER/DCOMP Web calcula multa e juros de debitos em atraso a partir da data de vencimento e da data de transmissao da DCOMP original, mas a RFB alerta que o contribuinte deve confirmar valores no Sicalc Web quando houver dia nao util ou pagamento em quotas.
7. Existem vedacoes aplicaveis a qualquer meio de compensacao, inclusive fora do PER/DCOMP Web.
8. A compensacao unificada exige classificar credito e debito como previdenciario/nao previdenciario e anterior/posterior ao marco de obrigatoriedade da DCTFWeb.

## Impacto Direto para a Aplicacao

### Catalogo de Tipo de Credito

A aplicacao precisa evoluir de comparacoes textuais avulsas para um catalogo normativo de tipos de credito. Esse catalogo deve registrar:

- nome normalizado do tipo de credito;
- aliases possiveis no relatorio e-CAC;
- meio cabivel: PER/DCOMP Web, Programa PER/DCOMP, formulario/processo, Portal do Simples, eSocial Simplificado ou outro;
- se admite DCOMP, PER, ressarcimento, reembolso ou apenas compensacao;
- pre-requisitos, como ECF, EFD-Reinf, EFD-Contribuicoes, habilitacao judicial ou pedido de ressarcimento previo;
- vedacoes especificas;
- manual/fonte oficial.

Rodada de priorizacao em 2026-06-07: a planilha real `Sheets/relatorio.xlsx` trouxe seis tipos de credito a priorizar no primeiro catalogo consultivo:

- `Contribuicao Previdenciaria Indevida ou a Maior`;
- `Credito Oriundo de Acao Judicial`;
- `Pagamento Indevido ou a Maior`;
- `Pagamento Indevido ou a Maior eSocial`;
- `Saldo Negativo de CSLL`;
- `Saldo Negativo de IRPJ`.

Esses tipos devem ser classificados antes dos demais, pois sao os que afetam diretamente o fluxo real atualmente auditado.

### Catalogo de Vedacoes

As vedacoes devem virar uma matriz de validacao, inicialmente consultiva. O app pode alertar o usuario quando o dado importado/simulado indicar potencial vedacao, sem bloquear a auditoria ate que a regra esteja validada em casos reais.

### Debitos e Multa/Juros

O modal atual que altera principal, multa e juros deve ser auditado contra a distincao da RFB entre:

- valores informados;
- valores compensados;
- saldo a pagar/saldo devedor;
- reducao de multa;
- juros compensados;
- data de vencimento;
- data de transmissao da DCOMP original.

O calculo proporcional atual pode ser adequado como simulacao operacional simples, mas nao deve ser tratado como regra normativa final sem validacao.

### Rastreabilidade

Toda validacao futura deve preservar:

- valores importados em `...Original`;
- valores simulados pelo usuario;
- valores calculados pelo motor;
- metodologia usada;
- fonte normativa.

## Matriz Resumida de Meios por Tipo de Credito

| Grupo/fonte do credito | Meio principal identificado | Observacoes para auditoria |
| --- | --- | --- |
| Pagamento indevido ou a maior em DARF | PER/DCOMP Web, tipo Pagamento Indevido ou a Maior | Ha excecoes para DI/Duimp, comercio exterior, DAU, AFRMM/TUM, reclamataria trabalhista, estimativas, parcelamentos, quotas de IRPF e codigos especificos. |
| Pagamento indevido ou a maior em GPS | PER/DCOMP Web, tipo Contribuicao Previdenciaria Indevida ou a Maior | Excecoes para reclamataria trabalhista e situacoes de retencao recolhida em CNPJ da contratada. |
| Pagamento em DAE/eSocial | Depende do sujeito: eSocial Simplificado, PER/DCOMP Web ou vedacao | Empregador domestico: restituicao pelo eSocial Simplificado e compensacao vedada. Segurado especial/MEI podem ter PER/DCOMP Web em certos casos. |
| Pagamento em DAS Simples Nacional | Portal do Simples Nacional | Regra geral fora do PER/DCOMP Web; DAU e empresa excluida do Simples exigem atencao. |
| Pagamento em DJE | Processo judicial/extrajudicial | Levantamento do deposito no processo correspondente. |
| Pagamento em GRU | Orgao administrador da cobranca | Nao arrecadado pela RFB. |
| Retencao previdenciaria de PF | PER/DCOMP Web, Contribuicao Previdenciaria Indevida ou a Maior | Excecao para produtor rural PF em formulario/processo. |
| Retencao previdenciaria de PJ | Retencao Lei 9.711/98; PER/DCOMP Web ou Programa PER/DCOMP conforme competencia/EFD-Reinf | Retificacao pelo mesmo aplicativo usado no PER/DCOMP original. |
| Retencao CPSSS | Formulario/processo ou orgao pagador | Depende de precatorio/RPV ou folha. |
| Retencao IRPF | DIRPF como regra | Day trade e impossibilidade de DIRPF podem exigir formulario/processo. |
| Retencoes IRPJ/CSLL de nao optante do Simples | Composicao de Saldo Negativo IRPJ/CSLL via ECF e PER/DCOMP Web | Retencao indevida/a maior em receitas imunes/isentas pode ir para formulario/processo. |
| Retencoes PIS/Cofins de nao optante do Simples | Formulario/processo apos EFD-Contribuicoes | Nao e regra geral de PER/DCOMP Web. |
| IRRF Cooperativas | PER/DCOMP Web | Compensa codigos especificos durante o ano e, depois, saldo remanescente. |
| IRRF Juros sobre Capital Proprio | Programa PER/DCOMP durante o ano; saldo negativo depois via ECF/PER/DCOMP Web | Nao tratar automaticamente como PER/DCOMP Web desde a origem. |
| Credito oriundo de acao judicial PJ | PER/DCOMP Web para compensacao | Exige transito em julgado e habilitacao previa; pedido de restituicao/ressarcimento/reembolso e vedado na via administrativa. |
| Credito judicial PF/PF equiparada | Formulario/processo | Fora do fluxo principal do app, salvo se relatorio trouxer cadeia ja transmitida. |
| Salario-familia e salario-maternidade | Reembolso; PER/DCOMP Web ou Programa conforme competencia/DCTFWeb | Declaracao de compensacao e vedada. |
| Ressarcimento de IPI | Pedido de Ressarcimento no Programa PER/DCOMP; depois DCOMP Web | Pedido de ressarcimento previo e parte da regra. |
| Ressarcimento PIS/Cofins nao cumulativos | PER/DCOMP Web a partir de jan/2014; Programa antes disso | SCP tem regra propria por formulario/processo. |
| Reintegra | Pedido de Ressarcimento no Programa PER/DCOMP; depois DCOMP Web | Fluxo em duas etapas. |
| Saldo Negativo IRPJ/CSLL | PER/DCOMP Web via ECF | SCP tem regra propria por formulario/processo. |
| Credito financeiro Lei de Informatica/PADIS | PER/DCOMP Web, apenas compensacao | Exige certificacao previa; sem ressarcimento. |
| Credito financeiro Programa Mover | Formulario/processo | Exige habilitacao previa no MDIC. |

## Vedacoes de Creditos a Transformar em Matriz

| Vedacao | Observacao pratica |
| --- | --- |
| Credito que nao se refira a tributo administrado pela RFB | Mesmo recolhido em DARF, pode estar fora da competencia da RFB; inclui ressalvas sobre Justica do Trabalho. |
| Credito do Simples Nacional | Em regra, tratado no Portal do Simples Nacional. |
| Credito de pagamento de debito inscrito em DAU | Restituicao por processo; compensacao vedada. |
| AFRMM/TUM | Restituicao por formulario especifico; compensacao vedada. |
| Simples Domestico | Pedido proprio no eSocial Simplificado; compensacao vedada. |
| Credito apurado por terceiros | Vedado, salvo eventos especiais como incorporacao, fusao e cisao. |
| Credito judicial sem transito em julgado | Vedado pelo art. 170-A do CTN. |
| Alegacao de inconstitucionalidade sem excecao admitida | Exige enquadramento em excecoes como STF, Senado, sumula vinculante ou sentenca transitada. |
| DIRPF a restituir | Restituicao por deposito/compensacao de oficio, nao DCOMP. |
| Credito nao passivel de restituicao/ressarcimento | Condicao indispensavel, salvo previsao especifica. |
| Refis/Paes/Paex | Vedacao especifica para compensacao. |
| Credito ja nao reconhecido pela RFB | Nova DCOMP vedada; caminho e manifestacao de inconformidade. |
| Credito sob procedimento fiscal | Vedada compensacao apos ciencia do termo de inicio ate encerramento. |
| Quotas de salario-familia/salario-maternidade | Reembolso possivel; DCOMP vedada. |
| Credito judicial acima do limite mensal | Vedado acima do limite do art. 74-A da Lei 9.430/1996 e Portaria Normativa MF 14/2024. |

## Vedacoes de Debitos a Transformar em Matriz

| Vedacao | Observacao pratica |
| --- | --- |
| Debito que nao se refira a tributo administrado pela RFB | Inclui verbas de reclamataria trabalhista sob competencia da Justica do Trabalho. |
| Debito do Simples Nacional | Em regra, compensacao no Portal do Simples Nacional. |
| Debito encaminhado para inscricao em DAU | Vedado em DCOMP. |
| AFRMM/TUM | Vedado. |
| Simples Domestico | Vedado. |
| Debito de DI/Duimp | Vedado, exceto importacao de servicos codigos 5434 e 5442. |
| Debito parcelado | Vedado enquanto parcelado; ressalva para parcelamento cancelado/rescindido. |
| Debito ja compensado anteriormente com compensacao nao homologada ou nao declarada | Vedado. |
| Estimativa mensal IRPJ/CSLL | Vedada a compensacao dos codigos 2362, 5993, 2319, 2484 e 2469 a partir de 30/05/2018. |
| Debitos previdenciarios e nao previdenciarios antes/depois da DCTFWeb | Exigem matriz de compensacao unificada. |
| Debito com credito judicial acima do limite mensal | Vedado quanto ao excedente. |

## Compensacao Unificada: Regra Transversal

As expressoes "anterior" e "posterior" referem-se ao mes em que o contribuinte passou a ser obrigado a entregar a DCTFWeb. Quando o credito e originario de pagamento, inclusive reconhecido judicialmente, a data de apuracao do credito e a data de arrecadacao do pagamento.

| Credito | Debito | Pode compensar? |
| --- | --- | --- |
| Nao previdenciario anterior | Previdenciario anterior | Nao |
| Nao previdenciario anterior | Previdenciario posterior | Nao |
| Nao previdenciario anterior | Nao previdenciario anterior | Sim |
| Nao previdenciario anterior | Nao previdenciario posterior | Sim |
| Nao previdenciario posterior | Previdenciario anterior | Nao |
| Nao previdenciario posterior | Previdenciario posterior | Sim |
| Nao previdenciario posterior | Nao previdenciario anterior | Sim |
| Nao previdenciario posterior | Nao previdenciario posterior | Sim |
| Previdenciario anterior | Previdenciario anterior | Sim, mas no PER/DCOMP apenas se o debito for CPRB; caso contrario, GFIP |
| Previdenciario anterior | Previdenciario posterior | Sim |
| Previdenciario anterior | Nao previdenciario anterior | Nao |
| Previdenciario anterior | Nao previdenciario posterior | Nao |
| Previdenciario posterior | Previdenciario anterior | Nao |
| Previdenciario posterior | Previdenciario posterior | Sim |
| Previdenciario posterior | Nao previdenciario anterior | Nao |
| Previdenciario posterior | Nao previdenciario posterior | Sim |

## Debitos: Campos e Regras Operacionais

### Importar Debitos em Cobranca

- Recupera debitos em aberto nos sistemas de controle da RFB, vencidos ou a vencer, desde que constituidos.
- Nao recupera debitos sem saldo devedor, encaminhados para DAU, parcelados ou oriundos de compensacao nao homologada.
- O contribuinte informa valor a compensar - principal, limitado ao saldo devedor - principal.
- Apos inclusao, e possivel editar apenas informacoes digitadas pelo contribuinte e multa/juros calculados pelo sistema.

### Importar Debitos DCTFWeb

- Exige DCTFWeb transmitida e debito declarado com saldo a pagar.
- Recupera tributos da DCTFWeb, exceto CIDE, IPI e RET/Pagamento Unificado de Tributos.
- Nao permite DCTFWeb de reclamataria trabalhista.
- O contribuinte informa data de vencimento e valor a compensar.
- Debitos com saldo a pagar zero, ja incluidos ou vedados por codigo/extensao nao ficam aptos.

### Informar Debito

- Permite informar manualmente debitos, inclusive previdenciarios desde 07/02/2025.
- Excecoes: contribuicao previdenciaria de obra de construcao civil e retencao previdenciaria codigos 1162-01 e 1141-06, que devem usar importacao.
- Campos relevantes: grupo de tributo, codigo de receita/extensao, periodicidade, periodo de apuracao, data de vencimento, principal, multa, juros e dados de processo.
- Para CIDE, IPI e RET/Pagamento Unificado de Tributos pode ser necessario ajustar a ordem do CNPJ do detentor do debito para estabelecimento.

## Multa, Juros e Reducoes

O PER/DCOMP Web calcula multa e juros de debitos compensados em atraso comparando:

- data de vencimento do debito informada pelo contribuinte; e
- data de transmissao da DCOMP original.

O manual alerta que o sistema nao verifica eventual impacto de dia nao util ou pagamento dividido em quotas. A confirmacao do valor correto deve ser feita por simulacao no Sicalc Web.

Para multas por atraso e lancamentos de oficio:

- valores informados devem refletir o valor integral da notificacao/auto, sem reducao;
- valores compensados devem refletir o valor efetivamente compensado, ja com reducao quando cabivel;
- em compensacao parcial de multa com reducao, a reducao e aplicada proporcionalmente a parte compensada;
- lancamento de oficio exige compensacao parcial na mesma proporcao para principal, multa e juros.

## Implicacoes para Correcoes Futuras

1. Criar catalogo normativo de tipos de credito antes de alterar calculos.
2. Criar catalogo de vedacoes por credito/debito.
3. Criar classificador previdenciario/nao previdenciario e anterior/posterior a DCTFWeb.
4. Separar no modelo os conceitos de valor informado, valor compensado, saldo a pagar/devedor e valores simulados.
5. Registrar no PDF/Excel a metodologia quando multa/juros forem estimados ou alterados pelo usuario.
6. Preservar `...Original` como base importada e auditavel.
