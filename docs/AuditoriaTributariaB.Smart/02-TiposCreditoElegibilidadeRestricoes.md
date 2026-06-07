# AUD-02 - Tipos de Credito, Elegibilidade e Restricoes

## Descricao do Objeto

Auditar quais tipos de credito podem ser informados, compensados, restituidos ou ressarcidos no PER/DCOMP Web, bem como restricoes de debitos, vedacoes e meios adequados para cada tipo.

## Criticidade

Critica.

## Fontes Normativas a Analisar

- `Knowledge/meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf`
- `Knowledge/creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.pdf`
- Manuais especificos por tipo de credito.

## Comportamento Atual do Codigo

O codigo usa `tipoCredito` principalmente para:

- agrupar e exibir cadeias;
- aplicar fallback de multiplos detalhamentos em `CalculoService.ts`;
- mostrar contexto em UI e relatorios.

Ainda nao ha matriz normativa central de elegibilidade por tipo de credito.

## Conhecimento Geral Ja Extraido

Fonte principal: `Knowledge/meios-para-solicitar-ou-compensar-cada-tipo-de-credito.pdf`.

O manual confirma que cada tipo de credito possui meio proprio de utilizacao. Portanto, o B.Smart deve tratar `tipoCredito` como uma chave normativa, nao apenas como texto exibido na UI.

Rotas identificadas:

- PER/DCOMP Web.
- Programa PER/DCOMP.
- Formulario/processo administrativo.
- Portal do Simples Nacional.
- eSocial Simplificado.
- DIRPF/ECF/EFD-Reinf/EFD-Contribuicoes como etapa previa ou meio de composicao do credito.
- Via judicial/processual especifica.
- Casos em que a compensacao e vedada.

Ver consolidado em `10-BaseGeralPERDCOMPWeb.md`.

## Fragilidades Possiveis

- Simular compensacao com tipo de credito/debito vedado.
- Tratar todos os tipos de credito como se tivessem a mesma regra de consumo ou atualizacao.
- Usar excecoes por texto parcial de `tipoCredito`, o que pode ser fragil caso a RFB altere nomenclatura.
- Deixar de diferenciar PER/DCOMP Web, Programa PER/DCOMP, formulario/processo e outros meios.
- Tratar credito que exige pedido previo, habilitacao, ECF ou EFD como se fosse imediatamente compensavel.

## Perguntas de Auditoria

- Quais tipos de credito aparecem nos relatorios reais importados?
- Quais tipos de credito o PER/DCOMP Web admite para compensacao?
- Quais creditos exigem pedido proprio, habilitacao ou processo anterior?
- Quais debitos nao podem ser compensados por DCOMP?
- Como o app deve alertar o usuario quando a cadeia envolver restricao normativa?

## Possiveis Solucoes

- Criar catalogo de tipos de credito com chave normalizada.
- Mapear cada tipo para meio permitido, restricoes e manual aplicavel.
- Exibir alertas de auditoria sem bloquear simulacao ate que a regra esteja validada.
- Usar esse catalogo como base para filtros, relatorios e testes.
- Incluir no catalogo campos como `meioCabivel`, `admiteDcomp`, `admitePER`, `exigeHabilitacao`, `exigePedidoPrevio`, `exigeEscrituracaoPrevia` e `fonteNormativa`.

## Criterios de Aceite

- Matriz tipo de credito x meio permitido x restricoes preenchida.
- Pelo menos os tipos presentes na planilha real do usuario mapeados.
- Divergencias registradas no controle geral.
