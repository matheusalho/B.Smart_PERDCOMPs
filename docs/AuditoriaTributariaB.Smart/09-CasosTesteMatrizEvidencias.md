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
| CT-CAS-001 | eSocial/CPIM | Multiplos detalhamentos e consumo | AUD-04, perfil real de `Sheets/relatorio.xlsx`; fonte normativa pendente por tipo | Cadeia com dois ou mais detalhadores vigentes em `Pagamento Indevido ou a Maior eSocial` ou `Contribuicao Previdenciaria Indevida ou a Maior` | Saldo inicial calculado por pool de detalhadores vigentes; cada abatimento usa credito original utilizado do documento; metodo e origem do pool registrados | Futuro `CascataRule`, `CalculoService.ts` | Em especificacao |
| CT-CAS-002 | Saldo Negativo de IRPJ/CSLL | Credito raiz replicado sem contaminar original | AUD-04; manuais de saldo negativo para contexto SELIC | Cadeia de saldo negativo com DCOMP raiz e DCOMPs subsequentes sem novos detalhamentos independentes | `valorTotalCreditoDetalhadoOriginal` permanece importado; eventual valor replicado para exibicao/calculo recebe origem `replicado_credito_raiz`; relatorio diferencia importado de calculado | Futuro `CascataRule`, `TimelineCascata.tsx`, `ReportGeneratorService.ts` | Em especificacao |
| CT-CAS-003 | Qualquer tipo | Pool sem detalhador vigente identificado | AUD-04; invariantes de rastreabilidade AUD-05 | Cadeia sem documento vigente que satisfaca a regra de detalhador ou com relacionamento ausente/incompleto | Resultado consultivo `dados_insuficientes` ou `fallback_operacional`, com `dadosAusentes`, sem converter divergencia em retificacao conclusiva | Futuro `CascataRule`, `CalculoService.ts` | Em especificacao |
| CT-CAS-004 | Qualquer tipo | Separacao entre status tecnico e acao sugerida | AUD-04; `statusHelper.ts` | Documento vigente ou bloqueado com divergencia maior que cinco centavos entre saldo importado e saldo calculado | Status tecnico registra `divergencia_calculada`; acao sugerida so indica retificacao se regra, dados e status permitirem conclusao consultiva rastreavel | Futuro `CascataRule`, `statusHelper.ts`, `ReportGeneratorService.ts` | Em especificacao |
| CT-CAS-005 | Credito oriundo de acao judicial | Cascata por componentes ou dados insuficientes | `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`; AUD-01/AUD-04 | Credito judicial sem componentes importados ou com componentes informados manualmente | Se componentes ausentes, nao calcular consumo normativo; se presentes, consumir por componente conforme regra judicial e preservar saldo original por componente | Futuro `CreditoJudicialRulesService`, `CalculoService.ts` | Em especificacao |
| CT-RET-001 | Qualquer | Retificacao/cancelamento e vigencia | `orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.md`, linhas 113 a 121; AUD-06 | Status reais da planilha: `Retificado`, `Cancelado`, `Pedido de cancelamento deferido`, `Nao admitido` | Documentos nao vigentes nao participam do consumo ativo; retorno inclui motivo e fonte; cancelamento deferido e tratado como irreversivel | Futuro `StatusRulesService`, `statusHelper.ts`, `ExcelParser.ts` | Em especificacao |
| CT-RET-002 | Qualquer | Normalizacao de status e tipo de documento | AUD-06; `Sheets/relatorio.xlsx` | Casos reais `Pedido de cancelamento deferido | Pedido Cancelamento` e `Nao admitido | Decl. Compensacao` | Classificacao normalizada reconhece nao vigencia/bloqueio independentemente de caixa, acento, hifen/travessao, alias de tipo e padrao numerico do documento | Futuro `StatusRulesService` | Em especificacao |
| CT-RET-003 | Qualquer | Bloqueio de edicao/cancelamento sem retirar historico | `orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.md`, linhas 119 a 121; AUD-06 | Documentos `Analise concluida`, `Homologado`, `Despacho Decisorio Emitido` ou em discussao administrativa | Documento pode permanecer historicamente vigente para consumo, mas deve ser bloqueado para edicao/cancelamento com motivo exibido em UI/PDF | Futuro `StatusRulesService`, `TimelineCascata.tsx`, `ReportGeneratorService.ts` | Em especificacao |
| CT-RET-004 | Qualquer | Separacao entre status e vedacao normativa | `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.md`, linhas 180 a 235; AUD-06 | Documento com status processual ativo, mas debito/credito potencialmente vedado por regra legal | `vigenciaCascata` nao se confunde com `vedacaoNormativa`; alerta consultivo e emitido por catalogo proprio, com fonte e campo que disparou a regra | Futuro `StatusRulesService`, `VedacaoCompensacaoService` | Em especificacao |
| CT-ORI-001 | DCOMP real importada | Preservacao de `...Original` | AUD-05; invariantes da auditoria | Importar `Sheets/relatorio.xlsx`, editar debito, recalcular cascata e salvar simulacao | Nenhum campo `...Original` de DCOMP real ou debito importado e alterado apos parse; deltas usam campos mutaveis/calculados separados | `ExcelParser.ts`, `store.ts`, `CalculoService.ts` | Em especificacao |
| CT-ORI-002 | DCOMP hipotetica | Baseline simulado versus original RFB | AUD-05, AUD-07, AUD-08 | Criar DCOMP hipotetica com debitos digitados pelo usuario | Campos `...Original` da hipotetica sao tratados como baseline `simulado_usuario`; UI/PDF nao os descrevem como importados da RFB | `store.ts`, `ReportGeneratorService.ts` | Em especificacao |
| CT-ORI-003 | Qualquer | Origem de valor por campo | AUD-05, AUD-11 | Documento com valor importado, calculado, simulado, replicado e fallback | Cada valor exportado/relatado possui origem dentre `importado_rfb`, `calculado_motor`, `simulado_usuario`, `replicado_credito_raiz`, `fallback_operacional` ou `exibido_formatado` | Futuro metadado de auditoria | Em especificacao |
| CT-REL-001 | Qualquer | Rastreabilidade no PDF | AUD-08; invariantes AUD-05 | Simulacao salva com edicao manual de debito e recalculo de cascata | PDF mostra valor importado/original, valor simulado/recalculado, delta, origem do valor e metodo de calculo; nao usa `Correto` para estimativa operacional | `ReportGeneratorService.ts` | Em especificacao |
| CT-REL-002 | DCOMP hipotetica | Premissas de calculo em PDF | AUD-01, AUD-07, AUD-08 | Simulacao salva com DCOMP hipotetica antes da implementacao normativa de SELIC | PDF identifica DCOMP como hipotetica/simulada e informa que consumo de credito e estimativa operacional quando `SelicService` normativo nao estiver disponivel | `ReportGeneratorService.ts`, `ModalHipotetica.tsx` | Em especificacao |
| CT-REL-003 | Qualquer tipo com regra SELIC | Secao de metodologia/fonte | AUD-01, AUD-08, FX-SEL-001 a FX-SEL-008 | Simulacao com calculo SELIC normativo, estimado e caso de dados insuficientes | PDF lista `statusCalculo`, fonte normativa, taxa, termo inicial/final, hipoteses e dados ausentes por cadeia/documento | Futuro `SelicService`, `ReportGeneratorService.ts` | Em especificacao |
| CT-REL-004 | Qualquer | Exportacao Excel futura | AUD-08 | Exportacao de simulacao com cascata, debitos, status e SELIC | Excel possui abas `Resumo`, `Premissas`, `Cascata`, `Debitos`, `SELIC`, `StatusVigencia` e `Evidencias`, preservando campos `...Original` e deltas | Futuro exportador Excel | Em especificacao |
| CT-MEI-001 | Varios | Meio cabivel por tipo de credito | `meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf` | Catalogo de tipos | Meio correto identificado | Futuro `CreditoRulesService` | Em especificacao |
| CT-VED-001 | Varios | Credito/debito vedado em DCOMP | `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf` | Credito/debito com vedacao | Alerta ou bloqueio consultivo | Futuro `VedacaoCompensacaoService` | Em especificacao |
| CT-DCTF-001 | Previdenciario/Nao previdenciario | Compensacao unificada antes/depois DCTFWeb | `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf`, secao 3 | 16 combinacoes da tabela pratica | Sim/Nao conforme matriz | Futuro classificador | Em especificacao |
| CT-IMP-001 | Importacao e-CAC | Documentos sem cadeia relacional | AUD-03; `Sheets/relatorio.xlsx` | Planilha com linhas em `Processamento PERDCOMP` sem `IDs da Cadeia Relacional` | Parser/relatorio de qualidade lista documentos ignorados com motivo `sem_cadeia_relacional`; usuario consegue ver que nao entraram na cascata | `ExcelParser.ts`, futuro `ImportQualityReport` | Em especificacao |
| CT-IMP-002 | Importacao e-CAC | Data ausente ou invalida | AUD-03; invariantes AUD-05 | Linha com campo de data normativo vazio/invalido | Campo permanece ausente/invalido em metadado; nao vira `new Date()` para calculo normativo; `dadosAusentes` registra o problema | `ExcelParser.ts`, futuro validador | Em especificacao |
| CT-IMP-003 | Importacao e-CAC | Valor ausente versus zero importado | AUD-03; invariantes AUD-05 | Linha com valor monetario vazio e outra com valor monetario zero | Parser distingue ausente de zero importado para fins normativos e relatorio de qualidade | `ExcelParser.ts`, futuro validador | Em especificacao |
| CT-IMP-004 | Importacao e-CAC | Metadados SELIC disponiveis na planilha | AUD-03, FX-SEL-001 a FX-SEL-008 | Aba `Processamento PERDCOMP` com `Data de Arrecadacao`, `Competencia do Credito`, processos e pagamento | Metadados sao preservados em bloco importado/rastreavel; ausencia de componente judicial ou PER original fica em `dadosAusentes` | `ExcelParser.ts`, futuro `MetadadosCreditoImportado` | Em especificacao |
| CT-DEB-001 | Qualquer | Multa/juros por data de vencimento x transmissao original | `per_dcomp-web_-informar-debitos-para-compensacao.pdf` | Debito em atraso | Metodo registrado e alerta Sicalc quando necessario | `ModalEdicao.tsx`, `CalculoService.ts` | Em especificacao |
| CT-DEB-002 | Debito editado | Proporcionalidade de principal/multa/juros | `per_dcomp-web_-informar-debitos-para-compensacao.md`, linhas 291 a 315 e 777 a 793; AUD-07 | Usuario reduz principal em debito com multa e juros importados | Multa/juros recalculados proporcionalmente apenas como metodo declarado; quando o caso for lancamento de oficio/compensacao parcial, validar proporcao principal/multa/juros; quando depender de acrescimos legais, alertar Sicalc | `ModalEdicao.tsx`, futuro metadado de edicao | Em especificacao |
| CT-SIM-001 | DCOMP hipotetica | Data de transmissao auditavel | AUD-01, AUD-07; IN RFB n. 2.055/2021, art. 157 | Usuario cria DCOMP hipotetica | Simulacao registra `dataTransmissaoHipotetica`, origem da data e `dataEntregaValoracao`; nao usa apenas `new Date()` sem rastro | `ModalHipotetica.tsx`, `TimelineCascata.tsx`, `store.ts` | Em especificacao |
| CT-SIM-002 | DCOMP hipotetica | Origem dos valores `...Original` | AUD-05, AUD-07, AUD-08 | Debito simulado digitado pelo usuario | Campos `...Original` da hipotetica sao preservados como baseline simulado e exibidos com origem `simulado_usuario`, nao como importado RFB | `store.ts`, `ReportGeneratorService.ts` | Em especificacao |
| CT-SIM-003 | DCOMP hipotetica | Consumo por SELIC ou estimativa | AUD-01, AUD-07, FX-SEL-001 a FX-SEL-008 | DCOMP hipotetica com tipo de credito e dados completos/incompletos | Se dados completos, usar resultado normativo futuro; se incompletos, `statusCalculo = dados_insuficientes` ou `estimativa_historica`, com metodologia no PDF/UI | Futuro `SelicService`, `CalculoService.ts` | Em especificacao |
| CT-CAN-001 | Qualquer | Cancelamento irreversivel e restricoes | `orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.pdf` | Documento analisado/intimado | Cancelamento nao sugerido | Futuro catalogo de status/acoes | Em especificacao |
| CT-MEI-002 | Tipos presentes na planilha real | Classificacao normalizada de tipo de credito | `meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf`; `Sheets/relatorio.xlsx` | Seis tipos reais: pagamento indevido/maior, pagamento indevido/maior eSocial, CPIM, saldo negativo IRPJ, saldo negativo CSLL e credito judicial | Cada tipo classificado com id normalizado, meio cabivel, pre-requisitos e fontes; sem bloqueio automatico | Futuro `CreditoRulesService` | Em especificacao |
| CT-VED-002 | Credito judicial | Transito em julgado, habilitacao e limite mensal | `meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf`, item 4.1; `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf`, itens 1.9, 1.17 e 2.14 | Credito judicial com/sem dados de habilitacao e com valor potencialmente acima do limite | Exibir alerta consultivo sobre habilitacao/transito e limite; nao calcular bloqueio automatico sem dados completos | Futuro `CreditoRulesService`, `VedacaoCompensacaoService` | Em especificacao |
| CT-VED-003 | Debito estimativa IRPJ/CSLL | Vedacao de estimativas mensais desde 30/05/2018 | `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf`, item 2.9 | Debito com codigo 2362, 5993, 2319, 2484 ou 2469 e data posterior ao marco | Alerta consultivo de vedacao de DCOMP para debito de estimativa | Futuro `VedacaoCompensacaoService` | Em especificacao |
| CT-GER-001 | Qualquer | Resultado consultivo coordenado | AUD-10, ACH-025 | Documento com tipo de credito classificavel, debito potencialmente vedado, status processual bloqueado e dado SELIC ausente | Saida separa `meioCabivel`, `vedacaoCredito`, `vedacaoDebito`, `statusProcessual`, `qualidadeImportacao` e `statusCalculoSelic`; UI/PDF explicam cada causa sem reduzir tudo a um booleano | Futuros catalogos consultivos | Em especificacao |

## Fixtures Normativas Minimas para Primeira Implementacao SELIC

Priorizar estes casos para transformar em fixtures automatizadas antes de qualquer alteracao de calculo:

| Fixture | Caso base | Motivo | Dados minimos a fixture deve conter | Resultado de aceite |
| --- | --- | --- | --- | --- |
| FX-SEL-001 | CT-SEL-002 | Pagamento indevido/maior e regra simples por data de pagamento | Tipo de credito, data de arrecadacao, valor original, total de debitos, data da DCOMP original | Taxa pelo mes seguinte ao pagamento; descapitalizacao por `(1 + taxa)`. |
| FX-SEL-002 | CT-SEL-001 | Saldo negativo IRPJ/CSLL | Periodo de apuracao com fim identificavel, valor original, total de debitos, data da DCOMP original | Taxa pelo mes seguinte ao fim do PA; zero se DCOMP no mesmo mes. |
| FX-SEL-003 | CT-SEL-007 | Retencao previdenciaria PJ | Competencia, valor original, deducoes/valor disponivel, data da DCOMP original | Taxa pelo segundo mes seguinte a competencia; zero se DCOMP no mesmo mes ou seguinte. |
| FX-SEL-004 | CT-SEL-014 | PIS/Cofins com PER e 361 dias | Data de protocolo/transmissao do PER original, valor original/saldo, data da DCOMP original | Taxa pelo mes subsequente ao 361 dia do PER original. |
| FX-SEL-005 | CT-SEL-016 | IPI conforme art. 152 | Valor original/base, data do PER original, data da DCOMP original | Mesmo marco do art. 152, sem apuracao operacional de RAIPI. |
| FX-SEL-006 | CT-SEL-010 ou CT-SEL-011 | Credito judicial simples com componente SELIC | Um componente judicial com forma SELIC, data/marco inicial, valor original/atualizado ou total de debitos | Calculo por componente; se componente ausente, nao calcular. |
| FX-SEL-007 | Novo cenario derivado de CT-SEL-005/014/016 | Dados insuficientes | Tipo de credito que exige data de pagamento ou PER original, mas sem esse dado no modelo | Resultado `dados_insuficientes`, com lista objetiva de campos ausentes e sem aproximacao. |
| FX-SEL-008 | CT-SEL-017 | Data de entrega em dia nao util | DCOMP original transmitida em dia nao util e calendario/regra de dia util | Data de valoracao ajustada pelo art. 157 sem alterar `dataTransmissaoOriginal`. |

### Rodada de Especificacao de Fixtures SELIC - 2026-06-07

Fonte tecnica de taxa:

- `Knowledge/Selic_Acumulada_ate_06.2026.pdf`, emitido em 04/06/2026, extraido por `pdftotext`.
- A tabela se identifica como Sicalc - Sistema de Calculo de Acrescimos Legais e orienta usar a taxa correspondente ao mes e ano do vencimento do debito.
- Por cautela, as fixtures abaixo nao fixam taxa numerica derivada por subtracao de acumuladas como verdade normativa de credito. Elas separam:
  - teste de marco/intervalo normativo;
  - teste de formula com `taxaSelicDecimal` conhecida/injetada;
  - teste de indisponibilidade por dado ausente.

#### FX-SEL-001 - Pagamento Indevido ou a Maior PJ

- Caso base: CT-SEL-002 e CT-SEL-005.
- Tipo de credito: `Pagamento Indevido ou a Maior`.
- Fonte normativa: manual de Pagamento Indevido ou a Maior PJ, paginas 10 a 12; AUD-01.
- Entrada minima:
  - `valorCreditoOriginalNaDataEntrega`: 10000.00.
  - `totalDebitosDocumento`: 11500.00.
  - `dataArrecadacaoCredito`: 2024-01-15.
  - `dataTransmissaoOriginal`: 2025-06-10.
  - `taxaSelicDecimal` para teste de formula: 0.15.
- Resultado esperado:
  - termo inicial normativo: mes subsequente ao pagamento, ou seja, 2024-02.
  - termo final normativo: mes anterior a entrega da DCOMP original, com 1% no mes da entrega.
  - se a taxa validada for 0.15, `creditoAtualizado = 11500.00`, `creditoOriginalUtilizado = 10000.00` e `saldoCreditoOriginal = 0.00`.
  - status esperado: `normativo` apenas se `dataArrecadacaoCredito`, `valorCreditoOriginalNaDataEntrega`, `totalDebitosDocumento` e `dataTransmissaoOriginal` estiverem presentes.

#### FX-SEL-002 - Saldo Negativo IRPJ/CSLL

- Caso base: CT-SEL-001, CT-SEL-003 e CT-SEL-005.
- Tipo de credito: `Saldo Negativo de IRPJ` ou `Saldo Negativo de CSLL`.
- Fonte normativa: manual de Saldo Negativo IRPJ/CSLL, paginas 21 a 24; AUD-01.
- Entrada minima:
  - `periodoApuracaoCreditoFim`: 2023-12-31.
  - `valorCreditoOriginalNaDataEntrega`: 100000.00.
  - `totalDebitosDocumento`: 110000.00.
  - `dataTransmissaoOriginal`: 2024-10-16.
  - `taxaSelicDecimal` para teste de formula: 0.10.
- Resultado esperado:
  - termo inicial normativo: mes subsequente ao encerramento do periodo de apuracao, ou seja, 2024-01.
  - termo final normativo: mes anterior a entrega da DCOMP original, com 1% no mes da entrega.
  - se a taxa validada for 0.10, `creditoAtualizado = 110000.00`, `creditoOriginalUtilizado = 100000.00` e `saldoCreditoOriginal = 0.00`.
  - caso derivado de taxa zero: se a DCOMP original for entregue no mesmo mes do encerramento do periodo de apuracao, `taxaSelicDecimal = 0`.

#### FX-SEL-003 - Retencao Previdenciaria PJ

- Caso base: CT-SEL-007 e CT-SEL-005.
- Tipo de credito: retencao previdenciaria Lei n. 9.711/1998.
- Fonte normativa: manual de Retencao Previdenciaria PJ, paginas 1 e 6 a 12; AUD-01.
- Entrada minima:
  - `competenciaCredito`: 2024-01.
  - `valorCreditoOriginalNaDataEntrega`: 50000.00.
  - `totalDebitosDocumento`: 55000.00.
  - `dataTransmissaoOriginal`: 2024-05-20.
  - `taxaSelicDecimal` para teste de formula: 0.10.
- Resultado esperado:
  - termo inicial normativo: segundo mes subsequente a competencia, ou seja, 2024-03.
  - termo final normativo: mes anterior a entrega da DCOMP original, com 1% no mes da entrega.
  - se a taxa validada for 0.10, `creditoAtualizado = 55000.00`, `creditoOriginalUtilizado = 50000.00` e `saldoCreditoOriginal = 0.00`.
  - sem atualizacao se a DCOMP original for entregue no mesmo mes ou no mes seguinte a competencia.

#### FX-SEL-004 - PIS/Cofins com PER original e prazo de 361 dias

- Caso base: CT-SEL-014.
- Tipo de credito: `Ressarcimento de PIS/Pasep e Cofins nao cumulativos`.
- Fonte normativa: manual de Ressarcimento de PIS/Pasep e Cofins nao cumulativos; IN RFB n. 2.055/2021, art. 152; AUD-01.
- Entrada minima:
  - `dataProtocoloPerOriginal`: 2024-01-10.
  - `valorCreditoOriginalNaDataEntrega`: 80000.00.
  - `totalDebitosDocumento`: 88000.00.
  - `dataTransmissaoOriginal`: 2025-04-15.
  - `taxaSelicDecimal` para teste de formula: 0.10.
- Resultado esperado:
  - termo inicial normativo: mes subsequente ao 361 dia contado da data do PER original.
  - termo final normativo: mes anterior a entrega da DCOMP original, com 1% no mes da entrega.
  - se a taxa validada for 0.10, `creditoAtualizado = 88000.00`, `creditoOriginalUtilizado = 80000.00` e `saldoCreditoOriginal = 0.00`.
  - a contagem civil exata do 361 dia deve ficar concentrada em `DateRulesService` e validada antes de automatizacao definitiva.

#### FX-SEL-005 - Ressarcimento de IPI conforme art. 152

- Caso base: CT-SEL-016.
- Tipo de credito: ressarcimento de IPI.
- Fonte normativa: IN RFB n. 2.055/2021, art. 152; roteiro de Ressarcimento de IPI apenas como contexto de tipo de credito/PER previo; AUD-01.
- Entrada minima:
  - `dataProtocoloPerOriginal`: 2024-02-20.
  - `valorCreditoOriginalNaDataEntrega`: 120000.00.
  - `totalDebitosDocumento`: 132000.00.
  - `dataTransmissaoOriginal`: 2025-07-10.
  - `taxaSelicDecimal` para teste de formula: 0.10.
- Resultado esperado:
  - termo inicial normativo: mes subsequente ao 361 dia contado do PER original.
  - termo final normativo: mes anterior a entrega da DCOMP original, com 1% no mes da entrega.
  - se a taxa validada for 0.10, `creditoAtualizado = 132000.00`, `creditoOriginalUtilizado = 120000.00` e `saldoCreditoOriginal = 0.00`.
  - escopo negativo obrigatório: nao implementar RAIPI, apuracao trimestral, estornos ou demais regras operacionais do roteiro de IPI.

#### FX-SEL-006 - Credito Judicial com componente de pagamento e SELIC

- Caso base: CT-SEL-010 e CT-SEL-013.
- Tipo de credito: `Credito Oriundo de Acao Judicial`, layout novo por componente.
- Fonte normativa: manual de Credito Oriundo de Acao Judicial, paginas 22 a 24, 29, 48, 51 e 52; AUD-01.
- Entrada minima:
  - componente unico `pagamento`.
  - `formaAtualizacao`: `SELIC`.
  - `dataArrecadacao`: 2024-03-15.
  - `valorOriginalComponente`: 30000.00.
  - `creditoAtualizadoUtilizado`: 34500.00.
  - `dataTransmissaoOriginal`: 2025-03-20.
  - `taxaSelicDecimal` para teste de formula: 0.15.
- Resultado esperado:
  - termo inicial normativo: mes subsequente a data de arrecadacao.
  - consumo deve ocorrer por componente, preservando saldo original por componente.
  - se a taxa validada for 0.15, `valorAtualizadoComponente = 34500.00` e `creditoOriginalUtilizadoComponente = 30000.00`.
  - se componentes nao estiverem presentes no e-CAC/modelo, status deve ser `dados_insuficientes`, nao fator historico.

#### FX-SEL-007 - Dados Insuficientes

- Caso base: CT-SEL-014, CT-SEL-016 e AUD-03.
- Tipo de credito: PIS/Cofins ou IPI sujeito ao art. 152.
- Fonte normativa: IN RFB n. 2.055/2021, art. 152; AUD-01/AUD-03.
- Entrada minima:
  - `tipoCredito`: ressarcimento sujeito ao art. 152.
  - `valorCreditoOriginalNaDataEntrega`: presente.
  - `totalDebitosDocumento`: presente.
  - `dataTransmissaoOriginal`: presente.
  - `dataProtocoloPerOriginal`: ausente.
- Resultado esperado:
  - `statusCalculo = dados_insuficientes`.
  - `dadosAusentes` inclui `dataProtocoloPerOriginal`.
  - nenhum valor original importado e alterado.
  - o motor nao deve aplicar por analogia a data da DCOMP nem fator historico como resultado normativo.

#### FX-SEL-008 - DCOMP transmitida em dia nao util

- Caso base: CT-SEL-017.
- Tipo de credito: qualquer tipo com regra SELIC confirmada e dados completos.
- Fonte normativa: IN RFB n. 2.055/2021, art. 157; AUD-01.
- Entrada minima:
  - `dataTransmissaoOriginal`: 2025-06-01, domingo.
  - `dataEntregaValoracaoEsperada`: primeiro dia util subsequente, sujeito a calendario aplicavel.
  - demais dados do tipo de credito completos.
- Resultado esperado:
  - `dataTransmissaoOriginal` permanece 2025-06-01.
  - `dataEntregaValoracao` e calculada separadamente.
  - termo final e acrescimo de 1% usam a data de valoracao, sem contaminar o campo original.

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
