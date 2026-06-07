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
- `per_dcomp-web_-contribuicao-previdenciaria-indevida-ou-a-maior-pessoa-juridica.pdf`, paginas 9 e 11 a 14.
- `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`, paginas 3, 4, 10 a 12, 22 a 24, 29, 33 a 34, 43, 46 a 49 e 51 a 52.
- `per_dcomp-web_-retencao-previdenciaria-pessoa-juridica.pdf`, paginas 1, 6 a 12.
- `per_dcomp-web_-salario-familia-e-salario-maternidade-pessoa-juridica.pdf`, paginas 1, 5, 7 e 8.
- `per_dcomp-web_-ressarcimento-de-pis_pasep-e-cofins-nao-cumulativos.pdf`, demonstrativo do credito.
- `per_dcomp-web_ressarcimento-de-ipi.pdf`, introducao, identificacao do credito e demonstrativo.

Conclusao para simulacoes:

- A reducao de debitos em DCOMP real editada deve, quando houver engine normativa autorizada, recalcular o credito original utilizado por descapitalizacao do novo total dos debitos por `(1 + taxa Selic)`; a taxa depende do tipo de credito e dos marcos temporais normativos.
- O fator historico atual (`totalDebitosOriginal / valorUtilizadoPerdcompOriginal`) e uma estimativa operacional aceitavel apenas enquanto preservada a rastreabilidade e enquanto o relatorio nao a apresentar como regra normativa.
- A DCOMP hipotetica nao deve derivar SELIC apenas da ultima DCOMP real. Ela precisa de data de transmissao hipotetica, tipo de credito, marco inicial normativo e fonte da tabela/taxa.
- Em retificacao, a data de transmissao da DCOMP original permanece relevante para a SELIC; uma simulacao de retificadora nao deve recalcular a taxa com base apenas na data em que o usuario simulou a alteracao.
- Para contribuicao previdenciaria indevida ou a maior em GPS, a simulacao precisa considerar compensacoes anteriores em GFIP e possivel existencia de multiplos termos iniciais de SELIC no mesmo PER/DCOMP.
- Para retencao previdenciaria PJ, a simulacao precisa considerar competencia unica, EFD-Reinf R-2020/DCTFWeb ou GFIP e marco SELIC no segundo mes seguinte ao da competencia.
- Para salario-familia e salario-maternidade PJ, a simulacao de DCOMP deve ser bloqueada ou marcada como vedada/fora de escopo, pois o manual trata Pedido de Reembolso e veda declaracao de compensacao.
- Para credito oriundo de acao judicial, uma DCOMP hipotetica so pode ser tratada como normativa se houver dados de componente do credito, forma de atualizacao, valor original/atualizado e ordem de consumo. Sem isso, o resultado deve permanecer como estimativa ou dependente de informacao complementar.
- Para ressarcimento de PIS/Pasep e Cofins nao cumulativos, uma DCOMP hipotetica posterior a PER precisa identificar o pedido de ressarcimento original, sua data de transmissao e o saldo original remanescente. O marco inicial da SELIC e o mes seguinte ao do 361 dia contado da transmissao do PER original, nao o trimestre do credito.
- Para ressarcimento de PIS/Pasep e Cofins nao cumulativos sem PER previo, nas hipoteses admitidas pelo roteiro, a simulacao ainda nao deve aplicar automaticamente a regra de DCOMP posterior a PER; e necessario confirmar o fluxo real/campo de SELIC antes de automatizar.
- Para ressarcimento de IPI, a simulacao nao deve tentar reconstruir a apuracao completa do roteiro de IPI, como RAIPI, trimestre, estornos e menor saldo ajustado. Neste ciclo, a aplicacao deve usar o valor original/base importada ou informada e calcular apenas a SELIC do credito conforme art. 152 da IN RFB n. 2.055/2021: termo inicial no mes subsequente ao 361 dia do PER original e termo final pela DCOMP original, quando for compensacao declarada.
- Para todos os tipos com regra SELIC confirmada, se a DCOMP hipotetica ou simulada cair em dia nao util, a simulacao precisa aplicar a regra do art. 157 da IN RFB n. 2.055/2021 antes de definir o mes de valoracao.
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
