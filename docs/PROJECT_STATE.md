# PROJECT_STATE.md

## Resumo Executivo
O **B.Smart PER/DCOMPs** está em fase de protótipo de alta fidelidade e com o núcleo lógico da prova de conceito consolidado. A aplicação importa arquivos `.xlsx` do e-CAC, processa corretamente o relacionamento de retificações e cancelamentos (Linhagens / Cascatas) e exibe uma simulação visual premium, permitindo edição matemática dos débitos para que advogados tributaristas identifiquem distorções ou falta de saldo nas compensações subsequentes.

## O que já está Implementado e Funcional
- **Importação de Planilha:** Leitura e tipagem correta de `.xlsx` (abas Processamento e Débitos) utilizando a biblioteca `xlsx`.
- **Processamento em Web Worker:** O upload delega o parse e o primeiro recálculo para `src/workers/excelWorker.ts`, reduzindo bloqueio da main thread durante a importação.
- **Motor de Linhagem:** `ExcelParser.ts` lida de forma exemplar com a formação de árvores familiares, garantindo que documentos predecessores fiquem antes dos sucessores (resolvemos o bug em que DCOMPs com mesma data ficavam misturadas).
- **Recálculo em Cascata:** O `CalculoService.ts` calcula as variações matemáticas e atualiza os saldos corretamente, classificando documentos como `OK`, `RETIFICAR`, `IMPACTADO_BLOQUEADO` ou `EDITADO`.
- **Formatação de Datas do Excel:** Uma função `formatPeriodoExcel` foi criada e testada na exaustão. Números seriais como `45839` agora são lindamente exibidos em `DD/MM/YYYY`.
- **Design System Premium:** Todo o estilo foi polido seguindo uma estética de Glassmorphism. A tabela rola bem, os KPIs são dinâmicos e há botões flutuantes, além do toggle Light/Dark mode estar operacional.
- **Tabela de Edição de Débitos (Modal):** Permite abaixar o "Valor Principal" de um débito e recalcula proporcionalmente a Multa e Juros, informando o Delta real de economia.
- **Filtros Dinâmicos:** Filtros da tabela funcionam perfeitamente, com destaque para a visualização exclusiva de declarações "Vigentes/Editáveis".
- **Dashboard Executivo Global:** A tela principal exibe empresa analisada, CNPJ, intervalo de anos, total de cadeias, total de PER/DCOMPs, cadeias editadas, lastro disponibilizado e débitos reduzidos.
- **Persistência Local das Simulações:** O Zustand persiste cadeias, empresa e simulações salvas no `localStorage` por meio da chave `bsmart-perdcomp-storage`.
- **Relatório Consolidado em PDF:** O usuário pode salvar simulações de cadeias e gerar um relatório PDF consolidado com KPIs, edições manuais, espelho antes/depois, impactos colaterais e PER/DCOMPs hipotéticas.
- **PER/DCOMP Hipotética com Modal:** A inclusão de declarações hipotéticas já usa modal dedicado, suporta múltiplos débitos e filtro por origem de código de receita.

## O que está Parcialmente Implementado
- **Exportação de Resultados:** A exportação PDF está implementada e validada em fluxo funcional. A exportação Excel ainda não foi iniciada e permanece no backlog.
- **Indicadores / KPIs:** Renomeamos os KPIs com base em feedback do usuário (ex: "Lastro Original Disponibilizado"). A UI agora preserva sinal negativo em saldos contábeis, usando formatação com magnitude apenas para métricas de redução/economia.

## O que ainda não foi Iniciado
- **Exportação Excel:** A geração de planilha `.xlsx` com o espelho da simulação, deltas e rastreabilidade dos valores originais ainda não foi implementada. Prazo a definir.
- **Autenticação / Persistência no Backend:** Hoje o estado vive apenas na aba do browser via `localStorage`.

## Bugs Conhecidos / Limitações Atuais
- Nenhum bug funcional bloqueante conhecido após a correção de lint e do sinal negativo em saldos da UI.
- *Limitação:* O estado vive apenas no `bsmart-perdcomp-storage` (localStorage). Se o usuário fechar o browser, limpar cookies ou mudar de máquina, a simulação será perdida e ele deverá reimportar a planilha.

## Riscos Técnicos e Dívidas
- **Desempenho:** A importação já usa Web Worker, mas edições e recálculos disparados pela store ainda podem atingir cadeias inteiras de forma síncrona. Se alguma cadeia tiver volume muito acima dos dados reais atuais, a renderização do React pode gargalar.
- **Tratamento de Fuso Horário Local:** Lidamos com o Excel UTC offset, que foi estabilizado compensando com timezone na máquina local do usuário.
- **Tipagens em `xlsx`:** A biblioteca `xlsx` converte tudo em `any` arrays. Pode haver chaves inconsistentes no futuro caso a Receita Federal altere os nomes das colunas da planilha padrão.
- **Bundle de Relatório:** `jspdf` e dependências relacionadas aumentam chunks de produção. O build passa, mas Vite alerta sobre chunks acima de 500 kB.

## Próximos Passos Recomendados
1. Iniciar auditoria guiada das regras tributárias por tipo de crédito usando os manuais oficiais da RFB em `Knowledge/` e os atos normativos citados por eles.
2. Construir matriz de validação: tipo de crédito, regra de saldo inicial, regra de atualização Selic, regra de consumo, vigência/bloqueio, campos e evidências do relatório e-CAC.
3. Validar regressivamente o fluxo PDF após cada ajuste normativo.
4. Planejar a **Exportação Excel** em sessão futura. Prazo a definir.
5. Avaliar um backend leve, versionamento de store ou armazenamento IndexedDB se as simulações se tornarem excessivamente grandes para `localStorage`.

## Observações Relevantes do Antigravity
A transição entre o Modo Claro e Escuro sofreu ajustes profundos de contraste nas últimas interações. Se forem criar novas tags coloridas de Status, é imperativo usar cores que sejam vibrantes contra fundos escuros (`color-mix` no CSS ajuda), mas que não "apaguem" no modo Light.
