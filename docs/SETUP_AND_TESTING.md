# SETUP_AND_TESTING.md

## Pré-requisitos
- **Node.js**: Versão >= 18.x
- **Gerenciador de pacotes**: `npm` ou `yarn`
- **TypeScript**: Configuração do Vite.

## Instalação
No diretório raiz (`bsmart-perdcomp`):
```bash
npm install
```

## Variáveis de Ambiente
Não há dependências críticas de chaves de API secretas até o momento. No entanto, criei um `.env.example` padrão no repositório.
Para iniciar:
```bash
cp .env.example .env
```
(O `.env` atualmente pode não ter chaves, mas serve de placeholder para futuras integrações de Backend).

## Rodando Localmente
```bash
npm run dev
```
O servidor abrirá em `http://localhost:5173`. O Vite possui HMR (Hot Module Replacement), permitindo edição ágil.

## Testes Manuais (Validação Core)
Até o momento, não possuímos testes E2E/Unitários automatizados (`vitest`/`jest`). A auditoria e os testes foram feitos via IA.

Para validar o sistema manualmente se você modificar o motor lógico:
1. Abra `localhost:5173`.
2. Clique no botão de **"Carregar Dados de Exemplo"** (carrega as cascatas de teste de `mockData.ts`) OU faça upload de uma planilha oficial fornecida.
3. Altere o "Valor Principal" de qualquer DCOMP com código numérico (que já esteja no topo da cascata). 
4. Valide que as colunas de "NOVO: " apareçam em cor verde (positivo) ou amarela (aviso) ao longo dos itens debaixo na cascata, indicando que a quebra de valor se propagou.
5. Verifique a Tag de Situação na primeira coluna. Se a redução foi grande e consumiu o crédito inteiro, um "RETIFICAR" vermelho deve ser ativado nas linhas onde houver estouro.

## Build para Produção
```bash
npm run build
```
Certifique-se de não haver erros de tipagem. A aplicação utilizará `tsc -b` para checar tipos antes do vite engatilhar o build de minify.

## Troubleshooting Comum
- **TypeError: Cannot read properties of undefined (reading '...'):**
  Ocorre tipicamente se o `bsmart-perdcomp-storage` do LocalStorage está envenenado por um build antigo com objetos inválidos. 
  **Solução:** F12 no Chrome -> Application -> Local Storage -> Apague `bsmart-perdcomp-storage` e recarregue a página.
