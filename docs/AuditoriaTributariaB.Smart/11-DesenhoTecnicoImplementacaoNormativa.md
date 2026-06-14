# AUD-11 - Desenho Tecnico da Implementacao Normativa

## Descricao do Objeto

Consolidar a arquitetura tecnica recomendada para implementar, futuramente e apenas com autorizacao expressa, a camada normativa de SELIC, classificacao de credito, status, cascata, simulacao e relatorio auditavel.

Este arquivo nao implementa regras. Ele organiza contratos, ordem de entrega, invariantes e gates de validacao derivados dos objetos AUD-01 a AUD-10.

## Criticidade

Critica.

## Escopo

Camadas cobertas:

- ampliacao de metadados importados do e-CAC;
- `CreditoRulesService`;
- `VedacaoCompensacaoService`;
- `StatusRulesService`;
- `DateRulesService`;
- `SelicService`;
- `CascataRule`;
- integracao controlada com `CalculoService`;
- metadados de simulacao;
- rastreabilidade em UI/PDF/Excel;
- fixtures normativas.

## Estado Atual Verificado em 2026-06-14

- Branch atual: `main`.
- Checkpoint tecnico recente: `b4c779a chore: checkpoint current PERDCOMP state`; commit posterior `a305029` atualizou o README publico.
- `package.json` possui `test`, `lint`, `build`, `dev` e `preview`.
- Validacao executada na rodada documental inicial: `npm test` aprovado com 14 arquivos/60 testes, `npm run lint` aprovado e `npm run build` aprovado com avisos nao bloqueantes de chunk/plugin timing.
- Validacao executada apos Passo 1: `npm test` aprovado com 15 arquivos/62 testes.
- `CalculoService.ts` integra `calcularSelicRastreavel(...)` e usa resultado normativo quando disponivel, mantendo fallback historico identificado quando faltam dados/taxa.
- `store.ts` persiste em IndexedDB via `idb-keyval`, nao apenas em `localStorage`.
- `UploadComponent.tsx` usa Worker e fallback local via `importPipeline`.
- UI inclui `RastreabilidadePanel`, `StatusBadge` e tooltips consultivos.
- PDF ja possui bloco inicial de premissas/metodologia e origem/metodo/status por valor individual nos comparativos quando o snapshot possui `rastreabilidadeValores`.
- Passo 1 implementou `rastreabilidadeValores` nos snapshots e origem/metodo/status nas celulas monetarias do PDF.
- Itens nao rastreados no git nesta rodada: `docs/AuditoriaTributariaB.Smart/13-RelatorioHandoffCheckpointB4C779A.md`, `testSelic.ts` e `tmp/`.

Fora de escopo nesta primeira implementacao:

- apuracao operacional completa de IPI, RAIPI, estornos, trimestre e menor saldo ajustado;
- calculo automatico de componentes judiciais quando o e-CAC nao trouxer os componentes;
- bloqueios duros por vedacao antes de validacao com caso real e decisao do usuario;
- alteracao ou recalculo de qualquer campo `...Original`.

## Invariantes Obrigatorias

- Campos `...Original` permanecem imutaveis.
- Valor importado da RFB, valor calculado pelo motor, valor simulado pelo usuario e valor apenas exibido/formatado devem ter origem distinta.
- Toda regra normativa aplicada deve ter fonte, hipotese, dados usados, dados ausentes, metodo e status.
- Quando dado obrigatorio estiver ausente, retornar `dados_insuficientes`, nao analogia silenciosa.
- O fator historico atual pode permanecer apenas como `estimativa_historica`.
- DCOMP hipotetica deve ser sempre identificada como simulada.
- Data de transmissao original nao deve ser substituida por data de valoracao calculada pelo art. 157.

## Tipos Conceituais Minimos

```ts
type FonteNormativa = {
  arquivo?: string;
  ato?: string;
  artigo?: string;
  paginaOuSecao?: string;
  resumo: string;
};

type OrigemValor =
  | 'importado_rfb'
  | 'calculado_motor'
  | 'simulado_usuario'
  | 'replicado_credito_raiz'
  | 'fallback_operacional'
  | 'exibido_formatado';

type StatusCalculo =
  | 'normativo'
  | 'estimativa_historica'
  | 'dados_insuficientes'
  | 'vedado'
  | 'fora_de_escopo'
  | 'tipo_nao_classificado';

type ResultadoAuditavel<T> = {
  statusCalculo: StatusCalculo;
  valor?: T;
  metodo: string;
  origemValor: OrigemValor;
  fontesNormativas: FonteNormativa[];
  dadosUsados: string[];
  dadosAusentes: string[];
  hipoteses: string[];
  alertas: string[];
};
```

## Contrato de Importacao

Antes de `SelicService`, ampliar o modelo com metadados opcionais de credito e de documento:

```ts
type MetadadosCreditoImportado = {
  dataArrecadacaoCredito?: Date;
  competenciaCredito?: string;
  tipoCompetenciaCredito?: string;
  numeroPagamento?: string;
  periodoApuracaoDarf?: string;
  processoJudicial?: string;
  processoHabilitacao?: string;
  processoAdministrativo?: string;
  dataProtocoloPerOriginal?: Date;
  numeroPerOriginal?: string;
  origemDataProtocoloPerOriginal?: 'importada' | 'resolvida_por_linhagem' | 'informada_usuario';
};
```

Regras:

- Esses campos sao evidencia de importacao, nao resultado calculado.
- Ausencia de campo deve ser preservada como ausencia, nao preenchida por inferencia fraca.
- `dataProtocoloPerOriginal` so pode ser resolvida quando o PER original estiver identificado na cadeia ou for informado pelo usuario com rastro.

## `CreditoRulesService`

Responsabilidade:

- normalizar `tipoCredito`;
- identificar meio cabivel e pre-requisitos;
- indicar se DCOMP e admitida, vedada ou depende de dado complementar;
- expor regra SELIC aplicavel por tipo.

Saida minima:

```ts
type CreditoClassificado = {
  tipoCreditoOriginal: string;
  tipoCreditoId:
    | 'pagamento_indevido_maior'
    | 'pagamento_indevido_maior_esocial'
    | 'contribuicao_previdenciaria_indevida_maior'
    | 'saldo_negativo_irpj'
    | 'saldo_negativo_csll'
    | 'credito_judicial'
    | 'ressarcimento_ipi'
    | 'ressarcimento_pis_cofins'
    | 'desconhecido';
  dcompAdmitida: boolean | 'depende';
  exigeHabilitacao?: boolean;
  exigePerOriginal?: boolean;
  exigeComponentesJudiciais?: boolean;
  fontesNormativas: FonteNormativa[];
};
```

## `StatusRulesService`

Responsabilidade:

- normalizar status e tipo de documento;
- separar vigencia, editabilidade, cancelabilidade e vedacao normativa.

Saida minima:

```ts
type StatusProcessamentoClassificado = {
  statusOriginal: string;
  statusNormalizado: string;
  tipoDocumentoOriginal: string;
  tipoDocumentoNormalizado: string;
  vigenciaCascata: 'vigente' | 'nao_vigente' | 'indeterminado';
  editabilidadeSimulacao: 'editavel' | 'bloqueado' | 'indeterminado';
  cancelabilidade: 'cancelavel' | 'nao_cancelavel' | 'indeterminado';
  motivos: string[];
  fontesNormativas: FonteNormativa[];
};
```

Casos obrigatorios:

- `Pedido de cancelamento deferido | Pedido Cancelamento`;
- `Nao admitido | Decl. Compensacao`;
- `Retificado`;
- `Cancelado`;
- `Homologado`;
- `Despacho Decisorio Emitido`;
- `Em discussao administrativa - DRJ/CARF/CSRF`;
- `Analise concluida`.

## `DateRulesService`

Responsabilidade:

- converter competencia/periodo de apuracao em mes normativo;
- calcular termo inicial por tipo de credito;
- calcular termo final por DCOMP original;
- aplicar art. 157 para transmissao em dia nao util;
- calcular o 361 dia do PER original para art. 152.

Saida minima:

```ts
type ResultadoDataValoracao = {
  dataTransmissaoOriginal: Date;
  dataEntregaValoracao: Date;
  ajusteArt157Aplicado: boolean;
  termoInicialMes?: string;
  termoFinalMes?: string;
  dadosAusentes: string[];
  fontesNormativas: FonteNormativa[];
};
```

Ponto pendente:

- A contagem civil exata do 361 dia deve ser validada com o usuario antes de automacao definitiva.

## `SelicService`

Responsabilidade:

- receber regra, datas e taxa/tabela;
- calcular taxa aplicavel apenas quando fonte e dados forem suficientes;
- aplicar formulas de credito atualizado, credito original utilizado e saldo original.

Entrada minima:

```ts
type SelicCalculationInput = {
  tipoCredito: CreditoClassificado;
  valorCreditoOriginalNaDataEntrega: number;
  totalDebitosDocumento: number;
  termoInicialMes: string;
  termoFinalMes: string;
  dataEntregaValoracao: Date;
  taxaSelicDecimal?: number;
  fonteTabelaSelic?: string;
};
```

Saida minima:

```ts
type SelicCalculationResult = ResultadoAuditavel<{
  taxaSelicDecimal: number;
  valorCreditoAtualizado: number;
  creditoOriginalUtilizadoCalculado: number;
  saldoCreditoOriginalCalculado: number;
}>;
```

Regras:

- Se taxa nao puder ser obtida com seguranca, retornar `dados_insuficientes`.
- Se a tabela Sicalc de debitos for usada por subtracao de acumuladas, essa hipotese deve ser documentada e testada antes de virar `normativo`.
- Para credito judicial, usar `SelicService` por componente, nao por DCOMP inteira, quando houver componentes.

## `CascataRule`

Responsabilidade:

- definir estrategia de saldo inicial e consumo por tipo de credito;
- impedir que fallback operacional pareca conclusivo;
- separar status tecnico de acao sugerida.

Entrada/saida minima:

```ts
type CascataRule = {
  tipoCreditoId: string;
  estrategiaSaldoInicial:
    | 'pool_detalhadores_vigentes'
    | 'credito_raiz_replicado'
    | 'componentes_credito_judicial'
    | 'dados_insuficientes';
  permiteMultiplosDetalhamentos: boolean;
  fontes: FonteNormativa[];
};

type ResultadoConsumoCredito = ResultadoAuditavel<{
  saldoInicialCalculado: number;
  saldoFinalCalculado: number;
  creditoOriginalUtilizadoCalculado: number;
}>;
```

## Integracao com `CalculoService`

Ordem recomendada:

1. Manter comportamento atual como fallback.
2. Adicionar classificacao de credito/status sem mudar calculo.
3. Adicionar resultados auditaveis em campos separados.
4. Usar resultado normativo apenas quando `statusCalculo = normativo`.
5. Se a regra falhar por dado ausente, manter fator historico como `estimativa_historica`, sem sobrescrever resultado normativo.

Anti-regras:

- Nao substituir `valorUtilizadoPerdcompOriginal`.
- Nao recalcular DCOMP real importada sem edicao.
- Nao converter divergencia matematica em `RETIFICAR` sem causa/metodo/confianca.
- Nao aplicar SELIC unica a credito judicial sem componentes.

## Simulacao e DCOMP Hipotetica

Metadados minimos:

```ts
type AuditoriaSimulacao = {
  origemValores: 'importado_rfb' | 'simulado_usuario';
  dataTransmissaoHipotetica?: Date;
  origemDataTransmissaoHipotetica?: 'informada_usuario' | 'default_sistema';
  dataEntregaValoracao?: Date;
  metodoConsumoCredito: 'normativo_selic' | 'estimativa_historica' | 'dados_insuficientes';
  dadosAusentes: string[];
  hipoteses: string[];
};
```

Regras:

- DCOMP hipotetica precisa de data auditavel.
- Campos `...Original` da hipotetica sao baseline simulado, nao RFB.
- Proporcionalidade de multa/juros deve ter metodo declarado.

## Relatorios

PDF e Excel devem exibir:

- origem do valor;
- metodo;
- fonte normativa;
- status de calculo;
- dados ausentes;
- hipoteses;
- diferenca entre importado, calculado e simulado.

Excel futuro deve ter, no minimo:

- `Resumo`;
- `Premissas`;
- `Cascata`;
- `Debitos`;
- `SELIC`;
- `StatusVigencia`;
- `Evidencias`.

## Ordem de Implementacao Recomendada

### Pre-condicao tecnica

Historico: antes da Fase 1, o `package.json` possuia scripts de `dev`, `build`, `lint` e `preview`, mas nao possuia runner nem script de testes automatizados.

Estado atual: Vitest e script `test` ja existem. A pre-condicao de testes foi cumprida e revalidada em 2026-06-14 com 15 arquivos/62 testes apos o Passo 1.

Recomendacao pratica atual:

- manter testes de servicos puros como contrato de regressao;
- adicionar testes focados antes de ampliar comportamento ativo;
- registrar em AUD-09 qualquer nova regra normativa, UI consultiva ou relatorio que vire comportamento validado;
- nao endurecer alerta consultivo como bloqueio sem fonte oficial, hipotese, impacto e caso de validacao.

### Fase 1 - Contratos e testes sem alterar comportamento

- Criar tipos/fixtures de teste.
- Automatizar FX-SEL-001 a FX-SEL-008, CT-RET-001 a CT-RET-004, CT-CAS-001 a CT-CAS-005 e CT-ORI-001.
- Criar helpers puros de normalizacao.
- Nenhuma mudanca visual obrigatoria.
- Nao alterar `CalculoService.ts`, `ExcelParser.ts`, `store.ts`, componentes de UI ou geracao de PDF nesta fase, salvo ajuste estritamente necessario para expor tipos sem mudar comportamento.

Arquivos propostos para a Fase 1, sujeitos a autorizacao:

| Arquivo/pasta | Finalidade | Observacao de seguranca |
| --- | --- | --- |
| `src/services/normativo/types.ts` | Tipos comuns: `FonteNormativa`, `OrigemValor`, `StatusCalculo`, `ResultadoAuditavel`, metadados de importacao/simulacao. | Apenas contratos; sem execucao no fluxo ativo. |
| `src/services/normativo/fixturesSelic.ts` | Fixtures FX-SEL-001 a FX-SEL-008 com taxa injetada quando o objetivo for testar formula. | Nao usar tabela Sicalc por inferencia silenciosa. |
| `src/services/normativo/dateRules.ts` | Helpers puros para mes normativo, mes subsequente, segundo mes subsequente, mes anterior e marcacao de dados ausentes. | Art. 157 e 361 dia devem permanecer testados; feriados podem iniciar como calendario parametrizado. |
| `src/services/normativo/creditRules.ts` | Normalizacao consultiva dos tipos de credito priorizados. | Sem bloqueio duro de credito/debito. |
| `src/services/normativo/statusRules.ts` | Normalizacao consultiva de status e tipo de documento. | Separar vigencia, editabilidade, cancelabilidade e vedacao. |
| `src/services/normativo/selicMath.ts` | Formula pura: credito atualizado, credito original utilizado e saldo original calculado com taxa recebida. | Nao buscar taxa; apenas calcular com entrada auditavel. |
| `src/services/normativo/__tests__/*.test.ts` | Testes das fixtures e invariantes. | Nenhum teste deve depender de mutacao de `...Original`. |

Entregaveis minimos da Fase 1:

- infraestrutura de teste funcionando;
- tipos normativos compilando;
- testes de formula SELIC com taxa injetada;
- testes de marcos de data por tipo de credito;
- testes de `dados_insuficientes`;
- testes de normalizacao de status reais da planilha;
- teste de invariancia de `...Original` em objetos simulados.

Nao entregaveis da Fase 1:

- recalculo ativo de cascata;
- alteracao de PDF/UI;
- alteracao do parser real;
- bloqueio automatico de compensacao;
- classificacao tributaria conclusiva fora dos casos especificados.

### Fase 2 - Importacao e classificadores consultivos

- Ampliar `ExcelParser.ts` para metadados opcionais.
- Implementar `CreditoRulesService`, `StatusRulesService` e `VedacaoCompensacaoService` em modo consultivo.
- UI/PDF podem exibir alertas, sem bloqueio duro.

### Fase 3 - Datas e SELIC

- Implementar `DateRulesService`.
- Implementar `SelicService` com status auditavel.
- Validar tabela/taxa antes de resultado `normativo`.

### Fase 4 - Cascata e simulacao

- Implementar `CascataRule`.
- Integrar `CalculoService` mantendo fallback.
- Exigir data auditavel em DCOMP hipotetica.
- Adicionar metadados de edicao de debitos.

### Fase 5 - Relatorios e revalidacao

- Ajustar rotulos do PDF.
- Adicionar premissas/metodologia.
- Implementar Excel futuro, se autorizado.
- Rodar lint/build/testes e registrar resultado nos arquivos de auditoria.

## Gates de Validacao

Antes de aceitar implementacao:

- `npm run test`, apos criacao do script de testes;
- `npm run lint`;
- `npm run build`;
- testes automatizados das fixtures normativas;
- fixture de importacao real `Sheets/relatorio.xlsx`;
- verificacao de que nenhum campo `...Original` foi alterado;
- revisao visual de UI/PDF se houver mudanca de interface/relatorio;
- registro do resultado em AUD-09 e no objeto pertinente.

## Mapa de Achados para Implementacao

| Achado | Entrega tecnica principal |
| --- | --- |
| ACH-001, ACH-005 | `SelicService`, `DateRulesService`, fixtures FX-SEL |
| ACH-006 | `CreditoJudicialRulesService` ou extensao por componente |
| ACH-007, ACH-008 | Metadados de importacao e resolucao de PER original |
| ACH-009 | `CreditoRulesService` |
| ACH-010 a ACH-013 | `CascataRule` e status tecnico/acao sugerida |
| ACH-014, ACH-015 | `StatusRulesService` e `VedacaoCompensacaoService` |
| ACH-016 a ACH-018 | Metadados de relatorio/snapshot |
| ACH-019 a ACH-021 | Metadados de simulacao, DCOMP hipotetica e edicao de debitos |

## Estado

- Status: Fases 1, 2, 3 e 4 parcialmente executadas e revalidadas; checkpoint `b4c779a` adicionou melhorias de UI/rastreabilidade, fallback de Worker, vedacao consultiva e cobertura de testes.
- Implementacao ativa: contratos normativos, importacao de metadados, classificadores consultivos, SELIC rastreavel, provider SELIC, integracao controlada com `CalculoService`, persistencia IndexedDB, painel de rastreabilidade e PDF com premissas iniciais.
- Proximo passo recomendado: consolidar origem/metodo/status por valor em UI/PDF/snapshots, versionar schema persistido e planejar Excel auditavel.

## Rodada de Implementacao Fase 1 - 2026-06-07

Escopo executado:

- adicionado Vitest e script `npm run test`;
- criados contratos comuns em `src/services/normativo/types.ts`;
- criada matematica SELIC pura com taxa injetada em `selicMath.ts`;
- criados helpers puros de datas em `dateRules.ts`;
- criada classificacao consultiva de creditos em `creditRules.ts`;
- criada classificacao consultiva de status em `statusRules.ts`;
- criada regra consultiva de cascata em `cascataRules.ts`;
- criadas fixtures FX-SEL-001 a FX-SEL-008 em `fixturesSelic.ts`;
- criada guarda de campos `...Original` em `originalValueGuards.ts`;
- criados 7 arquivos de teste em `src/services/normativo/__tests__/`.

Limites preservados:

- nao houve integracao com `CalculoService.ts`;
- nao houve alteracao de `ExcelParser.ts`;
- nao houve alteracao de `store.ts`;
- nao houve alteracao de UI ou PDF;
- nenhum campo `...Original` foi recalculado ou sobrescrito;
- fatores historicos atuais continuam inalterados no fluxo ativo.

Validacao executada:

- `npm run test`: aprovado, 7 arquivos, 28 testes.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.

Riscos/observacoes:

- `npm install --save-dev vitest` reportou 1 vulnerabilidade alta no `npm audit`; nao foi tratada nesta fase para evitar mudanca de dependencias fora do escopo.
- O build emitiu avisos de chunk acima de 500 kB e plugin timings do Vite; sem falha.
- A contagem do 361 dia do art. 152 foi implementada como helper preliminar com hipotese registrada `contagem_calendario_pendente_validacao_usuario`.
- O art. 157 considera inicialmente sabado/domingo; feriados dependem de decisao/fonte de calendario na fase futura.

## Rodada de Implementacao Fase 2 Parcial - 2026-06-07

Escopo executado:

- ampliado `src/models/types.ts` com `MetadadosCreditoImportado` e `ImportQualityReport`;
- ampliado `DCOMP` com `metadadosCreditoImportado` opcional;
- ampliado `parseExcelFile` para retornar `importQualityReport`;
- preservados metadados opcionais de SELIC/credito importados da aba `Processamento PERDCOMP`;
- documentados documentos ignorados por ausencia de cadeia relacional;
- criada cobertura automatizada com planilhas reais da pasta `Sheets/`.

Limites preservados:

- nao houve alteracao de `CalculoService.ts`;
- nao houve integracao dos classificadores consultivos ao fluxo ativo;
- nao houve alteracao de `store.ts`, UI ou PDF;
- campos `...Original` continuam sendo base importada, nao resultado calculado.

Validacao executada:

- `npm run test`: aprovado, 8 arquivos, 34 testes.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.

Proximo passo recomendado:

- continuar Fase 2 integrando `CreditoRulesService`, `StatusRulesService` e qualidade de importacao em modo consultivo, sem bloqueios duros e sem recalculo ativo.

## Rodada de Implementacao Fase 2 Consultiva - 2026-06-07

Escopo executado:

- `CreditoRulesService` integrado ao parser como `classificacaoCreditoConsultiva`;
- `StatusRulesService` integrado ao parser como `statusProcessamentoConsultivo`;
- `ImportQualityReport` transportado pelo worker e preservado no store;
- testes reais ampliados para validar classificacoes consultivas e preservacao do relatorio no estado.

Limites preservados:

- classificacoes nao alteram `statusCascata`;
- classificacoes nao bloqueiam edicao/simulacao;
- classificacoes nao alteram consumo de credito;
- nenhuma regra normativa foi usada para recalcular valores importados.

Validacao executada:

- `npm run test`: aprovado, 9 arquivos, 36 testes.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.

Proximo passo recomendado:

- iniciar Fase 3 com `DateRulesService`/`SelicService` calculando resultado normativo somente quando dados e taxa forem suficientes, mantendo `estimativa_historica` como fallback rastreavel.

## Rodada de Implementacao Fase 3 Parcial - 2026-06-07

Escopo executado:

- criado `SelicService` rastreavel em `src/services/normativo/selicService.ts`;
- ampliado `DateRulesService` com termo final e extracao do fim do periodo de apuracao;
- adicionada validacao real com DCOMPs importadas de `Sheets/`;
- mantida a camada fora do fluxo ativo de cascata.

Comportamento:

- `normativo`: somente com dados e `taxaSelicDecimal` suficientes;
- `dados_insuficientes`: quando faltar componente judicial, PER original, data material ou taxa;
- `estimativa_historica`: quando a taxa normativa faltar, mas houver `fatorHistorico` informado como fallback operacional;
- todos os resultados retornam metodo, origem do valor, dados usados, dados ausentes, hipoteses e alertas.

Validacao executada:

- `npm run test`: aprovado, 10 arquivos, 39 testes.
- `npm run lint`: aprovado.
- `npm run build`: aprovado.

Proximo passo recomendado:

- ampliar a Fase 3 para pagamento indevido/eSocial, CPIM e art. 152 com dados reais/complementares; depois preparar Fase 4 de integracao controlada com `CalculoService`.

## Rodada de Consolidacao Documental - 2026-06-14

Escopo verificado sem alterar codigo:

- leitura do handoff `13-RelatorioHandoffCheckpointB4C779A.md`;
- inventario Markdown do projeto;
- comparacao contra codigo, UI, testes e git status;
- validacao por `npm test`, `npm run lint` e `npm run build`.

Estado confirmado:

- 15 arquivos de teste e 62 testes aprovados apos o Passo 1;
- `CalculoService.ts` integrado ao `SelicService` com fallback;
- `idb-keyval`/IndexedDB ativo no store;
- Worker com fallback local pelo `importPipeline`;
- UI de rastreabilidade e badges padronizados;
- `VED-DCTFWEB-CRUZADA` consultivo por PA do credito;
- PDF com premissas/metodologia inicial.

## Rodada Passo 1 - Rastreabilidade por Valor - 2026-06-14

Entregas:

- Tipo de snapshot para rastreabilidade por DCOMP/valor.
- Helper puro `src/services/valueTraceability.ts`.
- Persistencia de `rastreabilidadeValores` em `salvarSimulacaoCadeia`.
- PDF com origem/metodo/status nas celulas monetarias quando o metadado existe.
- Teste de store para snapshot e teste de PDF para renderizacao do metadado.

Validacao:

- RED observado nos testes novos antes da implementacao.
- `npm test -- src/__tests__/storeImportQuality.test.ts src/services/__tests__/ReportGeneratorService.test.ts`: aprovado.
- `npm test`: aprovado com 15 arquivos e 62 testes.

Risco residual:

- Snapshots antigos persistidos em IndexedDB podem nao possuir `rastreabilidadeValores`; o PDF mantém fallback para valor monetario simples nesses casos.
- O layout do PDF pode precisar de ajuste visual fino por causa de celulas mais densas.

Limites ainda vigentes:

- `...Original` permanece intocavel;
- credito judicial sem componentes segue como `dados_insuficientes`;
- DCOMP hipotetica precisa de data auditavel e metodo SELIC proprio;
- alertas consultivos nao devem virar bloqueios duros sem nova autorizacao e fonte normativa.

## Pedido de Autorizacao Recomendado

Para avancar com eficiencia e baixo risco, a autorizacao tecnica deve ser limitada a:

1. criar infraestrutura de testes;
2. criar apenas arquivos novos em `src/services/normativo/`;
3. criar testes automatizados para os casos ja documentados em AUD-09;
4. nao conectar os novos servicos ao fluxo ativo;
5. nao alterar campos `...Original`, parser, store, UI, PDF ou regra de cascata ativa.

Texto sugerido de autorizacao:

> Autorizar Fase 1 da implementacao normativa: criar runner de testes, contratos e servicos puros em `src/services/normativo/`, com fixtures automatizadas de AUD-09, sem integrar ao fluxo ativo e sem alterar `...Original`.

## Questoes Abertas Antes da Implementacao

### Bloqueantes para iniciar Fase 1

Estas questoes precisam de confirmacao do usuario antes de qualquer alteracao tecnica, ainda que a Fase 1 nao conecte os servicos ao fluxo ativo:

1. Autorizacao expressa da Fase 1.
   - Escopo recomendado: criar runner de testes, contratos e servicos puros em `src/services/normativo/`, sem integracao ao fluxo ativo.
   - Sem esta autorizacao, a auditoria permanece apenas documental.

2. Runner de testes.
   - Recomendacao tecnica: Vitest, por aderencia a Vite/TypeScript.
   - Impacto: altera `package.json`/lockfile e cria script `npm run test`.

### Bloqueantes para Fase 3 ou para resultado `normativo`

Estas questoes nao impedem contratos e testes puros, mas impedem que o calculo seja classificado como `normativo` em producao:

1. Fonte operacional da taxa SELIC.
   - A tabela local `Selic_Acumulada_ate_06.2026.pdf` foi identificada como tabela Sicalc de acrescimos legais.
   - Deve ser confirmado se a engine usara tabela propria de taxa mensal SELIC, tabela acumulada validada, ou calculo por subtracao de acumuladas como hipotese tecnica testada.

2. Contagem do 361 dia do PER original para art. 152.
   - A auditoria registrou o marco normativo, mas a contagem civil exata deve ser validada antes de automacao definitiva.
   - A decisao deve definir se o 361 dia e tratado por contagem calendario simples e como lidar com feriado/dia nao util no termo inicial.

3. Calendario de dia util para art. 157.
   - Deve ser decidido se a primeira versao considera apenas sabado/domingo ou tambem feriados nacionais/bancarios/RFB.
   - Se feriados forem considerados, e preciso definir a fonte da tabela de feriados.

4. DCOMP hipotetica.
   - Confirmar se a data de transmissao hipotetica deve ser sempre informada pelo usuario ou se pode haver default do sistema marcado como `default_sistema`.
   - Sem data auditavel, a simulacao deve permanecer `dados_insuficientes` ou `estimativa_historica`.

5. Credito judicial sem componentes no e-CAC.
   - A regra normativa exige componente, forma de atualizacao, valor original/atualizado e ordem de consumo.
   - Confirmar se a aplicacao deve apenas retornar `dados_insuficientes` ou se tambem aceitara componentes informados manualmente pelo usuario.

6. Ressarcimento de PIS/Cofins sem PER previo.
   - A auditoria registrou que o fluxo sem PER previo nao deve receber automaticamente a regra do art. 152 de DCOMP posterior a PER.
   - Confirmar o tratamento esperado no app: fora de escopo, `dados_insuficientes`, ou fluxo proprio a ser auditado em nova rodada.

7. Multa e juros de debitos.
   - Confirmar se a aplicacao deve manter recalculo proporcional apenas como estimativa declarada ou se havera suporte a validacao externa/Sicalc.
   - Enquanto nao houver motor ou conferencia Sicalc, o resultado deve ser rotulado como estimativa/metodo informado, nao como valor correto normativo.

8. Vedacoes e bloqueios duros.
   - A auditoria recomenda catalogos consultivos primeiro.
   - Confirmar quando, e para quais regras, a aplicacao deve bloquear operacoes em vez de apenas alertar com fonte normativa.

### Pode ser decidido depois da Fase 1

- Layout final dos alertas em UI/PDF.
- Exportacao Excel completa.
- Estrategia de persistencia dos metadados de auditoria em snapshots salvos.
- Tratamento de tipos de credito fora dos seis tipos reais encontrados na planilha inicial.
