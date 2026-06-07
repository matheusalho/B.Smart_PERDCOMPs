# AUD-08 - Relatorios PDF/Excel e Rastreabilidade

## Descricao do Objeto

Auditar a capacidade dos relatorios de demonstrar, com clareza e rastreabilidade, os valores originais importados, valores simulados, deltas, status da cascata, impactos colaterais e premissas de calculo.

## Criticidade

Alta.

## Estado Atual

- Relatorio PDF consolidado implementado.
- Exportacao Excel esta no backlog, com prazo a definir.

## Codigo Relacionado

- `src/services/ReportGeneratorService.ts`
- `src/components/TimelineCascata.tsx`
- `src/components/CascataKpis.tsx`

## Fragilidades Possiveis

- Relatorio pode omitir metodologia de calculo.
- Pode haver confusao entre saldo original restante anterior e novo.
- Exportacao futura em Excel pode perder rastreabilidade se nao for planejada a partir da matriz de campos.
- DCOMPs hipoteticas precisam ser claramente identificadas.

## Perguntas de Auditoria

- Quais campos sao indispensaveis para uso por advogado tributarista?
- O relatorio deve declarar se o calculo e normativo validado ou estimativa?
- Como evidenciar fonte normativa por tipo de credito?
- Quais abas devem existir na exportacao Excel futura?

## Possiveis Solucoes

- Criar secao de premissas e metodologia no PDF.
- Incluir legenda de tipos de valor: importado, calculado, simulado.
- Planejar Excel com abas: resumo, cascata, debitos, divergencias, premissas, evidencias.
- Gerar identificadores de caso de auditoria para rastrear simulacoes.

## Criterios de Aceite

- PDF continua passando no fluxo funcional.
- Exportacao Excel futura preserva campos originais e deltas.
- Relatorio explica qualquer estimativa ou regra nao validada.
