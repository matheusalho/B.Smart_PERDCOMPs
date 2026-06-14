# AGENTS.md - B.Smart PER/DCOMPs Handoff

Bem-vindo, Agente Codex! Este arquivo contém as diretrizes permanentes para que você (ou outro agente de IA) assuma a continuidade do projeto com segurança.

## Objetivo do Projeto
O **B.Smart PER/DCOMPs** é uma aplicação web voltada para a área tributária (especificamente voltada ao escritório Balera Advogados). Seu objetivo principal é importar a planilha "Relatório de Análise e-CAC.xlsx", ler o histórico de declarações de compensação (PER/DCOMP), agrupar essas declarações em "Cadeias Relacionais" (seguindo hierarquias de retificação e cancelamento) e permitir que o usuário simule edições manuais de débitos (reduzindo valores) para ver, matematicamente em cascata, se haverá falta ou sobra de crédito no final da cadeia.

## Stack Utilizada
- **Core:** React 19, TypeScript, Vite
- **Gerenciamento de Estado:** Zustand persistido via `idb-keyval`/IndexedDB na chave `bsmart-perdcomp-storage`, com fallback em memoria quando IndexedDB nao estiver disponivel.
- **Estilização:** Vanilla CSS (sem Tailwind), usando CSS Variables, Glassmorphism e tema dinâmico (Light/Dark mode). A tipografia oficial do projeto é a **Manrope**.
- **Leitura de Arquivos:** `xlsx` (SheetJS), processado em Web Worker com fallback local pelo pipeline compartilhado.
- **Componentes / Utilitários:** `lucide-react` (ícones), `date-fns` (manipulação de datas), `react-dropzone` (upload)

## Estrutura do Repositório
```
bsmart-perdcomp/
├── src/
│   ├── components/    # Componentes React de UI e lógicas de visualização (TimelineCascata, ModalEdicao, UploadComponent)
│   ├── models/        # Tipagens TypeScript (types.ts)
│   ├── services/      # Lógica pesada de negócio: ExcelParser.ts, CalculoService.ts, importPipeline.ts, ReportGeneratorService.ts e services/normativo/
│   ├── store/         # Zustand Store (store.ts) gerencia estado global e ações de usuário
│   ├── utils/         # Helpers (statusHelper.ts) para validação e lógica condicional de status
│   ├── styles/        # Arquivos CSS principais (index.css) - Design System e paletas
│   ├── App.tsx        # Container principal com Theme Provider simplificado
│   └── main.tsx       # Entry point
├── docs/              # Documentação técnica e histórico de estado (Criado para o handoff)
├── package.json       # Configuração e dependências
└── vite.config.ts     # Configuração do Vite
```

## Comandos Principais
*Sempre execute esses comandos no diretório `bsmart-perdcomp/`.*

- **Instalar dependências:** `npm install`
- **Rodar localmente:** `npm run dev`
- **Build de produção:** `npm run build`
- **Typecheck & Lint:** `npm run lint`

## Padrões de Arquitetura e Convenções
1. **Lógica de Linhagem Desacoplada:** O motor que decide "quem veio de quem" (originais, retificadoras, cancelamentos) mora no `ExcelParser.ts`. O React apenas exibe.
2. **Matemática Isolada:** Recálculos de saldo original e abatimentos moram em `CalculoService.ts`, usando a camada `src/services/normativo/` quando houver resultado rastreavel. Não coloque regra de negócio tributária dentro dos componentes `*.tsx`.
3. **Imutabilidade e Zustand:** O estado central é o objeto `CadeiaRelacional`. Quando o usuário edita um débito, o Zustand cria uma cópia da DCOMP, chama o `CalculoService` para repassar as quebras, e injeta as novas tags (`EDITADO`, `RETIFICAR`, `IMPACTADO_BLOQUEADO`) no array global.
4. **CSS Premium Glassmorphism:** **PROIBIDO** usar Tailwind. As classes CSS (`.card-glass`, `.status-led`) estão no `index.css`. O design segue a paleta Balera Advogados, usando tons slate e efeitos backdrop-blur para dar aspecto Premium de 2026.

## Restrições Obrigatórias & "Do Not Touch" sem aprovação expressa
- **Preservação de Dados Originais:** A propriedade `valorPrincipalOriginal`, `valorTotalCreditoDetalhadoOriginal` e afins **NUNCA** devem ser reescritas na simulação. Toda a matemática da cascata e o cálculo de economia em Multa/Juros dependem de comparar o `valorPrincipal` (mutável) contra a âncora do valor original que veio da RFB.
- **NÃO** altere a lógica de `getDepth` e de encadeamento no `ExcelParser.ts`. Demorou várias iterações para alinhar o recálculo cronológico das árvores familiares de DCOMPs. Se houver bug de ordenação, valide exaustivamente antes de commitar.
- **NÃO** instale bibliotecas CSS pesadas (como Material UI ou Tailwind). Siga expandindo o `index.css`.
- **Modo Claro / Escuro:** É controlado via `data-theme` no `<html>`. Respeite o contraste dinâmico usando variáveis CSS como `var(--color-bg)` ou `var(--color-text-main)`.
- **Aba "Processamento PERDCOMP" e "PERDCOMP Débitos":** A planilha de entrada **não** vai mudar de formato; a importação depende dos nomes exatos das colunas.

## Definição de Pronto (DoD)
Qualquer alteração feita por você deve:
1. Compilar sem erros (`npm run build`).
2. Passar na validação de tipos TypeScript estrita.
3. Não quebrar a formatação visual Premium, tanto no Modo Claro quanto Escuro.
4. Preservar o filtro de tabela "Apenas Vigentes e Editáveis".

## Estratégia Recomendada para Início
1. Leia `docs/PROJECT_STATE.md` para entender onde paramos.
2. Leia `docs/ROADMAP.md` para buscar a próxima tarefa não iniciada.
3. Se precisar entender por que algo está feito de forma X, verifique o `docs/DECISIONS.md`.
4. Converse com o usuário, suba o ambiente com `npm run dev` e foque nas melhorias pendentes.
