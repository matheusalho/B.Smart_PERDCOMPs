# PROJECT_STATE.md

## Resumo Executivo
O **B.Smart PER/DCOMPs** está em fase de protótipo de alta fidelidade e com o núcleo lógico da prova de conceito consolidado. A aplicação importa arquivos `.xlsx` do e-CAC, processa corretamente o relacionamento de retificações e cancelamentos (Linhagens / Cascatas) e exibe uma simulação visual premium, permitindo edição matemática dos débitos para que advogados tributaristas identifiquem distorções ou falta de saldo nas compensações subsequentes.

## O que já está Implementado e Funcional
- **Importação de Planilha:** Leitura e tipagem correta de `.xlsx` (abas Processamento e Débitos) utilizando a biblioteca `xlsx`.
- **Motor de Linhagem:** `ExcelParser.ts` lida de forma exemplar com a formação de árvores familiares, garantindo que documentos predecessores fiquem antes dos sucessores (resolvemos o bug em que DCOMPs com mesma data ficavam misturadas).
- **Recálculo em Cascata:** O `CalculoService.ts` calcula as variações matemáticas e atualiza os saldos corretamente, classificando documentos como `OK`, `RETIFICAR`, `IMPACTADO_BLOQUEADO` ou `EDITADO`.
- **Formatação de Datas do Excel:** Uma função `formatPeriodoExcel` foi criada e testada na exaustão. Números seriais como `45839` agora são lindamente exibidos em `DD/MM/YYYY`.
- **Design System Premium:** Todo o estilo foi polido seguindo uma estética de Glassmorphism. A tabela rola bem, os KPIs são dinâmicos e há botões flutuantes, além do toggle Light/Dark mode estar operacional.
- **Tabela de Edição de Débitos (Modal):** Permite abaixar o "Valor Principal" de um débito e recalcula proporcionalmente a Multa e Juros, informando o Delta real de economia.
- **Filtros Dinâmicos:** Filtros da tabela funcionam perfeitamente, com destaque para a visualização exclusiva de declarações "Vigentes/Editáveis".

## O que está Parcialmente Implementado
- **Declarações Hipotéticas:** Existe um botão na parte inferior da tabela "Simular PER/DCOMP Hipotética". Ele engatilha uma ação na `store.ts`, mas a UX desta funcionalidade e sua amarração na tabela de cascata podem precisar de melhor polimento futuro.
- **Indicadores / KPIs:** Renomeamos os KPIs com base em feedback do usuário (ex: "Lastro Original Disponibilizado"), mas eles podem demandar refinamentos a depender de novas descobertas tributárias.

## O que ainda não foi Iniciado
- **Exportação de Resultados:** Funcionalidade que permite ao advogado clicar num botão e exportar a cascata alterada para PDF ou de volta para Excel.
- **Autenticação / Persistência no Backend:** Hoje o estado vive apenas na aba do browser via `localStorage`.

## Bugs Conhecidos / Limitações Atuais
- Nenhum bug funcional bloqueante identificado neste exato momento após as robustas correções de Datas e Filtros. 
- *Limitação:* O estado vive apenas no `bsmart-perdcomp-storage` (localStorage). Se o usuário fechar o browser, limpar cookies ou mudar de máquina, a simulação será perdida e ele deverá reimportar a planilha.

## Riscos Técnicos e Dívidas
- **Desempenho:** Se a planilha carregada pelo usuário contiver milhares de DCOMPs, o recálculo em cascata (`useStore -> CalculoService`) atinge todas elas de forma síncrona, e a renderização do React pode gargalar. Um `useMemo` na UI e WebWorkers poderão ser necessários.
- **Tratamento de Fuso Horário Local:** Lidamos com o Excel UTC offset, que foi estabilizado compensando com timezone na máquina local do usuário.
- **Tipagens em `xlsx`:** A biblioteca `xlsx` converte tudo em `any` arrays. Pode haver chaves inconsistentes no futuro caso a Receita Federal altere os nomes das colunas da planilha padrão.

## Próximos Passos Recomendados
1. Implementar mecânica robusta de **Exportação (PDF / Excel)** da simulação atualizada.
2. Polir a mecânica da simulação de uma **PER/DCOMP Hipotética** na interface (Modal amigável em vez de um simples prompt).
3. Avaliar um backend leve ou armazenamento indexDB se as simulações se tornarem excessivamente grandes para `localStorage`.

## Observações Relevantes do Antigravity
A transição entre o Modo Claro e Escuro sofreu ajustes profundos de contraste nas últimas interações. Se forem criar novas tags coloridas de Status, é imperativo usar cores que sejam vibrantes contra fundos escuros (`color-mix` no CSS ajuda), mas que não "apaguem" no modo Light.
