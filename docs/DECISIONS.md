# DECISIONS.md

Este documento armazena o histórico das principais decisões arquiteturais (ADR - Architecture Decision Records) que guiaram o desenvolvimento até o momento. Não reverta essas decisões sem uma justificativa técnica muito forte.

## 1. Tratamento e Ordenação da Cadeia Relacional (Linhagem)
- **Contexto:** DCOMPs retificadoras substituem suas originais. Eventualmente a RFB traz DCOMPs com as mesmas Datas de Transmissão, bagunçando a linha do tempo e consequentemente o consumo contábil na cascata.
- **Decisão:** Calcular um índice de `Depth` (profundidade) varrendo o mapa `rectifiesMap`. Se DCOMP "B" retifica "A", B é descendente e ganha um Depth superior, logo renderizando DEPOIS de A, independentemente de estarem na mesma data de transmissão. 
- **Consequência:** A estrutura em árvore tornou-se robusta e previsível. Cancelamentos e documentos mais profundos obrigatoriamente se arrastam para baixo das suas raízes na tabela de cascata.

## 2. Tratamento de Documentos Impedidos (Bloqueados)
- **Contexto:** Documentos com Status de processamento fechado ("Homologado", "Despacho Decisório Emitido") não podem ser alterados na vida real na Receita Federal.
- **Decisão:** Adotada função `isBloqueado` que barra a inserção do status `'RETIFICAR'` nestes documentos na tela. Eles herdam a flag `IMPACTADO_BLOQUEADO` (linha vermelha e bloqueio do botão Editar Débitos). 
- **Consequência:** A simulação obriga o usuário a tratar erros na cascata enviando retificadoras mais modernas, espelhando fielmente as restrições burocráticas da RFB.

## 3. Parsing e Formatação de Datas Numéricas do Excel
- **Contexto:** O Excel salva certas datas exportadas como números seriais de 5 dígitos (ex: 45839). Isso fazia a interface de débitos exibir "PA: 45839".
- **Decisão:** Adoção de `formatPeriodoExcel` dentro do `ExcelParser.ts` E um fallback similar dentro do `ModalEdicao.tsx`, convertendo o número via offset UNIX (-25569) e injetando timezone local antes de formatar para `DD/MM/YYYY`.
- **Consequência:** Eliminamos problemas de timezone onde as datas no fuso do Brasil retrocediam um dia (ex: 31 virava 30).

## 4. Remoção do TailwindCSS
- **Contexto:** Havia um framework predefinido, mas havia dificuldade de alinhamento com a paleta institucional do Balera Advogados.
- **Decisão:** Escrever CSS Vanilla no `index.css` abusando de variáveis CSS de tokens semânticos (`--color-primary`, `--color-glass-bg`).
- **Consequência:** Temos layouts Glassmorphism levíssimos, de manutenção óbvia e flexibilidade ímpar com Theming, além de diminuir o bundle de scripts de build.

## 5. Recálculo Baseado na Origem (Valor Original)
- **Contexto:** Quando se recálcula multa e juros a partir da alteração do valor principal num débito, podem haver divergências de arredondamento após N modificações.
- **Decisão:** Sempre recalcular a proporção em cima do `valorPrincipalOriginal` absoluto (vindo da planilha), e não no valor mutável incremental, impedindo derrapagens de dízimas periódicas.

## 6. Lógica de Filtros Visuais na Tabela
- **Contexto:** Havia confusão sobre o que deveria ser ocultado ou mostrado em filtros como "OK", "A Retificar" e "Impedido".
- **Decisão:** Optou-se por aplicar a restrição matemática do negócio no React. Exemplo: "OK" exige que o documento seja Vigente e Não Bloqueado. "Impedido" lista exatamente os documentos não vigentes (substituídos) e os vigentes que possuem flag `isBloqueado`.
- **Consequência:** A UI filtra com altíssima precisão baseada na capacidade real de edição do usuário, em vez de depender apenas do nome bruto do status original.

## 7. Preservação dos Campos `...Original`
- **Contexto:** A aplicação precisa simular alterações sem perder rastreabilidade da base importada do e-CAC.
- **Decisão:** Campos com sufixo `...Original` representam valores importados ou snapshots históricos e não devem ser sobrescritos por simulações. Valores simulados/calculados devem ser mantidos em campos mutáveis separados, como `valorPrincipal`, `valorTotal`, `valorUtilizadoPerdcomp`, `saldoCreditoOriginalCalculado` e flags de status.
- **Consequência:** A UI e o PDF conseguem mostrar comparativos antes/depois, deltas e saldos anteriores sem contaminar a base original.

## 8. Relatório Consolidado em PDF por Simulações Salvas
- **Contexto:** O usuário precisa consolidar alterações de uma ou mais cadeias em um documento auditável.
- **Decisão:** O relatório PDF é gerado a partir de `simulacoesSalvas`, e não diretamente da cadeia selecionada em edição. Cada simulação salva carrega snapshots de DCOMPs e KPIs no momento do salvamento.
- **Consequência:** O relatório reflete cadeias explicitamente selecionadas para exportação e evita capturar estados transitórios não salvos.

## 9. Exportação Excel Adiada
- **Contexto:** A exportação PDF já cobre o fluxo principal de relatório consolidado, enquanto a exportação `.xlsx` exige decisões adicionais de layout, abas, colunas e rastreabilidade.
- **Decisão:** A exportação Excel fica no backlog, com prazo a definir, para planejamento e implementação em sessão futura.
- **Consequência:** A prioridade imediata passa a ser corrigir lint, ajustar o KPI de saldo restante na UI e manter o PDF estável.
