# KNOWN_ISSUES.md

## Problemas e Limitacoes Conhecidas

1. **Auditoria normativa ainda incompleta por tipo de credito**
   - *Comportamento:* A aplicacao ja possui camada normativa consultiva e SELIC integrada com fallback, mas ainda nao ha matriz completa para todos os tipos, vedacoes e cenarios.
   - *Risco:* Regra consultiva pode ser interpretada como bloqueio/conclusao normativa completa.
   - *Diretriz:* Endurecer regras somente com fonte oficial, hipotese, impacto e caso de validacao.

2. **Schema persistido em IndexedDB sem migracao formal**
   - *Comportamento:* Zustand persiste objetos em `bsmart-perdcomp-storage` via `idb-keyval`.
   - *Risco:* Mudanca futura no formato de `CadeiaRelacional`, `DCOMP` ou snapshots pode hidratar dados antigos incompativeis.
   - *Solucao futura:* Versionar o schema persistido e criar migracao/limpeza controlada.

3. **Tipagens flexiveis da lib `xlsx`**
   - *Comportamento:* `XLSX.utils.sheet_to_json` trabalha com linhas flexiveis e cabecalhos do e-CAC.
   - *Risco:* Mudanca de cabecalho, valores monetarios como string ou datas fora do padrao podem exigir sanitizacao adicional.
   - *Solucao futura:* Fortalecer validadores de importacao e distinguir ausente, invalido e zero importado.

4. **Performance do recalculo pos-edicao**
   - *Comportamento:* A importacao usa Worker, mas edicoes e recalculos posteriores ainda rodam pela store/main thread.
   - *Risco:* Cadeias muito maiores que as reais atuais podem travar a UI.
   - *Solucao futura:* Mover recalculo pos-edicao para Worker se o volume real exigir.

5. **Credito judicial sem componentes**
   - *Comportamento:* O e-CAC pode trazer processo judicial/habilitacao sem componentes de credito.
   - *Risco:* SELIC unica por DCOMP judicial seria incorreta.
   - *Diretriz:* Manter `dados_insuficientes` ou exigir componente informado com rastro.

## Resolvidos Recentemente

- Worker de upload com erro generico: mitigado com fallback local pelo `importPipeline`.
- `QuotaExceededError`/limite pratico de `localStorage`: mitigado com IndexedDB via `idb-keyval`.
- PER/DCOMP `Em analise`: classificada consultivamente como vigente, editavel e cancelavel.
- Testes automatizados expandidos: 15 arquivos e 62 testes aprovados em 2026-06-14 apos o Passo 1.
