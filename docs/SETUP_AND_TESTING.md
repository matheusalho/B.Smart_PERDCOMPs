# SETUP_AND_TESTING.md

## Pre-requisitos

- Node.js compativel com o projeto.
- npm.

## Instalacao

No diretorio raiz do repositorio ativo:

```bash
npm install
```

## Rodando Localmente

```bash
npm run dev
```

O Vite normalmente sobe em `http://localhost:5173`, salvo conflito de porta.

## Validacoes Automatizadas

Comandos base:

```bash
npm test
npm run lint
npm run build
```

Estado verificado em 2026-06-14:

- `npm test`: aprovado, 15 arquivos e 62 testes.
- `npm run lint`: aprovado.
- `npm run build`: aprovado. Avisos nao bloqueantes: tempo relevante em `vite:worker-import-meta-url` e chunks acima de 500 kB.

## Cobertura Automatizada Atual

- Servicos normativos puros (`selicMath`, `dateRules`, `creditRules`, `statusRules`, `cascataRules`, `originalValueGuards`, `vedacaoCompensacaoService`).
- `SelicService` com dados reais importados.
- `ExcelParser`/`importPipeline` com planilhas reais em `Sheets/`.
- Preservacao de `ImportQualityReport` no store.
- `RastreabilidadePanel`.
- `ReportGeneratorService` com origem/metodo/status por valor no PDF.
- Mensagens/tooltips consultivos.

## Validacao Manual Recomendada

Use validacao manual quando a mudanca afetar UI, PDF, upload ou fluxo de edicao:

1. Rode `npm run dev`.
2. Importe uma planilha real de `C:\Projetos\B.Smart_PERDCOMPs\Sheets`.
3. Confirme que a primeira cadeia e selecionada apos importacao.
4. Abra uma cadeia e verifique KPIs, tabela e painel de rastreabilidade.
5. Edite debitos de uma DCOMP vigente/editavel.
6. Verifique badges de SELIC/status e ausencia de alteracao em campos `...Original`.
7. Salve uma simulacao e gere PDF consolidado, conferindo premissas/metodologia.

## Troubleshooting

- **Estado antigo/incompativel:** limpar dados do site para a chave `bsmart-perdcomp-storage` em IndexedDB e recarregar.
- **Worker indisponivel:** o upload deve tentar fallback local; se tambem falhar, conferir mensagem final e a planilha de entrada.
- **Build com aviso de chunk:** nao bloqueia a validacao atual, mas pode orientar code splitting futuro.
