# ROADMAP.md

## Alta Prioridade (O que Codex deve assumir primeiro)
1. **Auditoria Tributária Guiada por Tipo de Crédito:**
   Usar os manuais oficiais da RFB na pasta `Knowledge/` e os atos normativos citados por eles para validar se a aplicação reproduz corretamente as regras de compensação, atualização, consumo de crédito e restrições de retificação para cada tipo de crédito.

2. **Matriz de Evidências e Casos de Teste Normativos:**
   Criar uma matriz auditável cruzando `ExcelParser.ts`, `CalculoService.ts`, `store.ts`, UI e PDF: tipo de crédito, campos do relatório e-CAC, fórmula esperada, fórmula implementada, divergências e evidência normativa.

## Média Prioridade
1. **Tratamento de Exceções Visuais:** 
   Se a planilha vier sem algumas colunas ou formato quebrado, o `ExcelParser` joga um `throw new Error`. Criar uma tela de falha limpa ou Toasts em vez de apenas quebrar o React (Error Boundary).
   
2. **Validação Regressiva do Relatório PDF:**
   O relatório consolidado em PDF já existe e deve continuar exportando KPIs, edições manuais, espelho antes/depois, efeitos colaterais e PER/DCOMPs hipotéticas. Após ajustes de lint ou KPI, validar novamente o fluxo "salvar simulação -> relatório consolidado".

## Concluído Recentemente
- **Lint limpo:** `npm run lint` passa sem erros.
- **Build de produção:** `npm run build` passa.
- **Sinal de saldo preservado na UI:** saldos contábeis usam formatação com sinal; deltas/economias usam formatação de magnitude quando aplicável.

## Backlog de Longo Prazo
- **Exportação Excel (.xlsx) da Simulação:** Funcionalidade adiada para próxima sessão, com prazo a definir. Deve exportar a cascata/simulações com valores originais, valores novos, deltas, status final e rastreabilidade suficiente para auditoria.
- Integração com backend (Node/NestJS) e Banco de Dados (PostgreSQL) para salvar as sessões de trabalho e simulações para os advogados, eliminando a dependência pesada de arquivos `.xlsx` salvos e recarregados via `localStorage`.

## Sequência Recomendada de Trabalho (Segurança Codex)
1. Entenda como o `ExcelParser.ts` estrutura o JSON.
2. Para ajustes de KPI, rastreie a origem entre `CalculoService.ts`, `store.ts`, `TimelineCascata.tsx`, `CascataKpis.tsx` e `ReportGeneratorService.ts` antes de alterar a UI.
3. Nunca sobrescreva, recalcule ou contamine campos `...Original`; eles representam a base importada/auditável.
4. Para auditoria normativa, cite o manual/ato normativo usado, registre a hipótese de cálculo e valide contra uma cadeia real antes de alterar regra de negócio.
5. Somente mexa no css em `index.css` se precisar adicionar elementos não cobertos.
