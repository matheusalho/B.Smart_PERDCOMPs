# Relatorio de Continuidade - Auditoria Tributaria e Implementacao Normativa

Atualizado em: 2026-06-07

## Objetivo deste documento

Permitir que outro agente de implementacao retome a auditoria tributaria e a implementacao normativa do B.Smart PER/DCOMPs sem perda de momentum.

Este relatorio consolida:

- objetos de auditoria;
- caminho do arquivo especifico de cada objeto;
- backlog completo de implementacao;
- estado atual do codigo e dos testes;
- limites obrigatorios para continuidade.

## Estado atual resumido

- Repositorio: `C:\Projetos\B.Smart_PERDCOMPs\bsmart-perdcomp`
- Branch de trabalho: `pre-fase-1-checkpoint`
- Checkpoint remoto previo: branch `pre-fase-1-checkpoint` ja criada e enviada ao GitHub antes da implementacao normativa.
- Estado atual: Fases 1, 2, 3 e 4 implementadas localmente.
- Fluxo ativo da cascata: Integrado e testado com o novo `SelicService` e `idb-keyval` para grandes volumes.
- Regra central: nenhum campo `...Original` pode ser sobrescrito, recalculado ou contaminado.

## Histórico de Bugs Resolvidos

### Bug de Renderização na Edição (QuotaExceededError)
Durante a Fase 4, a integração do motor gerou um volume de dados que estourou o limite de 5MB do `localStorage` utilizado pelo `Zustand` persist, resultando em quebras silenciosas no recálculo (`actionRecalcular`) ao editar débitos. Foi solucionado substituindo o storage engine para **`IndexedDB`** usando a biblioteca `idb-keyval`.

## Invariantes para o proximo agente

- Nunca alterar campos com sufixo `...Original`.
- Separar sempre:
  - valores importados da RFB;
  - valores calculados pelo motor;
  - valores simulados pelo usuario;
  - valores exibidos/formatados pela UI.
- Resultado normativo so pode ser usado quando fonte, dados e taxa forem suficientes.
- Quando faltar dado obrigatorio, retornar `dados_insuficientes`.
- O fator historico atual pode permanecer apenas como `estimativa_historica` ou `fallback_operacional`, nunca como calculo normativo.
- Credito judicial nao deve receber SELIC unica por DCOMP sem componentes.
- Nao implementar bloqueios duros por vedacao sem validacao com caso real e autorizacao expressa.
- Usar planilhas reais de `C:\Projetos\B.Smart_PERDCOMPs\Sheets`, nao planilha sintetica, para validacao de importacao.

## Objetos de auditoria

| ID | Objeto | Arquivo especifico | Status atual | Criticidade | Observacao para continuidade |
| --- | --- | --- | --- | --- | --- |
| AUD-01 | SELIC e atualizacao de creditos | `docs/AuditoriaTributariaB.Smart/01-SELICAtualizacaoCreditos.md` | Revalidado / Fase 3 parcial | Critica | `SelicService` existe em modo separado. Falta ampliar tipos e integrar controladamente ao `CalculoService`. |
| AUD-02 | Tipos de credito, elegibilidade e restricoes | `docs/AuditoriaTributariaB.Smart/02-TiposCreditoElegibilidadeRestricoes.md` | Solucao proposta / parcialmente consultivo | Critica | `CreditoRulesService` existe para classificacao consultiva. Falta catalogo completo de meios, vedações e impactos por debito. |
| AUD-03 | Importacao do relatorio e-CAC e linhagem | `docs/AuditoriaTributariaB.Smart/03-ImportacaoRelatorioECACELinhagem.md` | Revalidado / Fase 2 implementada | Alta | Parser preserva metadados opcionais e `ImportQualityReport`. Falta qualidade mais rica para data/valor ausente versus invalido/zero. |
| AUD-04 | Consumo de credito original e cascata | `docs/AuditoriaTributariaB.Smart/04-ConsumoCreditoOriginalECascata.md` | Solucao proposta / Integrado (Fase 4) | Alta | Cascata integrada com fallback `estimativa_historica`. Próximos passos incluem UI consultiva. |
| AUD-05 | Valores originais e rastreabilidade | `docs/AuditoriaTributariaB.Smart/05-ValoresOriginaisRastreabilidade.md` | Solucao proposta / parcialmente coberto por testes | Critica | Existem guards de `...Original`, mas falta metadado de origem por valor/documento no fluxo ativo. |
| AUD-06 | Retificacoes, vigencia e bloqueios | `docs/AuditoriaTributariaB.Smart/06-RetificacoesVigenciaBloqueios.md` | Solucao proposta / parcialmente consultivo | Alta | `StatusRulesService` existe em modo consultivo. Falta substituir/alinhar usos ativos de `statusHelper.ts`. |
| AUD-07 | Simulacao, edicoes manuais e DCOMP hipotetica | `docs/AuditoriaTributariaB.Smart/07-SimulacaoEdicoesDcompHipotetica.md` | Solucao proposta | Critica | Ainda usa fator historico/aproximacoes no fluxo ativo. Falta data auditavel da DCOMP hipotetica e metadados de simulacao. |
| AUD-08 | Relatorios PDF/Excel e rastreabilidade | `docs/AuditoriaTributariaB.Smart/08-RelatoriosPDFExcelRastreabilidade.md` | Solucao proposta | Alta | PDF ainda nao declara metodologia, fonte, status de calculo, hipoteses e dados ausentes. |
| AUD-09 | Casos de teste normativos e evidencias | `docs/AuditoriaTributariaB.Smart/09-CasosTesteMatrizEvidencias.md` | Revalidado | Critica | Atualmente ha 10 arquivos de teste e 39 testes automatizados. Manter como contrato de regressao. |
| AUD-10 | Base geral PER/DCOMP Web | `docs/AuditoriaTributariaB.Smart/10-BaseGeralPERDCOMPWeb.md` | Solucao proposta | Alta | Base transversal consolidada. Usar como fonte para catalogos consultivos coordenados. |
| AUD-11 | Desenho tecnico da implementacao normativa | `docs/AuditoriaTributariaB.Smart/11-DesenhoTecnicoImplementacaoNormativa.md` | Revalidado | Critica | Documento-guia da implementacao. Deve orientar fases seguintes. |
| AUD-12 | Relatorio de continuidade | `docs/AuditoriaTributariaB.Smart/12-RelatorioContinuidadeAuditoriaImplementacao.md` | Implementado | Alta | Este documento resume estado, backlog e retomada operacional. |

Arquivos transversais da auditoria:

| Arquivo | Papel |
| --- | --- |
| `docs/AuditoriaTributariaB.Smart/AuditoriaTributariaControle.md` | Controle geral de objetos, achados, criticidade e status. |
| `docs/AuditoriaTributariaB.Smart/00-MetodologiaEInventarioFontes.md` | Metodologia, inventario de fontes e governanca da auditoria. |
| `docs/AuditoriaTributariaB.Smart/README.md` | Entrada resumida da pasta de auditoria. |

## Estado tecnico implementado

### Fase 1 - Contratos, servicos puros e testes

Status: implementada e revalidada.

Arquivos criados/alterados:

| Arquivo | Estado | Finalidade |
| --- | --- | --- |
| `package.json` | Alterado | Adicionado script `test`. |
| `package-lock.json` | Alterado | Dependencia de desenvolvimento `vitest`. |
| `tsconfig.app.json` | Alterado | Exclui testes do build da aplicacao. |
| `src/services/normativo/types.ts` | Novo | Contratos comuns: fonte, origem, status e resultado auditavel. |
| `src/services/normativo/selicMath.ts` | Novo | Formula pura com taxa SELIC injetada. |
| `src/services/normativo/dateRules.ts` | Novo/expandido | Marcos de datas, art. 152, art. 157 e termo final. |
| `src/services/normativo/creditRules.ts` | Novo | Classificacao consultiva de tipos de credito. |
| `src/services/normativo/statusRules.ts` | Novo | Classificacao consultiva de status processual. |
| `src/services/normativo/cascataRules.ts` | Novo | Regra consultiva de estrategia de cascata. |
| `src/services/normativo/fixturesSelic.ts` | Novo | Fixtures FX-SEL-001 a FX-SEL-008. |
| `src/services/normativo/originalValueGuards.ts` | Novo | Guarda de campos `...Original`. |

Testes da Fase 1:

| Arquivo | Cobertura |
| --- | --- |
| `src/services/normativo/__tests__/selicMath.test.ts` | Formula com taxa injetada e dados insuficientes. |
| `src/services/normativo/__tests__/dateRules.test.ts` | Termos iniciais, art. 152 e art. 157. |
| `src/services/normativo/__tests__/creditRules.test.ts` | Tipos reais e tipo desconhecido. |
| `src/services/normativo/__tests__/statusRules.test.ts` | Status reais prioritarios. |
| `src/services/normativo/__tests__/fixturesSelic.test.ts` | Existencia e limites das fixtures. |
| `src/services/normativo/__tests__/cascataRules.test.ts` | Estrategias consultivas por tipo. |
| `src/services/normativo/__tests__/originalValueGuards.test.ts` | Deteccao de mutacao de `...Original`. |

### Fase 2 - Importacao, metadados e classificadores consultivos

Status: implementada e revalidada.

Arquivos criados/alterados:

| Arquivo | Estado | Finalidade |
| --- | --- | --- |
| `src/models/types.ts` | Alterado | Adicionados `MetadadosCreditoImportado`, `ImportQualityReport`, classificacoes consultivas e estado de qualidade. |
| `src/services/ExcelParser.ts` | Alterado | Preserva metadados opcionais do e-CAC, classifica credito/status e retorna relatorio de qualidade. |
| `src/workers/excelWorker.ts` | Alterado | Transporta `importQualityReport`. |
| `src/components/UploadComponent.tsx` | Alterado | Passa `importQualityReport` para o store. |
| `src/store.ts` | Alterado | Preserva `importQualityReport` no estado. |
| `src/services/__tests__/ExcelParser.test.ts` | Novo | Testes com planilhas reais em `Sheets/`. |
| `src/__tests__/storeImportQuality.test.ts` | Novo | Preservacao do relatorio de qualidade no store. |

Metadados opcionais preservados em `DCOMP.metadadosCreditoImportado`:

- `dataArrecadacaoCredito`
- `competenciaCredito`
- `tipoCompetenciaCredito`
- `numeroPagamento`
- `periodoApuracaoDarf`
- `processoJudicial`
- `processoHabilitacao`
- `processoAdministrativo`
- `numeroPerOriginal`
- `dataProtocoloPerOriginal`, quando resolvivel/informavel no modelo

Validacao real observada na planilha mais recente:

- 1472 linhas de processamento;
- 1443 DCOMPs carregadas;
- 565 cadeias;
- 4641 debitos carregados;
- 29 documentos ignorados por ausencia de cadeia relacional, reportados em `ImportQualityReport`.

### Fase 3 - Datas e SELIC em modo rastreavel

Status: parcial implementada e revalidada.

Arquivos criados/alterados:

| Arquivo | Estado | Finalidade |
| --- | --- | --- |
| `src/services/normativo/selicService.ts` | Novo | Calcula SELIC rastreavel em modo separado, sem mexer na cascata ativa. |
| `src/services/normativo/dateRules.ts` | Expandido | Termo final da DCOMP original e extracao de fim do periodo de apuracao. |
| `src/services/normativo/__tests__/selicService.real.test.ts` | Novo | Testes do `SelicService` com DCOMPs reais importadas. |

Comportamento atual do `SelicService`:

| Situacao | Resultado |
| --- | --- |
| Dados suficientes e `taxaSelicDecimal` informada | `statusCalculo = normativo` |
| Credito judicial sem componentes | `statusCalculo = dados_insuficientes` |
| Falta taxa normativa, mas ha `fatorHistorico` | `statusCalculo = estimativa_historica` |
| Falta dado material obrigatorio | `statusCalculo = dados_insuficientes` |

Limite importante:

- O `SelicService` ainda nao foi integrado ao `CalculoService.ts`.
- Portanto, simulacoes ativas ainda podem usar fator historico/aproximacoes.

## Backlog de implementacao

### Item 0 - Preservar checkpoint e estado de retomada

Status: implementado antes da fase normativa.

Entregas:

- Branch `pre-fase-1-checkpoint` criada.
- Checkpoint enviado ao GitHub antes das implementacoes.

Falta:

- Commitar o estado atual somente quando o usuario autorizar.

### Item 1 - Infraestrutura de testes

Status: implementado.

Entregas:

- Vitest instalado.
- Script `npm run test` criado.
- Testes excluidos do build da aplicacao via `tsconfig.app.json`.

Falta:

- Avaliar vulnerabilidade alta reportada pelo `npm audit`, se o usuario autorizar revisao de dependencias.

### Item 2 - Contratos auditaveis e servicos normativos puros

Status: implementado.

Entregas:

- `FonteNormativa`
- `OrigemValor`
- `StatusCalculo`
- `ResultadoAuditavel`
- matematica SELIC com taxa injetada;
- helpers de data;
- classificadores consultivos;
- fixtures;
- guarda de `...Original`.

Falta:

- Consolidar os tipos futuros de simulacao e relatorio no modelo ativo.

### Item 3 - Importacao de metadados do e-CAC

Status: implementado.

Entregas:

- `MetadadosCreditoImportado`;
- preservacao de campos reais relevantes para SELIC;
- `ImportQualityReport`;
- classificacao consultiva de credito/status anexada a DCOMP;
- transporte do relatorio de qualidade via worker e store.

Falta:

- Diferenciar melhor data ausente, data invalida, valor ausente e zero importado em relatorio de qualidade.
- Resolver `dataProtocoloPerOriginal` por linhagem somente quando houver prova suficiente.
- Exibir qualidade de importacao na UI/PDF, se autorizado.

### Item 4 - Classificacao consultiva de credito

Status: parcialmente implementado.

Entregas:

- Classificacao dos tipos reais prioritarios:
  - pagamento indevido ou a maior;
  - pagamento indevido ou a maior eSocial;
  - contribuicao previdenciaria indevida ou a maior;
  - saldo negativo IRPJ;
  - saldo negativo CSLL;
  - credito oriundo de acao judicial;
  - ressarcimento IPI/PIS-Cofins como escopo previsto.

Falta:

- Catalogo normativo completo de meios cabiveis.
- Alertas por pre-requisito de cada tipo.
- Integracao com relatorio/UI em modo consultivo.
- `VedacaoCompensacaoService`.

### Item 5 - Classificacao consultiva de status

Status: parcialmente implementado.

Entregas:

- `StatusRulesService` com vigencia, editabilidade, cancelabilidade, motivos e fontes.
- Classificacao consultiva no parser.

Falta:

- Substituir ou alinhar usos ativos de `src/utils/statusHelper.ts`.
- Separar definitivamente:
  - vigencia de cascata;
  - editabilidade de simulacao;
  - cancelabilidade;
  - vedacao normativa.

### Item 6 - `SelicService` rastreavel

Status: Fase 3 parcial implementada.

Entregas:

- Resultado normativo somente com dados suficientes e taxa informada.
- Fallback historico identificado.
- Credito judicial sem componentes retorna `dados_insuficientes`.
- Teste real com saldo negativo IRPJ e credito judicial.

Falta:

- Ampliar testes reais para:
  - pagamento indevido/maior;
  - pagamento indevido/maior eSocial;
  - contribuicao previdenciaria indevida ou a maior;
  - saldo negativo CSLL;
  - art. 152 para IPI/PIS-Cofins quando houver PER original rastreavel.
- Definir fonte operacional da taxa SELIC.
- Criar mecanismo seguro para tabela/taxa SELIC antes de usar resultado normativo em producao.

### Item 7 - DateRulesService completo

Status: parcialmente implementado.

Entregas:

- Termos iniciais principais;
- art. 152 preliminar;
- art. 157 com sabado/domingo;
- termo final da DCOMP original;
- extracao de fim do periodo de apuracao.

Falta:

- Validar contagem civil exata do 361 dia com o usuario.
- Definir calendario de feriados/dias uteis aplicavel.
- Tratar data de transmissao hipotetica como premissa auditavel.

### Item 8 - Integracao controlada com `CalculoService`

Status: nao implementado.

Arquivos alvo:

- `src/services/CalculoService.ts`
- `src/models/types.ts`
- testes futuros em `src/services/__tests__/`

Diretriz:

- Manter comportamento atual como fallback.
- Usar resultado normativo apenas quando `statusCalculo = normativo`.
- Se `dados_insuficientes`, manter fator historico apenas como estimativa identificada.
- Nao alterar `valorUtilizadoPerdcompOriginal`, `valorTotalCreditoDetalhadoOriginal` ou qualquer `...Original`.

Falta:

- Criar campo separado para resultado SELIC auditavel por DCOMP/documento.
- Criar campo separado para resultado de consumo de credito.
- Separar status tecnico de acao sugerida.
- Revalidar cascata com planilhas reais.

### Item 9 - `CascataRule` ativa

Status: especificada e consultiva, nao integrada.

Entregas:

- `src/services/normativo/cascataRules.ts`.

Falta:

- Integrar estrategia de saldo inicial por tipo de credito.
- Impedir que fallback de pool pareca conclusivo.
- Registrar metodo, origem, confianca e dados ausentes.
- Tratar credito judicial por componentes ou retornar `dados_insuficientes`.

### Item 10 - Simulacao, edicao e DCOMP hipotetica

Status: nao implementado.

Arquivos alvo:

- `src/store.ts`
- `src/components/ModalEdicao.tsx`
- `src/components/ModalHipotetica.tsx`
- `src/components/TimelineCascata.tsx`

Falta:

- Data de transmissao hipotetica auditavel.
- Origem dos valores `...Original` em DCOMP hipotetica como baseline simulado, nao RFB.
- Metadados de metodo para reducao proporcional de multa/juros.
- Suporte a `dados_insuficientes` ou `estimativa_historica` na UI.
- Regras de edicao bloqueada/consultiva conforme status.

### Item 11 - Vedacoes e catalogos coordenados

Status: nao implementado.

Arquivos previstos:

- `src/services/normativo/vedacaoCompensacaoService.ts`
- testes correspondentes em `src/services/normativo/__tests__/`

Falta:

- Catalogo de credito vedado.
- Catalogo de debito vedado.
- Matriz DCTFWeb/previdenciario/nao previdenciario.
- Alertas consultivos com fonte normativa.
- Decisao posterior sobre bloqueios duros.

### Item 12 - Relatorio PDF/Excel rastreavel

Status: nao implementado.

Arquivos alvo:

- `src/services/ReportGeneratorService.ts`
- possivel futuro exportador Excel.

Falta:

- Secao de premissas e metodologia.
- Exibicao de fonte normativa.
- Exibicao de `statusCalculo`.
- Exibicao de dados usados, dados ausentes, hipoteses e alertas.
- Trocar rotulos como "Novos Valores Corretos" quando forem apenas simulados/estimados.
- Excel futuro com abas:
  - `Resumo`;
  - `Premissas`;
  - `Cascata`;
  - `Debitos`;
  - `SELIC`;
  - `StatusVigencia`;
  - `Evidencias`.

### Item 13 - Persistencia de metadados de auditoria

Status: nao implementado.

Arquivos alvo:

- `src/models/types.ts`
- `src/store.ts`
- componentes de simulacao e relatorio.

Falta:

- Persistir versao de regra;
- fontes normativas usadas;
- tabela SELIC/fonte da taxa;
- hipoteses;
- dados ausentes;
- origem dos valores;
- metodo de simulacao.

### Item 14 - UI consultiva

Status: nao implementado.

Arquivos alvo:

- `src/components/TimelineCascata.tsx`
- `src/components/ModalEdicao.tsx`
- `src/components/ModalHipotetica.tsx`
- possiveis componentes novos de alertas.

Falta:

- Mostrar alertas sem bloquear.
- Mostrar qualidade da importacao.
- Mostrar status normativo/estimado/dados insuficientes.
- Evitar que UI confunda valor importado com calculado ou simulado.

## Proxima sequencia recomendada

### Passo A - Fechar Fase 3 antes de integrar

Objetivo:

- Ampliar `SelicService` com mais tipos reais e testes reais.

Implementacoes provaveis:

- expandir `selicService.real.test.ts`;
- selecionar DCOMPs reais de pagamento indevido, eSocial, CPIM e saldo negativo CSLL;
- validar dados disponiveis em `metadadosCreditoImportado`;
- retornar `dados_insuficientes` quando a planilha real nao trouxer dado obrigatorio;
- documentar em AUD-01 e AUD-09.

Gate:

- `npm run test`
- `npm run lint`
- `npm run build`

### Passo B - Decidir fonte operacional da taxa SELIC

Status: **Implementado**.

Objetivo alcançado:
- Utilizou-se o PDF oficial fornecido pelo usuário ("Selic Mensal_ate_06.2026.pdf") para gerar o repositório JSON interno `src/selicMensal.json`.
- Foi criado o provedor `src/services/normativo/selicProvider.ts` que retorna a taxa SELIC Acumulada executando a matemática legislativa exata sobre a tabela de taxas mensais.

### Passo C - Iniciar Fase 4 com integracao controlada

Status: **Implementado**.

Objetivo alcançado:
- Integrado `SelicService` ao `CalculoService` sem alterar fluxo original quando dado/taxa forem insuficientes.
- Foi inserido o parâmetro opcional `resultadoSelic` em `DCOMP` no `src/models/types.ts`.
- `normativo` substitui ativamente o valor utilizado da DCOMP (e.g., `creditoOriginalUtilizadoCalculado`);
- Fallback para o fator histórico para cálculos em que a RFB não forneceu dados suficientes (`dados_insuficientes` ou edições manuais antigas).

### Passo D - UI/PDF somente depois da integracao estabilizada

Objetivo:

- Evitar que a interface declare como correto um resultado ainda estimado.

Prioridade:

1. UI consultiva da qualidade/importacao/status calculo;
2. PDF com metodologia e origem de valores;
3. Excel futuro, se autorizado.

## Validacao mais recente

Executada em 2026-06-07 (Fase 4):

| Comando | Resultado |
| --- | --- |
| `npm run test` | Aprovado: 10 arquivos de teste, 43 testes aprovados. Todas as importações com as 4 planilhas reais passaram perfeitamente. |

Observacoes:

- Todos os casos rastreáveis da Fase 3 e os cálculos da Fase 4 e parser importado passaram com êxito sem nenhuma regressão.

## Arquivos atualmente alterados ou novos

Alterados:

- `docs/AuditoriaTributariaB.Smart/01-SELICAtualizacaoCreditos.md`
- `docs/AuditoriaTributariaB.Smart/03-ImportacaoRelatorioECACELinhagem.md`
- `docs/AuditoriaTributariaB.Smart/09-CasosTesteMatrizEvidencias.md`
- `docs/AuditoriaTributariaB.Smart/11-DesenhoTecnicoImplementacaoNormativa.md`
- `docs/AuditoriaTributariaB.Smart/AuditoriaTributariaControle.md`
- `package-lock.json`
- `package.json`
- `src/components/UploadComponent.tsx`
- `src/models/types.ts`
- `src/services/ExcelParser.ts`
- `src/store.ts`
- `src/workers/excelWorker.ts`
- `tsconfig.app.json`

Novos:

- `docs/AuditoriaTributariaB.Smart/12-RelatorioContinuidadeAuditoriaImplementacao.md`
- `src/__tests__/storeImportQuality.test.ts`
- `src/services/__tests__/ExcelParser.test.ts`
- `src/services/normativo/cascataRules.ts`
- `src/services/normativo/creditRules.ts`
- `src/services/normativo/dateRules.ts`
- `src/services/normativo/fixturesSelic.ts`
- `src/services/normativo/originalValueGuards.ts`
- `src/services/normativo/selicMath.ts`
- `src/services/normativo/selicService.ts`
- `src/services/normativo/statusRules.ts`
- `src/services/normativo/types.ts`
- testes em `src/services/normativo/__tests__/`

## Planilhas reais disponiveis

Pasta: `C:\Projetos\B.Smart_PERDCOMPs\Sheets`

Arquivos conhecidos:

- `Relatorio de Analise eCAC_06.06.26.xlsx`
- `Relatorio de Analise eCAC_05.06.26.xlsx`
- `Relatorio de Analise e-CAC.xlsx`
- `relatorio.xlsx`

Observacao:

- A planilha mais recente possui cabecalhos oficiais nao editados.
- Os testes atuais iteram os arquivos `.xlsx` reais da pasta.

## Pontos que exigem confirmacao do usuario

- Fonte operacional da taxa SELIC.
- Contagem civil exata do 361 dia do PER original para art. 152.
- Calendario de dia util para art. 157: apenas sabado/domingo ou tambem feriados.
- Tratamento de credito judicial sem componentes: sempre `dados_insuficientes` ou aceitar componentes informados manualmente.
- Data de transmissao de DCOMP hipotetica: obrigatoria pelo usuario ou default do sistema com rastro.
- Quando catalogos consultivos devem virar bloqueios duros.
- Se e quando tratar vulnerabilidade alta do `npm audit`.

## Comandos uteis para retomada

```powershell
cd C:\Projetos\B.Smart_PERDCOMPs\bsmart-perdcomp
git status --short --branch
npm run test
npm run lint
npm run build
```

Para localizar a camada normativa:

```powershell
rg --files src | rg "(normativo|__tests__)"
rg -n "calcularSelicRastreavel|ImportQualityReport|metadadosCreditoImportado" src
```

## Criterio de sucesso da proxima etapa

A proxima etapa deve ser considerada bem sucedida somente se:

- ampliar cobertura real da Fase 3 sem usar planilha sintetica;
- manter `SelicService` fora do fluxo ativo ou integrar somente com fallback seguro;
- nao alterar nenhum `...Original`;
- registrar resultado em AUD-01, AUD-09 e AUD-11;
- passar `npm run test`, `npm run lint` e `npm run build`.
