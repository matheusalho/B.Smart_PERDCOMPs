# AUD-03 - Importacao do Relatorio e-CAC e Linhagem

## Descricao do Objeto

Auditar a importacao da planilha extraida do e-CAC, incluindo abas esperadas, colunas, normalizacao de datas e numeros, agrupamento por cadeia relacional, retificacoes, cancelamentos e ordenacao de linhagens.

## Criticidade

Alta.

## Fontes a Analisar

- Relatorio real `Sheets/relatorio.xlsx`
- `src/services/ExcelParser.ts`
- Manuais operacionais da RFB que expliquem campos e relacoes do PER/DCOMP.

## Comportamento Atual do Codigo

O parser:

- le abas de processamento e debitos;
- converte datas e valores;
- cria DCOMPs e debitos;
- agrupa por `IDs da Cadeia Relacional`;
- reconstrui linhagens por retificacao/cancelamento;
- preserva valores importados em campos `...Original`.

## Fragilidades Possiveis

- Mudanca de nome de coluna pela RFB.
- Ambiguidade entre `Data Transmissao` e `Data de Transmissao do Perdcomp`.
- Datas Excel serializadas com fuso/offset.
- Colunas ausentes ou valores monetarios formatados como texto.
- Ordenacao incorreta de retificacoes com mesma data.

## Perguntas de Auditoria

- Quais colunas sao obrigatorias por aba?
- Quais colunas possuem aliases aceitos?
- Quais campos definem a cadeia e a linhagem?
- Quais campos sao importados como base auditavel?
- Como reportar erro ao usuario sem quebrar a aplicacao?

## Possiveis Solucoes

- Criar contrato de importacao documentado.
- Criar validador de colunas antes do parse.
- Gerar relatorio de qualidade da importacao.
- Transformar aliases de coluna em tabela central.

## Criterios de Aceite

- Matriz de colunas obrigatorias e opcionais.
- Reproducao do parse com a planilha real.
- Casos de teste para datas, valores e retificacoes.
