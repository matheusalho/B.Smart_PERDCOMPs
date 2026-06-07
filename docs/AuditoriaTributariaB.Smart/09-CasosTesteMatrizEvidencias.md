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
