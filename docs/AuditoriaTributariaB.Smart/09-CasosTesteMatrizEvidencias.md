# AUD-09 - Casos de Teste Normativos e Matriz de Evidencias

## Descricao do Objeto

Criar uma matriz transversal de testes e evidencias para validar regras tributarias por tipo de credito, vinculando fonte normativa, comportamento esperado, implementacao e resultado observado.

## Criticidade

Critica.

## Matriz Inicial

| Caso | Tipo de credito | Regra auditada | Fonte normativa | Entrada/fixture | Resultado esperado | Codigo relacionado | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CT-SEL-001 | Saldo negativo IRPJ/CSLL | Marco inicial/final da SELIC | `per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf`, paginas 21 a 24 | Credito de saldo negativo com periodo de apuracao definido, valor original na data de entrega e DCOMP transmitida em mes posterior | Taxa desde o mes seguinte ao final do periodo de apuracao ate o mes anterior a entrega, mais 1%; credito atualizado = credito original na data de entrega x `(1 + taxa)` | Futuro `SelicService`, `CalculoService.ts` | Em especificacao |
| CT-SEL-002 | Pagamento indevido ou a maior | Marco inicial/final da SELIC | `per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf`, paginas 10 a 12 | Pagamento indevido/maior em DARF ou DAE, com data de arrecadacao, valor original e DCOMP transmitida em mes posterior | Taxa desde o mes seguinte a data do pagamento ate o mes anterior a entrega, mais 1%; credito atualizado = credito original na data de entrega x `(1 + taxa)` | Futuro `SelicService`, `CalculoService.ts` | Em especificacao |
| CT-SEL-003 | Saldo negativo IRPJ/CSLL ou pagamento indevido | DCOMP original no mesmo mes do marco inicial material | `per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf`, pagina 23; `per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf`, pagina 11 | DCOMP original apresentada no mesmo mes do encerramento do PA ou no mesmo mes do pagamento | Nao aplicar atualizacao do credito; taxa SELIC igual a zero | Futuro `SelicService`, `CalculoService.ts` | Em especificacao |
| CT-SEL-004 | Qualquer tipo com regra SELIC confirmada | Retificacao e data de transmissao original | `per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf`, pagina 23; `per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf`, pagina 11 | DCOMP retificadora com data posterior a DCOMP original | Calculo da taxa usa a data de transmissao da declaracao de compensacao original | Futuro `SelicService`, `ExcelParser.ts`, `CalculoService.ts` | Em especificacao |
| CT-SEL-005 | Qualquer tipo com regra SELIC confirmada | Descapitalizacao do total de debitos | `per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf`, pagina 24; `per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf`, pagina 12 | Total dos debitos do documento e taxa SELIC decimal conhecida | Credito original utilizado = total dos debitos / `(1 + taxa Selic)`; saldo original = credito original na data de entrega - credito original utilizado | Futuro `SelicService`, `CalculoService.ts` | Em especificacao |
| CT-SEL-006 | Contribuicao Previdenciaria Indevida ou a Maior PJ | Pagamento em GPS e compensacoes em GFIP | `per_dcomp-web_-contribuicao-previdenciaria-indevida-ou-a-maior-pessoa-juridica.pdf`, paginas 9 e 11 a 14 | GPS paga indevidamente, eventual uso parcial em GFIP, valor original disponivel e DCOMP transmitida em mes posterior | Credito original disponivel = credito inicial - credito usado em GFIP; SELIC desde o mes seguinte a data do pagamento; se houver multiplos termos iniciais, exigir taxa por termo ou ajuste manual validado | Futuro `SelicService`, `CreditoRulesService`, `CalculoService.ts` | Em especificacao |
| CT-SEL-007 | Retencao Previdenciaria PJ | Marco SELIC por competencia | `per_dcomp-web_-retencao-previdenciaria-pessoa-juridica.pdf`, paginas 1, 6 a 12 | Credito de retencao Lei 9.711/98, competencia unica, EFD-Reinf R-2020/DCTFWeb ou GFIP, DCOMP transmitida em mes posterior | Valor original = total de retencoes - deducoes; SELIC desde o segundo mes seguinte a competencia ate o mes anterior a entrega, mais 1%; sem atualizacao se transmitida no mesmo mes ou no mes seguinte a competencia | Futuro `SelicService`, `CreditoRulesService`, `CalculoService.ts` | Em especificacao |
| CT-SEL-008 | Salario-Familia e Salario-Maternidade PJ | Reembolso e vedacao de DCOMP | `per_dcomp-web_-salario-familia-e-salario-maternidade-pessoa-juridica.pdf`, paginas 1, 5, 7 e 8 | Credito de salario-familia/maternidade declarado em DCTFWeb com saldo passivel de reembolso | Nao permitir tratar como DCOMP compensavel; registrar que atualizacao pela SELIC ocorre no pagamento do reembolso e nao e calculada pelo PER/DCOMP Web na transmissao | Futuro `CreditoRulesService`, `VedacaoCompensacaoService` | Em especificacao |
| CT-SEL-009 | Credito oriundo de acao judicial | Pre-requisitos e layout | `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`, paginas 3 e 4 | Credito judicial com transito em julgado, habilitacao e data de inicio de consumo | Exigir registro consultivo de transito em julgado/habilitacao; distinguir layout antigo de layout novo quando consumo se iniciou a partir de 15/02/2025 | Futuro `CreditoRulesService` | Em especificacao |
| CT-SEL-010 | Credito judicial - componente pagamento | SELIC por data de arrecadacao | `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`, paginas 22 a 24 e 29 | Componente de pagamento/GPS ou demais documentos, forma de atualizacao SELIC, data de arrecadacao e DCOMP original | SELIC desde o mes seguinte a data de arrecadacao ate o mes anterior a entrega da DCOMP original, mais 1%; valor atualizado = original + original x indice | Futuro `SelicService`, `CreditoJudicialRulesService` | Em especificacao |
| CT-SEL-011 | Credito judicial - retencao | SELIC por tipo de retencao | `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`, paginas 33 a 34 | Componente de retencao previdenciaria e componente de retencao nao previdenciaria | Retencao previdenciaria usa segundo mes seguinte a competencia; retencao nao previdenciaria usa mes seguinte ao mes da retencao | Futuro `SelicService`, `CreditoJudicialRulesService` | Em especificacao |
| CT-SEL-012 | Credito judicial - demais parcelas | Mes inicial conforme decisao judicial | `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`, paginas 46 a 48 | Componente "Demais Parcelas" com forma SELIC e mes inicial informado | Usar o campo "Mes Inicial de Incidencia da Selic"; se decisao judicial for omissa, exigir validacao dos arts. 149 a 152 da IN RFB n. 1.717/2017 antes de automatizar | Futuro `SelicService`, `CreditoJudicialRulesService` | Em especificacao |
| CT-SEL-013 | Credito judicial - consumo por componente | Proporcao original/atualizado e ordem de consumo | `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`, paginas 48, 51 e 52 | Dois ou mais componentes com valores original/atualizado e debitos informados | Consumir componentes do mais antigo para o mais recente; credito original utilizado = original / atualizado x credito atualizado utilizado; preservar saldo original por componente | Futuro `CalculoService`, `CreditoJudicialRulesService` | Em especificacao |
| CT-SEL-014 | Ressarcimento de PIS/Pasep e Cofins nao cumulativos | DCOMP posterior a PER e marco de 361 dias | `per_dcomp-web_-ressarcimento-de-pis_pasep-e-cofins-nao-cumulativos.pdf`, demonstrativo do credito; IN RFB n. 2.055/2021, art. 152 | DCOMP posterior a PER com data de transmissao/protocolo do pedido de ressarcimento original, valor do pedido/saldo original remanescente e data de entrega da DCOMP original | SELIC desde o mes seguinte ao do 361 dia contado da transmissao/protocolo do PER original ate o mes anterior a entrega da DCOMP original, mais 1%; credito original utilizado = total dos debitos / `(1 + taxa Selic)` | Futuro `SelicService`, `CreditoRulesService`, `CalculoService.ts` | Em especificacao |
| CT-SEL-015 | Ressarcimento de PIS/Pasep e Cofins nao cumulativos | DCOMP sem PER previo em excecao operacional | `per_dcomp-web_-ressarcimento-de-pis_pasep-e-cofins-nao-cumulativos.pdf`, secao Pedido de Ressarcimento x Declaracao de Compensacao | DCOMP antes do encerramento do trimestre do credito, em base legal admitida pelo roteiro, sem PER previo | Nao aplicar automaticamente a regra de 361 dias de DCOMP posterior a PER; exigir classificacao do fluxo e validacao do campo SELIC antes de calculo normativo | Futuro `CreditoRulesService`, `SelicService` | Em especificacao |
| CT-SEL-016 | Ressarcimento de IPI | SELIC do credito de IPI, sem apuracao operacional completa | IN RFB n. 2.055/2021, art. 152; `per_dcomp-web_ressarcimento-de-ipi.pdf` apenas como contexto de tipo de credito/PER previo | Credito de IPI com valor original/base importada ou informada, data de protocolo/transmissao do PER original e data de entrega da DCOMP original | Calcular SELIC desde o mes subsequente ao 361 dia contado do PER original ate o mes anterior a entrega da DCOMP original, mais 1%; nao implementar RAIPI, apuracao trimestral, estornos ou demais regras operacionais extensas do roteiro de IPI | Futuro `SelicService`, `CalculoService.ts` | Em especificacao |
| CT-SEL-017 | Qualquer tipo com regra SELIC confirmada | DCOMP transmitida em dia nao util | IN RFB n. 2.055/2021, art. 157 | DCOMP transmitida em sabado/domingo/feriado, com regra SELIC aplicavel e dados completos | Para fins de valoracao do art. 148, considerar a entrega no primeiro dia util subsequente antes de definir mes final e 1% do mes corrente | Futuro `SelicService`, `DateRulesService`, `CalculoService.ts` | Em especificacao |
| CT-CAS-001 | eSocial/CPIM | Multiplos detalhamentos e consumo | Pendente | `Sheets/relatorio.xlsx` | Pendente | `ExcelParser.ts`, `CalculoService.ts` | Nao iniciado |
| CT-RET-001 | Qualquer | Retificacao/cancelamento e vigencia | Pendente | Pendente | Pendente | `statusHelper.ts`, `ExcelParser.ts` | Nao iniciado |
| CT-ORI-001 | Qualquer | Preservacao de `...Original` | Pendente | Pendente | Nenhum campo original alterado | `ExcelParser.ts`, `store.ts`, `CalculoService.ts` | Nao iniciado |
| CT-REL-001 | Qualquer | Rastreabilidade no PDF | Pendente | Simulacao salva | PDF mostra original, novo e delta | `ReportGeneratorService.ts` | Nao iniciado |
| CT-MEI-001 | Varios | Meio cabivel por tipo de credito | `meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf` | Catalogo de tipos | Meio correto identificado | Futuro `CreditoRulesService` | Em especificacao |
| CT-VED-001 | Varios | Credito/debito vedado em DCOMP | `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf` | Credito/debito com vedacao | Alerta ou bloqueio consultivo | Futuro `VedacaoCompensacaoService` | Em especificacao |
| CT-DCTF-001 | Previdenciario/Nao previdenciario | Compensacao unificada antes/depois DCTFWeb | `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf`, secao 3 | 16 combinacoes da tabela pratica | Sim/Nao conforme matriz | Futuro classificador | Em especificacao |
| CT-DEB-001 | Qualquer | Multa/juros por data de vencimento x transmissao original | `per_dcomp-web_-informar-debitos-para-compensacao.pdf` | Debito em atraso | Metodo registrado e alerta Sicalc quando necessario | `ModalEdicao.tsx`, `CalculoService.ts` | Em especificacao |
| CT-CAN-001 | Qualquer | Cancelamento irreversivel e restricoes | `orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.pdf` | Documento analisado/intimado | Cancelamento nao sugerido | Futuro catalogo de status/acoes | Em especificacao |

## Template de Caso de Teste

### Identificacao

- ID:
- Objeto de auditoria:
- Tipo de credito:
- Fonte normativa:
- Arquivo/manual:
- Secao/pagina:

### Regra Esperada

Resumo tecnico da regra.

### Entrada

- Dados importados:
- Edicao/simulacao:
- Datas relevantes:
- Valores relevantes:

### Resultado Esperado

- Valor esperado:
- Status esperado:
- Saldo esperado:
- Relatorio esperado:

### Resultado Observado

- Valor observado:
- Status observado:
- Divergencia:
- Evidencia:

### Decisao

- Status:
- Acao tecnica:
- Risco residual:

## Diretriz para Automatizacao Futura

Comecar com casos manuais e fixtures pequenas. Quando a regra estiver validada, criar testes automatizados de servico para `CalculoService.ts` e helpers relacionados. A automacao deve conferir tambem que campos `...Original` permanecem inalterados.
