# AUD-04 - Consumo de Credito Original e Cascata

## Descricao do Objeto

Auditar como a aplicacao calcula o saldo original disponivel, o credito original utilizado e o saldo original restante em uma cadeia de PER/DCOMPs.

## Criticidade

Critica.

## Codigo Relacionado

- `src/services/CalculoService.ts`
- `src/store.ts`
- `src/components/TimelineCascata.tsx`
- `src/components/CascataKpis.tsx`
- `src/services/ReportGeneratorService.ts`

## Comportamento Atual do Codigo

O motor de cascata:

- calcula um pool de saldo original a partir dos documentos detalhadores vigentes;
- usa fallback para tipos que nao permitem multiplos detalhamentos;
- abate `valorUtilizadoPerdcomp` de documentos vigentes;
- calcula `saldoCreditoOriginalCalculado`;
- preserva uma trilha historica em `saldoCreditoOriginalAnterior`;
- marca divergencia quando o saldo calculado de entrada difere do saldo importado.

### Rodada de Auditoria de 2026-06-07

Fontes tecnicas verificadas:

- `src/services/CalculoService.ts`, linhas 92 a 250.
- `src/utils/statusHelper.ts`, linhas 1 a 47.
- `src/components/TimelineCascata.tsx`, linhas 24 a 49.
- `src/models/types.ts`, linhas 35 a 70.
- `Sheets/relatorio.xlsx`, aba `Processamento PERDCOMP`.

Perfil operacional extraido da planilha real, considerando a linha 1 como cabecalho efetivo da aba `Processamento PERDCOMP`:

| Tipo de credito | Linhas | Cadeias | Cadeias com mais de um documento | Cadeias com multiplos detalhadores | Cadeias com retificacao/cancelamento indicado |
| --- | ---: | ---: | ---: | ---: | ---: |
| Contribuicao Previdenciaria Indevida ou a Maior | 556 | 404 | 90 | 50 | 52 |
| Credito Oriundo de Acao Judicial | 9 | 9 | 0 | 0 | 0 |
| Pagamento Indevido ou a Maior eSocial | 451 | 94 | 72 | 70 | 41 |
| Pagamento Indevido ou a Maior | 40 | 40 | 0 | 0 | 1 |
| Saldo Negativo de CSLL | 128 | 20 | 11 | 9 | 9 |
| Saldo Negativo de IRPJ | 288 | 27 | 13 | 7 | 12 |

Leitura tecnica do algoritmo atual:

- O saldo original inicial da cadeia e calculado como soma dos documentos vigentes que parecem ser detalhadores, isto e, sem `numeroDcompDetalhamento` ou com `numeroDcompDetalhamento === id`.
- O valor usado para o pool e `valorTotalCreditoDetalhadoOriginal || valorTotalCreditoDetalhado`, o que preserva a preferencia pelo valor importado original.
- Quando o pool resulta zero, o motor usa fallback para o maior `valorTotalCreditoDetalhado` vigente ou, se nao houver, para o primeiro documento da cadeia.
- A distincao entre tipos que permitem multiplos detalhamentos e tipos com credito raiz replicado e feita por comparacao textual de `tipoCredito`.
- Para tipos fora da heuristica de multiplos detalhamentos, o motor replica `valorTotalCreditoDetalhado` da primeira DCOMP vigente para documentos posteriores. A replicacao ocorre no campo mutavel, nao em `valorTotalCreditoDetalhadoOriginal`.
- O abatimento de saldo usa `valorUtilizadoPerdcomp`. Em DCOMP real nao editada, esse campo e restaurado a partir de `valorUtilizadoPerdcompOriginal`; em DCOMP editada ou hipotetica, ele e recalculado por fator historico/aproximado ja registrado no AUD-01/AUD-07.
- A divergencia de entrada compara `valorCreditoDataTransmissao` importado com o saldo calculado antes do abatimento do documento corrente e, se a diferenca superar cinco centavos, gera `RETIFICAR`, `EDITADO_E_RETIFICAR` ou `IMPACTADO_BLOQUEADO`.
- `statusHelper.ts` considera nao vigente apenas situacoes expressamente listadas e trata os demais status como vigentes por fallback.

## Achados da Rodada

### ACH-010 - Estrategia de consumo por tipo de credito ainda depende de texto livre

- Objeto relacionado: AUD-02, AUD-04, AUD-05, AUD-08.
- Criticidade: Critica.
- Evidencia tecnica:
  - `CalculoService.ts`, linhas 132 a 141.
  - `TimelineCascata.tsx`, linhas 27 a 49.
- Descricao:
  - A regra de multiplos detalhamentos e decidida por `includes()` em `tipoCredito`.
  - A matriz do AUD-02 ja demonstrou que `tipoCredito` precisa virar classificador normalizado, com aliases e comportamento por tipo.
- Risco:
  - Alteracao de grafia da RFB, acentuacao, abreviacao ou novo subtipo pode deslocar uma cadeia para estrategia errada de pool/replicacao.
  - Uma divergencia de saldo pode ser tributariamente falsa se a estrategia de consumo aplicada for inadequada ao tipo de credito.
- Diretriz:
  - Substituir a heuristica textual por regra consultiva em `CreditoRulesService`/`CascataRule`, mantendo fallback explicitamente marcado como `dados_insuficientes` ou `tipo_nao_classificado`.

### ACH-011 - Fallback de pool pode mascarar insuficiencia de dados ou erro de linhagem

- Objeto relacionado: AUD-03, AUD-04, AUD-05.
- Criticidade: Alta.
- Evidencia tecnica:
  - `CalculoService.ts`, linhas 101 a 130.
- Descricao:
  - Quando nenhum detalhador vigente compoe saldo, o motor assume o maior credito vigente ou o primeiro credito da cadeia.
- Risco:
  - O relatorio pode apresentar saldo calculado com aparencia conclusiva mesmo quando a cadeia nao possui base tecnica suficiente para formar o pool.
  - Em casos de importacao incompleta, retificacao mal classificada ou relacionamento ausente, o fallback pode esconder uma falha que deveria ser auditada.
- Diretriz:
  - Manter o fallback apenas como camada operacional, mas registrar `metodoSaldoInicial`, `fonteSaldoInicial`, `dadosAusentes` e `confiancaCalculo`.
  - Para calculo normativo futuro, retornar estado consultivo (`dados_insuficientes`) quando o pool nao puder ser formado por regra do tipo de credito.

### ACH-012 - Replicacao de credito para UI precisa de rastro de origem

- Objeto relacionado: AUD-04, AUD-05, AUD-08.
- Criticidade: Alta.
- Evidencia tecnica:
  - `CalculoService.ts`, linhas 139 a 149.
  - `TimelineCascata.tsx`, linhas 36 a 49.
- Descricao:
  - Para tipos que nao permitem multiplos detalhamentos pela heuristica atual, o motor replica `valorTotalCreditoDetalhado` da primeira DCOMP vigente para documentos posteriores.
  - A replicacao nao sobrescreve `valorTotalCreditoDetalhadoOriginal`, o que respeita a invariante central, mas o campo mutavel passa a conter valor de exibicao/calculo e nao o dado importado daquele documento.
- Risco:
  - UI e relatorio podem induzir leitura de que o valor replicado foi importado da RFB para aquele documento, se a origem nao estiver explicitada.
- Diretriz:
  - Registrar metadado de origem do valor apresentado, por exemplo `origemValorCreditoDetalhado: importado_rfb | replicado_credito_raiz | calculado_selic | simulado_usuario`.
  - No relatorio, distinguir claramente valor original/importado do valor calculado/replicado para fins de cascata.

### ACH-013 - Status `RETIFICAR` deriva de divergencia matematica, nao de conclusao tributaria definitiva

- Objeto relacionado: AUD-04, AUD-06, AUD-08.
- Criticidade: Alta.
- Evidencia tecnica:
  - `CalculoService.ts`, linhas 215 a 244.
  - `statusHelper.ts`, linhas 31 a 47.
- Descricao:
  - O motor transforma divergencia maior que cinco centavos entre saldo de entrada importado e saldo calculado em status de retificacao, salvo bloqueio ou edicao manual.
  - A classificacao de vigencia usa uma lista negativa; todo status nao listado como nao vigente e tratado como vigente.
- Risco:
  - O app pode sugerir retificacao quando a divergencia decorre de regra de tipo de credito, SELIC ainda aproximada, dados ausentes, status da RFB ou componente nao modelado.
  - O termo `RETIFICAR` tem carga operacional/tributaria forte e deve ser usado como recomendacao consultiva, nao como conclusao automatica sem fonte e premissas.
- Diretriz:
  - Separar `statusCascataTecnico` de `acaoSugerida`.
  - A acao sugerida deve incluir causa, premissas, confianca, dados ausentes e base normativa/tecnica.
  - Ate a validacao completa, divergencias devem ser relatadas como `divergencia_calculada` ou `alerta_retificacao_pendente_validacao`.

## Fragilidades Possiveis

- Regra de pool global pode nao servir para todos os tipos de credito.
- Textos de tipo de credito usados como heuristica podem falhar.
- Retificacoes e documentos bloqueados podem exigir tratamento especifico.
- Saldo negativo precisa ser exibido com sinal, nao mascarado.

## Perguntas de Auditoria

- Em quais tipos de credito ha multiplos detalhamentos independentes?
- Quando o credito raiz deve ser replicado para DCOMPs subsequentes?
- Como documentos nao vigentes devem afetar saldo e relatorio?
- Quando uma divergencia deve virar `RETIFICAR`, `IMPACTADO_BLOQUEADO` ou apenas alerta?

## Possiveis Solucoes

- Separar regra de consumo geral de estrategia por tipo de credito.
- Criar `CascataRule` por tipo de credito, se a auditoria confirmar diferencas.
- Registrar no relatorio a origem do saldo de entrada: importado, calculado, divergente ou hipotetico.

## Desenho Tecnico Proposto

Criar uma camada consultiva de estrategia de cascata antes de alterar o calculo:

```ts
type CascataRule = {
  tipoCreditoId: string;
  estrategiaSaldoInicial:
    | 'pool_detalhadores_vigentes'
    | 'credito_raiz_replicado'
    | 'componentes_credito_judicial'
    | 'dados_insuficientes';
  permiteMultiplosDetalhamentos: boolean;
  exigeComponentesCredito?: boolean;
  exigePerOriginal?: boolean;
  fontes: FonteNormativa[];
};
```

Resultado minimo esperado da camada:

```ts
type ResultadoConsumoCredito = {
  saldoInicialCalculado: number | null;
  saldoFinalCalculado: number | null;
  metodoSaldoInicial: string;
  origemSaldoInicial: 'importado_rfb' | 'calculado_motor' | 'replicado_credito_raiz' | 'fallback_operacional' | 'dados_insuficientes';
  statusConfianca: 'validado' | 'estimado' | 'dados_insuficientes' | 'tipo_nao_classificado';
  dadosAusentes: string[];
  alertas: string[];
};
```

Regras de desenho:

- Nunca alterar `valorTotalCreditoDetalhadoOriginal`, `valorUtilizadoPerdcompOriginal` ou qualquer outro campo `...Original`.
- O campo importado `valorCreditoDataTransmissao` deve continuar sendo lido como evidencia RFB, nao como verdade recalculada.
- Campo calculado deve ter origem e metodo.
- Campo simulado deve ser identificado por edicao do usuario ou DCOMP hipotetica.
- Se a regra por tipo de credito nao for classificavel, a saida deve ser consultiva, sem converter automaticamente divergencia em recomendacao de retificacao.

## Criterios de Aceite

- Consumo validado em cadeia real.
- Saldo negativo preservado em UI e relatorio.
- Divergencias explicadas em linguagem tributaria e tecnica.
- Matriz de casos de teste contemplando:
  - tipo com multiplos detalhamentos;
  - tipo com credito raiz replicado;
  - fallback/dados insuficientes;
  - documento bloqueado ou nao vigente;
  - separacao entre status tecnico e acao sugerida.
