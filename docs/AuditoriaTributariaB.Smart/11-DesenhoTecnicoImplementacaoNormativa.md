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

### Fase 1 - Contratos e testes sem alterar comportamento

- Criar tipos/fixtures de teste.
- Automatizar FX-SEL-001 a FX-SEL-008, CT-RET-001 a CT-RET-004, CT-CAS-001 a CT-CAS-005 e CT-ORI-001.
- Criar helpers puros de normalizacao.
- Nenhuma mudanca visual obrigatoria.

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

- Status: Solucao proposta.
- Implementacao: nao autorizada neste ciclo.
- Proximo passo apos autorizacao: Fase 1, com testes e contratos puros antes de alterar calculo.
