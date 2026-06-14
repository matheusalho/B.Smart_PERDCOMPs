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

### Rodada de Auditoria de 2026-06-07

Fontes verificadas:

- `Knowledge/orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.md`, linhas 113 a 121.
- `Knowledge/creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.md`, linhas 180 a 235.
- `src/utils/statusHelper.ts`, linhas 1 a 47.
- `src/services/CalculoService.ts`, linhas 70 a 85 e 215 a 244.
- `src/services/ExcelParser.ts`, linhas 151 a 178 e 198 a 214.
- `src/components/TimelineCascata.tsx`, linhas 125 a 145 e 228 a 243.
- `src/services/ReportGeneratorService.ts`, linhas 173 a 178 e 416 a 421.
- `Sheets/relatorio.xlsx`, aba `Processamento PERDCOMP`.

Regras e evidencias normativas confirmadas nesta rodada:

- O PER/DCOMP Web permite elaborar pedido de cancelamento de documento transmitido anteriormente.
- O cancelamento e irreversivel e eventuais debitos compensados podem ser cobrados pela RFB.
- O proprio manual recomenda avaliar retificacao em vez de cancelamento.
- O PER/DCOMP nao pode ser cancelado quando ja tiver sido analisado pela RFB ou quando o contribuinte tiver sido intimado para apresentar documentos ou esclarecimentos.
- Fonte oficial complementar: pagina RFB `Retificacao de Documentos`, atualizada em 20/08/2020, registra que o PER/DCOMP Web somente pode ser retificado se estiver pendente de decisao administrativa na data do pedido de retificacao.
- Diretriz normativa do usuario responsavel pelo projeto, registrada em 2026-06-13: PER/DCOMPs em situacao `Em analise` representam documentos pendentes de decisao administrativa, vigentes e editaveis.
- As vedacoes de DCOMP para determinados debitos, como DAU, debito parcelado, Simples Nacional e estimativas de IRPJ/CSLL, sao materia separada de status de processamento: devem ser modeladas como alerta/bloqueio normativo consultivo, nao dentro de `isVigente`.

Perfil real de status na aba `Processamento PERDCOMP`:

| Situacao | Linhas |
| --- | ---: |
| Em analise | 536 |
| Retificado | 303 |
| Despacho Decisorio Emitido | 214 |
| Homologado | 211 |
| Em discussao administrativa - DRJ | 143 |
| Analise concluida | 30 |
| Cancelado | 12 |
| Pedido de cancelamento deferido | 12 |
| Em discussao administrativa - CARF | 10 |
| Nao admitido | 1 |

Tipos de documento na mesma aba:

| Tipo do documento | Linhas |
| --- | ---: |
| Decl. Compensacao | 1396 |
| Pedido Restituicao | 64 |
| Pedido Cancelamento | 12 |

Classificacao tecnica observada:

- `isNaoVigente` usa comparacao literal e sensivel a grafia/caixa para `Pedido de Cancelamento Deferido`, `Retificado`, `Cancelado` e `Nao Admitido`.
- `isPedidoCancelamento` procura `Pedido de Cancelamento` no tipo do documento ou o padrao `.1.8.02-` no numero do documento.
- A planilha real usa `Pedido Cancelamento` como tipo do documento e contem pedidos deferidos com numeros `.1.8.03-` e `.1.8.24-`.
- Ao importar as funcoes reais de `statusHelper.ts` e comparar com uma classificacao normalizada, 5 linhas mudam de classificacao:
  - 4 linhas `Pedido de cancelamento deferido | Pedido Cancelamento` sao tratadas atualmente como vigentes e nao bloqueadas.
  - 1 linha `Nao admitido | Decl. Compensacao` depende de normalizacao de caixa/grafia para nao vigencia/bloqueio.
- O `CalculoService.ts` ainda contem lista historica `IMPEDIMENTOS`, distinta de `statusHelper.ts`, criando risco de divergencia de criterio se voltar a ser usada.

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

## Achados da Rodada

### ACH-014 - Classificacao de status precisa de normalizacao auditavel

- Objeto relacionado: AUD-04, AUD-06, AUD-08.
- Criticidade: Alta.
- Evidencia tecnica:
  - `statusHelper.ts`, linhas 1 a 47.
  - `Sheets/relatorio.xlsx`, aba `Processamento PERDCOMP`.
- Descricao:
  - O helper atual usa comparacoes literais e identifica pedido de cancelamento por texto/padrao de numero muito restrito.
  - A planilha real traz variacoes que nao sao capturadas em 5 linhas.
- Risco:
  - Pedido de cancelamento deferido pode participar indevidamente de saldo/cascata, KPI, UI ou relatorio como documento vigente.
  - Documento nao admitido pode ficar fora de bloqueio se a grafia vier em caixa diferente.
- Diretriz:
  - Criar `StatusRulesService` ou catalogo unico com normalizacao por acento, caixa, travessao/hifen e aliases de tipo de documento.
  - A classificacao deve retornar motivo e fonte, nao apenas booleanos.

### ACH-015 - Vigencia, bloqueio de edicao e vedacao normativa sao dimensoes diferentes

- Objeto relacionado: AUD-02, AUD-04, AUD-06, AUD-08, AUD-10.
- Criticidade: Alta.
- Evidencia normativa:
  - `orientacoes-iniciais-portal-e-cac-e-per_dcomp_web.md`, linhas 113 a 121.
  - `creditos-e-debitos-que-nao-podem-ser-informados-em-declaracao-de-compensacao.md`, linhas 180 a 235.
- Evidencia tecnica:
  - `statusHelper.ts`, linhas 31 a 47.
  - `TimelineCascata.tsx`, linhas 125 a 145 e 228 a 243.
- Descricao:
  - O codigo mistura classificacoes booleanas de vigencia e bloqueio com efeitos de UI.
  - As vedacoes legais de credito/debito sao outro eixo e nao podem ser inferidas apenas da situacao do processamento.
- Risco:
  - Um documento pode ser vigente para historico/consumo, bloqueado para edicao/cancelamento e ainda sujeito a alerta normativo de vedacao em outra dimensao.
  - A UI pode simplificar indevidamente o motivo do bloqueio.
- Diretriz:
  - Separar resultado em dimensoes:
    - `vigenciaCascata`: participa ou nao do consumo historico.
    - `editabilidadeSimulacao`: pode ou nao ser editado pelo usuario.
    - `cancelabilidade`: pode ou nao ser objeto de pedido de cancelamento.
    - `vedacaoNormativa`: alerta/bloqueio consultivo por tipo de credito/debito.
  - Relatorio e UI devem exibir o motivo de cada dimensao.

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

## Desenho Tecnico Proposto

Criar um classificador unico:

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
  fontes: FonteNormativa[];
};
```

Regras preliminares, ainda sem implementacao:

- `Retificado`, `Cancelado`, `Pedido de cancelamento deferido` e `Nao admitido` devem ser nao vigentes para consumo ativo.
- Pedido de cancelamento deve ser identificado por tipo normalizado (`Pedido Cancelamento`, `Pedido de Cancelamento`) e nao apenas por um unico padrao numerico.
- Status analisado, homologado, despacho decisorio e discussao administrativa devem bloquear edicao/cancelamento, mas podem continuar compondo historico se nao forem nao vigentes.
- `Em analise` deve ser classificado na camada consultiva como vigente e editavel. Hipotese: enquanto a PER/DCOMP permanece em analise, ela nao foi substituida, cancelada, nao admitida, homologada, analisada conclusivamente ou bloqueada por discussao administrativa. Impacto: o painel de rastreabilidade deve exibir `vigente` e `editavel`, sem alterar as regras de cascata. Caso de validacao: `statusRules.test.ts` deve cobrir `Em analise` com `vigenciaCascata = vigente`, `editabilidadeSimulacao = editavel` e motivo `documento_em_analise_vigente_editavel`.
- Vedacoes legais de credito/debito devem ser avaliadas por catalogo proprio, com fonte e campo de entrada, sem contaminar a classificacao de vigencia.

## Criterios de Aceite

- Cada status relevante possui fonte ou evidencia.
- `isVigente` e `isBloqueado` ficam documentados.
- UI e relatorio usam a mesma classificacao.
- Casos reais `Pedido de cancelamento deferido | Pedido Cancelamento` e `Nao admitido | Decl. Compensacao` sao classificados corretamente por normalizacao.
- `Em analise | Decl. Compensacao` e classificado consultivamente como vigente e editavel, preservando as regras existentes de cascata.
- O relatorio explica se o documento e nao vigente, bloqueado para edicao/cancelamento ou apenas sujeito a alerta normativo.
