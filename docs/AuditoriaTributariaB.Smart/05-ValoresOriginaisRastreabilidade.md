# AUD-05 - Valores Originais e Rastreabilidade

## Descricao do Objeto

Auditar a preservacao dos valores importados da RFB e a separacao entre valores originais, calculados, simulados e exibidos.

## Criticidade

Critica.

## Invariante Central

Campos com sufixo `...Original` nao podem ser alterados por simulacao, recalculo, exportacao ou normalizacao posterior ao parse. Eles representam a base importada e auditavel.

## Campos a Mapear

- `valorPrincipalOriginal`
- `valorMultaOriginal`
- `valorJurosOriginal`
- `valorTotalOriginal`
- `valorTotalCreditoDetalhadoOriginal`
- `valorUtilizadoPerdcompOriginal`
- `dataTransmissaoOriginal`
- outros campos que venham a receber sufixo `...Original`

## Fragilidades Possiveis

- Sobrescrever campo original durante edicao manual.
- Usar campo original como fallback e perder distincao entre importado e calculado.
- Relatorio nao explicar quando um valor e simulado.
- Persistencia em `localStorage` hidratar estruturas antigas sem schema versionado.

## Perguntas de Auditoria

- Qual e a origem de cada campo original?
- Quais campos podem ser alterados pelo usuario?
- Quais campos sao calculados pelo motor?
- Quais campos devem ser exportados como evidencia?
- Como diferenciar alteracao de credito raiz de valor importado original?

## Possiveis Solucoes

- Criar matriz de mutabilidade por campo.
- Adicionar camada de metadados de calculo.
- Versionar schema persistido.
- Validar no lint/teste que campos `...Original` nao sao atribuidos fora do parser/criacao de hipotetica.

## Criterios de Aceite

- Tabela de campos e mutabilidade completa.
- Nenhum ajuste tecnico futuro viola a preservacao dos originais.
- Relatorio mostra claramente original, novo e delta.
