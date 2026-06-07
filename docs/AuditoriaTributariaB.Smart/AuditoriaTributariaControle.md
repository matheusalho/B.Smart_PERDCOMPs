# Controle Geral da Auditoria Tributaria B.Smart PER/DCOMPs

Atualizado em: 2026-06-07

## Objetivo

Controlar a auditoria tributaria da aplicacao B.Smart PER/DCOMPs, registrando progresso, objetos auditados, criticidade, fragilidades, achados, inconsistencias, evidencias normativas e possiveis solucoes tecnicas.

Esta auditoria deve validar se a aplicacao reproduz corretamente, por tipo de credito, as regras de compensacao, atualizacao, consumo de credito, retificacao, restricoes e rastreabilidade exigidas nos manuais oficiais da Receita Federal do Brasil e nos atos normativos por eles citados.

## Estado Geral

- Status geral: Em preparacao
- Prioridade atual do roadmap: Auditoria Tributaria Guiada por Tipo de Credito
- Fonte normativa primaria: manuais oficiais da RFB em `Knowledge/`
- Fonte tecnica primaria: codigo em `src/`, especialmente `ExcelParser.ts`, `CalculoService.ts`, `store.ts`, UI e servico de relatorio
- Regra operacional central: preservar integralmente campos `...Original`

## Niveis de Criticidade

- Critica: risco direto de resultado tributario incorreto, perda de rastreabilidade ou orientacao equivocada de compensacao.
- Alta: pode gerar divergencia relevante em simulacao, relatorio ou interpretacao pelo usuario.
- Media: afeta confiabilidade, clareza, manutencao ou cobertura de casos relevantes.
- Baixa: melhoria documental, ergonomica ou preventiva sem impacto imediato no calculo.

## Status dos Objetos

- Nao iniciado: arquivo criado, mas sem analise normativa.
- Em analise: manual ou codigo em leitura.
- Achado registrado: ha fragilidade ou divergencia documentada.
- Solucao proposta: ha proposta tecnica, ainda nao implementada.
- Validado normativamente: regra confirmada contra fonte oficial.
- Implementado: ajuste tecnico aplicado.
- Revalidado: lint/build/teste/fluxo real confirmaram o ajuste.

## Registro dos Objetos de Auditoria

| ID | Objeto | Arquivo | Criticidade | Status | Descricao precisa | Fragilidades possiveis | Achados/Inconsistencias atuais | Possiveis solucoes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-01 | SELIC e atualizacao de creditos | `01-SELICAtualizacaoCreditos.md` | Critica | Validado normativamente | Validar marco inicial, marco final, acrescimo de 1%, tipo de credito, componentes de credito judicial e uso da tabela SELIC. | Calculo simplificado pode distorcer consumo de credito em simulacoes; regras variam por tipo de credito e, no credito judicial, por componente/forma de atualizacao. | `CalculoService.ts` ainda contem funcao simplificada `calcularSelicAcumulada`; ela parece nao ser chamada no fluxo ativo. O fluxo ativo usa fator empirico para edicoes e aproximacao para DCOMP hipotetica. Manuais de Saldo Negativo IRPJ/CSLL, Pagamento Indevido PJ, Contribuicao Previdenciaria Indevida PJ e Retencao Previdenciaria PJ confirmam marcos iniciais distintos. Manual de credito judicial confirma calculo por componente. Salario-Familia/Maternidade PJ confirma DCOMP vedada e atualizacao apenas no reembolso pago. Ressarcimento de PIS/Cofins nao cumulativos e Ressarcimento de IPI seguem o art. 152 da IN RFB n. 2.055/2021 para SELIC apos 360 dias do PER original, com escopo de IPI limitado a valoracao do credito. Matriz minima implementavel de SELIC criada no arquivo do AUD-01. | Criar engine normativa de SELIC por tipo de credito/componente, com input/result rastreavel, mantendo valores importados e `...Original` intactos. |
| AUD-02 | Tipos de credito, elegibilidade e restricoes | `02-TiposCreditoElegibilidadeRestricoes.md` | Critica | Solucao proposta | Mapear quais creditos podem ser compensados, ressarcidos ou restituidos e quais debitos nao podem ser informados. | Permitir simulacao de combinacoes vedadas ou incompatibilidade entre credito e debito. | Matriz inicial criada para os seis tipos reais da planilha (`Pagamento Indevido ou a Maior`, `Pagamento Indevido ou a Maior eSocial`, `Contribuicao Previdenciaria Indevida ou a Maior`, `Saldo Negativo de IRPJ`, `Saldo Negativo de CSLL`, `Credito Oriundo de Acao Judicial`) e para vedações prioritarias. Ainda nao ha catalogo normativo no codigo. | Construir `CreditoRulesService`/catalogo consultivo de tipos e `VedacaoCompensacaoService`, inicialmente com alertas e rastreabilidade, sem bloqueio automatico. |
| AUD-03 | Importacao do relatorio e-CAC e linhagem | `03-ImportacaoRelatorioECACELinhagem.md` | Alta | Solucao proposta | Auditar parser, normalizacao, datas, agrupamento por cadeia, retificacoes e cancelamentos. | Mudanca de coluna da RFB pode quebrar importacao; erro de linhagem altera cascata inteira; marcos de SELIC podem existir na planilha mas nao no modelo. | Planilha real contem `Data de Arrecadacao`, `Competencia do Credito`, processos e dados de PER/pagamento ainda nao mapeados. Execucao real do parser carregou 1443 DCOMPs de 1472 linhas uteis; 29 documentos sem `IDs da Cadeia Relacional` foram descartados silenciosamente. Datas/valores ausentes possuem fallback silencioso. | Ampliar contrato de importacao com metadados opcionais e `ImportQualityReport`, reportando documentos sem cadeia, campos ausentes, data invalida e zero importado antes de implementar `SelicService`. |
| AUD-04 | Consumo de credito original e cascata | `04-ConsumoCreditoOriginalECascata.md` | Critica | Solucao proposta | Validar como o saldo original e consumido, propagado e comparado com o saldo informado pela RFB. | Erro de abatimento pode indicar retificacao indevida ou esconder insuficiencia de credito. | Rodada de 2026-06-07 confirmou que o motor preserva campos originais principais, mas usa heuristica textual para multiplos detalhamentos, fallback silencioso de pool, replicacao de valor mutavel para UI e status `RETIFICAR` derivado de divergencia matematica. | Criar `CascataRule` por tipo de credito, registrar metodo/origem/confianca do saldo calculado e separar status tecnico de acao sugerida. |
| AUD-05 | Valores originais e rastreabilidade | `05-ValoresOriginaisRastreabilidade.md` | Critica | Solucao proposta | Garantir preservacao de `...Original`, separando valores importados, calculados e simulados. | Contaminar base original compromete prova, auditoria e relatorio. | Matriz de origem/mutabilidade criada para campos atuais e futuros; taxonomia consolidada distingue `importado_rfb`, `calculado_motor`, `simulado_usuario`, `replicado_credito_raiz`, `fallback_operacional` e `exibido_formatado`. ACH-022 registra que `...Original` de DCOMP hipotetica e baseline simulado, nao RFB. | Criar metadados de origem por documento/valor e tipo dedicado para metadados de importacao, resultado SELIC e auditoria de simulacao, mantendo campos `...Original` intactos. |
| AUD-06 | Retificacoes, vigencia e bloqueios | `06-RetificacoesVigenciaBloqueios.md` | Alta | Solucao proposta | Validar status da RFB, documentos vigentes, bloqueados, retificados, cancelados e impactos em cascata. | Classificacao incorreta pode permitir edicao indevida, ignorar documento relevante ou consumir saldo de documento nao vigente. | Manual confirma cancelamento irreversivel e restricoes a documento analisado/intimado. Planilha real tem 10 situacoes e 3 tipos de documento; helper atual diverge em 5 linhas por falta de normalizacao (`Pedido de cancelamento deferido | Pedido Cancelamento` e `Nao admitido`). | Criar classificador unico `StatusRulesService`, com normalizacao, motivo, fonte e separacao entre vigencia, editabilidade, cancelabilidade e vedacao normativa. |
| AUD-07 | Simulacao, edicoes manuais e DCOMP hipotetica | `07-SimulacaoEdicoesDcompHipotetica.md` | Critica | Solucao proposta | Auditar os efeitos tributarios de reduzir debitos, recalcular juros/multa e criar DCOMP hipotetica. | Simulacao pode parecer normativa sem calculo SELIC totalmente validado. | Edicao manual usa fator historico; hipotetica usa aproximacao de fator SELIC da ultima DCOMP real. Rodada de 2026-06-07 registrou que multa/juros proporcionais precisam de metodo declarado, DCOMP hipotetica usa `new Date()` como data de transmissao e campos `...Original` de hipotetica representam baseline simulado, nao RFB. | Exigir rastreabilidade do metodo usado, data de transmissao hipotetica auditavel, origem de valor por documento/debito e migrar para calculo normativo quando validado. |
| AUD-08 | Relatorios PDF/Excel e rastreabilidade | `08-RelatoriosPDFExcelRastreabilidade.md` | Alta | Solucao proposta | Garantir que relatorios mostrem original, simulado, delta, status e fonte do calculo. | Relatorio pode omitir premissas ou misturar saldo original com saldo simulado. | PDF existe e compara valores, mas nao declara metodologia/fonte/status de calculo; rotulos como `Valores Anteriores (Originais)` e `Novos Valores Corretos` misturam valores importados, calculados e simulados; snapshot salvo nao preserva contexto de auditoria. | Criar secao de premissas/metodologia, legenda de origem dos valores, metadados de auditoria no snapshot e Excel futuro com abas `Resumo`, `Premissas`, `Cascata`, `Debitos`, `SELIC`, `StatusVigencia` e `Evidencias`. |
| AUD-09 | Casos de teste normativos e evidencias | `09-CasosTesteMatrizEvidencias.md` | Critica | Solucao proposta | Criar matriz de testes por tipo de credito, regra e caso real. | Ajustes futuros sem teste podem quebrar regras tributarias sensiveis. | Casos normativos de SELIC foram detalhados em fixtures FX-SEL-001 a FX-SEL-008, cobrindo pagamento indevido, saldo negativo, retencao previdenciaria, PIS/Cofins art. 152, IPI art. 152, credito judicial por componente, dados insuficientes e transmissao em dia nao util. Casos de cascata e status tambem foram especificados. Ainda nao ha automacao. | Automatizar primeiro fixtures de servico para `SelicService`, `DateRulesService`, `CreditoRulesService`, `StatusRulesService` e `CascataRule`, mantendo campos `...Original` intactos. |
| AUD-10 | Base geral PER/DCOMP Web | `10-BaseGeralPERDCOMPWeb.md` | Alta | Em analise | Consolidar orientacoes gerais aplicaveis a multiplos tipos de credito e objetos de auditoria. | Corrigir regras especificas sem base transversal pode gerar inconsistencias entre tipos de credito, debitos, UI e relatorio. | Primeira rodada de leitura concluida para quatro manuais gerais: meios, vedacoes, informar debitos e orientacoes iniciais. | Usar o consolidado como camada de referencia antes de auditar manuais especificos por tipo de credito. |
| AUD-11 | Desenho tecnico da implementacao normativa | `11-DesenhoTecnicoImplementacaoNormativa.md` | Critica | Solucao proposta | Consolidar contratos, camadas, ordem de implementacao, gates e anti-regras antes de alterar codigo. | Implementar regras espalhadas ou sem testes pode contaminar valores originais e misturar calculo normativo com estimativa. | Desenho central criado com contratos para metadados de importacao, `CreditoRulesService`, `StatusRulesService`, `DateRulesService`, `SelicService`, `CascataRule`, simulacao, relatorios e fases de implementacao. | Implementar somente apos autorizacao, iniciando por contratos/testes puros e mantendo comportamento atual como fallback identificado. |

## Achados Transversais Iniciais

### ACH-001 - SELIC simplificada em simulacoes

- Objeto relacionado: AUD-01, AUD-07
- Criticidade: Critica
- Evidencia tecnica:
  - `src/services/CalculoService.ts`
  - `calcularSelicAcumulada` implementa subtracao de taxas acumuladas em `selic.json` e soma `1%`.
  - A funcao parece nao ser chamada no fluxo ativo.
  - O fluxo ativo de DCOMP editada usa fator historico `totalDebitosOriginal / valorUtilizadoPerdcompOriginal`.
  - O fluxo ativo de DCOMP hipotetica usa fator da ultima DCOMP real e soma `getSelicMensal` do mes da ultima transmissao.
- Risco:
  - Simulacoes podem apresentar consumo de credito original estimado por aproximacao, sem reproduzir integralmente a regra normativa por tipo de credito.
- Diretriz:
  - Nao alterar valores importados nem campos `...Original`.
  - Antes de mudar o calculo, auditar os manuais oficiais e registrar a regra por tipo de credito.
  - Implementar regra nova como camada calculada e rastreavel.

### ACH-002 - Ausencia de catalogo normativo de meios por tipo de credito

- Objeto relacionado: AUD-02, AUD-10
- Criticidade: Critica
- Evidencia normativa:
  - `meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf`
- Risco:
  - O app pode tratar como PER/DCOMP Web ou como compensavel um credito que exige Programa PER/DCOMP, formulario/processo, Portal do Simples, eSocial Simplificado, habilitacao ou pedido previo.
- Diretriz:
  - Criar catalogo consultivo de tipos de credito antes de endurecer bloqueios.

### ACH-003 - Vedacoes legais ainda nao modeladas

- Objeto relacionado: AUD-02, AUD-06, AUD-10
- Criticidade: Critica
- Evidencia normativa:
  - `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf`
- Risco:
  - Simulacoes podem incluir creditos ou debitos vedados em DCOMP, como DAU, parcelados, Simples Nacional, estimativas de IRPJ/CSLL, creditos sob fiscalizacao ou creditos judiciais sem requisito.
- Diretriz:
  - Implementar primeiro matriz de alerta e evidencia; bloquear apenas depois de validacao com casos reais.

### ACH-004 - Multa, juros e debitos precisam de modelo mais rico

- Objeto relacionado: AUD-07, AUD-10
- Criticidade: Alta
- Evidencia normativa:
  - `per_dcomp-web_-informar-debitos-para-compensacao.pdf`
- Risco:
  - O modal pode confundir valores informados, valores compensados, reducao de multa, juros, saldo devedor e acrescimos calculados pelo PER/DCOMP Web.
- Diretriz:
  - Separar campos e registrar metodologia antes de alterar calculos.

### ACH-005 - Marco inicial da SELIC varia por tipo de credito

- Objeto relacionado: AUD-01, AUD-04, AUD-07
- Criticidade: Critica
- Evidencia normativa:
  - `per_dcomp-web_-saldo-negativo-de-irpj-ou-csll.pdf`, paginas 21 a 24.
  - `per_dcomp-web_-pagamento-indevido-ou-a-maior-pessoa-juridica.pdf`, paginas 10 a 12.
  - `per_dcomp-web_-contribuicao-previdenciaria-indevida-ou-a-maior-pessoa-juridica.pdf`, paginas 9 e 11 a 14.
  - `per_dcomp-web_-retencao-previdenciaria-pessoa-juridica.pdf`, paginas 1, 6 a 12.
  - `per_dcomp-web_-salario-familia-e-salario-maternidade-pessoa-juridica.pdf`, paginas 1, 5, 7 e 8.
  - `per_dcomp-web_-ressarcimento-de-pis_pasep-e-cofins-nao-cumulativos.pdf`, paginas/secoes do demonstrativo do credito.
  - `per_dcomp-web_ressarcimento-de-ipi.pdf`, secoes introdutorias, identificacao do credito e demonstrativo.
  - IN RFB n. 2.055/2021, arts. 148, 151, 152 e 157.
  - `Selic_Acumulada_ate_06.2026.pdf`, paginas 1 a 4.
- Regra confirmada:
  - Saldo Negativo IRPJ/CSLL usa SELIC desde o mes seguinte ao final do periodo de apuracao.
  - Pagamento Indevido ou a Maior PJ usa SELIC desde o mes seguinte a data do pagamento.
  - Contribuicao Previdenciaria Indevida ou a Maior PJ em GPS usa SELIC desde o mes seguinte a data do pagamento e alerta para multiplos termos iniciais no mesmo PER/DCOMP.
  - Retencao Previdenciaria PJ usa SELIC desde o segundo mes seguinte ao da competencia.
  - Salario-Familia e Salario-Maternidade PJ tem DCOMP vedada; eventual SELIC de reembolso e calculada ate a data de pagamento ao contribuinte, nao pela transmissao do pedido.
  - Ressarcimento de IPI, PIS/Pasep, Cofins e Reintegra seguem o art. 152 da IN RFB n. 2.055/2021: se nao houver ressarcimento em 360 dias do PER original, aplica-se SELIC a parcela nao ressarcida ou nao compensada, desde o mes subsequente ao 361 dia.
  - Para IPI, o escopo e apenas calcular SELIC do credito, sem reproduzir toda a apuracao operacional de RAIPI/trimestre do roteiro de IPI.
  - Regras de DCOMP usam ate o mes anterior a entrega da DCOMP, mais 1% no mes corrente, com excecoes de nao atualizacao quando a transmissao original ocorre antes do termo cabivel.
  - DCOMP transmitida em dia nao util deve ser considerada entregue no primeiro dia util subsequente para fins do art. 148.
  - Retificacao usa a data de transmissao da DCOMP original.
  - Credito original utilizado e obtido por descapitalizacao do total de debitos por `(1 + taxa Selic)`.
- Evidencia tecnica:
  - `src/services/CalculoService.ts`, linhas 30 a 60: funcao simplificada e nao comprovadamente usada no fluxo ativo.
  - `src/services/CalculoService.ts`, linhas 162 a 196: DCOMP hipotetica e DCOMP editada usam fator historico/aproximado.
- Risco:
  - Simulacoes podem calcular saldo original restante por fator empirico, nao por regra normativa individualizada.
- Diretriz:
  - Implementar futuramente uma camada normativa de SELIC por tipo de credito, com fonte, hipoteses e resultado calculado separados dos campos importados.
  - Manter a regra atual identificada como estimativa operacional ate validacao/implementacao autorizada.

### ACH-006 - Credito judicial exige regra por componente e forma de atualizacao

- Objeto relacionado: AUD-01, AUD-02, AUD-04, AUD-07
- Criticidade: Critica
- Evidencia normativa:
  - `per_dcomp-web_-credito-oriundo-de-acao-judicial.pdf`, paginas 3, 4, 10 a 12, 22 a 24, 29, 33 a 34, 43, 46 a 49 e 51 a 52.
- Regra confirmada:
  - Credito judicial exige transito em julgado e habilitacao previa.
  - PER administrativo e vedado; o uso administrativo cabivel e DCOMP.
  - Layout novo, aplicavel a creditos cujo consumo se iniciou a partir de 15/02/2025, exige detalhamento por componente.
  - Componentes podem ter atualizacao pela SELIC, por outro indice ou sem atualizacao.
  - Pagamentos e parcelamentos usam, quando SELIC, mes seguinte a data de arrecadacao; retencao previdenciaria usa segundo mes seguinte a competencia; retencao nao previdenciaria usa mes seguinte ao mes da retencao; demais parcelas dependem de mes inicial conforme decisao judicial ou IN RFB n. 1.717/2017.
  - O consumo e calculado por componente e o PER/DCOMP Web ordena componentes do mais antigo para o mais recente.
- Evidencia tecnica:
  - `src/services/CalculoService.ts`, linhas 162 a 196: DCOMP hipotetica e DCOMP editada usam fator historico/aproximado sem componente judicial.
  - Modelo atual `DCOMP` nao possui componentes de credito judicial, forma de atualizacao ou indice manual.
- Risco:
  - Aplicar uma SELIC unica por `tipoCredito` pode produzir resultado tributario incorreto em credito judicial.
- Diretriz:
  - Tratar credito judicial como regra propria por componente.
  - Se o relatorio e-CAC nao trouxer componentes, marcar calculo normativo como dependente de dado complementar.
  - Nao implementar bloqueio ou calculo judicial automatico sem validacao do usuario e caso real.

### ACH-007 - Relatorio e-CAC contem marcos de SELIC nao mapeados pelo modelo

- Objeto relacionado: AUD-01, AUD-03, AUD-05
- Criticidade: Alta
- Evidencia tecnica:
  - `Sheets/relatorio.xlsx`, aba `Processamento PERDCOMP`, contem `Data de Arrecadacao`, `Competencia do Credito`, `Numero do Pagamento - DARF`, `Processo Judicial`, `Processo de Habilitacao` e `Processo Administrativo`.
  - `src/services/ExcelParser.ts` nao persiste esses campos em `DCOMP`.
- Risco:
  - A engine normativa pode deixar de calcular mesmo quando o e-CAC traz o dado, ou voltar a usar fator historico por falta artificial de informacao no modelo.
- Diretriz:
  - Ampliar o contrato de importacao antes de codar `SelicService`.
  - Campo importado deve ser rastreavel; campo calculado deve ter `statusCalculo`, `fonteNormativa`, `hipoteses` e `dadosAusentes`.

### ACH-008 - PER original para art. 152 e parcialmente inferivel, mas nao garantido

- Objeto relacionado: AUD-01, AUD-03, AUD-04
- Criticidade: Alta
- Evidencia tecnica/normativa:
  - `ExcelParser.ts` mapeia `numeroDcompDetalhamento`.
  - IN RFB n. 2.055/2021, art. 152, exige marco do pedido de ressarcimento original para IPI, PIS/Pasep, Cofins e Reintegra.
- Risco:
  - Usar a data da DCOMP em vez do PER original desloca o marco de 361 dias.
- Diretriz:
  - Resolver `dataProtocoloPerOriginal` apenas quando o PER estiver presente/identificado na cadeia ou for informado como dado complementar rastreavel.
  - Se nao houver dado, retornar `dados_insuficientes`, sem analogia nem estimativa silenciosa.

### ACH-009 - Ausencia de classificador normalizado de tipo de credito e vedacoes

- Objeto relacionado: AUD-02, AUD-06, AUD-07, AUD-08, AUD-10
- Criticidade: Critica
- Evidencia normativa:
  - `meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf`, itens 1 a 4.
  - `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf`, itens 1 a 3.
- Evidencia tecnica:
  - `src/models/types.ts` trata `tipoCredito` como `string`.
  - `src/services/CalculoService.ts` usa comparacoes textuais para regra de multiplos detalhamentos.
  - Nao ha `CreditoRulesService`, catalogo de meios cabiveis ou matriz de vedações no codigo.
- Risco:
  - O app pode simular ou relatar uma cadeia como se fosse compensavel sem alertar que o tipo exige Programa PER/DCOMP, formulario/processo, habilitacao, pedido previo, Portal do Simples, eSocial Simplificado ou que a DCOMP e vedada.
- Diretriz:
  - Criar catalogo consultivo de tipos de credito e vedações antes de endurecer bloqueios.
  - Priorizar os seis tipos encontrados em `Sheets/relatorio.xlsx`.
  - Registrar alertas no relatorio/UI com fonte normativa; bloqueios duros so depois de validacao com caso real e autorizacao expressa.

### ACH-010 - Estrategia de consumo por tipo de credito depende de texto livre

- Objeto relacionado: AUD-02, AUD-04, AUD-05, AUD-08
- Criticidade: Critica
- Evidencia tecnica:
  - `src/services/CalculoService.ts`, linhas 132 a 141.
  - `src/components/TimelineCascata.tsx`, linhas 27 a 49.
- Risco:
  - Alteracao de grafia, acentuacao, abreviacao ou novo subtipo do relatorio e-CAC pode aplicar estrategia incorreta de pool ou replicacao.
- Diretriz:
  - Substituir comparacao textual por catalogo normalizado de tipo de credito e `CascataRule`.

### ACH-011 - Fallback de pool pode mascarar dados insuficientes

- Objeto relacionado: AUD-03, AUD-04, AUD-05
- Criticidade: Alta
- Evidencia tecnica:
  - `src/services/CalculoService.ts`, linhas 101 a 130.
- Risco:
  - O motor pode apresentar saldo calculado como conclusivo quando a cadeia nao possui detalhador vigente identificavel ou quando ha falha de linhagem/importacao.
- Diretriz:
  - Registrar `metodoSaldoInicial`, `origemSaldoInicial`, `dadosAusentes` e `statusConfianca`; para regra normativa, retornar `dados_insuficientes` quando o pool nao puder ser formado.

### ACH-012 - Valor replicado para UI precisa de origem explicita

- Objeto relacionado: AUD-04, AUD-05, AUD-08
- Criticidade: Alta
- Evidencia tecnica:
  - `src/services/CalculoService.ts`, linhas 139 a 149.
  - `src/models/types.ts`, linhas 47 a 63.
- Risco:
  - Valor replicado no campo mutavel `valorTotalCreditoDetalhado` pode ser lido como valor importado daquele documento se UI/PDF nao distinguirem origem.
- Diretriz:
  - Manter `valorTotalCreditoDetalhadoOriginal` imutavel e adicionar metadado de origem do valor apresentado/calculado.

### ACH-013 - `RETIFICAR` deve ser acao consultiva, nao conclusao matematica automatica

- Objeto relacionado: AUD-04, AUD-06, AUD-08
- Criticidade: Alta
- Evidencia tecnica:
  - `src/services/CalculoService.ts`, linhas 215 a 244.
  - `src/utils/statusHelper.ts`, linhas 31 a 47.
- Risco:
  - Divergencia por estrategia de tipo, SELIC aproximada, dado ausente ou status RFB ainda nao modelado pode virar recomendacao operacional forte sem validacao tributaria.
- Diretriz:
  - Separar `statusCascataTecnico` de `acaoSugerida`, com causa, premissas, confianca e dados ausentes.

### ACH-014 - Classificacao de status precisa de normalizacao auditavel

- Objeto relacionado: AUD-04, AUD-06, AUD-08
- Criticidade: Alta
- Evidencia normativa:
  - `orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.md`, linhas 113 a 121.
- Evidencia tecnica:
  - `src/utils/statusHelper.ts`, linhas 1 a 47.
  - `Sheets/relatorio.xlsx`, aba `Processamento PERDCOMP`.
- Regra/evidencia confirmada:
  - Pedido de cancelamento e irreversivel e nao deve ser tratado como documento ativo de consumo.
  - A planilha real contem variacoes de grafia/tipo que o helper atual nao captura em 5 linhas.
- Risco:
  - Documento nao vigente pode ser tratado como vigente e participar de cascata, KPI, UI ou relatorio.
- Diretriz:
  - Criar classificador normalizado com aliases e retorno de motivo/fonte.

### ACH-015 - Vigencia, bloqueio e vedacao normativa sao dimensoes distintas

- Objeto relacionado: AUD-02, AUD-04, AUD-06, AUD-08, AUD-10
- Criticidade: Alta
- Evidencia normativa:
  - `orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.md`, linhas 119 a 121.
  - `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.md`, linhas 180 a 235.
- Evidencia tecnica:
  - `src/utils/statusHelper.ts`
  - `src/components/TimelineCascata.tsx`
- Risco:
  - Um documento pode ser vigente para historico, bloqueado para edicao/cancelamento e ainda sujeito a alerta de vedacao por outro motivo; misturar essas dimensoes gera orientacao tributaria imprecisa.
- Diretriz:
  - Separar `vigenciaCascata`, `editabilidadeSimulacao`, `cancelabilidade` e `vedacaoNormativa`, com explicacao em UI/PDF.

### ACH-016 - PDF nao declara metodologia, fonte normativa ou status do calculo

- Objeto relacionado: AUD-01, AUD-04, AUD-05, AUD-07, AUD-08, AUD-09
- Criticidade: Alta
- Evidencia tecnica:
  - `src/services/ReportGeneratorService.ts`, linhas 196 a 205, 247 a 261, 285 a 405 e 410 a 540.
- Risco:
  - Estimativa operacional de simulacao pode ser interpretada como calculo SELIC normativo.
- Diretriz:
  - Adicionar secao de premissas/metodologia, `statusCalculo`, fontes, hipoteses e dados ausentes.

### ACH-017 - Rotulos do PDF misturam valor importado, calculado e simulado

- Objeto relacionado: AUD-04, AUD-05, AUD-08
- Criticidade: Alta
- Evidencia tecnica:
  - `src/services/ReportGeneratorService.ts`, linhas 326 a 358 e 432 a 463.
- Risco:
  - `Valores Anteriores (Originais)` e `Novos Valores Corretos` podem comprometer rastreabilidade, porque nem todos os valores sao importados nem todos os novos sao normativamente corretos.
- Diretriz:
  - Classificar valores como `Importado da RFB`, `Calculado pelo motor`, `Simulado pelo usuario` ou `Exibido/formatado na UI`.

### ACH-018 - Snapshot salvo nao preserva contexto de auditoria

- Objeto relacionado: AUD-07, AUD-08, AUD-09
- Criticidade: Media
- Evidencia tecnica:
  - `src/models/types.ts`, linhas 81 a 98.
  - `src/components/TimelineCascata.tsx`, linhas 90 a 105.
- Risco:
  - Simulacoes geradas com metodo antigo podem ser confundidas com simulacoes normativas futuras.
- Diretriz:
  - Persistir metadados de auditoria no snapshot da simulacao salva, incluindo versao de regra, tabela SELIC, fontes, hipoteses e dados ausentes.

### ACH-019 - Recalculo proporcional de multa/juros precisa ser metodo declarado

- Objeto relacionado: AUD-07, AUD-08, AUD-10
- Criticidade: Alta
- Evidencia normativa:
  - `per_dcomp-web_-informar-debitos-para-compensacao.md`, linhas 193 a 205, 291 a 315 e 777 a 793.
- Evidencia tecnica:
  - `src/components/ModalEdicao.tsx`, linhas 28 a 49 e 134 a 138.
- Risco:
  - Proporcionalidade pode ser interpretada como recalculo normativo universal de multa/juros, embora acrescimos legais dependam de vencimento, transmissao original e validacao/Sicalc.
- Diretriz:
  - Registrar metodo por componente do debito: `informado_usuario`, `estimativa_proporcional`, `proporcional_lancamento_oficio`, `sicalc_confirmado` ou `dados_insuficientes`.

### ACH-020 - DCOMP hipotetica nao captura data de transmissao como premissa do usuario

- Objeto relacionado: AUD-01, AUD-07, AUD-08
- Criticidade: Critica
- Evidencia tecnica:
  - `src/components/ModalHipotetica.tsx`, linhas 12 a 19 e 76 a 103.
  - `src/components/TimelineCascata.tsx`, linhas 468 a 474.
  - `src/store.ts`, linhas 156 a 172.
- Risco:
  - Termo final da SELIC e regra de dia nao util podem depender do momento do clique, nao de premissa auditavel.
- Diretriz:
  - Exigir ou exibir `dataTransmissaoHipotetica`, origem da data e `dataEntregaValoracao` calculada separadamente.

### ACH-021 - Campos `...Original` de DCOMP hipotetica representam baseline simulado

- Objeto relacionado: AUD-05, AUD-07, AUD-08
- Criticidade: Alta
- Evidencia tecnica:
  - `src/store.ts`, linhas 129 a 142 e 156 a 172.
- Risco:
  - UI/PDF podem descrever valores digitados pelo usuario como originais importados da RFB.
- Diretriz:
  - Adicionar origem de documento/valor (`importado_rfb` ou `simulado_usuario`) e tratar `...Original` da hipotetica como baseline simulado.

### ACH-022 - `...Original` precisa de origem documental explicita

- Objeto relacionado: AUD-05, AUD-07, AUD-08, AUD-11
- Criticidade: Critica
- Evidencia tecnica:
  - `src/services/ExcelParser.ts`, linhas 135 a 138, 163 a 175.
  - `src/store.ts`, linhas 129 a 142 e 156 a 172.
  - `src/services/ReportGeneratorService.ts`, linhas 326 a 358 e 432 a 463.
- Risco:
  - A mesma nomenclatura `...Original` pode significar base RFB em DCOMP real e baseline simulado em DCOMP hipotetica.
- Diretriz:
  - Adicionar `origemValor`/`origemDocumento` antes de qualquer ajuste de relatorio ou calculo normativo.

### ACH-023 - Linhas sem cadeia relacional sao descartadas sem relatorio de qualidade

- Objeto relacionado: AUD-03, AUD-04, AUD-08
- Criticidade: Alta
- Evidencia tecnica:
  - `src/services/ExcelParser.ts`, linhas 151 a 153.
  - `Sheets/relatorio.xlsx`: 29 linhas com numero de PER/DCOMP nao carregadas por ausencia de `IDs da Cadeia Relacional`.
- Risco:
  - Documentos podem ficar fora da cascata e do relatorio sem que o usuario perceba.
- Diretriz:
  - Criar `ImportQualityReport` com documentos ignorados e motivo.

### ACH-024 - Datas/valores ausentes usam fallback silencioso

- Objeto relacionado: AUD-01, AUD-03, AUD-05
- Criticidade: Alta
- Evidencia tecnica:
  - `src/services/ExcelParser.ts`, linhas 20 a 47.
- Risco:
  - Data ausente pode virar data atual e valor ausente pode virar zero, contaminando regra normativa futura.
- Diretriz:
  - Distinguir `ausente`, `zero_importado` e `data_invalida`; nao usar fallback silencioso em campos normativos.

## Fluxo de Trabalho da Auditoria

1. Escolher um objeto de auditoria no controle geral.
2. Abrir o arquivo proprio do objeto e registrar escopo, perguntas e fontes.
3. Ler o manual oficial da RFB correspondente em `Knowledge/`.
4. Registrar trechos normativos por resumo tecnico, evitando depender de memoria.
5. Mapear regra normativa para campos do Excel, tipos do modelo e funcoes do codigo.
6. Classificar achados por criticidade.
7. Definir solucao tecnica sem contaminar valores originais.
8. Criar casos de teste ou cenarios de validacao.
9. Somente depois implementar ajuste no codigo.
10. Revalidar lint, build, fluxo real de importacao e relatorio.

## Sugestoes de Otimizacao do Trabalho

- Manter cada objeto de auditoria pequeno o suficiente para virar uma sessao de trabalho.
- Registrar sempre a diferenca entre "regra normativa confirmada", "hipotese do usuario" e "comportamento atual do codigo".
- Criar uma matriz de campos com quatro colunas obrigatorias: origem RFB, campo no modelo, mutabilidade, uso em relatorio.
- Adotar nomenclatura fixa:
  - Original/importado: valores vindos do relatorio e-CAC.
  - Calculado: valores produzidos pelo motor da aplicacao.
  - Simulado: valores alterados pelo usuario ou por DCOMP hipotetica.
  - Evidencia: manual, ato normativo, relatorio RFB ou teste real.
- Antes de mexer em qualquer regra tributaria, criar pelo menos um caso de validacao com entrada, saida esperada e fonte normativa.
