# AUD-06 - Retificacoes, Vigencia e Bloqueios

## Descricao do Objeto

Auditar a classificacao de documentos vigentes, nao vigentes, retificados, cancelados, bloqueados ou impedidos de edicao e seus reflexos na cascata.

## Criticidade

Alta.

## Codigo Relacionado

- `src/utils/statusHelper.ts`
- `src/services/CalculoService.ts`
- `src/services/ExcelParser.ts`
- `src/components/TimelineCascata.tsx`

## Comportamento Atual do Codigo

O app usa helpers de status para definir vigencia e bloqueio. O `CalculoService.ts` tambem possui lista de impedimentos historica.

## Conhecimento Geral Ja Extraido

Fontes principais:

- `Knowledge/orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.pdf`
- `Knowledge/creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf`

Pontos relevantes:

- O PER/DCOMP Web permite pedido de cancelamento de PER/DCOMP transmitido anteriormente.
- O cancelamento e irreversivel.
- O PER/DCOMP nao pode ser cancelado se ja tiver sido analisado pela RFB ou se o contribuinte tiver sido intimado para apresentar documentos/esclarecimentos.
- O proprio manual recomenda avaliar se e caso de retificar, em vez de cancelar.
- Vedacoes de credito e debito alcancam declaracoes de compensacao por qualquer meio.
- Certas situacoes devem ser tratadas como alerta/bloqueio normativo, como credito sob fiscalizacao, credito ja nao reconhecido, debito parcelado, DAU, Simples Nacional e estimativa mensal de IRPJ/CSLL.

## Fragilidades Possiveis

- Lista de situacoes pode estar incompleta.
- Situacoes da RFB podem variar em grafia, acento ou descricao.
- Documento bloqueado pode ser sinalizado incorretamente como retificavel.
- Retificacao/cancelamento pode afetar ordem e consumo na cascata.
- A UI pode sugerir retificacao/cancelamento sem considerar impedimento normativo externo ao status textual.

## Perguntas de Auditoria

- Quais situacoes oficiais existem no relatorio e-CAC?
- Quais situacoes impedem retificacao?
- Quais situacoes devem participar do consumo de saldo?
- Como tratar documentos em discussao administrativa, despacho decisorio ou homologados?

## Possiveis Solucoes

- Consolidar status em um unico catalogo auditavel.
- Mapear status oficial para comportamento do app.
- Criar testes de status com fixtures pequenas.
- Exibir motivo de bloqueio na UI e no PDF.
- Criar camada consultiva de vedacoes legais separada de `isVigente` e `isBloqueado`.

## Criterios de Aceite

- Cada status relevante possui fonte ou evidencia.
- `isVigente` e `isBloqueado` ficam documentados.
- UI e relatorio usam a mesma classificacao.
