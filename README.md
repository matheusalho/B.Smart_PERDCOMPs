# B.Smart - PER/DCOMPs

Aplicacao web para importar relatorios de analise do e-CAC, reconstruir cadeias
relacionais de PER/DCOMPs e simular os efeitos de alteracoes em debitos
compensados ao longo da cascata de credito.

O projeto nasceu para apoiar rotinas tributarias em que a leitura manual de
planilhas, retificacoes, saldos, SELIC e debitos compensados consome muito tempo
e aumenta o risco de perda de rastreabilidade.

## Para Que Serve

O B.Smart - PER/DCOMPs ajuda a responder perguntas praticas do dia a dia:

- Quais PER/DCOMPs pertencem a uma mesma cadeia de credito?
- Qual declaracao detalha o credito e quais documentos apenas consomem esse
  credito?
- Quais documentos continuam vigentes, editaveis ou exigem atencao consultiva?
- Se um debito for reduzido, qual sera o reflexo matematico nas proximas
  declaracoes da cadeia?
- A simulacao indica sobra de credito, quebra de saldo ou necessidade de
  analisar retificacao?
- Quais valores vieram da importacao oficial e quais valores foram calculados,
  simulados ou exibidos pela aplicacao?
- A atualizacao SELIC usada no calculo esta classificada como normativa,
  estimada ou insuficiente?

## Problemas Que Resolve

Em trabalhos com PER/DCOMP, e comum lidar com dezenas ou centenas de documentos
relacionados, retificadores, cancelamentos, debitos de varios periodos e saldos
que precisam ser acompanhados cronologicamente. Fazer isso somente em planilhas
pode gerar:

- dificuldade para identificar a linhagem correta das declaracoes;
- perda de visao sobre documentos vigentes e nao vigentes;
- retrabalho para recalcular impactos de uma mudanca em cascata;
- risco de misturar valor original importado com valor alterado pelo usuario;
- pouca rastreabilidade sobre premissas, alertas e dados ausentes;
- dificuldade para documentar a metodologia usada em uma simulacao.

A aplicacao centraliza essa analise em uma interface visual, com preservacao dos
valores originais importados e separacao entre dados da RFB, calculos do motor,
simulacoes do usuario e informacoes exibidas na UI.

## Como Funciona

1. O usuario importa uma planilha `.xlsx` extraida do e-CAC.
2. O parser le as abas de processamento e debitos do relatorio.
3. A aplicacao agrupa os documentos em cadeias relacionais.
4. Cada cadeia e exibida em uma tabela de simulacao com KPIs, status, valores,
   debitos e rastreabilidade.
5. O usuario pode visualizar ou editar debitos de PER/DCOMPs vigentes e
   editaveis.
6. O motor recalcula os impactos na cadeia sem sobrescrever campos
   `...Original`.
7. A interface destaca alertas consultivos, qualidade SELIC, quebras de saldo,
   documentos bloqueados e dados insuficientes.
8. Simulacoes podem ser salvas em memoria local e exportadas em relatorio PDF
   consolidado.

## Principais Recursos

- Importacao de relatorios reais do e-CAC em Excel.
- Processamento em Web Worker, com fallback local quando o Worker falha.
- Reconstrucao de cadeias relacionais de PER/DCOMP.
- Simulador de cascata de credito por documento.
- Edicao controlada de debitos compensados.
- Visualizacao somente leitura para documentos nao editaveis.
- Painel de rastreabilidade por PER/DCOMP.
- Classificacao consultiva de status, vigencia e editabilidade.
- Indicadores de qualidade da SELIC.
- Alertas consultivos de vedacao e pontos de atencao normativa.
- Persistencia local com Zustand e IndexedDB/local storage conforme o estado.
- Exportacao de relatorio PDF consolidado.
- Testes automatizados com planilhas reais de validacao.

## Stack Tecnologica

- React 19
- TypeScript
- Vite
- Zustand para estado global
- SheetJS (`xlsx`) para leitura de planilhas
- Web Workers para processamento pesado de importacao
- `idb-keyval` para persistencia de dados maiores no navegador
- `jspdf` e `jspdf-autotable` para relatorios PDF
- `lucide-react` para icones
- `date-fns` para datas
- `react-dropzone` para upload
- `react-hot-toast` para notificacoes
- Vitest para testes automatizados
- ESLint para verificacao estatica
- CSS proprio com variaveis, tema claro/escuro e componentes visuais do projeto

## Como Rodar Localmente

Requisitos:

- Node.js compativel com o projeto
- npm

Instale as dependencias:

```bash
npm install
```

Rode o ambiente de desenvolvimento:

```bash
npm run dev
```

Execute as validacoes principais:

```bash
npm run lint
npm run build
npm test
```

## Como Usar

1. Acesse a aplicacao no navegador pelo servidor local do Vite.
2. Arraste ou selecione o relatorio `.xlsx` extraido do e-CAC.
3. Aguarde a importacao e o recalculo das cadeias.
4. Escolha a cadeia relacional desejada.
5. Analise os KPIs, a tabela de cascata e o painel de rastreabilidade.
6. Use "Debitos" para editar valores quando o documento estiver vigente e
   editavel.
7. Use "Ver Debitos" para documentos bloqueados ou nao vigentes.
8. Salve simulacoes relevantes e gere o relatorio consolidado quando necessario.

## Organizacao Do Codigo

```text
src/
  components/              Componentes React da interface
  data/                    Dados auxiliares da aplicacao
  models/                  Tipos TypeScript centrais
  services/                Parser, calculos, relatorios e pipeline de importacao
  services/normativo/      Regras consultivas, SELIC, datas e validacoes puras
  utils/                   Formatadores, status e mensagens auxiliares
  workers/                 Web Worker de processamento Excel
docs/
  AuditoriaTributariaB.Smart/  Documentacao tecnica e normativa viva
```

## Premissas E Limites

- A aplicacao e uma ferramenta de apoio tecnico e consultivo.
- Ela nao substitui a validacao oficial no e-CAC, no PER/DCOMP Web ou em outros
  sistemas da Receita Federal.
- Alertas normativos devem ser interpretados como apoio a analise profissional.
- Campos com sufixo `...Original` representam a base importada e nao devem ser
  sobrescritos por simulacoes.
- Quando dados obrigatorios estiverem ausentes, a aplicacao deve explicitar o
  estado como estimado, insuficiente ou pendente de validacao, em vez de tratar
  o resultado como conclusivo.

## Documentacao Tecnica

A documentacao de auditoria e continuidade fica em:

```text
docs/AuditoriaTributariaB.Smart/
```

Arquivos importantes:

- `README.md`: entrada da documentacao de auditoria.
- `AuditoriaTributariaControle.md`: controle dos objetos auditados.
- `09-CasosTesteMatrizEvidencias.md`: matriz de testes e evidencias.
- `12-RelatorioContinuidadeAuditoriaImplementacao.md`: estado de continuidade
  para novas sessoes de desenvolvimento.

## Status Do Projeto

O projeto esta em evolucao ativa. A aplicacao ja possui fluxo funcional de
importacao, agrupamento de cadeias, simulacao de debitos, indicadores de
rastreabilidade e validacoes automatizadas. A camada normativa continua sendo
ampliada de forma controlada, com separacao entre comportamento ativo,
classificacoes consultivas, hipoteses, fontes e dados insuficientes.
