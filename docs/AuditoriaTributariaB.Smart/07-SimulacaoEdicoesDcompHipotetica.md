# AUD-07 - Simulacao, Edicoes Manuais e DCOMP Hipotetica

## Descricao do Objeto

Auditar a camada de simulacao do usuario: reducao de debitos, recalculo proporcional de multa/juros, inclusao de DCOMP hipotetica, propagacao em cascata e exibicao de impactos.

## Criticidade

Critica.

## Codigo Relacionado

- `src/store.ts`
- `src/components/ModalEdicao.tsx`
- `src/components/ModalHipotetica.tsx`
- `src/services/CalculoService.ts`
- `src/components/TimelineCascata.tsx`

## Comportamento Atual do Codigo

- A edicao manual permite alterar principal, multa e juros de debitos.
- Ao alterar principal, multa e juros sao recalculados proporcionalmente no modal.
- O estado marca a DCOMP como editada quando algum debito difere do original.
- O recalculo em cascata estima novo credito original consumido.
- DCOMP hipotetica cria debitos simulados e calcula consumo por fator derivado da ultima DCOMP real.

## Conhecimento Geral Ja Extraido

Fonte principal: `Knowledge/per_dcomp-web_-informar-debitos-para-compensacao.pdf`.

O PER/DCOMP Web distingue tres formas de inclusao de debitos:

- importar debitos em cobranca;
- importar debitos DCTFWeb;
- informar debito manualmente.

O manual confirma que, na etapa de debitos, ha diferenca entre:

- saldo devedor/saldo a pagar;
- valor a compensar;
- valores informados;
- valores compensados;
- principal, multa e juros;
- data de vencimento;
- data de transmissao da DCOMP original;
- dados de processo;
- reducoes de multa.

O PER/DCOMP Web calcula automaticamente multa e juros em atraso usando a data de vencimento do debito e a data de transmissao da DCOMP original, mas alerta que nao verifica dia nao util nem pagamento em quotas. A RFB orienta confirmar valores no Sicalc Web.

## Fragilidades Possiveis

- Recalculo proporcional de multa/juros pode nao refletir regra normativa do debito.
- Reducao de debito atualizado exige descapitalizacao correta para credito original.
- DCOMP hipotetica pode usar SELIC aproximada.
- Simulacao pode ser confundida com valor importado se a UI ou relatorio nao distinguirem metodo.
- O modelo atual pode nao separar adequadamente valor informado, valor compensado, saldo a pagar e reducao de multa.
- Lancamento de oficio exige compensacao parcial na mesma proporcao para principal, multa e juros, regra que precisa ser validada contra o comportamento do modal.

## Achado Inicial

Relacionado ao ACH-001:

- edicoes manuais usam fator empirico historico;
- DCOMP hipotetica usa aproximacao derivada da ultima DCOMP real;
- ambos precisam ser auditados contra regra normativa de SELIC e tipo de credito.

## Impacto da Rodada AUD-01 em 2026-06-06

Fontes especificas lidas:

- `per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf`, paginas 21 a 24.
- `per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf`, paginas 10 a 12.

Conclusao para simulacoes:

- A reducao de debitos em DCOMP real editada deve, quando houver engine normativa autorizada, recalcular o credito original utilizado por descapitalizacao do novo total dos debitos por `(1 + taxa Selic)`; a taxa depende do tipo de credito e dos marcos temporais normativos.
- O fator historico atual (`totalDebitosOriginal / valorUtilizadoPerdcompOriginal`) e uma estimativa operacional aceitavel apenas enquanto preservada a rastreabilidade e enquanto o relatorio nao a apresentar como regra normativa.
- A DCOMP hipotetica nao deve derivar SELIC apenas da ultima DCOMP real. Ela precisa de data de transmissao hipotetica, tipo de credito, marco inicial normativo e fonte da tabela/taxa.
- Em retificacao, a data de transmissao da DCOMP original permanece relevante para a SELIC; uma simulacao de retificadora nao deve recalcular a taxa com base apenas na data em que o usuario simulou a alteracao.
- Nenhuma dessas correcoes deve alterar `valorUtilizadoPerdcompOriginal`, `valorTotalCreditoDetalhadoOriginal`, `valorPrincipalOriginal`, `valorMultaOriginal`, `valorJurosOriginal` ou `valorTotalOriginal`.

## Perguntas de Auditoria

- O usuario quer simular reducao de principal, total atualizado ou credito original consumido?
- Como a RFB calcula juros/multa para o debito informado?
- Quando a simulacao deve ser marcada como estimativa?
- Como mostrar o metodo de calculo usado em cada linha?

## Possiveis Solucoes

- Adicionar campo de metodologia de simulacao por DCOMP.
- Permitir modo "estimativa historica" e, futuramente, modo "normativo validado".
- Criar alerta quando regra de SELIC/tipo de credito ainda nao estiver validada.
- Encapsular a descapitalizacao em servico testavel.
- Criar estrutura de debito simulavel com campos separados para `valorInformado`, `valorCompensado`, `saldoDevedor`, `reducaoAplicada`, `dataVencimento`, `dataTransmissaoOriginalReferencia` e `metodoCalculoAcrescimos`.

## Criterios de Aceite

- Usuario consegue ver claramente o que foi importado e o que foi simulado.
- Toda simulacao possui metodo rastreavel.
- Ajustes futuros preservam os campos `...Original`.
