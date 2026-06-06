# ARCHITECTURE.md

## Visão Geral da Arquitetura
A aplicação adota uma arquitetura Client-Side (SPA) construída com React e Zustand. O frontend absorve toda a carga computacional, permitindo que o usuário trabalhe offline ou sem latência de rede em cálculos pesados de compensação tributária. 
O aplicativo atua como um simulador interativo, traduzindo dados estáticos vindos de relatórios da Receita Federal em uma linha do tempo dinâmica mutável.

## Descrição das Principais Pastas e Módulos
- `src/App.tsx`: Gerencia a casca principal da aplicação, Navbar e controle de Theme Light/Dark mode.
- `src/store/store.ts`: Utiliza o Zustand como única fonte de verdade persistida (`bsmart-perdcomp-storage`). Contém as definições de `CadeiaRelacional` e injeta a ação `atualizarDebito`, que trigga o `CalculoService`.
- `src/services/ExcelParser.ts`: Faz o parse de ArrayBuffer para objetos, resolvendo a linhagem (dependências PAI-FILHA) da árvore através das chaves "Retificado ou Cancelado Por".
- `src/services/CalculoService.ts`: Módulo matemático desacoplado de dependências do React. Recebe a Cadeia, calcula a evolução do saldo e aplica flags baseando-se no `statusHelper`.
- `src/components/TimelineCascata.tsx`: O cérebro da exibição da cadeia, onde as tabelas de cascata são geradas. Depende puramente da leitura da `store`.
- `src/components/ModalEdicao.tsx`: Abre um portal para edição profunda dos débitos (`valorPrincipal`). Atualiza a `store` quando valores são mudados.

## Fluxo de Execução Principal e Dados
1. **Upload**: Usuário joga a planilha em `UploadComponent`.
2. **Parseamento**: O arquivo é passado para `ExcelParser.ts`, que o converte em arrays do tipo `CadeiaRelacional[]`. 
3. **Agrupamento & Linhagem**: Ainda no Parse, a função agrupa documentos com base na "Origem" comum, e calcula o `Depth` (profundidade de retificação) usando um `rectifiesMap`. As declarações são niveladas cronologicamente respeitando ancestrais.
4. **Hydration e Primeiro Cálculo**: O store salva o resultado da importação, invoca `CalculoService` pela primeira vez para estabelecer o Saldo Inicial.
5. **Edição do Usuário**: O usuário abre `ModalEdicao`, muda o valor de um Débito (ex: IRPJ Trimestral reduzido).
6. **Reatividade**: O modal chama `atualizarDebito` no `store`. O store gera uma nova cópia de Cadeia, repassa para o `CalculoService`, que abate a diferença sobre a declaração alterada e empurra esse "crédito que sobrou" pras declarações subsequentes.
7. **Re-render**: `TimelineCascata.tsx` percebe a mutação do store e plota os novos saldos na tela com cores indicativas.

## Modelos de Dados Chave (`src/models/types.ts`)
- **`DebitoOficial`**: Representa um débito unitário do e-CAC. Contém `valorPrincipal` (mutável) e `valorPrincipalOriginal` (referência estática).
- **`DCOMP`**: Declaração. Possui o seu array de Débitos, as métricas agregadas (ex: `valorTotalCreditoDetalhado`) e Flags do recálculo (`statusCascata` como 'RETIFICAR' ou 'IMPACTADO_BLOQUEADO').
- **`CadeiaRelacional`**: Container. É a casca que abriga diversas DCOMPs ordenadas sob uma mesma lógica contábil/crédito.

## Integrações Externas
A aplicação é 100% cliente; a única integração é com o `FileSystem` do dispositivo (upload de XLS). A formatação do Excel depende da estabilidade do relatório oficial extraído do sistema e-CAC da RFB.

## Decisões Arquiteturais Relevantes
- **Zustand em vez de Context API ou Redux**: Redux era overkill e muito boilerplate; Context API era suscetível a renders desnecessários, especialmente com uma tabela de dados densos. Zustand permitiu subscrição limpa.
- **`CalculoService` Desacoplado**: Lógicas tributárias em React causam loops de dependência cruéis. Separámos o serviço estritamente em um file TS puro de entrada e saída.

## Alternativas Evitadas e Porquê
- **Backend Node.js**: Evitado para simplificar o MVP. Dado que as empresas lidam com dados fiscais sensíveis, rodar tudo localmente no browser elimina dores de cabeça de conformidade (LGPD) num primeiro momento.
- **Mutações Diretas (`immer`)**: Evitamos e fizemos recriação superficial padrão (spread operator) nas listagens. Immer poderia ser implementado, mas como as árvores de objeto têm pouca profundidade no frontend, seria dependência desnecessária.
