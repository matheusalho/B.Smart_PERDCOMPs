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

## Criterios de Aceite

- Consumo validado em cadeia real.
- Saldo negativo preservado em UI e relatorio.
- Divergencias explicadas em linguagem tributaria e tecnica.
