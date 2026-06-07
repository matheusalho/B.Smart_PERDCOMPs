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

### Rodada de Auditoria de 2026-06-07

Fontes verificadas:

- `Knowledge/per_dcomp-web_-informar-debitos-para-compensacao.md`, linhas 193 a 205, 243 a 253, 291 a 315, 563 a 573 e 777 a 793.
- `src/components/ModalEdicao.tsx`, linhas 28 a 49, 96 a 105 e 134 a 138.
- `src/components/ModalHipotetica.tsx`, linhas 12 a 19, 76 a 103 e 167 a 175.
- `src/components/TimelineCascata.tsx`, linhas 468 a 474.
- `src/store.ts`, linhas 118 a 172.
- `src/services/CalculoService.ts`, linhas 162 a 196.

Leitura tecnica:

- `ModalEdicao.tsx` permite edicao direta de principal, multa e juros.
- Quando o usuario altera o principal, o modal recalcula multa e juros pela proporcao `novoPrincipal / valorPrincipalOriginal`.
- Se o usuario altera multa ou juros diretamente, o modal apenas soma os componentes e salva o novo total.
- O texto do modal informa que multa e juros serao recalculados proporcionalmente quando o principal for alterado, mas nao declara que isso e uma estimativa/heuristica operacional.
- `store.ts` marca a DCOMP como editada se algum debito difere do original e aciona recalcule da cadeia.
- `CalculoService.ts` descapitaliza DCOMP editada por fator historico: `totalDebitosOriginal / valorUtilizadoPerdcompOriginal`.
- `ModalHipotetica.tsx` coleta codigo de receita, PA, vencimento, principal, multa e juros, mas nao coleta data de transmissao da DCOMP hipotetica.
- `TimelineCascata.tsx` cria a DCOMP hipotetica com `new Date()` no momento da confirmacao.
- `store.ts` grava debitos simulados com `valorPrincipalOriginal`, `valorMultaOriginal`, `valorJurosOriginal` e `valorTotalOriginal` iguais aos valores digitados pelo usuario. Para DCOMP hipotetica, esses campos representam base simulada, nao valor importado da RFB.
- `CalculoService.ts` calcula DCOMP hipotetica por fator derivado da ultima DCOMP real e soma `getSelicMensal` do mes da ultima transmissao real, nao da data hipotetica.

Regras/evidencias normativas confirmadas nesta rodada:

- O PER/DCOMP Web calcula multa e juros de debito em atraso comparando data de vencimento do debito e data de transmissao da DCOMP original.
- O manual orienta confirmar multa e juros no Sicalc Web.
- Em multa com reducao, o valor informado e o valor compensado podem ser diferentes; a reducao precisa ser tratada expressamente.
- Em lancamento de oficio, a compensacao parcial do debito deve ser realizada na mesma proporcao para principal, multa e juros.
- Juros compensados devem considerar os juros incidentes ate a data de transmissao da declaracao de compensacao.

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

## Achados da Rodada

### ACH-019 - Recalculo proporcional de multa/juros precisa ser metodo declarado

- Objeto relacionado: AUD-07, AUD-08, AUD-10.
- Criticidade: Alta.
- Evidencia normativa:
  - `per_dcomp-web_-informar-debitos-para-compensacao.md`, linhas 193 a 205, 291 a 315 e 777 a 793.
- Evidencia tecnica:
  - `ModalEdicao.tsx`, linhas 28 a 49 e 134 a 138.
- Descricao:
  - O modal recalcula multa e juros proporcionalmente quando o principal e alterado.
  - A regra normativa de multa/juros em atraso depende de data de vencimento e data de transmissao da DCOMP original, com recomendacao de conferencia no Sicalc.
  - A proporcionalidade e expressamente relevante para alguns cenarios de compensacao parcial/lancamento de oficio, mas nao substitui o calculo de acrescimos legais em todos os debitos.
- Risco:
  - Usuario pode interpretar a proporcionalidade como recalculo normativo universal de multa/juros.
- Diretriz:
  - Manter o metodo como `estimativa_proporcional` ou `proporcional_lancamento_oficio` conforme o caso.
  - Exibir alerta e registrar no relatorio quando multa/juros nao forem recalculados por motor normativo/Sicalc.

### ACH-020 - DCOMP hipotetica nao captura data de transmissao como premissa do usuario

- Objeto relacionado: AUD-01, AUD-07, AUD-08.
- Criticidade: Critica.
- Evidencia tecnica:
  - `ModalHipotetica.tsx`, linhas 12 a 19 e 76 a 103.
  - `TimelineCascata.tsx`, linhas 468 a 474.
  - `store.ts`, linhas 156 a 172.
- Descricao:
  - A data de transmissao da DCOMP hipotetica e criada com `new Date()` no momento da confirmacao, nao informada ou revisada pelo usuario.
  - A data de transmissao define o termo final da SELIC e a regra de dia nao util.
- Risco:
  - A simulacao pode mudar de resultado por data de uso da ferramenta, e nao por premissa consciente do usuario.
  - Relatorio futuro pode nao conseguir explicar o termo final usado.
- Diretriz:
  - Modal hipotetico deve exigir ou exibir `dataTransmissaoHipotetica`, com origem `informada_usuario` ou `default_sistema`.
  - A data de valoracao calculada pelo art. 157 deve ser separada de `dataTransmissaoOriginal`.

### ACH-021 - Campos `...Original` de DCOMP hipotetica representam base simulada, nao RFB

- Objeto relacionado: AUD-05, AUD-07, AUD-08.
- Criticidade: Alta.
- Evidencia tecnica:
  - `store.ts`, linhas 129 a 142 e 156 a 172.
- Descricao:
  - Ao criar debitos simulados, o store preenche `valorPrincipalOriginal`, `valorMultaOriginal`, `valorJurosOriginal` e `valorTotalOriginal` com os valores digitados.
  - Para uma DCOMP hipotetica, esses valores nao vieram da RFB; sao o baseline da propria simulacao.
- Risco:
  - UI/PDF podem tratar `...Original` como importado da RFB em uma DCOMP hipotetica.
- Diretriz:
  - Acrescentar origem de documento/valor: `importado_rfb` versus `simulado_usuario`.
  - Para hipotetica, preservar os campos como baseline simulado, mas nunca descreve-los como "original RFB".

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

## Desenho Tecnico Proposto

### Edicao manual de debitos

Criar metadados por debito editado:

```ts
type MetodoEdicaoDebito =
  | 'informado_usuario'
  | 'estimativa_proporcional'
  | 'proporcional_lancamento_oficio'
  | 'sicalc_confirmado'
  | 'dados_insuficientes';

type AuditoriaEdicaoDebito = {
  origemValoresOriginais: 'importado_rfb' | 'simulado_usuario';
  metodoPrincipal: MetodoEdicaoDebito;
  metodoMulta: MetodoEdicaoDebito;
  metodoJuros: MetodoEdicaoDebito;
  dataVencimentoDebito?: string;
  dataTransmissaoReferencia?: string;
  reducaoMultaAplicada?: number;
  observacoes: string[];
};
```

Regras:

- Alteracao proporcional automatica deve ser registrada como estimativa, salvo quando o tipo de debito/cenario confirmar proporcionalidade obrigatoria.
- Valores informados manualmente pelo usuario devem ser marcados como `informado_usuario`.
- Quando multa/juros dependerem de Sicalc, o app deve exibir alerta e permitir marcar conferencia externa.

### DCOMP hipotetica

Campos minimos futuros:

- `dataTransmissaoHipotetica`;
- `origemDataTransmissaoHipotetica`: `informada_usuario` ou `default_sistema`;
- `dataEntregaValoracao`, calculada por regra de dia util quando aplicavel;
- `metodoConsumoCredito`: `normativo_selic`, `estimativa_historica`, `dados_insuficientes`;
- `origemValores`: `simulado_usuario`;
- `dadosAusentes` e `hipoteses`.

Regra de apresentacao:

- A DCOMP hipotetica deve sempre aparecer como simulacao, nao como documento importado.
- Se `SelicService` nao tiver dados suficientes, manter consumo por fator historico apenas como estimativa operacional declarada.

## Criterios de Aceite

- Usuario consegue ver claramente o que foi importado e o que foi simulado.
- Toda simulacao possui metodo rastreavel.
- Ajustes futuros preservam os campos `...Original`.
- DCOMP hipotetica possui data de transmissao auditavel e nao dependente apenas do momento de clique.
- Multa/juros proporcionais sao identificados como estimativa ou como regra aplicavel ao caso, com fonte.
- Relatorio diferencia baseline simulado de valor original importado da RFB.
