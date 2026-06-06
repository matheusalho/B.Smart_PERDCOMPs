# ARCHITECTURE.md

## Visão Geral da Arquitetura
A aplicação adota uma arquitetura Client-Side (SPA) construída com React e Zustand. O frontend absorve toda a carga computacional, permitindo que o usuário trabalhe offline ou sem latência de rede em cálculos pesados de compensação tributária. 
O aplicativo atua como um simulador interativo, traduzindo dados estáticos vindos de relatórios da Receita Federal em uma linha do tempo dinâmica mutável.

## Descrição das Principais Pastas e Módulos
- `src/App.tsx`: Gerencia a casca principal da aplicação, Navbar e controle de Theme Light/Dark mode.
- `src/store.ts`: Utiliza o Zustand como única fonte de verdade persistida (`bsmart-perdcomp-storage`). Mantém cadeias, empresa, cadeia selecionada e simulações salvas. Injeta ações como `atualizarDebito`, `editarCreditoOriginal`, `adicionarDcompHipotetica`, `salvarSimulacaoCadeia` e `recalcularCadeia`.
- `src/services/ExcelParser.ts`: Faz o parse de ArrayBuffer para objetos, resolvendo a linhagem (dependências PAI-FILHA) da árvore através das chaves "Retificado ou Cancelado Por".
- `src/services/CalculoService.ts`: Módulo matemático desacoplado de dependências do React. Recebe a Cadeia, calcula a evolução do saldo e aplica flags baseando-se no `statusHelper`.
- `src/services/ReportGeneratorService.ts`: Gera o relatório consolidado em PDF com `jspdf` e `jspdf-autotable`, usando snapshots de simulações salvas e preservando comparativos entre valores originais e novos.
- `src/workers/excelWorker.ts`: Executa parse e primeiro recálculo fora da main thread durante o upload da planilha.
- `src/components/TimelineCascata.tsx`: O cérebro da exibição da cadeia, onde as tabelas de cascata são geradas. Depende puramente da leitura da `store`.
- `src/components/ModalEdicao.tsx`: Abre um portal para edição profunda dos débitos (`valorPrincipal`). Atualiza a `store` quando valores são mudados.
- `src/components/ModalHipotetica.tsx`: Abre um portal para injeção de PER/DCOMP hipotética com múltiplos débitos simulados.
- `src/components/DashboardCadeias.tsx`: Exibe o resumo executivo global, filtros de cadeias e seleção da cadeia relacional ativa.

## Fluxo de Execução Principal e Dados
1. **Upload**: Usuário joga a planilha em `UploadComponent`.
2. **Parseamento**: O arquivo é enviado para `excelWorker.ts`, que chama `ExcelParser.ts` e converte o ArrayBuffer em `CadeiaRelacional[]`.
3. **Agrupamento & Linhagem**: Ainda no Parse, a função agrupa documentos com base na "Origem" comum, e calcula o `Depth` (profundidade de retificação) usando um `rectifiesMap`. As declarações são niveladas cronologicamente respeitando ancestrais.
4. **Primeiro Cálculo no Worker**: O worker chama `CalculoService` para recalcular as cadeias importadas antes de retornar os dados para a UI.
5. **Hydration da Store**: O store salva o resultado da importação já recalculado e persiste o estado no `localStorage`.
6. **Edição do Usuário**: O usuário abre `ModalEdicao`, muda o valor de um Débito (ex: IRPJ Trimestral reduzido), edita o saldo da raiz ou injeta uma PER/DCOMP hipotética.
7. **Reatividade**: A ação na store gera uma nova cópia de Cadeia e repassa para o `CalculoService`, que abate a diferença sobre a declaração alterada e propaga os efeitos pelas declarações subsequentes.
8. **Re-render**: `TimelineCascata.tsx` percebe a mutação do store e plota os novos saldos na tela com cores indicativas.
9. **Salvamento e Relatório**: O usuário salva uma simulação de cadeia. A store guarda um snapshot em `simulacoesSalvas`, e `ReportGeneratorService.ts` usa esses snapshots para gerar o PDF consolidado.

## Modelos de Dados Chave (`src/models/types.ts`)
- **`DebitoOficial`**: Representa um débito unitário do e-CAC. Contém `valorPrincipal` (mutável) e `valorPrincipalOriginal` (referência estática).
- **`DCOMP`**: Declaração. Possui o seu array de Débitos, as métricas agregadas (ex: `valorTotalCreditoDetalhado`) e Flags do recálculo (`statusCascata` como 'RETIFICAR' ou 'IMPACTADO_BLOQUEADO').
- **`CadeiaRelacional`**: Container. É a casca que abriga diversas DCOMPs ordenadas sob uma mesma lógica contábil/crédito.

## Integrações Externas
A aplicação é 100% cliente; a principal integração é com o `FileSystem` do dispositivo (upload de XLS). A geração de PDF roda no browser e baixa o arquivo localmente. A formatação do Excel depende da estabilidade do relatório oficial extraído do sistema e-CAC da RFB.

## Decisões Arquiteturais Relevantes
- **Zustand em vez de Context API ou Redux**: Redux era overkill e muito boilerplate; Context API era suscetível a renders desnecessários, especialmente com uma tabela de dados densos. Zustand permitiu subscrição limpa.
- **`CalculoService` Desacoplado**: Lógicas tributárias em React causam loops de dependência cruéis. Separámos o serviço estritamente em um file TS puro de entrada e saída.
- **Web Worker para Importação**: O parse e primeiro recálculo da planilha são executados fora da main thread para melhorar responsividade durante o upload.
- **Relatório PDF por Snapshot**: O PDF usa simulações explicitamente salvas pelo usuário, não o estado transitório da cadeia atual, para preservar a intenção de exportação e a auditabilidade.

## Alternativas Evitadas e Porquê
- **Backend Node.js**: Evitado para simplificar o MVP. Dado que as empresas lidam com dados fiscais sensíveis, rodar tudo localmente no browser elimina dores de cabeça de conformidade (LGPD) num primeiro momento.
- **Mutações Diretas (`immer`)**: Evitamos e fizemos recriação superficial padrão (spread operator) nas listagens. Immer poderia ser implementado, mas como as árvores de objeto têm pouca profundidade no frontend, seria dependência desnecessária.
