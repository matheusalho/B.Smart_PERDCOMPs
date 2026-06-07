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

## Rodada AUD-02 em 2026-06-07 - Catalogo Normativo Inicial

Fontes lidas:

- `Knowledge/meios-para-solicitar-ou-compensar-cada-tipo-de-credito.md`, v25/07/2024.
- `Knowledge/creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.md`, v21/07/2025.
- `Sheets/relatorio.xlsx`, aba `Processamento PERDCOMP`, para identificar tipos reais importados.

### Tipos de credito encontrados na planilha real

Extraidos de `Sheets/relatorio.xlsx`, aba `Processamento PERDCOMP`:

| Tipo de credito e-CAC | Qtde. linhas | Prioridade no catalogo |
| --- | ---: | --- |
| Contribuicao Previdenciaria Indevida ou a Maior | 556 | Alta |
| Credito Oriundo de Acao Judicial | 9 | Alta |
| Pagamento Indevido ou a Maior | 40 | Alta |
| Pagamento Indevido ou a Maior eSocial | 451 | Alta |
| Saldo Negativo de CSLL | 128 | Alta |
| Saldo Negativo de IRPJ | 288 | Alta |

Conclusao: a primeira versao do catalogo normativo deve cobrir estes seis tipos antes de tentar suportar todos os tipos do roteiro geral.

### Matriz inicial dos tipos presentes no relatorio real

| Tipo normalizado | Aliases observados | Meio cabivel | Admite DCOMP? | Pre-requisitos / restricoes | Fonte |
| --- | --- | --- | --- | --- | --- |
| `pagamento_indevido_maior` | `Pagamento Indevido ou a Maior` | PER/DCOMP Web, em regra | Sim | Codigo de receita deve ser aceito pelo PER/DCOMP Web; DI/Duimp, comercio exterior, DAU, AFRMM/TUM, reclamataria trabalhista, estimativas, parcelamentos e quotas exigem excecoes especificas. | Meios, item 1.1; Vedacoes, itens 1.1 a 1.4, 1.13 e 2.9. |
| `pagamento_indevido_maior_esocial` | `Pagamento Indevido ou a Maior eSocial` | Depende do sujeito: PER/DCOMP Web para segurado especial/MEI em certas hipoteses; eSocial Simplificado para empregador domestico | Parcial | Empregador domestico: compensacao vedada; MEI e segurado especial podem usar PER/DCOMP Web conforme roteiro. FGTS fora da RFB. | Meios, item 1.3; Vedacoes, itens 1.5 e 2.5. |
| `contribuicao_previdenciaria_indevida_maior` | `Contribuicao Previdenciaria Indevida ou a Maior` | PER/DCOMP Web, em regra | Sim | Pagamento em GPS; codigo deve ser aceito; reclamataria trabalhista em regra fora da via administrativa; retencao recolhida no CNPJ da contratada pode exigir formulario/processo. | Meios, item 1.2; Vedacoes, item 1.1. |
| `saldo_negativo_irpj` | `Saldo Negativo de IRPJ` | PER/DCOMP Web via ECF | Sim | Antecipacoes/retencoes devem compor a ECF; SCP usa formulario/processo, salvo socio ostensivo. | Meios, itens 2.5, 2.8 e 4.6. |
| `saldo_negativo_csll` | `Saldo Negativo de CSLL` | PER/DCOMP Web via ECF | Sim | Mesma logica de saldo negativo; retencoes indevidas/a maior de receitas imunes/isentas podem ir a formulario/processo. | Meios, itens 2.5 e 4.6. |
| `credito_judicial_pj` | `Credito Oriundo de Acao Judicial` | PER/DCOMP Web para PJ | Sim, apenas DCOMP | Exige transito em julgado e habilitacao previa; pedido de restituicao/ressarcimento/reembolso e vedado na via administrativa; limite mensal do art. 74-A deve ser observado. | Meios, item 4.1; Vedacoes, itens 1.9, 1.10, 1.17 e 2.14. |

### Tipos relevantes para a matriz SELIC, mas nao encontrados nesta planilha

| Tipo normalizado | Meio cabivel | Observacao para o B.Smart | Fonte |
| --- | --- | --- | --- |
| `retencao_previdenciaria_pj` | PER/DCOMP Web ou Programa PER/DCOMP conforme competencia/EFD-Reinf | Necessario para CT-SEL-007; competencia e obrigatoriedade EFD-Reinf definem meio. | Meios, item 2.1. |
| `ressarcimento_ipi` | PER no Programa PER/DCOMP, depois DCOMP Web | Escopo da aplicacao: apenas SELIC/valoracao, sem RAIPI/apuracao operacional. | Meios, item 4.3; IN RFB n. 2.055/2021, art. 152. |
| `ressarcimento_pis_cofins_nao_cumulativos` | PER/DCOMP Web a partir de jan/2014; Programa antes disso | SCP por formulario/processo; pagamento indevido/maior de PIS/Cofins por DARF usa regra de pagamento, nao ressarcimento. | Meios, item 4.4. |
| `salario_familia_maternidade` | Reembolso via PER/DCOMP Web ou Programa; formulario para empregador domestico | DCOMP vedada; tratar como fora de compensacao. | Meios, item 4.2; Vedacoes, item 1.16. |
| `reintegra` | PER no Programa PER/DCOMP, depois DCOMP Web | Relevante para art. 152, mas nao presente no relatorio real lido. | Meios, item 4.5; IN RFB n. 2.055/2021, art. 152. |

### Vedacoes prioritarias para validacao consultiva

As vedações alcançam DCOMP por qualquer meio. Para o app, a primeira camada deve ser consultiva: alertar e registrar fonte, sem bloquear automaticamente ate validacao com caso real.

| Codigo interno sugerido | Escopo | Regra resumida | Fonte |
| --- | --- | --- | --- |
| `VED-CRED-NAO-RFB` | Credito | Credito que nao se refira a tributo administrado pela RFB nao pode compor DCOMP; inclui verbas de reclamataria trabalhista como regra. | Vedacoes, item 1.1. |
| `VED-CRED-SIMPLES` | Credito | Credito do Simples Nacional e tratado no Portal do Simples Nacional, nao em DCOMP comum. | Vedacoes, item 1.2. |
| `VED-CRED-DAU` | Credito | Pagamento de debito inscrito em DAU nao pode ser compensado por DCOMP. | Vedacoes, item 1.3. |
| `VED-CRED-JUD-SEM-TJ` | Credito judicial | Credito judicial sem transito em julgado nao pode ser compensado. | Vedacoes, item 1.9; CTN, art. 170-A. |
| `VED-CRED-JUD-LIMITE` | Credito judicial | Credito judicial acima do limite mensal e vedado quanto ao excedente. | Vedacoes, item 1.17; Lei n. 9.430/1996, art. 74-A; Portaria MF n. 14/2024. |
| `VED-CRED-FISCALIZACAO` | Credito | Credito sob procedimento fiscal nao pode ser usado em compensacao apos ciencia do termo de inicio ate encerramento. | Vedacoes, item 1.15. |
| `VED-CRED-SALARIO` | Credito | Salario-familia/maternidade admite reembolso, mas DCOMP e vedada. | Vedacoes, item 1.16. |
| `VED-DEB-DAU` | Debito | Debito encaminhado para inscricao em DAU nao pode ser informado em DCOMP. | Vedacoes, item 2.3. |
| `VED-DEB-PARCELADO` | Debito | Debito parcelado nao pode ser informado enquanto parcelado; ressalva para parcelamento cancelado/rescindido. | Vedacoes, item 2.7. |
| `VED-DEB-ESTIMATIVA` | Debito | Estimativas mensais IRPJ/CSLL codigos 2362, 5993, 2319, 2484 e 2469 nao podem ser compensadas a partir de 30/05/2018. | Vedacoes, item 2.9. |
| `VED-DCTFWEB-CRUZADA` | Credito/debito | Compensacao previdenciaria/nao previdenciaria antes/depois da DCTFWeb depende da tabela pratica. | Vedacoes, itens 2.10 a 2.13 e secao 3. |

### Impacto no codigo atual

- `tipoCredito` e tratado como texto livre no modelo `DCOMP` e em `CadeiaRelacional`.
- `CalculoService.ts` usa comparacoes textuais para definir `permiteMultiplosDetalhamentos`, atualmente restritas a `pagamento indevido ou a maior esocial` e `contribuicao previdenciaria indevida ou a maior`.
- Nao existe `CreditoRulesService`, classificador normalizado ou catalogo central de meios/vedacoes.
- A UI e o PDF ainda nao possuem campo para exibir alerta normativo por tipo de credito/debito.

### Proposta tecnica sem implementacao

Criar um catalogo consultivo de credito, separado da engine de SELIC:

```ts
type MeioCabivel =
  | 'perdcomp_web'
  | 'programa_perdcomp'
  | 'formulario_processo'
  | 'portal_simples'
  | 'esocial_simplificado'
  | 'via_judicial'
  | 'orgao_externo'
  | 'vedado';

type SeveridadeRegra = 'info' | 'alerta' | 'bloqueio_consultivo';
```

Campos minimos por item:

- `idTipoCredito`;
- `aliasesECAC`;
- `meiosCabiveis`;
- `admiteDcomp`;
- `admitePER`;
- `exigePedidoPrevio`;
- `exigeHabilitacao`;
- `exigeEscrituracaoPrevia`;
- `vedacoesAplicaveis`;
- `fontesNormativas`;
- `observacoesAuditoria`.

Diretriz: usar o catalogo inicialmente para alerta e rastreabilidade. Bloqueios duros so devem ser implementados depois de validacao com casos reais e autorizacao expressa.

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
