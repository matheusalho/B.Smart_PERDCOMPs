# ROADMAP.md

## Alta Prioridade (O que Codex deve assumir primeiro)
1. **Exportação / Relatórios PDF / Excel:** 
   O aplicativo hoje calcula a economia visualmente. A funcionalidade primária que falta para ser MVP 100% útil aos advogados é um botão de "Exportar Simulação". Este botão deve:
   - Exportar um PDF bonito ou planilhas (.xlsx) detalhando qual DCOMP foi alterada, de qual valor para qual valor, o Delta (Ahorro) gerado e o status final de sucesso/retificar.

2. **Polimento na PER/DCOMP Hipotética:**
   Atualmente há um botão `+ Simular PER/DCOMP Hipotética` no pé da tabela que chama um `prompt` cru nativo do navegador para inserir o valor principal. Criar um modal agradável e alinhado ao Design System para tratar isso.

## Média Prioridade
1. **Tratamento de Exceções Visuais:** 
   Se a planilha vier sem algumas colunas ou formato quebrado, o `ExcelParser` joga um `throw new Error`. Criar uma tela de falha limpa ou Toasts em vez de apenas quebrar o React (Error Boundary).
   
2. **Dashboard de Resumo Executivo:**
   O `DashboardCadeias.tsx` atual possui apenas uma listagem e dropdown. Expandir para mostrar um mini gráfico ou total de Cadeias vs Débitos totais analisados.

## Backlog de Longo Prazo
- Integração com backend (Node/NestJS) e Banco de Dados (PostgreSQL) para salvar as sessões de trabalho e simulações para os advogados, eliminando a dependência pesada de arquivos `.xlsx` salvos e recarregados via `localStorage`.

## Sequência Recomendada de Trabalho (Segurança Codex)
1. Entenda como o `ExcelParser.ts` estrutura o JSON.
2. Inicie pela construção do módulo de relatórios/exportação (recomenda-se algo genérico e plugável como `jspdf` + `autoTable` ou `exceljs`).
3. Somente mexa no css em `index.css` se precisar adicionar elementos não cobertos.
